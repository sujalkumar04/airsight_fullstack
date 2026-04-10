# 🌍 AirSight AI — Global PM2.5 Forecast Platform

> **India Innovates 2026**  
> *XGBoost-powered air quality prediction with anomaly detection, scenario planning, and real-time visualization.*

![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![Tech](https://img.shields.io/badge/Tech-XGBoost%20%7C%20Flask%20%7C%20Leaflet-green)
![Accuracy](https://img.shields.io/badge/Accuracy-R%C2%B2%200.979-orange)
![Features](https://img.shields.io/badge/Features-Anomaly%20Detection%20%7C%20Scenarios%20%7C%20RBAC-purple)

**🔗 Live Dashboard:** [bytebender77.github.io/airsight-ai](https://bytebender77.github.io/airsight-ai)  
**📦 GitHub:** [github.com/sujalkumar04/airsight_fullstack](https://github.com/sujalkumar04/airsight_fullstack)

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Judges Guide](#-judges-guide)
- [Credits](#-credits)

---

## 🎯 Problem Statement

Air pollution kills **7 million people annually** (WHO), yet real-time PM2.5 monitoring is scarce in developing regions. AirSight AI bridges this gap using **7 years of satellite data** and Machine Learning to provide:

- **Historical Visibility** — 84-month global air quality timeline (2015–2021)
- **Future Predictions** — 24h, 48h, 72h PM2.5 forecasts using XGBoost
- **Anomaly Detection** — Statistical identification of pollution spikes
- **Scenario Planning** — What-if forecasting with collaborative tools

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 VISUALIZATION LAYER                      │
│   Leaflet Map · Chart.js · Anomaly Markers              │
│   Scenario Planner · Role-Based UI                      │
├─────────────────────────────────────────────────────────┤
│                ML PREDICTION LAYER                       │
│   XGBoost (24h/48h/72h) · R²=0.979 · <8ms Inference    │
│   ForecastService · ScenarioManager                     │
├─────────────────────────────────────────────────────────┤
│                 PROCESSING LAYER                         │
│   Feature Engineering (21 dims) · AnomalyDetector (2σ)  │
│   Schema Validation · Range Checks · Error Handling     │
├─────────────────────────────────────────────────────────┤
│               DATA INGESTION LAYER                       │
│   DataUploadHandler (CSV) · Satellite Pipeline          │
│   AuditLogger · RBAC (Admin/Planner/Viewer)             │
└─────────────────────────────────────────────────────────┘
```

> Full architecture details: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## ✨ Key Features

### 🤖 ML Prediction Engine
- **3 XGBoost models** trained on 298,000+ data points across 3,554 global grid points
- **21 input features:** PM2.5 lags (1–7d), rolling averages, weather (temp, humidity, wind, AOD), spatial coordinates
- **Performance:** R² = 0.979 (24h) · 0.968 (48h) · 0.961 (72h)

### 📂 CSV Data Upload (DataUploadHandler)
- Drag-and-drop file upload in dashboard
- **Multi-layer validation:** File type, 10MB size limit, schema check, range verification
- Structured error responses with detailed feedback

### 🔴 Anomaly Detection (AnomalyDetector)
- Statistical **2-sigma** method on PM2.5 data
- Anomalies rendered as **pulsing red markers** on the map
- Automatic detection on CSV upload

### 🗂️ Scenario Planning (ScenarioManager)
- Save forecast results as **named scenarios** (e.g., "Delhi Winter 2025")
- View, compare, and **comment** on scenarios collaboratively
- Full CRUD API with role-based permissions

### 👤 Role-Based Access Control (RBAC)
- Three roles: **Admin** > **Planner** > **Viewer**
- Role selector in dashboard header
- Permission enforcement on upload, scenarios, audit log

### 📋 Audit Logging (AuditLogger)
- File-based logger tracking all operations (predictions, uploads, errors)
- In-dashboard log viewer with **color-coded** entries
- 90-day retention policy

### 🗺️ Interactive Dashboard
- **Leaflet.js** dark-themed world map with 3,554+ data points
- **84-month timeline slider** with animation
- City search, WHO risk categories, health alerts
- **Cigarette equivalent** lung impact visualization

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **ML** | XGBoost 2.0, scikit-learn, NumPy, pandas |
| **API** | Flask, Flask-CORS, Gunicorn |
| **Frontend** | Leaflet.js, Chart.js, Vanilla JS, Inter font |
| **Data** | Google Earth Engine, NASA satellites |
| **Deployment** | Render.com (API), GitHub Pages (Dashboard) |

---

## 🚀 Quick Start

### Prerequisites
```bash
pip install -r requirements.txt
```

### Launch (One Command)
```bash
cd dashboard
bash start_demo.sh
```

### Manual Launch
```bash
# Terminal 1: Start API
cd dashboard
python3 api.py

# Terminal 2: Start Frontend
cd dashboard
python3 -m http.server 8502
```

**Open:**
- 🌍 Dashboard: `http://localhost:8502/dashboard.html`
- 🧪 Evaluator: `http://localhost:8502/evaluate.html`
- 🔌 API Health: `http://localhost:5050/health`

### Remote Demo (ngrok)
```bash
ngrok http 5050
bash start_demo.sh https://your-url.ngrok-free.app
```

---

## 📡 API Reference

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/predict` | POST | All | Run XGBoost forecast for a location |
| `/evaluate` | POST | All | Batch evaluation with R², RMSE, MAE |
| `/upload` | POST | Planner+ | CSV upload with validation + anomaly detection |
| `/anomalies` | POST | All | Standalone anomaly detection |
| `/scenarios` | GET/POST | All/Planner+ | List or create forecast scenarios |
| `/scenarios/<id>` | GET/DELETE | All/Admin | Get or delete a scenario |
| `/scenarios/<id>/comment` | POST | All | Add comment to scenario |
| `/audit-log` | GET | Planner+ | Retrieve audit log entries |
| `/user-info` | GET | All | Current user role + permissions |
| `/snapshot` | GET | All | Historical PM2.5 data by month |
| `/months` | GET | All | Available months metadata |
| `/health` | GET | All | API health check |

---

## 👨‍⚖️ Judges Guide

1. **[Executive Summary](EXECUTIVE_SUMMARY.md)** — 1-page problem, solution, results
2. **[Architecture](ARCHITECTURE.md)** — 4-layer modular design + full API docs
3. **[Judges Q&A](JUDGES_QA.md)** — Common questions about impact, data, accuracy
4. **[Data Pipeline](data_pipeline/README.md)** — How we extracted 7 years of satellite data
5. **[Model Docs](models/README.md)** — XGBoost engine + feature engineering
6. **[Live Demo](https://bytebender77.github.io/airsight-ai)** — See it in action

---

## 📁 Project Structure

```
airsight-ai-v2/
├── dashboard/
│   ├── api.py                 # Flask API (14 endpoints)
│   ├── audit_logger.py        # AuditLogger module
│   ├── scenario_manager.py    # ScenarioManager module
│   ├── dashboard.html         # Main dashboard UI
│   ├── evaluate.html          # Judge evaluation console
│   ├── predict.py             # CLI prediction tool
│   └── start_demo.sh          # One-click launcher
├── data_pipeline/             # Google Earth Engine data scripts
├── models/                    # Trained XGBoost models (24h/48h/72h)
├── data/                      # Dataset (99MB)
├── ARCHITECTURE.md            # 4-layer architecture documentation
├── EXECUTIVE_SUMMARY.md       # 1-page overview
├── JUDGES_QA.md               # Q&A for evaluators
└── requirements.txt           # Python dependencies
```

---

## 📈 Scalability Design

The system is architected for horizontal scalability:

- **Containerized API** — Flask backend deployable via Docker/Kubernetes; multiple instances can run in parallel behind a load balancer
- **Distributed Processing** — Data ingestion layer integrates with Apache Spark (or Dask) for large-scale CSV processing beyond single-node capacity
- **Streaming Ready** — Periodic refresh architecture aligns with Kafka-style streaming ingestion; real-time updates can replace `setInterval` with WebSocket subscriptions
- **Cloud-Native Storage** — Dataset and model artifacts can be migrated to GCP BigQuery / Cloud Storage with zero code changes to the prediction layer
- **Stateless Inference** — Each `/predict` call is fully stateless, enabling elastic scaling under high concurrency

> *"System is horizontally scalable using containerized APIs and can integrate with distributed processing (e.g., Spark) for large-scale data ingestion and analytics."*

---

## 👥 Credits

Developed by **Kunal, Sujal & Tikendra** for **India Innovates 2026** 🇮🇳

---

## 📄 License

MIT License — Project developed for Hackathon purposes.
