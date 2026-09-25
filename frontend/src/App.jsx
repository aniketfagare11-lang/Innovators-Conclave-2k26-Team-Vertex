import React, { useState, useEffect, useRef, useCallback } from 'react';
import MapView from './components/MapView';
import Header from './components/Header';
import EmergencyInput from './components/EmergencyInput';
import AmbulancePanel from './components/AmbulancePanel';
import HospitalPanel from './components/HospitalPanel';
import RouteSelector from './components/RouteSelector';
import RightAIPanel from './components/RightAIPanel';
import ControlPanel from './components/ControlPanel';
import AlertSystem from './components/AlertSystem';
import SOSOverlay from './components/SOSOverlay';
import DispatchTimeline from './components/DispatchTimeline';
import AnalyticsPanel from './components/AnalyticsPanel';
import DemoOverlay from './components/DemoOverlay';


import { scoreAmbulance, scoreHospital } from './utils/aiEngine';
import {
  generateRoadAmbulances,
  generateDualRoutes, rerouteFromPosition,
  getPickupIndex, calculateDistance,
  fetchHospitalsFromBackend,
} from './utils/geoUtils';
import {
  generateTrafficConditions,
  generateTrafficSegments, shouldReroute,
  fetchRealTimeTraffic, fetchFlowSegment, levelFromFlowSegment, TRAFFIC_LEVELS,
} from './utils/trafficSimulator';

import {
  createTrafficState,
  triggerTrafficSpike,
  getRouteTraffic,
  adaptStateToLegacyConditions
} from './utils/trafficIntelligence';

import {
  createIncident,
  getIncidentImpact,
  applyIncidentImpact,
  INCIDENT_STATUS
} from './utils/incidentManager';

import {
  predictFutureTraffic,
  appendTrafficHistory
} from './utils/aiTrafficPrediction';

import { rankRoutes } from './utils/routeScoring';
import { evaluateReroute, formatRerouteTimelineEvent, REROUTE_CONFIG } from './utils/reroutingEngine';

import {
  generateCorridorIntersections,
  updateCorridorStatus
} from './utils/emergencyCorridor';

