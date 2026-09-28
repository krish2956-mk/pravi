from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.domain import Asset, LifecycleEvent, Inspection
from app.schemas.domain import AssetCreate, AssetUpdate
from typing import Optional, List, Tuple


def get_asset(db: Session, asset_id: int):
    return db.query(Asset).filter(Asset.id == asset_id).first()


def get_asset_by_unique_id(db: Session, unique_id: str):
    return db.query(Asset).filter(Asset.unique_id == unique_id).first()


def get_assets(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Asset).offset(skip).limit(limit).all()


def get_assets_with_condition(db: Session, skip: int = 0, limit: int = 500) -> List[Tuple[Asset, Optional[int]]]:
    """
    Returns all assets joined with the score from their latest inspection.
    Each row is (Asset, score_or_None).
    """
    # Subquery: max inspection id per asset (proxy for latest)
    latest_subq = (
        db.query(
            Inspection.asset_id,
            func.max(Inspection.id).label('latest_id')
        )
        .group_by(Inspection.asset_id)
        .subquery()
    )

    rows = (
        db.query(Asset, Inspection.score)
        .outerjoin(latest_subq, Asset.id == latest_subq.c.asset_id)
        .outerjoin(Inspection, Inspection.id == latest_subq.c.latest_id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return rows


def create_asset(db: Session, asset: AssetCreate, type_code: str, region_code: str, user_id: int):
    # Server-side unique ID generation: TYPE-REGION-SEQ (e.g. BRG-AHM-000123)
    max_id = db.query(Asset).count() + 1
    seq = f"{max_id:06d}"
    unique_id = f"{type_code}-{region_code}-{seq}"

    db_asset = Asset(
        unique_id=unique_id,
        name=asset.name,
        type_id=asset.type_id,
        region_id=asset.region_id,
        status=asset.status,
        attributes=asset.attributes
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)

    # Log initial lifecycle event
    event = LifecycleEvent(
        asset_id=db_asset.id,
        user_id=user_id,
        to_status=asset.status,
        notes="Asset created"
    )
    db.add(event)
    db.commit()

    return db_asset


def update_asset(db: Session, db_asset: Asset, asset: AssetUpdate):
    update_data = asset.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_asset, key, value)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset
