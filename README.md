# 🚑 LifeLine AI — Intelligent Emergency Response & Dispatch System

> **Next-Gen AI-Powered Ambulance Dispatch and Dynamic OpenStreetMap Hospital Recommendation Engine for Smart Cities.**
> 
> *Real-time traffic integration, 35/35/20/10 multi-factor AI scoring, 5-step dispatch timeline, and seamless mid-journey road rerouting.*

---

## 🌟 Overview

**LifeLine AI** is a state-of-the-art emergency dispatch and hospital recommendation platform. It transforms traditional static dispatching into a dynamic, data-driven emergency management network. By proxying real-time OpenStreetMap (OSM) data via high-availability Overpass mirrors, calculating road-snapped routes with OSRM, and tracking 5 dispatch milestones, LifeLine AI ensures emergency units reach patients and deliver them to optimal medical facilities in minimal time.

---

## 🛠️ Key Features

| Feature | Description |
|---|---|
| 🗺️ **Interactive Geo-Spatial Map** | Click anywhere on the map to drop emergency coordinates with custom Leaflet markers |
| 🏥 **Dynamic OSM Hospital Search** | Live OpenStreetMap facility retrieval with progressive radius expansion ($1\text{km} \rightarrow 3\text{km} \rightarrow 5\text{km} \rightarrow 10\text{km} \rightarrow 20\text{km} \rightarrow 50\text{km} \rightarrow 100\text{km}$) via multi-mirror Overpass proxies |
| 🏷️ **AI Recommendation Reasons** | Context-aware rationale tags (*"Fastest travel time"*, *"Cardiology unit available"*, *"Low traffic corridor"*, *"Top rated facility"*) rendered on top-ranked hospitals |
| 🚑 **Enriched Ambulance Fleet** | Road-snapped ambulance units with realistic metadata (driver name, crew size, speed km/h, equipment type `BLS`/`ALS`/`ICU`, availability status) |
| 🧠 **Multi-Factor AI Scoring** | Balanced 35% Distance + 35% Travel Time + 20% Specialty Match + 10% Rating/Availability scoring matrix |
| 📋 **5-Step Dispatch Timeline** | Live sidebar progress tracking: *Emergency Created* $\rightarrow$ *Ambulance Assigned* $\rightarrow$ *Ambulance En Route* $\rightarrow$ *Patient Picked Up* $\rightarrow$ *Reached Hospital* |
| 🛣️ **Multi-Route Road System** | Calculates Shortest (Blue), Optimal (Green), and Alternative (Purple) road geometries via OSRM and OpenRouteService |
| 🚦 **Traffic Surge Simulation** | Color-coded congestion segments with live speed ratio monitoring and manual traffic surge triggers |
| ⚡ **Seamless Mid-Journey Rerouting** | Automatically recalculates routes from current ambulance coordinates upon traffic spikes while preserving patient pickup state (zero teleportation) |
| 🚨 **Instant SOS Workflow** | Press `~` backtick hotkey or SOS button to trigger live browser geolocation, auto-select ICU/Cardiac units, and dispatch instantly |

---

## 🏗️ System Architecture

```
                               ┌────────────────────────────────┐
                               │     React 18 + Vite Frontend   │
                               │  (Leaflet, Dispatch Timeline)  │
                               └───────────────┬────────────────┘
                                               │
                                       HTTP API Requests
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │    Node.js + Express Backend   │
                               │       (Port 3001 / Render)     │
                               └───────┬───────────────┬────────┘
                                       │               │
                     Overpass API Proxies             OSRM Road Router
                     (Multi-Mirror System)          (Geometry & Routes)
                                       │               │
                                       ▼               ▼
                               ┌───────────────┐ ┌───────────────┐
                               │ OpenStreetMap │ │ OSRM Driving  │
                               │ Health Nodes  │ │ Engine        │
                               └───────────────┘ └───────────────┘
```

---

## 💻 Tech Stack

### **Frontend:**
- **Core**: React 18, Vite
- **Mapping**: Leaflet.js, React-Leaflet
- **Styling**: Vanilla CSS Design Tokens (Dark Mode, Glassmorphism, Neon Accents)
- **Typography**: Orbitron (Display), Exo 2 (Body), JetBrains Mono (Data)

### **Backend:**
- **Runtime**: Node.js, Express.js
- **External APIs**: OpenStreetMap Overpass API, OSRM Driving Router, OpenRouteService, TomTom Traffic API
- **Middleware**: CORS, Dotenv, Error Handler

---

## 📁 Repository Structure