// â”€â”€â”€ App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  // â”€â”€ Core state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [phase, setPhase]                           = useState('idle');
  const [emergencyLocation, setEmergencyLocation]   = useState(null);
  const [emergencyType, setEmergencyType]           = useState('Accident');

  // â”€â”€ Ambulances â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [ambulances, setAmbulances]                 = useState([]);
  const [selectedAmbulance, setSelectedAmbulance]   = useState(null);

  // â”€â”€ Hospitals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [localHospitals, setLocalHospitals]         = useState([]);
  const [hospitalLoading, setHospitalLoading]        = useState(false);
  const [rankedHospitals, setRankedHospitals]       = useState([]);
  const [selectedHospital, setSelectedHospital]     = useState(null);

  // â”€â”€ Route & animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // shortestRoute = blue (normal/fewest km), optimalRoute = green (traffic-avoiding), alternativeRoute = purple
  const [shortestRoute, setShortestRoute]           = useState([]);
  const [optimalRoute, setOptimalRoute]             = useState([]);
  const [alternativeRoute, setAlternativeRoute]     = useState([]);
  const [routeMetrics, setRouteMetrics]             = useState({ normal: null, optimal: null, alternative: null });
  const [activeRouteType, setActiveRouteType]       = useState('optimal');
  const [route, setRoute]                           = useState([]);         // active animated route
  const [alternateRoutes, setAlternateRoutes]       = useState([]);
  const [ambulancePosition, setAmbulancePosition]   = useState(null);
  const [routeProgress, setRouteProgress]           = useState(0);
  const [pickupIndex, setPickupIndex]               = useState(0);
  const [trafficSegments, setTrafficSegments]       = useState([]);

  // â”€â”€ Traffic & mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [trafficEnabled, setTrafficEnabled]         = useState(true);
  const [emergencyMode, setEmergencyMode]           = useState(false);
  const [globalTrafficState, setGlobalTrafficState] = useState(createTrafficState(0.0));
  const [trafficConditions, setTrafficConditions]   = useState({});
  const [routeTrafficInfo, setRouteTrafficInfo]     = useState(null);
  
  // â”€â”€ Incidents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [incidents, setIncidents]                   = useState([]);
  const [incidentImpactInfo, setIncidentImpactInfo] = useState(null);

  // â”€â”€ AI Prediction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [trafficHistory, setTrafficHistory]         = useState([createTrafficState(0.0)]);
  const [trafficPrediction, setTrafficPrediction]   = useState(null);
  
  // â”€â”€ AI Route Scoring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [scoredRoutes, setScoredRoutes]             = useState([]);

  // â”€â”€ Emergency Corridor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [corridorActive, setCorridorActive]         = useState(false);
  const [corridorIntersections, setCorridorIntersections] = useState([]);

  const [simulationSpeed, setSimulationSpeed]       = useState(60);

  // â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [eta, setEta]                               = useState(null);
  const [distance, setDistance]                     = useState(null);
  const [normalTime, setNormalTime]                 = useState(null);
  const [optimizedTime, setOptimizedTime]           = useState(null);

  // â”€â”€ Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [alerts, setAlerts]                         = useState([]);

  // â”€â”€ Clock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [currentTime, setCurrentTime]               = useState('');

  // â”€â”€ Route mode (â€˜optimalâ€™ = auto-rerouting, â€˜normalâ€™ = direct) â”€â”€â”€â”€â”€â”€â”€
  const [routeMode, setRouteMode]                   = useState('optimal');

  // â”€â”€ Rerouting state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [rerouteCount, setRerouteCount]             = useState(0);
  const [lastRerouteTime, setLastRerouteTime]       = useState(0);
  const [rerouteStatus, setRerouteStatus]           = useState('STABLE âœ“');

  // â”€â”€ Presentation Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [presentationMode, setPresentationMode]     = useState(true);
  const [simControlsOpen, setSimControlsOpen]       = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded]   = useState(false);


  // â”€â”€ Dispatch Timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const TIMELINE_STEPS = [
    { key: 'created',   icon: 'ðŸš¨', label: 'Emergency Created' },
    { key: 'assigned',  icon: 'ðŸš‘', label: 'Ambulance Assigned' },
    { key: 'enroute',   icon: 'ðŸ“', label: 'Ambulance En Route' },
    { key: 'pickup',    icon: 'ðŸ‘¤', label: 'Patient Picked Up' },
    { key: 'arrived',   icon: 'ðŸ¥', label: 'Reached Hospital' },
  ];
  const [dispatchTimeline, setDispatchTimeline]      = useState([]);

  // â”€â”€ Refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const animRef            = useRef(null);
  const routeRef           = useRef([]);
  const idxRef             = useRef(0);
  const etaBaseRef         = useRef(0);
  const rerouteTimerRef    = useRef(null);
  const trafficTimerRef    = useRef(null);
  const patientPickedUpRef = useRef(false);
  const pickupIndexRef     = useRef(0);
  const corridorActiveRef  = useRef(false);

  // â”€â”€ DEMO MODE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [demoActive, setDemoActive] = useState(false);
  const [demoMode, setDemoMode] = useState('JUDGE'); // 'JUDGE' | 'LIVE'
  const [demoPhase, setDemoPhase] = useState('IDLE');
  const demoPhaseRef = useRef('IDLE');
  const [demoNextPhase, setDemoNextPhase] = useState('EMERGENCY_CREATED');
  const [demoProgress, setDemoProgress] = useState(0);

  // â”€â”€ Clock tick â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // â”€â”€ Alert helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addAlert = useCallback((message, type = 'info') => {
    const alert = { id: Date.now() + Math.random(), message, type, time: new Date().toLocaleTimeString('en-IN') };
    setAlerts(prev => [alert, ...prev].slice(0, 8));
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // â”€â”€ Rank helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rankAmbulances = useCallback((ambs, loc, traffic, eMode) => {
    return [...ambs].map(a => ({
      ...a,
      score:            scoreAmbulance(a, loc, traffic, eMode),
      distance:         parseFloat(calculateDistance(a.lat, a.lng, loc.lat, loc.lng).toFixed(2)),
      estimatedArrival: parseFloat(((calculateDistance(a.lat, a.lng, loc.lat, loc.lng) / 40) * 60).toFixed(1)),
    })).sort((a, b) => b.score - a.score);
  }, []);

  const rankHospitals = useCallback((hospList, loc, eType, traffic, eMode) => {
    return hospList.map(h => {
      const r = scoreHospital(h, loc, eType, traffic, eMode);
      return { ...h, ...r };
    }).sort((a, b) => b.score - a.score);
  }, []);

  // â”€â”€ Map click â†’ set emergency â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleMapClick = useCallback(async (latlng) => {
    if (phase !== 'idle' && phase !== 'located') return;
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }

    const loc = { lat: latlng.lat, lng: latlng.lng };
    setEmergencyLocation(loc);
    setPhase('located');
    setRoute([]); setAlternateRoutes([]);
    setAmbulancePosition(null); setRouteProgress(0);
    setEta(null); setDistance(null);
    setNormalTime(null); setOptimizedTime(null);

    // Initialize dispatch timeline â€” step 1: Emergency Created
    const now = new Date().toLocaleTimeString('en-IN');
    setDispatchTimeline([
      { key: 'created', icon: 'ðŸš¨', label: 'Emergency Created', time: now, done: true, active: false },
      { key: 'assigned', icon: 'ðŸš‘', label: 'Ambulance Assigned', time: null, done: false, active: false },
      { key: 'enroute', icon: 'ðŸ“', label: 'Ambulance En Route', time: null, done: false, active: false },
      { key: 'pickup', icon: 'ðŸ‘¤', label: 'Patient Picked Up', time: null, done: false, active: false },
      { key: 'arrived', icon: 'ðŸ¥', label: 'Reached Hospital', time: null, done: false, active: false },
    ]);

    addAlert('ðŸ” Fetching nearby hospitals from OpenStreetMap...', 'info');
    setHospitalLoading(true);

    // Parallel fetch: hospitals (via backend) + real traffic
    const [fetchedHospitals, realTraffic] = await Promise.all([
      fetchHospitalsFromBackend(loc.lat, loc.lng),
      fetchRealTimeTraffic(loc.lat, loc.lng),
    ]);

    setHospitalLoading(false);

    // If no hospitals at all, bail gracefully
    if (!fetchedHospitals || fetchedHospitals.length === 0) {
      addAlert('⚠️ Could not load hospitals — please try again', 'warning');
      setLocalHospitals([]);
      setRankedHospitals([]);
      setSelectedHospital(null);
      setAmbulances([]);
      setSelectedAmbulance(null);
      return;
    }

    // Notify if offline fallback data is used
    if (fetchedHospitals[0]?.isFallback) {
      addAlert('📡 Using offline hospital data (live OSM unavailable)', 'warning');
    }

    setLocalHospitals(fetchedHospitals);

    // Road-snapped ambulances near found hospitals
    addAlert('ðŸ“ Snapping ambulance positions to road network...', 'info');
    const newAmbs = await generateRoadAmbulances(loc.lat, loc.lng, 6, fetchedHospitals);

    // Traffic conditions (Normalized Intelligence Layer)
    const baseState = createTrafficState(0.0, realTraffic && Object.keys(realTraffic).length > 0 ? realTraffic : null);
    setGlobalTrafficState(baseState);
    const newHist = [baseState];
    setTrafficHistory(newHist);
    setTrafficPrediction(predictFutureTraffic(newHist, [], 15));
    
    const traffic = adaptStateToLegacyConditions(baseState, newAmbs, fetchedHospitals);
    setTrafficConditions(traffic);

    // AI scoring
    const scored = rankAmbulances(newAmbs, loc, traffic, emergencyMode);
    setAmbulances(scored);
    setSelectedAmbulance(scored[0]);

    // Mark timeline step 2: Ambulance Assigned
    const assignTime = new Date().toLocaleTimeString('en-IN');
    setDispatchTimeline(prev => prev.map(s =>
      s.key === 'assigned' ? { ...s, done: true, active: false, time: assignTime } : s
    ));

    const rankedH = rankHospitals(fetchedHospitals, loc, emergencyType, traffic, emergencyMode);
    setRankedHospitals(rankedH.slice(0, 3));
    setSelectedHospital(rankedH[0]);

    const preEta = scored[0].estimatedArrival + (rankedH[0].estimatedTime || 5);
    setEta(preEta);

    addAlert('ðŸ†˜ Emergency location set! AI analyzing situation...', 'danger');
    setTimeout(() => addAlert(`ðŸš‘ AI selected: ${scored[0].name} (Score: ${scored[0].score.toFixed(0)})`, 'success'), 700);
    setTimeout(() => addAlert(`ðŸ¥ Recommended: ${rankedH[0].name} â€” ${rankedH[0].type}`, 'info'), 1400);
  }, [phase, emergencyMode, emergencyType, rankAmbulances, rankHospitals, addAlert]);


  // â”€â”€ Core dispatch engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const executeDispatch = useCallback(async (loc, amb, hosp, traffic, mode, eType, startIdx = 0, currentRouteMode) => {
    if (!loc || !amb || !hosp) return;

    // Use explicitly passed routeMode to avoid stale closure issues
    const activeMode = currentRouteMode ?? routeMode;

    const from    = [amb.lat, amb.lng];
    const through = [loc.lat, loc.lng];
    const to      = [hosp.lat, hosp.lng];

    addAlert('ðŸ“¡ Calculating road routes...', 'info');

    // Fetch all three routes simultaneously
    const { shortest, optimal, alternative, metrics } = await generateDualRoutes(from, through, to);

    // Validate routes â€” reject if they look like straight lines (too few points)
    const validShortest     = shortest     && shortest.length     > 10 ? shortest     : null;
    const validOptimal      = optimal      && optimal.length      > 10 ? optimal      : null;
    const validAlternative  = alternative  && alternative.length  > 10 ? alternative  : null;

    // If both failed, retry once
    let finalShortest    = validShortest;
    let finalOptimal     = validOptimal;
    let finalAlternative = validAlternative;
    if (!finalShortest || !finalOptimal) {
      addAlert('âš ï¸ Route API slow â€” retrying...', 'warning');
      const retry = await generateDualRoutes(from, through, to);
      finalShortest    = finalShortest    || (retry.shortest?.length     > 10 ? retry.shortest     : null);
      finalOptimal     = finalOptimal     || (retry.optimal?.length      > 10 ? retry.optimal      : null);
      finalAlternative = finalAlternative || (retry.alternative?.length  > 10 ? retry.alternative  : null);
    }

    if (!finalShortest && finalOptimal) finalShortest = finalOptimal;
    if (!finalOptimal  && finalShortest) finalOptimal  = finalShortest;
    if (!finalAlternative) finalAlternative = finalOptimal;

    // Store real metrics from routing APIs
    setRouteMetrics(metrics || { normal: null, optimal: null, alternative: null });

    // Step 9: Use new Route Scoring Engine
    const context = {
      globalTrafficState,
      incidents,
      trafficPrediction
    };
    const candidates = [];
    if (finalOptimal) candidates.push({ id: 'optimal', waypoints: finalOptimal, distanceKm: metrics?.optimal?.distanceKm, durationMin: metrics?.optimal?.durationMin });
    if (finalShortest) candidates.push({ id: 'normal', waypoints: finalShortest, distanceKm: metrics?.normal?.distanceKm, durationMin: metrics?.normal?.durationMin });
    if (finalAlternative) candidates.push({ id: 'alternative', waypoints: finalAlternative, distanceKm: metrics?.alternative?.distanceKm, durationMin: metrics?.alternative?.durationMin });

    const ranked = rankRoutes(candidates, context);
    setScoredRoutes(ranked);

    // Pick recommended if no mode explicitly provided
    let bestId = ranked.length > 0 ? ranked[0].id : 'optimal';
    const activeModeResolved = currentRouteMode ?? bestId;

    const activeScored = ranked.find(r => r.id === activeModeResolved);
    const activeRoute = activeScored ? activeScored.originalRoute : (finalOptimal || finalShortest);

    const pIdx = getPickupIndex(activeRoute);

    routeRef.current           = activeRoute;
    idxRef.current             = startIdx;
    pickupIndexRef.current     = pIdx;
    patientPickedUpRef.current = false;

    setShortestRoute(finalShortest || []);
    setOptimalRoute(finalOptimal || []);
    setAlternativeRoute(finalAlternative || []);
    setRoute(activeRoute);
    setAlternateRoutes([]);
    setActiveRouteType(activeModeResolved);
    setRouteMode(activeModeResolved);
    setAmbulancePosition(activeRoute[startIdx]);
    setPickupIndex(pIdx);
    setRouteProgress(0);
    setPhase('enroute');
    setTrafficSegments(generateTrafficSegments(activeRoute, traffic, mode));
    
    // Evaluate normalized route traffic assessment
    let assessment = getRouteTraffic(activeRoute, globalTrafficState);
    const impact = getIncidentImpact(activeRoute, incidents);
    setIncidentImpactInfo(impact);
    assessment = applyIncidentImpact(assessment, impact);
    setRouteTrafficInfo(assessment);

    const distAmbToEmerg  = calculateDistance(amb.lat, amb.lng, loc.lat, loc.lng);
    const distEmergToHosp = calculateDistance(loc.lat, loc.lng, hosp.lat, hosp.lng);
    const totalDist = distAmbToEmerg + distEmergToHosp;
    setDistance(totalDist.toFixed(2));

    const normalMin = (totalDist / 35) * 60;
    const optMin    = normalMin * (mode ? 0.58 : 0.78);
    setNormalTime(normalMin.toFixed(1));
    setOptimizedTime(optMin.toFixed(1));
    etaBaseRef.current = optMin;

    if (startIdx === 0) {
      addAlert(`ðŸš‘ ${amb.name} dispatched â€” ${activeMode.toUpperCase()} route active!`, 'success');
      addAlert(`ðŸ›£ï¸ ${activeMode === 'normal' ? 'Direct route â€” no rerouting' : activeMode === 'alternative' ? 'Alternative path active' : 'Optimal route â€” auto-rerouting enabled'}`, 'info');
      if (mode) addAlert('ðŸš¨ Signal override ACTIVE â€” all lights cleared', 'danger');
      addAlert(`ðŸ“ En route to ${hosp.name}`, 'info');
      // Timeline step 3: Ambulance En Route
      const enrouteTime = new Date().toLocaleTimeString('en-IN');
      setDispatchTimeline(prev => prev.map(s =>
        s.key === 'enroute' ? { ...s, done: true, active: true, time: enrouteTime } : s
      ));
    } else {
      addAlert('ðŸ”„ Traffic rerouted â€” ambulance on new road path', 'success');
    }

    const realDurMs  = optMin * 60 * 1000;
    const animDurMs  = realDurMs / simulationSpeed;

    if (animRef.current) clearInterval(animRef.current);
    animRef.current = setInterval(() => {
      // Pause movement during demo until explicitly in AMBULANCE_MOVING or later
      if (presentationMode) {
        const step = DEMO_STEPS.indexOf(demoPhaseRef.current);
        const movingStep = DEMO_STEPS.indexOf('AMBULANCE_MOVING');
        if (step > 0 && step < movingStep) {
           return; // Skip animation tick
        }
      }

      idxRef.current++;
      const idx = idxRef.current;
      const currentRoute = routeRef.current;
      const totalPts = currentRoute.length;
      const targetPickupIdx = pickupIndexRef.current;
      const intervalMs = Math.max(40, animDurMs / totalPts);

      if (idx >= totalPts - 1) {
        clearInterval(animRef.current); animRef.current = null;
        if (rerouteTimerRef.current) clearInterval(rerouteTimerRef.current);
        if (trafficTimerRef.current) clearInterval(trafficTimerRef.current);
        setAmbulancePosition(currentRoute[totalPts - 1]);
        setRouteProgress(100);
        setEta(0);
        setPhase('arrived');
        // Timeline step 5: Reached Hospital
        const arrivedTime = new Date().toLocaleTimeString('en-IN');
        setDispatchTimeline(prev => prev.map(s =>
          s.key === 'arrived' ? { ...s, done: true, active: false, time: arrivedTime }
          : s.key === 'enroute' ? { ...s, active: false } : s
        ));
        addAlert(`âœ… Ambulance arrived at ${hosp.name}!`, 'success');
        addAlert('ðŸ“‹ Patient handover complete â€” case closed', 'info');
        return;
      }

      setAmbulancePosition(currentRoute[idx]);
      setRouteProgress(Math.min(99, Math.floor((idx / totalPts) * 100)));
      setEta(etaBaseRef.current * Math.max(0, 1 - idx / totalPts));
      
      if (corridorActiveRef.current) {
        setCorridorIntersections(prev => updateCorridorStatus(prev, currentRoute[idx]));
      }

      if (idx === Math.floor(totalPts * 0.3) && !patientPickedUpRef.current)  addAlert('ðŸš‘ Approaching patient pickup point', 'info');
      if (idx >= targetPickupIdx && !patientPickedUpRef.current) {
        patientPickedUpRef.current = true;
        addAlert('ðŸ‘¤ Patient on board â€” heading to hospital', 'success');
        // Timeline step 4: Patient Picked Up
        const pickupTime = new Date().toLocaleTimeString('en-IN');
        setDispatchTimeline(prev => prev.map(s =>
          s.key === 'pickup' ? { ...s, done: true, active: false, time: pickupTime } : s
        ));
      }
      if (idx === Math.floor(totalPts * 0.75) && patientPickedUpRef.current) addAlert('ðŸ¥ Approaching hospital â€” prepare ER team', 'warning');
    }, Math.max(40, (optMin * 60 * 1000 / simulationSpeed) / (activeRoute.length || 50)));
  }, [simulationSpeed, addAlert, routeMode]);


  // â”€â”€ Preview both routes when hospital/ambulance selected â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const previewRoutesRef = useRef(null);
  useEffect(() => {
    if (phase !== 'located' || !selectedAmbulance || !selectedHospital || !emergencyLocation) return;
    // Debounce to avoid firing on every render
    if (previewRoutesRef.current) clearTimeout(previewRoutesRef.current);
    previewRoutesRef.current = setTimeout(async () => {
      const from    = [selectedAmbulance.lat, selectedAmbulance.lng];
      const through = [emergencyLocation.lat, emergencyLocation.lng];
      const to      = [selectedHospital.lat, selectedHospital.lng];
      const { shortest, optimal, alternative, metrics } = await generateDualRoutes(from, through, to);
      if (shortest?.length    > 10) setShortestRoute(shortest);
      if (optimal?.length     > 10) setOptimalRoute(optimal);
      if (alternative?.length > 10) setAlternativeRoute(alternative);
      if (metrics) setRouteMetrics(metrics);
      
      // Score routes immediately so they show in UI before dispatch
      const context = { globalTrafficState, incidents, trafficPrediction };
      const candidates = [];
      if (optimal?.length > 10) candidates.push({ id: 'optimal', waypoints: optimal, distanceKm: metrics?.optimal?.distanceKm, durationMin: metrics?.optimal?.durationMin });
      if (shortest?.length > 10) candidates.push({ id: 'normal', waypoints: shortest, distanceKm: metrics?.normal?.distanceKm, durationMin: metrics?.normal?.durationMin });
      if (alternative?.length > 10) candidates.push({ id: 'alternative', waypoints: alternative, distanceKm: metrics?.alternative?.distanceKm, durationMin: metrics?.alternative?.durationMin });
      
      const ranked = rankRoutes(candidates, context);
      setScoredRoutes(ranked);
    }, 400);
    return () => clearTimeout(previewRoutesRef.current);
  }, [phase, selectedAmbulance, selectedHospital, emergencyLocation, globalTrafficState, incidents, trafficPrediction]);

  // â”€â”€ Manual dispatch wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDispatch = useCallback(() => {
    setRerouteCount(0);
    executeDispatch(emergencyLocation, selectedAmbulance, selectedHospital, trafficConditions, emergencyMode, emergencyType, 0, routeMode);
  }, [emergencyLocation, selectedAmbulance, selectedHospital, trafficConditions, emergencyMode, emergencyType, executeDispatch, routeMode]);

  // â”€â”€ Seamless rerouting helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const performReroute = useCallback(async (conditions, force = false, triggerReason = '') => {
    if (phase !== 'enroute' || !selectedHospital) return;

    // Check cooldown unless forced
    const nowMs = Date.now();
    if (!force && nowMs - lastRerouteTime < REROUTE_CONFIG.COOLDOWN_MS) {
       return; // Cooldown active
    }

    const currentIdx = idxRef.current;
    const currentRoute = routeRef.current;
    if (!currentRoute || currentIdx < 0 || currentIdx >= currentRoute.length) return;

    const currentPos = currentRoute[currentIdx];
    if (!currentPos) return;

    addAlert('âš ï¸ Evaluating route alternatives...', 'info');

    const isPickedUp = patientPickedUpRef.current || currentIdx >= pickupIndexRef.current;
    let newRemainingPath = null;
    let newActiveType = activeRouteType;
    let metricsData = null;

    if (isPickedUp) {
      // Patient already picked up: route directly from current ambulance position to hospital
      const rerouteData = await rerouteFromPosition(currentPos, [selectedHospital.lat, selectedHospital.lng]);
      newRemainingPath = rerouteData?.primary;
    } else if (emergencyLocation) {
      // Patient not yet picked up: route from current position through emergency location to hospital
      const dual = await generateDualRoutes(currentPos, [emergencyLocation.lat, emergencyLocation.lng], [selectedHospital.lat, selectedHospital.lng]);
      
      const context = { globalTrafficState, incidents, trafficPrediction };
      const candidates = [];
      if (dual.optimal) candidates.push({ id: 'optimal', waypoints: dual.optimal, distanceKm: dual.metrics?.optimal?.distanceKm, durationMin: dual.metrics?.optimal?.durationMin });
      if (dual.shortest) candidates.push({ id: 'normal', waypoints: dual.shortest, distanceKm: dual.metrics?.normal?.distanceKm, durationMin: dual.metrics?.normal?.durationMin });
      if (dual.alternative) candidates.push({ id: 'alternative', waypoints: dual.alternative, distanceKm: dual.metrics?.alternative?.distanceKm, durationMin: dual.metrics?.alternative?.durationMin });
      
      if (candidates.length > 0) {
        const ranked = rankRoutes(candidates, context);
        setScoredRoutes(ranked); // Update UI
        
        const evalResult = evaluateReroute(ranked, activeRouteType);
        setRerouteStatus(evalResult.status || 'STABLE âœ“');
        
        if (!evalResult.shouldReroute && !force) {
          // No significant improvement, stay on current route
          addAlert(`â„¹ï¸ Reroute skipped: ${evalResult.reason}`, 'info');
          return;
        }
        
        // We are rerouting!
        newActiveType = evalResult.newRecommendedId;
        newRemainingPath = ranked.find(r => r.id === newActiveType)?.originalRoute;
        
        const reasonMsg = force ? `Forced: ${triggerReason}` : evalResult.reason;
        addAlert(`ðŸ”„ REROUTING: ${reasonMsg}`, 'success');
        
        // Record in timeline
        setDispatchTimeline(prev => [...prev, formatRerouteTimelineEvent(activeRouteType, newActiveType, evalResult.improvement || 0)]);
      }
    }

    if (!Array.isArray(newRemainingPath) || newRemainingPath.length < 2) {
       addAlert('âš ï¸ REROUTE FAILED: Continuing on current route.', 'warning');
       return;
    }

    setRerouteCount(c => c + 1);
    setLastRerouteTime(Date.now());
    setActiveRouteType(newActiveType);
    setRouteMode(newActiveType);

    // Preserve already traveled path and splice new remaining path onto it
    const traveledPath = currentRoute.slice(0, currentIdx + 1);
    const splicedRoute = [...traveledPath, ...newRemainingPath.slice(1)];

    routeRef.current = splicedRoute;
    // idxRef.current remains at currentIdx â€” seamless continuation without teleporting!

    setOptimalRoute(splicedRoute);
    setRoute(splicedRoute);
    setTrafficSegments(generateTrafficSegments(splicedRoute, conditions || trafficConditions, emergencyMode));
    
    if (corridorActiveRef.current) {
      setCorridorIntersections(generateCorridorIntersections(splicedRoute, 0.4));
      addAlert('ðŸ”„ Corridor regenerated for new road path', 'info');
    }
    
    // Re-evaluate assessment on new route
    let assessment = getRouteTraffic(splicedRoute, globalTrafficState);
    const impact = getIncidentImpact(splicedRoute, incidents);
    setIncidentImpactInfo(impact);
    assessment = applyIncidentImpact(assessment, impact);
    setRouteTrafficInfo(assessment);

    const newOptMin = etaBaseRef.current * 0.85;
    etaBaseRef.current = newOptMin;

    addAlert('âœ… New road route calculated from current position â€” seamless reroute applied', 'success');
  }, [phase, selectedHospital, emergencyLocation, trafficConditions, emergencyMode, addAlert]);

  // â”€â”€ Auto-rerouting engine â€” only runs in 'optimal' mode â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    // Skip rerouting entirely in Normal mode
    if (phase !== 'enroute' || routeMode !== 'optimal') {
      if (rerouteTimerRef.current) clearInterval(rerouteTimerRef.current);
      return;
    }

    rerouteTimerRef.current = setInterval(async () => {
      const conditions = trafficConditions;
      const progress   = Math.floor(idxRef.current / (routeRef.current.length || 1) * 100);
      if (!shouldReroute(conditions, progress)) return;
      if (rerouteCount >= 3) return;

      await performReroute(conditions);
    }, 30000);

    return () => clearInterval(rerouteTimerRef.current);
  }, [phase, routeMode, trafficConditions, rerouteCount, performReroute]);


  // â”€â”€ Real-time traffic refresh every 60s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (phase === 'idle') return;
    trafficTimerRef.current = setInterval(async () => {
      if (!emergencyLocation) return;

      // Fetch new incident conditions
      const realTraffic = await fetchRealTimeTraffic(emergencyLocation.lat, emergencyLocation.lng);
      const newConditions = generateTrafficConditions(ambulances, localHospitals, undefined, realTraffic);
      setTrafficConditions(newConditions);

      if (phase === 'enroute' && route.length > 4) {
        // For each of 8 sample points along the route, get real speed ratio from TomTom
        const sampleCount = 8;
        const samplePoints = Array.from({ length: sampleCount }, (_, i) => {
          const idx = Math.floor((i / sampleCount) * route.length);
          return route[idx];
        });

        const flowResults = await Promise.all(
          samplePoints.map(pt => fetchFlowSegment(pt[0], pt[1]))
        );

        // Build a rich per-segment traffic array from actual road speed ratios
        const segLen = Math.floor(route.length / sampleCount);
        const richSegments = samplePoints.map((pt, i) => {
          const start = i * segLen;
          const end   = Math.min(start + segLen + 1, route.length);
          const lvl   = emergencyMode ? 'LOW' : levelFromFlowSegment(flowResults[i]);
          const info  = TRAFFIC_LEVELS[lvl];
          return { positions: route.slice(start, end), level: lvl, color: info.color, weight: info.weight };
        });

        setTrafficSegments(richSegments);
        addAlert('ðŸ”„ Real-time traffic data refreshed', 'info');
      }
    }, 60000);
    return () => clearInterval(trafficTimerRef.current);
  }, [phase, emergencyLocation, ambulances, localHospitals, emergencyMode, route, addAlert]);

  // â”€â”€ Select alternate route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSelectAlternate = useCallback((altIdx) => {
    const alt = alternateRoutes[altIdx];
    if (!alt) return;
    const newRoute = alt.waypoints;
    setRoute(newRoute);
    setAlternateRoutes(prev => prev.filter((_, i) => i !== altIdx));
    setTrafficSegments(generateTrafficSegments(newRoute, trafficConditions, emergencyMode));
    routeRef.current = newRoute;
    idxRef.current   = 0;
    addAlert(`â†ª Switched to alternate route ${altIdx + 1}`, 'success');
  }, [alternateRoutes, trafficConditions, emergencyMode, addAlert]);

  // â”€â”€ SOS Automation (Backtick hotkey) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const triggerSOS = useCallback(async () => {
    if (phase !== 'idle' && phase !== 'located') {
      addAlert('âš ï¸ Cannot trigger SOS while simulation is already active.', 'warning');
      return;
    }
    if (!navigator.geolocation) {
      addAlert('âŒ Geolocation not supported by your browser', 'danger');
      return;
    }

    // Get location first, then show overlay
    navigator.geolocation.getCurrentPosition(async (position) => {
      if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }

      const loc   = { lat: position.coords.latitude, lng: position.coords.longitude };
      const eType = 'Cardiac Arrest';
      const eMode = true;

      // Pre-fetch data while overlay is shown
      addAlert('ðŸš¨ SOS INITIATED â€” retrieving location...', 'danger');

      const [fetchedHospitals, realTraffic] = await Promise.all([
        fetchHospitalsFromBackend(loc.lat, loc.lng),
        fetchRealTimeTraffic(loc.lat, loc.lng),
      ]);
      // No static fallback â€” SOS with no hospitals will show a warning
      const hospitals = fetchedHospitals?.length > 0 ? fetchedHospitals : [];
      if (hospitals.length === 0) {
        addAlert('âš ï¸ SOS: No hospitals found nearby â€” location may be remote', 'warning');
      }
      const newAmbs   = await generateRoadAmbulances(loc.lat, loc.lng, 6, hospitals);
      const traffic   = generateTrafficConditions(newAmbs, hospitals, undefined, realTraffic);
      const scoredAmbs  = rankAmbulances(newAmbs, loc, traffic, eMode);
      const scoredHosps = rankHospitals(hospitals, loc, eType, traffic, eMode);

      // Store pending dispatch args and show overlay
      sosPendingRef.current = { loc, eType, eMode, hospitals, newAmbs, traffic, scoredAmbs, scoredHosps };
      setSosVisible(true);
    }, (err) => {
      addAlert('âŒ Failed to get live location: ' + err.message, 'danger');
    });
  }, [phase, rankAmbulances, rankHospitals, addAlert]);

  const handleSOSConfirm = useCallback(() => {
    setSosVisible(false);
    const p = sosPendingRef.current;
    if (!p) return;
    const { loc, eType, eMode, hospitals, newAmbs, traffic, scoredAmbs, scoredHosps } = p;
    sosPendingRef.current = null;

    setEmergencyLocation(loc);
    setPhase('located');
    setEmergencyType(eType);
    setEmergencyMode(eMode);
    setRoute([]); setAlternateRoutes([]);
    setAmbulancePosition(null); setRouteProgress(0);
    setEta(null); setDistance(null);
    setRerouteCount(0);
    setLocalHospitals(hospitals);
    setTrafficConditions(traffic);
    setAmbulances(scoredAmbs);
    setSelectedAmbulance(scoredAmbs[0]);
    setRankedHospitals(scoredHosps.slice(0, 3));
    setSelectedHospital(scoredHosps[0]);

    addAlert('ðŸš¨ SOS confirmed â€” dispatching emergency services!', 'danger');
    executeDispatch(loc, scoredAmbs[0], scoredHosps[0], traffic, eMode, eType, 0, 'optimal');
  }, [executeDispatch, addAlert]);

  const handleSOSCancel = useCallback(() => {
    setSosVisible(false);
    sosPendingRef.current = null;
    addAlert('âœ… SOS cancelled â€” false alarm cleared', 'info');
  }, [addAlert]);

  // Global backtick key listener for SOS
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === '`') triggerSOS();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSOS]);

  // â”€â”€ Emergency mode toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleEmergencyModeToggle = useCallback((val) => {
    setEmergencyMode(val);
    addAlert(val ? 'ðŸš¨ Emergency Priority Mode activated' : 'â„¹ï¸ Emergency mode deactivated', val ? 'danger' : 'info');
    if (emergencyLocation && phase === 'located') {
      const newH = rankHospitals(localHospitals, emergencyLocation, emergencyType, trafficConditions, val);
      setRankedHospitals(newH.slice(0, 3));
      setSelectedHospital(h => newH.find(n => n.id === h?.id) || newH[0]);
      setAmbulances(rankAmbulances(ambulances, emergencyLocation, trafficConditions, val));
    }
  }, [emergencyLocation, phase, emergencyType, trafficConditions, ambulances, localHospitals, rankHospitals, rankAmbulances, addAlert]);

  // â”€â”€ Traffic spike â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSimulateTraffic = useCallback(() => {
    const newState = triggerTrafficSpike(globalTrafficState);
    setGlobalTrafficState(newState);
    
    setTrafficHistory(prev => {
      const newHist = appendTrafficHistory(prev, newState);
      setTrafficPrediction(predictFutureTraffic(newHist, incidents, 15));
      return newHist;
    });
    
    const spiked = adaptStateToLegacyConditions(newState, ambulances, localHospitals);
    setTrafficConditions(spiked);
    
    addAlert(`âš¡ Traffic surge detected! Status: ${newState.severity}`, 'warning');
    
    if (phase === 'enroute' && route.length > 0) {
      setTrafficSegments(generateTrafficSegments(routeRef.current, spiked, emergencyMode));
      let assessment = getRouteTraffic(routeRef.current, newState);
      assessment = applyIncidentImpact(assessment, incidentImpactInfo);
      setRouteTrafficInfo(assessment);
      performReroute(spiked);
    }
    if (phase === 'located' && emergencyLocation) {
      const newH = rankHospitals(localHospitals, emergencyLocation, emergencyType, spiked, emergencyMode);
      setRankedHospitals(newH.slice(0, 3));
      setSelectedHospital(newH[0]);
      addAlert('ðŸ”„ Hospital ranking updated due to traffic changes', 'info');
    }
  }, [globalTrafficState, ambulances, localHospitals, phase, route, emergencyMode, emergencyLocation, emergencyType, rankHospitals, addAlert, performReroute, incidentImpactInfo]);

  // â”€â”€ Incident Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSimulateIncident = useCallback((type) => {
    if (phase !== 'enroute' || !routeRef.current || routeRef.current.length < 5) {
      addAlert('âš ï¸ Dispatch ambulance first to simulate route incidents.', 'warning');
      return;
    }
    
    const currentIdx = idxRef.current;
    const remaining = routeRef.current.length - currentIdx;
    if (remaining < 5) return;
    
    // Deterministic placement ahead on route
    const offset = Math.max(2, Math.floor(remaining * 0.4));
    const targetPt = routeRef.current[currentIdx + offset];
    
    const severity = type === 'ACCIDENT' ? 'HIGH' : type === 'ROAD_BLOCK' ? 'MEDIUM' : 'LOW';
    const newInc = createIncident(type, targetPt[0], targetPt[1], severity);
    
    setIncidents(prev => {
      const updated = [...prev, newInc];
      const impact = getIncidentImpact(routeRef.current, updated);
      setIncidentImpactInfo(impact);
      
      // Update prediction
      setTrafficPrediction(predictFutureTraffic(trafficHistory, updated, 15));
      
      if (corridorActiveRef.current && impact && impact.affected) {
        addAlert(`âš  INCIDENT AFFECTED: Virtual corridor disrupted by ${newInc.title}`, 'danger');
      }
      
      if (impact && impact.affected) {
        addAlert(`ðŸ’¥ ${newInc.title} reported on active route!`, 'danger');
        setRouteTrafficInfo(prevInfo => {
           const base = getRouteTraffic(routeRef.current, globalTrafficState);
           return applyIncidentImpact(base, impact);
        });
        
        // Trigger rerouting automatically for severe incidents (unless in presentation mode where we want explicit steps)
        if (!presentationMode && (impact.severity === 'HIGH' || impact.severity === 'CRITICAL')) {
           setTimeout(() => performReroute(trafficConditions, true, `${impact.severity} incident detected`), 1000);
        }
      } else {
        addAlert(`âš ï¸ ${newInc.title} reported nearby.`, 'warning');
      }
      return updated;
    });
  }, [phase, globalTrafficState, trafficConditions, addAlert, performReroute]);

  const handleResolveIncidents = useCallback(() => {
    setIncidents([]);
    setIncidentImpactInfo(null);
    setTrafficPrediction(predictFutureTraffic(trafficHistory, [], 15));
    addAlert('âœ… All incidents cleared.', 'success');
    if (phase === 'enroute') {
      const base = getRouteTraffic(routeRef.current, globalTrafficState);
      setRouteTrafficInfo(base);
    }
  }, [phase, globalTrafficState, addAlert]);

  const handleActivateCorridor = useCallback(() => {
    if (!routeRef.current || routeRef.current.length === 0) return;
    corridorActiveRef.current = true;
    setCorridorActive(true);
    setCorridorIntersections(generateCorridorIntersections(routeRef.current, 0.4));
    
    const t = new Date().toLocaleTimeString('en-IN');
    addAlert(`ðŸŸ¢ SIMULATED EMERGENCY CORRIDOR ACTIVATED at ${t}`, 'success');
  }, [addAlert]);

  const handleDeactivateCorridor = useCallback(() => {
    corridorActiveRef.current = false;
    setCorridorActive(false);
    setCorridorIntersections([]);
    addAlert('ðŸ”´ Emergency corridor deactivated', 'info');
  }, [addAlert]);

  // â”€â”€ Reset â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleReset = useCallback(() => {
    if (animRef.current)         { clearInterval(animRef.current);         animRef.current = null; }
    if (rerouteTimerRef.current) { clearInterval(rerouteTimerRef.current); rerouteTimerRef.current = null; }
    if (trafficTimerRef.current) { clearInterval(trafficTimerRef.current); trafficTimerRef.current = null; }
    patientPickedUpRef.current = false;
    pickupIndexRef.current = 0;
    setPhase('idle');
    setEmergencyLocation(null); setEmergencyType('Accident');
    setAmbulances([]); setSelectedAmbulance(null);
    setRankedHospitals([]); setSelectedHospital(null);
    setRoute([]); setShortestRoute([]); setOptimalRoute([]); setAlternativeRoute([]); setAlternateRoutes([]);
    setAmbulancePosition(null); setRouteProgress(0); setPickupIndex(0);
    setTrafficConditions({}); setTrafficSegments([]);
    setEta(null); setDistance(null); setNormalTime(null); setOptimizedTime(null);
    setAlerts([]); setEmergencyMode(false); setRerouteCount(0); setActiveRouteType('optimal'); setRouteMode('optimal'); setRouteMetrics({ normal: null, optimal: null, alternative: null });
    setDispatchTimeline([]); setHospitalLoading(false); setLocalHospitals([]);
    setIncidents([]); setIncidentImpactInfo(null);
    setTrafficHistory([createTrafficState(0.0)]); setTrafficPrediction(null);
    setScoredRoutes([]);
    corridorActiveRef.current = false; setCorridorActive(false); setCorridorIntersections([]);
    addAlert('ðŸ”„ System reset â€” ready for new emergency', 'info');
  }, [addAlert]);

  const DEMO_STEPS = [
    'IDLE', 
    'EMERGENCY_CREATED', 
    'ROUTES_READY', 
    'ROUTE_RECOMMENDED', 
    'CORRIDOR_ACTIVE', 
    'AMBULANCE_MOVING', 
    'TRAFFIC_SPIKE', 
    'INCIDENT_CREATED', 
    'REROUTING', 
    'NEW_CORRIDOR', 
    'COMPLETED'
  ];

  const getStepIndex = (phase) => DEMO_STEPS.indexOf(phase);

  const executePhaseAction = useCallback((phaseName) => {
    switch(phaseName) {
      case 'EMERGENCY_CREATED':
        handleMapClick({ lat: 12.9716, lng: 77.5946 });
        break;
      case 'ROUTES_READY':
        // Wait for API to resolve
        break;
      case 'ROUTE_RECOMMENDED':
        handleDispatch();
        break;
      case 'CORRIDOR_ACTIVE':
        handleActivateCorridor();
        break;
      case 'AMBULANCE_MOVING':
        // Handled naturally by timeline logic
        break;
      case 'TRAFFIC_SPIKE':
        handleSimulateTraffic();
        break;
      case 'INCIDENT_CREATED':
        handleSimulateIncident('ACCIDENT', 6);
        break;
      case 'REROUTING':
        performReroute(trafficConditions, true, 'High severity incident detected');
        break;
      case 'NEW_CORRIDOR':
        handleActivateCorridor();
        break;
      case 'COMPLETED':
        setDemoActive(false);
        break;
      default:
        break;
    }
  }, [handleMapClick, handleDispatch, handleActivateCorridor, handleSimulateTraffic, handleSimulateIncident, performReroute, trafficConditions]);

  const handleNextDemoStep = useCallback(() => {
    const currentIndex = getStepIndex(demoPhase);
    if (currentIndex < DEMO_STEPS.length - 1) {
      const nextPhase = DEMO_STEPS[currentIndex + 1];
      const nextNextPhase = DEMO_STEPS[currentIndex + 2] || '';
      setDemoPhase(nextPhase);
      demoPhaseRef.current = nextPhase;
      setDemoNextPhase(nextNextPhase);
      setDemoProgress(Math.floor(((currentIndex + 1) / (DEMO_STEPS.length - 1)) * 100));
      executePhaseAction(nextPhase);
    }
  }, [demoPhase, executePhaseAction]);

  const handleStartDemo = useCallback(() => {
    setDemoActive(true);
    setPresentationMode(true);
    setSimulationSpeed(15);
    if (demoPhase === 'IDLE' || demoPhase === 'COMPLETED') {
      handleReset();
      setDemoPhase('EMERGENCY_CREATED');
      demoPhaseRef.current = 'EMERGENCY_CREATED';
      setDemoNextPhase('ROUTES_READY');
      setDemoProgress(5);
      executePhaseAction('EMERGENCY_CREATED');
    }
  }, [demoPhase, handleReset, executePhaseAction]);

  const handlePauseDemo = useCallback(() => setDemoActive(false), []);
  const handleResetDemo = useCallback(() => {
    setDemoActive(false);
    setDemoPhase('IDLE');
    demoPhaseRef.current = 'IDLE';
    setDemoNextPhase('EMERGENCY_CREATED');
    setDemoProgress(0);
    setSimulationSpeed(60);
    handleReset();
  }, [handleReset]);

  const handlePrevDemoStep = useCallback(() => {
    // PREVIOUS is only allowed before state commits like ROUTE_RECOMMENDED (which fires dispatch).
    // The prompt requested limiting PREVIOUS to "where safe" to prevent state corruption.
    const safePhases = ['ROUTES_READY', 'ROUTE_RECOMMENDED'];
    if (safePhases.includes(demoPhase)) {
      const currentIndex = getStepIndex(demoPhase);
      const prevPhase = DEMO_STEPS[currentIndex - 1];
      setDemoPhase(prevPhase);
      demoPhaseRef.current = prevPhase;
      setDemoNextPhase(demoPhase); // The current phase becomes the next phase
      setDemoProgress(Math.floor(((currentIndex - 1) / (DEMO_STEPS.length - 1)) * 100));
    }
  }, [demoPhase]);

  // JUDGE MODE AUTOMATION TIMING
  useEffect(() => {
    if (!demoActive || demoMode === 'LIVE') return;
    
    // Controlled 5-8 second presentation pacing.
    const delays = {
      'EMERGENCY_CREATED': 5000,
      'ROUTES_READY': 5000,
      'ROUTE_RECOMMENDED': 6000,
      'CORRIDOR_ACTIVE': 6000,
      'AMBULANCE_MOVING': 7000,
      'TRAFFIC_SPIKE': 5000,
      'INCIDENT_CREATED': 5000,
      'REROUTING': 6000,
      'NEW_CORRIDOR': 5000,
    };
    
    const currentIndex = getStepIndex(demoPhase);
    if (currentIndex >= 1 && currentIndex < DEMO_STEPS.length - 1) {
       const delay = delays[demoPhase] || 5000;
       const timer = setTimeout(() => {
          handleNextDemoStep();
       }, delay);
       return () => clearTimeout(timer);
    }
  }, [demoActive, demoMode, demoPhase, handleNextDemoStep]);

  // â”€â”€ Emergency type change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleEmergencyTypeChange = useCallback((type) => {
    setEmergencyType(type);
    if (emergencyLocation && phase === 'located') {
      const newH = rankHospitals(localHospitals, emergencyLocation, type, trafficConditions, emergencyMode);
      setRankedHospitals(newH.slice(0, 3));
      setSelectedHospital(newH[0]);
      addAlert(`ðŸ”„ Emergency type changed to ${type} â€” hospitals re-ranked`, 'info');
    }
  }, [emergencyLocation, phase, trafficConditions, emergencyMode, localHospitals, rankHospitals, addAlert]);

  // â”€â”€ Cleanup on unmount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => () => {
    if (animRef.current)         clearInterval(animRef.current);
    if (rerouteTimerRef.current) clearInterval(rerouteTimerRef.current);
    if (trafficTimerRef.current) clearInterval(trafficTimerRef.current);
  }, []);

  // â”€â”€ Mobile sidebar toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // â”€â”€ Emergency Type Collapsible â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [emergencyControlsOpen, setEmergencyControlsOpen] = useState(false);

  // â”€â”€ SOS overlay state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [sosVisible, setSosVisible]       = useState(false);
  const sosPendingRef                     = useRef(null); // stores the pending dispatch args

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-body bg-brand-bg text-brand-text transition-colors duration-300 relative ${presentationMode ? 'presentation-mode' : ''}`}>
      {/* Demo overlay moved to Right Panel */}
      <SOSOverlay
        visible={sosVisible}
        onCancel={handleSOSCancel}
        onConfirm={handleSOSConfirm}
      />
      <Header 
        phase={phase} 
        currentTime={currentTime} 
        onMenuToggle={() => setSidebarOpen(o => !o)} 
        presentationMode={presentationMode}
        onPresentationModeToggle={() => setPresentationMode(p => !p)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
        
        {/* â”€â”€ Top 3-Column Area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* â”€â”€ Mobile overlay backdrop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sidebarOpen && (
          <div
            className={`fixed inset-0 bg-black/50 z-[200] md:hidden`}
            onClick={() => { setSidebarOpen(false); }}
          />
        )}

        {/* â”€â”€ Left Sidebar: Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className={`
          inset-y-0 left-0 flex flex-col overflow-hidden
          bg-brand-surface border-r border-brand-border
          transition-transform duration-300 ease-in-out shrink-0
          fixed md:relative z-[300] md:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `} style={{ width: '22%' }}>
          <div className="flex items-center justify-between px-3 pt-3 md:hidden">
            <span className="font-display text-[10px] text-brand-muted tracking-[0.15em] uppercase">CONTROL PANEL</span>
            <button onClick={() => { setSidebarOpen(false); }} className="text-brand-muted text-lg bg-transparent border-none cursor-pointer">âœ•</button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-3">
            
            {/* EMERGENCY CONTROLS (Collapsible) */}
            <div className="glass-card p-3 flex flex-col gap-2">
              <button 
                onClick={() => setEmergencyControlsOpen(!emergencyControlsOpen)}
                className="w-full flex items-center justify-between font-display text-[10px] text-brand-cyan tracking-widest uppercase hover:text-white transition-colors"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0' }}
              >
                <span>{emergencyControlsOpen ? '[-]' : '[+]'} CREATE EMERGENCY</span>
              </button>
              
              {emergencyControlsOpen && (
                <div className="mt-2">
                  <EmergencyInput emergencyType={emergencyType} onChange={handleEmergencyTypeChange} phase={phase} emergencyLocation={emergencyLocation} />
                  <div className="text-center mt-2">
                    <button 
                      onClick={() => setEmergencyControlsOpen(false)}
                      className="px-4 py-1.5 bg-[#0f3060] hover:bg-[#1a4a8a] text-[10px] uppercase tracking-widest rounded transition-colors text-white"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            <AmbulancePanel ambulances={ambulances} selectedAmbulance={selectedAmbulance} onSelect={setSelectedAmbulance} trafficConditions={trafficConditions} phase={phase} />
            
            {/* INCIDENT MONITOR UI */}
            <div className="glass-card p-3 flex flex-col gap-2">
              <div className="font-display text-[10px] text-brand-muted tracking-widest uppercase flex items-center justify-between">
                <span>Incident Monitor</span>
                <span className={incidents.length > 0 ? "text-brand-red font-bold" : "text-brand-cyan"}>
                  {incidents.length} ACTIVE
                </span>
              </div>
              {incidents.length === 0 ? (
                <div className="text-xs text-brand-muted italic text-center py-2 bg-black/20 rounded border border-brand-border/50">
                  No active incidents
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {incidents.map(inc => (
                    <div key={inc.id} className="flex flex-col gap-1 text-xs border-l-2 p-1.5 bg-black/20" 
                         style={{ borderLeftColor: inc.severity === 'HIGH' ? '#ff9800' : inc.severity === 'CRITICAL' ? '#ff1744' : '#ffd600' }}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{inc.title}</span>
                        <span className="text-[9px] px-1 bg-brand-surface rounded">{inc.severity}</span>
                      </div>
                      <div className="text-brand-muted flex justify-between">
                        <span>Impact: +{inc.estimatedDelay}m</span>
                        {inc.simulated && <span className="text-brand-cyan text-[8px] uppercase">SIM</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ControlPanel
              trafficEnabled={trafficEnabled} onTrafficToggle={setTrafficEnabled}
              emergencyMode={emergencyMode} onEmergencyModeToggle={handleEmergencyModeToggle}
              simulationSpeed={simulationSpeed} onSimulationSpeedChange={setSimulationSpeed}
              onSimulateTraffic={handleSimulateTraffic}
              onSimulateIncident={handleSimulateIncident}
              onResolveIncidents={handleResolveIncidents}
              onActivateCorridor={handleActivateCorridor}
              onDeactivateCorridor={handleDeactivateCorridor}
              corridorActive={corridorActive}
              onDispatch={handleDispatch}
              onReset={handleReset}
              phase={phase}
              selectedAmbulance={selectedAmbulance}
            />
          </div>
        </div>



        {/* â”€â”€ Map area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex-1 flex flex-col min-w-0 relative shrink-0" style={{ width: '56%' }}>
          <div className="w-full relative overflow-hidden flex-1 h-full">
          <MapView
            emergencyLocation={emergencyLocation}
            ambulances={ambulances}
            selectedAmbulance={selectedAmbulance}
            hospitals={localHospitals}
            rankedHospitals={rankedHospitals}
            selectedHospital={selectedHospital}
            shortestRoute={shortestRoute}
            optimalRoute={optimalRoute}
            alternativeRoute={alternativeRoute}
            route={route}
            alternateRoutes={alternateRoutes}
            ambulancePosition={ambulancePosition}
            trafficSegments={trafficEnabled ? trafficSegments : []}
            trafficEnabled={trafficEnabled}
            phase={phase}
            onMapClick={handleMapClick}
            onSelectAmbulance={setSelectedAmbulance}
            onSelectHospital={setSelectedHospital}
            onSelectAlternate={handleSelectAlternate}
            pickupIndex={pickupIndex}
            activeRouteType={activeRouteType}
            routeMode={routeMode}
            incidents={incidents}
            corridorActive={corridorActive}
            corridorIntersections={corridorIntersections}
          />

          <div className="absolute top-4 right-2 z-[1000] w-64 md:w-72">
            <AlertSystem alerts={alerts} onRemove={removeAlert} />
          </div>

          {/* Floating toggle for Simulation Controls removed as it's now in left panel */}

          {/* Mobile dispatch button floating on map */}
          {phase === 'located' && selectedAmbulance && selectedHospital && (
            <button
              onClick={handleDispatch}
              className="btn-dispatch md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-[900] px-8 py-3 rounded-xl text-sm"
            >
              ðŸš‘ DISPATCH
            </button>
          )}
        </div>
          
        </div>
        
        {/* â”€â”€ Right Sidebar: AI Intelligence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="hidden lg:flex shrink-0 flex-col overflow-hidden bg-brand-surface border-l border-brand-border z-[200]" style={{ width: '22%' }}>
            <div className="p-3 border-b border-brand-border bg-brand-card">
              <div className="font-display text-[11px] text-brand-cyan tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-brand-cyan rounded-full animate-pulse"></span>
                AI Route Intelligence
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {presentationMode && (
                <DemoOverlay 
                  demoActive={demoActive}
                  demoMode={demoMode}
                  setDemoMode={setDemoMode}
                  demoPhaseName={demoPhase}
                  demoNextPhaseName={demoNextPhase}
                  demoProgress={demoProgress}
                  onStartDemo={handleStartDemo}
                  onPauseDemo={handlePauseDemo}
                  onResetDemo={handleResetDemo}
                  onNextDemoStep={handleNextDemoStep}
                  onPrevDemoStep={handlePrevDemoStep}
                  
                  emergencyType={emergencyType}
                  scoredRoutes={scoredRoutes}
                  trafficPrediction={trafficPrediction}
                  incidents={incidents}
                  rerouteStatus={rerouteStatus}
                  globalTrafficState={globalTrafficState}
                  dispatchTimeline={dispatchTimeline}
                />
              )}
              
              <RightAIPanel 
                routeMode={routeMode} 
                setRouteMode={setRouteMode} 
                phase={phase} 
                scoredRoutes={scoredRoutes}
                trafficPrediction={trafficPrediction}
                rerouteStatus={rerouteStatus}
                globalTrafficState={globalTrafficState}
                routeMetrics={routeMetrics}
              />
              
              <HospitalPanel rankedHospitals={rankedHospitals} selectedHospital={selectedHospital} onSelect={setSelectedHospital} phase={phase} loading={hospitalLoading} emergencyType={emergencyType} />
            </div>
        </div>
        
      </div> {/* End of Top 3-Column Area */}

      {/* â”€â”€ Operational Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="shrink-0 bg-brand-surface border-t border-brand-border z-[200] flex">
        <div className="w-[22%] shrink-0 border-r border-brand-border overflow-y-auto p-3 hidden xl:block">
          <DispatchTimeline steps={dispatchTimeline} phase={phase} />
        </div>
        <div className="flex-1 transition-all duration-300">
            <AnalyticsPanel 
              activeEmergencies={phase !== 'idle' ? 1 : 0}
              activeIncidents={incidents.length}
              ambulances={ambulances}
              scoredRoutes={scoredRoutes}
              rerouteCount={rerouteCount}
              corridorIntersections={corridorIntersections}
              globalTrafficState={globalTrafficState}
              trafficPrediction={trafficPrediction}
            />
        </div>
      </div>
  </div>
  );
    </div>
  );
}

