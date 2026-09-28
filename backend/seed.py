import random
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.domain import User, Region, AssetType, Asset, LifecycleEvent, Inspection, WorkOrder
from app.core.security import get_password_hash

def seed_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Users
    if db.query(User).first():
        print("Database already seeded.")
        return
        
    admin = User(email="admin@example.com", hashed_password=get_password_hash("admin123"), role="admin")
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    # 2. Regions
    ahm_region = Region(code="AHM", name="Ahmedabad")
    db.add(ahm_region)
    db.commit()
    db.refresh(ahm_region)
    
    # 3. Asset Types
    types_data = [
        {"code": "BRG", "name": "Bridge"},
        {"code": "RDS", "name": "Road Segment"},
        {"code": "LGT", "name": "Streetlight"},
        {"code": "TRF", "name": "Transformer"},
        {"code": "WPL", "name": "Water Pipeline"}
    ]
    
    asset_types = {}
    for td in types_data:
        at = AssetType(code=td["code"], name=td["name"])
        db.add(at)
        db.commit()
        db.refresh(at)
        asset_types[td["code"]] = at
        
    # 4. Assets
    # Ahmedabad approximate center: 72.5714 (lon), 23.0225 (lat)
    center_lon, center_lat = 72.5714, 23.0225
    statuses = ["Planned", "Acquired", "Commissioned", "In Service", "Under Maintenance"]
    
    for i in range(1, 301):
        t_code = random.choice(list(asset_types.keys()))
        t_obj = asset_types[t_code]
        
        # Random location around Ahmedabad (approx +/- 0.1 deg)
        lon = center_lon + random.uniform(-0.1, 0.1)
        lat = center_lat + random.uniform(-0.1, 0.1)
        
        seq = f"{i:06d}"
        unique_id = f"{t_code}-AHM-{seq}"
        
        status = random.choice(statuses)
        
        asset = Asset(
            unique_id=unique_id,
            name=f"{t_obj.name} #{i}",
            type_id=t_obj.id,
            region_id=ahm_region.id,
            status=status,
            geometry=f"POINT({lon} {lat})",
            attributes={"condition_notes": "auto-generated demo data"}
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        
        # Lifecycle event
        event = LifecycleEvent(
            asset_id=asset.id,
            user_id=admin.id,
            from_status="Planned",
            to_status=status,
            notes="Initial creation"
        )
        db.add(event)
        
        # Inspection
        if random.random() > 0.5:
            inspection = Inspection(
                asset_id=asset.id,
                inspector_id=admin.id,
                score=random.randint(1, 5),
                findings="Looks good" if random.random() > 0.5 else "Needs some repair"
            )
            db.add(inspection)
            
        # Work Order
        if status == "Under Maintenance":
            wo = WorkOrder(
                asset_id=asset.id,
                type=random.choice(["preventive", "corrective", "emergency"]),
                status="In Progress",
                priority=random.choice(["High", "Medium", "Low"]),
                description="Routine maintenance",
                assigned_to=admin.id
            )
            db.add(wo)
            
    db.commit()
    print("Successfully seeded 300 assets.")

if __name__ == "__main__":
    seed_db()