```
lifeline-ai/
├── README.md                      # Professional Project Documentation
├── package.json                   # Root package configuration
├── .gitignore                     # Git exclusion rules
│
├── backend/                       # Express Node.js Server
│   ├── server.js                  # Main server entrypoint
│   ├── package.json               # Backend dependencies
│   ├── .env.example               # Backend environment variables
│   ├── routes/
│   │   ├── hospitals.js           # GET /api/hospitals/nearby (Overpass proxy & expansion)
│   │   ├── ambulances.js          # GET /api/ambulances (Fleet generation & scoring)
│   │   ├── route.js               # POST /api/calculate-route
│   │   └── aiDecision.js          # POST /api/ai-decision
│   └── utils/
│       └── aiEngine.js            # Server-side 35/35/20/10 AI scoring logic
│
└── frontend/                      # React + Vite Client Application
    ├── index.html                 # Entry HTML
    ├── package.json               # Frontend dependencies
    ├── vite.config.js             # Vite bundler configuration
    ├── .env.example               # Frontend environment variables
    └── src/
        ├── App.jsx                # Main orchestration & state engine
        ├── main.jsx                # React root mount
        ├── index.css              # Custom dark theme & Leaflet overrides
        ├── utils/
        │   ├── aiEngine.js        # AI scoring & recommendation reason generator
        │   ├── geoUtils.js        # Haversine distance, road snapping, backend fetcher
        │   └── trafficSimulator.js# Real-time traffic simulation
        └── components/
            ├── Header.jsx         # System status header
            ├── MapView.jsx        # Leaflet map rendering & road polylines
            ├── EmergencyInput.jsx # 8 Emergency Category selector
            ├── HospitalPanel.jsx  # AI Hospital Ranking & recommendation reasons
            ├── AmbulancePanel.jsx # Enriched ambulance unit listings
            ├── DispatchTimeline.jsx# 5-Step visual dispatch milestone tracker
            ├── RouteSelector.jsx  # Route mode toggle (Optimal vs Direct)
            ├── ControlPanel.jsx   # Traffic simulation & dispatch triggers
            ├── AlertSystem.jsx    # Live alert notifications
            ├── Dashboard.jsx      # Bottom statistics overlay
            └── SOSOverlay.jsx     # Emergency SOS confirmation overlay
```

---

## ⚙️ Environment Configuration

### Frontend (`frontend/.env.example`):
```env
# URL of the LifeLine AI Express Backend
VITE_BACKEND_URL=http://localhost:3001
```

### Backend (`backend/.env.example`):
```env
# Server Port
PORT=3001
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v8.0.0` or higher

### 1. Clone the Repository
```bash
git clone https://github.com/sharathkudachi/Lifeline-AI.git
cd Lifeline-AI
```

### 2. Setup & Start Backend
```bash
cd backend
npm install
npm run dev
# Backend server runs at http://localhost:3001
```

### 3. Setup & Start Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
# Application UI runs at http://localhost:3000
```

### 4. Open in Browser
Visit **`http://localhost:3000`** in your browser.

---

## 🔌 API Endpoints Reference

### 1. `GET /api/hospitals/nearby?lat={lat}&lng={lng}`
Proxies OpenStreetMap Overpass API across multiple high-availability mirrors with progressive search expansion ($1\text{km} \rightarrow 100\text{km}$).
```json
{
  "hospitals": [
    {
      "id": 6938690199,
      "name": "Mission Hospital",
      "lat": 13.0744,
      "lng": 77.7835,
      "type": "Multi-Specialty",
      "capability": 80,
      "beds": 352,
      "cardiac": true,
      "trauma": true,
      "rating": 4.7
    }
  ],
  "count": 1,
  "radiusUsed": 3000
}
```

### 2. `GET /api/ambulances?lat={lat}&lng={lng}&emergencyType={type}`
Generates road-snapped ambulance units enriched with driver, crew, speed, equipment type, and AI score.

### 3. `POST /api/hospitals/rank`
Ranks provided hospitals against emergency location using 35/35/20/10 AI weights.

### 4. `GET /health`
Returns service status OK.

---

## 🌐 Production Deployment Guide

### Deploying Frontend to Vercel:
1. Connect repository to **Vercel**.
2. Set Root Directory to `frontend`.
3. Add Environment Variable:
   `VITE_BACKEND_URL` = `https://your-backend.onrender.com`
4. Deploy!

### Deploying Backend to Render:
1. Create a new Web Service on **Render**.
2. Set Root Directory to `backend`.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Deploy!

---
## 📸 Interface Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/05de47ad-c76f-49f8-8e44-f1710f3fcaf8" alt="LifeLine AI Interface" width="900"/>
</p>

## 🔮 Future Enhancements

- 🚁 **Air Ambulance Integration**: Helicopter dispatch for rural or remote emergency locations.
- 📱 **Mobile Native App (React Native)**: Patient & Paramedic dedicated mobile interfaces.
- 🚦 **IoT Traffic Light Control**: Direct integration with smart traffic light sensors for green-wave priority corridor automation.

---

## 📄 License

This project is licensed under the **MIT License** — see the `LICENSE` file for details.

*Built for Smart City Innovation & Hackathon Excellence — LifeLine AI*
