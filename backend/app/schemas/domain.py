from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime


class UserBase(BaseModel):
    email: str
    role: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class AssetTypeBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    schema_: Dict[str, Any] = {} # Mapped to JSONB schema

class AssetTypeResponse(AssetTypeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AssetBase(BaseModel):
    name: str
    type_id: int
    region_id: int
    attributes: Dict[str, Any] = {}
    status: str = "Planned"
    geometry: Optional[str] = None # Will be handled carefully later, WKT for now

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    geometry: Optional[str] = None

class AssetResponse(AssetBase):
    id: int
    unique_id: str
    created_at: datetime
    updated_at: datetime
    condition_score: Optional[int] = None  # From latest inspection
    model_config = ConfigDict(from_attributes=True)

class LifecycleEventCreate(BaseModel):
    to_status: str
    notes: Optional[str] = None

class LifecycleEventResponse(LifecycleEventCreate):
    id: int
    asset_id: int
    user_id: int
    from_status: Optional[str] = None
    event_date: datetime
    model_config = ConfigDict(from_attributes=True)
