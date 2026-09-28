# Infrastructure Asset Inventory System

This is the Infrastructure Asset Inventory System, initialized at Phase 1.

## Features Completed (Phase 1)
- Project scaffold (backend with FastAPI, frontend with React/Vite/Tailwind).
- PostgreSQL database setup with PostGIS via Docker Compose.
- Database schemas and Alembic migrations.
- Server-side unique Asset ID generation (`TYPE-REGION-SEQ`).
- Seed script that auto-generates users, regions, asset types, and 300 demo assets located around Ahmedabad, Gujarat.
- JWT authentication with Role-Based Access Control.
- Minimal frontend demonstrating a list of assets with search by name/ID and status filtering.

## Prerequisites
- Node.js installed.
- Python 3.10+ installed.

## How to run the project

1. **Start the Backend:**
   Open a terminal and navigate to the backend folder:
   ```powershell
   cd infra-asset-inventory\backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   python seed.py
   uvicorn app.main:app --reload
   ```
   *This uses an SQLite database instead of Postgres/Docker. It will create the tables, seed the 300 demo assets, and start the FastAPI server.*

2. **Start the Frontend:**
   Open a new terminal and navigate to the frontend folder:
   ```powershell
   cd infra-asset-inventory\frontend
   npm install
   npm run dev
   ```

3. Access the applications:
   - **Frontend UI:** Open your browser and go to [http://localhost:5173](http://localhost:5173). You will see the minimal React application showing the seeded assets.
   - **Backend API Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs) to see the interactive Swagger UI for the FastAPI endpoints.

## Verification
- **Frontend Verification:** Open the Frontend UI. You should see a table populated with various assets (Bridges, Streetlights, etc.). Try using the search bar or the status dropdown to filter the results.
- **Backend Verification:** In the Swagger UI, you can try out the `/api/v1/auth/login` endpoint using:
  - **username:** `admin@example.com`
  - **password:** `admin123`
  
  Copy the resulting `access_token` and use the "Authorize" button to authenticate. You can then test creating or updating assets.
