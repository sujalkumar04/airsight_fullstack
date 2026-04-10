# AirSight AI — System Architecture

## Modular Architecture Overview

AirSight AI follows a **4-layer modular architecture** designed for scalability, maintainability, and extensibility.

```
┌─────────────────────────────────────────────────────────┐
│                    VISUALIZATION LAYER                   │
│   Leaflet Map · Chart.js Graphs · Anomaly Highlights    │
│   Scenario Planner · Dashboard (HTML/CSS/JS)            │
├─────────────────────────────────────────────────────────┤
│                   ML PREDICTION LAYER                    │
│   XGBoost Regressor (24h/48h/72h) · R² = 0.979         │
│   ForecastService · 21 Feature Dimensions               │
├─────────────────────────────────────────────────────────┤
│                    PROCESSING LAYER                      │
│   Feature Engineering · AnomalyDetector (2σ)            │
│   Schema Validation · Range Checks · Error Handling     │
├─────────────────────────────────────────────────────────┤
│                  DATA INGESTION LAYER                    │
│   DataUploadHandler (CSV) · Satellite Pipeline          │
│   AuditLogger · RBAC (Admin/Planner/Viewer)             │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1: Data Ingestion Layer

| Component | Description |
|---|---|
| **DataUploadHandler** | CSV upload via `/upload` with file type, size (10MB max), schema, and range validation. |
| **Satellite Pipeline** | 5-step pipeline (`data_pipeline/`) pulling PM2.5, weather, AOD, cloud, elevation from Google Earth Engine. |
| **AuditLogger** | Logs all operations (uploads, predictions, scenario changes, errors) with timestamps. 90-day retention. |
| **RBAC** | Role-based access control: Admin > Planner > Viewer, via `X-User-Role` header. |

---

## Layer 2: Processing Layer

| Component | Description |
|---|---|
| **Feature Engineering** | 21 model features: cyclical time encoding, lag features (1d–7d), rolling averages (3d/7d/14d). |
| **AnomalyDetector** | Statistical 2σ method — flags PM2.5 values beyond 2 standard deviations from mean. |
| **Schema Validation** | Checks for required columns (lat, lon, pm25) and validates data ranges (0–999 µg/m³). |
| **Error Handling** | Try/except on all ingestion, invalid file rejection, structured JSON error responses. |

---

## Layer 3: ML Prediction Layer

| Component | Description |
|---|---|
| **ForecastService** | 3 XGBoost Regressors for 24h/48h/72h PM2.5 forecasts via `/predict`. |
| **Performance** | R² = 0.979 (24h), 0.968 (48h), 0.961 (72h). RMSE < 6.5 µg/m³. < 8ms inference. |
| **ScenarioManager** | Save, name, share, and comment on forecast scenarios for collaborative what-if planning. |

---

## Layer 4: Visualization Layer

| Component | Description |
|---|---|
| **Global Heatmap** | Leaflet.js map with 3,554+ color-coded PM2.5 points + WHO risk categories. |
| **Anomaly Highlights** | Uploaded anomalies rendered as pulsing red markers on the map. |
| **Scenario Planner** | Modal to view, compare, and comment on saved forecast scenarios. |
| **Audit Log Viewer** | Color-coded log entries modal for operational traceability. |
| **Role Selector** | Switchable user roles (Admin/Planner/Viewer) with permission enforcement. |

---

## API Endpoints

| Endpoint | Method | Role | Purpose |
|---|---|---|---|
| `/predict` | POST | All | Run XGBoost forecast |
| `/evaluate` | POST | All | Batch evaluation with accuracy metrics |
| `/upload` | POST | Planner+ | CSV upload with validation + anomaly detection |
| `/anomalies` | POST | All | Standalone anomaly detection |
| `/scenarios` | GET | All | List saved scenarios |
| `/scenarios` | POST | Planner+ | Create named scenario |
| `/scenarios/<id>` | GET | All | Get single scenario |
| `/scenarios/<id>/comment` | POST | All | Add comment to scenario |
| `/scenarios/<id>` | DELETE | Admin | Delete scenario |
| `/user-info` | GET | All | Current user role + permissions |
| `/audit-log` | GET | Planner+ | Retrieve audit log entries |
| `/snapshot` | GET | All | Historical PM2.5 data |
| `/months` | GET | All | Available months metadata |
| `/health` | GET | All | API health check |

---

## Tech Stack

- **ML:** XGBoost 2.0, scikit-learn, NumPy, pandas
- **API:** Flask, Flask-CORS, Gunicorn
- **Frontend:** Leaflet.js, Chart.js, Vanilla JS
- **Data:** Google Earth Engine, NASA satellites
- **Deployment:** Render.com (API), GitHub Pages (Dashboard)
