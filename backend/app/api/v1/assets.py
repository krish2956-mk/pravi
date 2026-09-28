from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.api import deps
from app.schemas.domain import AssetCreate, AssetUpdate, AssetResponse
from app.crud.asset import (
    create_asset, get_asset, get_assets_with_condition, update_asset
)
from app.models.domain import User, AssetType, Region

router = APIRouter()


def _serialize_with_condition(asset, score) -> AssetResponse:
    r = AssetResponse.model_validate(asset)
    r.condition_score = score
    return r


@router.post("/", response_model=AssetResponse)
def create_new_asset(
    asset_in: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    type_obj = db.query(AssetType).filter(AssetType.id == asset_in.type_id).first()
    if not type_obj:
        raise HTTPException(status_code=404, detail="Asset type not found")
    region_obj = db.query(Region).filter(Region.id == asset_in.region_id).first()
    if not region_obj:
        raise HTTPException(status_code=404, detail="Region not found")
    return create_asset(
        db=db, asset=asset_in,
        type_code=type_obj.code, region_code=region_obj.code,
        user_id=current_user.id
    )


@router.get("/", response_model=List[AssetResponse])
def read_assets(
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    rows = get_assets_with_condition(db, skip=skip, limit=limit)
    return [_serialize_with_condition(asset, score) for asset, score in rows]


@router.get("/{id}", response_model=AssetResponse)
def read_asset(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    asset = get_asset(db, asset_id=id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.put("/{id}", response_model=AssetResponse)
def update_existing_asset(
    id: int,
    asset_in: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    asset = get_asset(db, asset_id=id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return update_asset(db=db, db_asset=asset, asset=asset_in)
