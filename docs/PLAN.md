# Implementation Plan: Infrastructure Asset Inventory System

## Architecture
- **Backend:** Python FastAPI for a high-performance async API.
- **Database:** PostgreSQL with PostGIS extension for geospatial data. SQLAlchemy as the ORM, Alembic for database migrations.
- **Frontend:** React (Vite) with TailwindCSS. MapLibre GL for interactive maps, Recharts for dashboard charts.
- **Authentication:** JWT with role-based access control (RBAC: admin, manager, inspector, technician).
- **Deployment:** Docker Compose for local development (PostgreSQL + PostGIS, Backend API, Frontend Server).

## Folder Structure
```text
/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/            # API routing
│   │   ├── core/              # Config, Security, JWT
│   │   ├── crud/              # DB operations
│   │   ├── db/                # DB Session, Base Model
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas (Validation)
│   │   ├── services/          # Business logic (ID generation, status transition)
│   │   └── main.py            # FastAPI entry point
│   ├── tests/                 # Pytest cases
│   ├── alembic/               # Migrations directory
│   ├── alembic.ini            # Alembic config
│   ├── requirements.txt
│   ├── Dockerfile
│   └── seed.py                # Script to seed demo data
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI elements
│   │   ├── pages/             # Route pages (Assets List, Dashboard)
│   │   ├── services/          # API client calls
│   │   ├── store/             # Global state (if needed)
│   │   ├── types/             # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── Dockerfile
│   └── vite.config.ts
├── docs/
│   └── PLAN.md                # This document
├── docker-compose.yml         # Local environment setup
└── README.md
```

## Data Model (PostgreSQL + PostGIS)
- **users:** id, email, hashed_password, role, is_active
- **regions:** id, code, name, boundary (Polygon geometry)
- **asset_types:** id, code, name, description, schema (JSONB for custom attributes definition)
- **assets:** id, unique_id (e.g., BRG-AHM-000123), name, type_id, region_id, status, geometry (Point/Line/Polygon), attributes (JSONB), created_at, updated_at
- **lifecycle_events:** id, asset_id, user_id, from_status, to_status, event_date, notes
- **inspections:** id, asset_id, inspector_id, score (1-5), findings, inspection_date
- **work_orders:** id, asset_id, type (preventive/corrective/emergency), status, priority, description, assigned_to, created_at, updated_at
- **attachments:** id, entity_type (asset/inspection/work_order), entity_id, file_url, uploaded_by, uploaded_at
- **audit_log:** id, user_id, action, entity, entity_id, details (JSONB), timestamp

## API Endpoints List
### Auth
- `POST /api/v1/auth/login`: Authenticate and return JWT
- `GET /api/v1/auth/me`: Get current user info

### Assets
- `GET /api/v1/assets`: List assets (with pagination, filters, search)
- `POST /api/v1/assets`: Create a new asset (Server auto-generates ID)
- `GET /api/v1/assets/{id}`: Get asset details
- `PUT /api/v1/assets/{id}`: Update asset attributes
- `POST /api/v1/assets/{id}/status`: Change asset status (Records lifecycle event automatically)

### Inspections
- `GET /api/v1/assets/{id}/inspections`: List inspections for an asset
- `POST /api/v1/assets/{id}/inspections`: Create an inspection

### Work Orders
- `GET /api/v1/work-orders`: List all work orders
- `POST /api/v1/assets/{id}/work-orders`: Create a work order for an asset
- `PUT /api/v1/work-orders/{id}/status`: Update work order status

### Analytics (Future)
- `GET /api/v1/analytics/dashboard`: Get KPI stats and data for charts

## Phased Roadmap
### Phase 1: Foundation & Asset Management (Current Phase)
- Project scaffolding (Docker Compose, Backend, Frontend).
- Database schema (Tables, PostGIS setup).
- Core CRUD for Assets and User Authentication (JWT + RBAC).
- Asset lifecycle state machine with server-side validation.
- Asset ID auto-generation.
- Seed script with 300 demo assets around Ahmedabad across 5 types.
- Minimal frontend listing view with search and filters.

### Phase 2: Inspections, Work Orders & Mapping
- Interactive Map view using MapLibre GL showing clustered assets.
- Inspection creation and condition history visualization.
- Work Order workflows and state machine logic.
- File attachments (photos, documents).
- Asset Profile Page tabs (Overview, Map, Lifecycle, etc.).

### Phase 3: Dashboard & Analytics
- Main Dashboard with KPI cards and Recharts.
- Maintenance cost trends and predictive flags (ranked "assets requiring attention").
- Advanced filtering and bulk CSV operations.

### Phase 4: Production Readiness
- Comprehensive testing (unit, integration, E2E).
- CI/CD pipeline setup.
- Optimization and database indexing.
