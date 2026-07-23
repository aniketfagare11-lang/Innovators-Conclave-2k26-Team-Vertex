import React, { useState, useEffect, useRef, useCallback } from 'react';
import MapView from './components/MapView';
import Header from './components/Header';
import EmergencyInput from './components/EmergencyInput';
import AmbulancePanel from './components/AmbulancePanel';
import HospitalPanel from './components/HospitalPanel';
import RouteSelector from './components/RouteSelector';
import ControlPanel from './components/ControlPanel';
import AlertSystem from './components/AlertSystem';
import Dashboard from './components/Dashboard';
import SOSOverlay from './components/SOSOverlay';
import DispatchTimeline from './components/DispatchTimeline';

import { scoreAmbulance, scoreHospital } from './utils/aiEngine';
import {
  generateRoadAmbulances,
  generateDualRoutes, rerouteFromPosition,
  getPickupIndex, calculateDistance,
  fetchHospitalsFromBackend,
} from './utils/geoUtils';
import {
  generateTrafficConditions, simulateTrafficIncrease,
  generateTrafficSegments, shouldReroute,
  fetchRealTimeTraffic, fetchFlowSegment, levelFromFlowSegment, TRAFFIC_LEVELS,
} from './utils/trafficSimulator';

// ─── App ───────────────────────────────────────────────────────────
export default function App() {
  // ── Core state ──────────────────────────────────────────────────
  const [phase, setPhase]                           = useState('idle');
  const [emergencyLocation, setEmergencyLocation]   = useState(null);
  const [emergencyType, setEmergencyType]           = useState('Accident');

  // ── Ambulances ───────────────────────────────────────────────────
  const [ambulances, setAmbulances]                 = useState([]);
  const [selectedAmbulance, setSelectedAmbulance]   = useState(null);

  // ── Hospitals ────────────────────────────────────────────────────
  const [localHospitals, setLocalHospitals]         = useState([]);
  const [hospitalLoading, setHospitalLoading]        = useState(false);
  const [rankedHospitals, setRankedHospitals]       = useState([]);
  const [selectedHospital, setSelectedHospital]     = useState(null);

  // ── Route & animation ────────────────────────────────────────────
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

  // ── Traffic & mode ───────────────────────────────────────────────
  const [trafficEnabled, setTrafficEnabled]         = useState(true);
  const [emergencyMode, setEmergencyMode]           = useState(false);
  const [trafficConditions, setTrafficConditions]   = useState({});
  const [simulationSpeed, setSimulationSpeed]       = useState(60);

  // ── Stats ─────────────────────────────────────────────────────────
  const [eta, setEta]                               = useState(null);
  const [distance, setDistance]                     = useState(null);
  const [normalTime, setNormalTime]                 = useState(null);
  const [optimizedTime, setOptimizedTime]           = useState(null);

  // ── Alerts ───────────────────────────────────────────────────────
  const [alerts, setAlerts]                         = useState([]);

  // ── Clock ────────────────────────────────────────────────────────
  const [currentTime, setCurrentTime]               = useState('');

  // ── Route mode (‘optimal’ = auto-rerouting, ‘normal’ = direct) ───────
  const [routeMode, setRouteMode]                   = useState('optimal');

  // ── Rerouting state ─────────────────────────────────────
  const [rerouteCount, setRerouteCount]             = useState(0);

  // ── Dispatch Timeline ─────────────────────────────────────────────
  const TIMELINE_STEPS = [
    { key: 'created',   icon: '🚨', label: 'Emergency Created' },
    { key: 'assigned',  icon: '🚑', label: 'Ambulance Assigned' },
    { key: 'enroute',   icon: '📍', label: 'Ambulance En Route' },
    { key: 'pickup',    icon: '👤', label: 'Patient Picked Up' },
    { key: 'arrived',   icon: '🏥', label: 'Reached Hospital' },
  ];
  const [dispatchTimeline, setDispatchTimeline]      = useState([]);

  // ── Refs ──────────────────────────────────────────────────────────
  const animRef            = useRef(null);
  const routeRef           = useRef([]);
  const idxRef             = useRef(0);
  const etaBaseRef         = useRef(0);
  const rerouteTimerRef    = useRef(null);
  const trafficTimerRef    = useRef(null);
  const patientPickedUpRef = useRef(false);
  const pickupIndexRef     = useRef(0);

  // ── Clock tick ───────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Alert helpers ─────────────────────────────────────────────────
  const addAlert = useCallback((message, type = 'info') => {
    const alert = { id: Date.now() + Math.random(), message, type, time: new Date().toLocaleTimeString('en-IN') };
    setAlerts(prev => [alert, ...prev].slice(0, 8));
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // ── Rank helpers ──────────────────────────────────────────────────
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

  // ── Map click → set emergency ─────────────────────────────────────
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

    // Initialize dispatch timeline — step 1: Emergency Created
    const now = new Date().toLocaleTimeString('en-IN');
    setDispatchTimeline([
      { key: 'created', icon: '🚨', label: 'Emergency Created', time: now, done: true, active: false },
      { key: 'assigned', icon: '🚑', label: 'Ambulance Assigned', time: null, done: false, active: false },
      { key: 'enroute', icon: '📍', label: 'Ambulance En Route', time: null, done: false, active: false },
      { key: 'pickup', icon: '👤', label: 'Patient Picked Up', time: null, done: false, active: false },
      { key: 'arrived', icon: '🏥', label: 'Reached Hospital', time: null, done: false, active: false },
    ]);

    addAlert('🔍 Fetching nearby hospitals from OpenStreetMap...', 'info');
    setHospitalLoading(true);

    // Parallel fetch: hospitals (via backend) + real traffic
    const [fetchedHospitals, realTraffic] = await Promise.all([
      fetchHospitalsFromBackend(loc.lat, loc.lng),
      fetchRealTimeTraffic(loc.lat, loc.lng),
    ]);

    setHospitalLoading(false);

    // No static fallback — if empty, show message and stay at located phase
    if (!fetchedHospitals || fetchedHospitals.length === 0) {
      addAlert('⚠️ No hospitals found in this area — try clicking a different location', 'warning');
      setLocalHospitals([]);
      setRankedHospitals([]);
      setSelectedHospital(null);
      setAmbulances([]);
      setSelectedAmbulance(null);
      return;
    }

    setLocalHospitals(fetchedHospitals);

    // Road-snapped ambulances near found hospitals
    addAlert('📍 Snapping ambulance positions to road network...', 'info');
    const newAmbs = await generateRoadAmbulances(loc.lat, loc.lng, 6, fetchedHospitals);

    // Traffic conditions
    const traffic = generateTrafficConditions(newAmbs, fetchedHospitals, undefined, realTraffic);
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

    addAlert('🆘 Emergency location set! AI analyzing situation...', 'danger');
    setTimeout(() => addAlert(`🚑 AI selected: ${scored[0].name} (Score: ${scored[0].score.toFixed(0)})`, 'success'), 700);
    setTimeout(() => addAlert(`🏥 Recommended: ${rankedH[0].name} — ${rankedH[0].type}`, 'info'), 1400);
  }, [phase, emergencyMode, emergencyType, rankAmbulances, rankHospitals, addAlert]);


  // ── Core dispatch engine ──────────────────────────────────────────
  const executeDispatch = useCallback(async (loc, amb, hosp, traffic, mode, eType, startIdx = 0, currentRouteMode) => {
    if (!loc || !amb || !hosp) return;

    // Use explicitly passed routeMode to avoid stale closure issues
    const activeMode = currentRouteMode ?? routeMode;

    const from    = [amb.lat, amb.lng];
    const through = [loc.lat, loc.lng];
    const to      = [hosp.lat, hosp.lng];

    addAlert('📡 Calculating road routes...', 'info');

    // Fetch all three routes simultaneously
    const { shortest, optimal, alternative, metrics } = await generateDualRoutes(from, through, to);

    // Validate routes — reject if they look like straight lines (too few points)
    const validShortest     = shortest     && shortest.length     > 10 ? shortest     : null;
    const validOptimal      = optimal      && optimal.length      > 10 ? optimal      : null;
    const validAlternative  = alternative  && alternative.length  > 10 ? alternative  : null;

    // If both failed, retry once
    let finalShortest    = validShortest;
    let finalOptimal     = validOptimal;
    let finalAlternative = validAlternative;
    if (!finalShortest || !finalOptimal) {
      addAlert('⚠️ Route API slow — retrying...', 'warning');
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

    // Active route depends on user's chosen mode
    const activeRoute = activeMode === 'normal'
      ? (finalShortest || finalOptimal)
      : activeMode === 'alternative'
        ? (finalAlternative || finalOptimal)
        : (finalOptimal || finalShortest);
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
    setActiveRouteType(activeMode);
    setAmbulancePosition(activeRoute[startIdx]);
    setPickupIndex(pIdx);
    setRouteProgress(0);
    setPhase('enroute');
    setTrafficSegments(generateTrafficSegments(activeRoute, traffic, mode));

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
      addAlert(`🚑 ${amb.name} dispatched — ${activeMode.toUpperCase()} route active!`, 'success');
      addAlert(`🛣️ ${activeMode === 'normal' ? 'Direct route — no rerouting' : activeMode === 'alternative' ? 'Alternative path active' : 'Optimal route — auto-rerouting enabled'}`, 'info');
      if (mode) addAlert('🚨 Signal override ACTIVE — all lights cleared', 'danger');
      addAlert(`📍 En route to ${hosp.name}`, 'info');
      // Timeline step 3: Ambulance En Route
      const enrouteTime = new Date().toLocaleTimeString('en-IN');
      setDispatchTimeline(prev => prev.map(s =>
        s.key === 'enroute' ? { ...s, done: true, active: true, time: enrouteTime } : s
      ));
    } else {
      addAlert('🔄 Traffic rerouted — ambulance on new road path', 'success');
    }

    const realDurMs  = optMin * 60 * 1000;
    const animDurMs  = realDurMs / simulationSpeed;

    if (animRef.current) clearInterval(animRef.current);
    animRef.current = setInterval(() => {
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
        addAlert(`✅ Ambulance arrived at ${hosp.name}!`, 'success');
        addAlert('📋 Patient handover complete — case closed', 'info');
        return;
      }

      setAmbulancePosition(currentRoute[idx]);
      setRouteProgress(Math.min(99, Math.floor((idx / totalPts) * 100)));
      setEta(etaBaseRef.current * Math.max(0, 1 - idx / totalPts));

      if (idx === Math.floor(totalPts * 0.3) && !patientPickedUpRef.current)  addAlert('🚑 Approaching patient pickup point', 'info');
      if (idx >= targetPickupIdx && !patientPickedUpRef.current) {
        patientPickedUpRef.current = true;
        addAlert('👤 Patient on board — heading to hospital', 'success');
        // Timeline step 4: Patient Picked Up
        const pickupTime = new Date().toLocaleTimeString('en-IN');
        setDispatchTimeline(prev => prev.map(s =>
          s.key === 'pickup' ? { ...s, done: true, active: false, time: pickupTime } : s
        ));
      }
      if (idx === Math.floor(totalPts * 0.75) && patientPickedUpRef.current) addAlert('🏥 Approaching hospital — prepare ER team', 'warning');
    }, Math.max(40, (optMin * 60 * 1000 / simulationSpeed) / (activeRoute.length || 50)));
  }, [simulationSpeed, addAlert, routeMode]);


  // ── Preview both routes when hospital/ambulance selected ─────────
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
    }, 400);
    return () => clearTimeout(previewRoutesRef.current);
  }, [phase, selectedAmbulance, selectedHospital, emergencyLocation]);

  // ── Manual dispatch wrapper ────────────────────────────────────────
  const handleDispatch = useCallback(() => {
    setRerouteCount(0);
    executeDispatch(emergencyLocation, selectedAmbulance, selectedHospital, trafficConditions, emergencyMode, emergencyType, 0, routeMode);
  }, [emergencyLocation, selectedAmbulance, selectedHospital, trafficConditions, emergencyMode, emergencyType, executeDispatch, routeMode]);

  // ── Seamless rerouting helper ───────────────────────────────────────
  const performReroute = useCallback(async (conditions) => {
    if (phase !== 'enroute' || !selectedHospital) return;

    const currentIdx = idxRef.current;
    const currentRoute = routeRef.current;
    if (!currentRoute || currentIdx < 0 || currentIdx >= currentRoute.length) return;

    const currentPos = currentRoute[currentIdx];
    if (!currentPos) return;

    addAlert('⚠️ Traffic surge detected — recalculating road path...', 'warning');

    const isPickedUp = patientPickedUpRef.current || currentIdx >= pickupIndexRef.current;
    let newRemainingPath = null;

    if (isPickedUp) {
      // Patient already picked up: route directly from current ambulance position to hospital
      const rerouteData = await rerouteFromPosition(currentPos, [selectedHospital.lat, selectedHospital.lng]);
      newRemainingPath = rerouteData?.primary;
    } else if (emergencyLocation) {
      // Patient not yet picked up: route from current position through emergency location to hospital
      const dual = await generateDualRoutes(currentPos, [emergencyLocation.lat, emergencyLocation.lng], [selectedHospital.lat, selectedHospital.lng]);
      newRemainingPath = dual.optimal || dual.shortest;
    }

    if (!newRemainingPath || newRemainingPath.length < 2) return;

    setRerouteCount(c => c + 1);

    // Preserve already traveled path and splice new remaining path onto it
    const traveledPath = currentRoute.slice(0, currentIdx + 1);
    const splicedRoute = [...traveledPath, ...newRemainingPath.slice(1)];

    routeRef.current = splicedRoute;
    // idxRef.current remains at currentIdx — seamless continuation without teleporting!

    setOptimalRoute(splicedRoute);
    setRoute(splicedRoute);
    setTrafficSegments(generateTrafficSegments(splicedRoute, conditions || trafficConditions, emergencyMode));

    const newOptMin = etaBaseRef.current * 0.85;
    etaBaseRef.current = newOptMin;

    addAlert('✅ New road route calculated from current position — seamless reroute applied', 'success');
  }, [phase, selectedHospital, emergencyLocation, trafficConditions, emergencyMode, addAlert]);

  // ── Auto-rerouting engine — only runs in 'optimal' mode ─────────
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


  // ── Real-time traffic refresh every 60s ──────────────────────────
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
        addAlert('🔄 Real-time traffic data refreshed', 'info');
      }
    }, 60000);
    return () => clearInterval(trafficTimerRef.current);
  }, [phase, emergencyLocation, ambulances, localHospitals, emergencyMode, route, addAlert]);

  // ── Select alternate route ────────────────────────────────────────
  const handleSelectAlternate = useCallback((altIdx) => {
    const alt = alternateRoutes[altIdx];
    if (!alt) return;
    const newRoute = alt.waypoints;
    setRoute(newRoute);
    setAlternateRoutes(prev => prev.filter((_, i) => i !== altIdx));
    setTrafficSegments(generateTrafficSegments(newRoute, trafficConditions, emergencyMode));
    routeRef.current = newRoute;
    idxRef.current   = 0;
    addAlert(`↪ Switched to alternate route ${altIdx + 1}`, 'success');
  }, [alternateRoutes, trafficConditions, emergencyMode, addAlert]);

  // ── SOS Automation (Backtick hotkey) ─────────────────────────────
  const triggerSOS = useCallback(async () => {
    if (phase !== 'idle' && phase !== 'located') {
      addAlert('⚠️ Cannot trigger SOS while simulation is already active.', 'warning');
      return;
    }
    if (!navigator.geolocation) {
      addAlert('❌ Geolocation not supported by your browser', 'danger');
      return;
    }

    // Get location first, then show overlay
    navigator.geolocation.getCurrentPosition(async (position) => {
      if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }

      const loc   = { lat: position.coords.latitude, lng: position.coords.longitude };
      const eType = 'Cardiac Arrest';
      const eMode = true;

      // Pre-fetch data while overlay is shown
      addAlert('🚨 SOS INITIATED — retrieving location...', 'danger');

      const [fetchedHospitals, realTraffic] = await Promise.all([
        fetchHospitalsFromBackend(loc.lat, loc.lng),
        fetchRealTimeTraffic(loc.lat, loc.lng),
      ]);
      // No static fallback — SOS with no hospitals will show a warning
      const hospitals = fetchedHospitals?.length > 0 ? fetchedHospitals : [];
      if (hospitals.length === 0) {
        addAlert('⚠️ SOS: No hospitals found nearby — location may be remote', 'warning');
      }
      const newAmbs   = await generateRoadAmbulances(loc.lat, loc.lng, 6, hospitals);
      const traffic   = generateTrafficConditions(newAmbs, hospitals, undefined, realTraffic);
      const scoredAmbs  = rankAmbulances(newAmbs, loc, traffic, eMode);
      const scoredHosps = rankHospitals(hospitals, loc, eType, traffic, eMode);

      // Store pending dispatch args and show overlay
      sosPendingRef.current = { loc, eType, eMode, hospitals, newAmbs, traffic, scoredAmbs, scoredHosps };
      setSosVisible(true);
    }, (err) => {
      addAlert('❌ Failed to get live location: ' + err.message, 'danger');
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

    addAlert('🚨 SOS confirmed — dispatching emergency services!', 'danger');
    executeDispatch(loc, scoredAmbs[0], scoredHosps[0], traffic, eMode, eType, 0, 'optimal');
  }, [executeDispatch, addAlert]);

  const handleSOSCancel = useCallback(() => {
    setSosVisible(false);
    sosPendingRef.current = null;
    addAlert('✅ SOS cancelled — false alarm cleared', 'info');
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

  // ── Emergency mode toggle ─────────────────────────────────────────
  const handleEmergencyModeToggle = useCallback((val) => {
    setEmergencyMode(val);
    addAlert(val ? '🚨 Emergency Priority Mode activated' : 'ℹ️ Emergency mode deactivated', val ? 'danger' : 'info');
    if (emergencyLocation && phase === 'located') {
      const newH = rankHospitals(localHospitals, emergencyLocation, emergencyType, trafficConditions, val);
      setRankedHospitals(newH.slice(0, 3));
      setSelectedHospital(h => newH.find(n => n.id === h?.id) || newH[0]);
      setAmbulances(rankAmbulances(ambulances, emergencyLocation, trafficConditions, val));
    }
  }, [emergencyLocation, phase, emergencyType, trafficConditions, ambulances, localHospitals, rankHospitals, rankAmbulances, addAlert]);

  // ── Traffic spike ──────────────────────────────────────────────────
  const handleSimulateTraffic = useCallback(() => {
    const spiked = simulateTrafficIncrease(trafficConditions);
    setTrafficConditions(spiked);
    addAlert('⚡ Traffic surge detected! Recalculating route...', 'warning');
    if (phase === 'enroute' && route.length > 0) {
      setTrafficSegments(generateTrafficSegments(routeRef.current, spiked, emergencyMode));
      performReroute(spiked);
    }
    if (phase === 'located' && emergencyLocation) {
      const newH = rankHospitals(localHospitals, emergencyLocation, emergencyType, spiked, emergencyMode);
      setRankedHospitals(newH.slice(0, 3));
      setSelectedHospital(newH[0]);
      addAlert('🔄 Hospital ranking updated due to traffic changes', 'info');
    }
  }, [trafficConditions, phase, emergencyLocation, emergencyType, emergencyMode, localHospitals, route, rankHospitals, addAlert, performReroute]);

  // ── Reset ──────────────────────────────────────────────────────────
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
    addAlert('🔄 System reset — ready for new emergency', 'info');
  }, [addAlert]);

  // ── Emergency type change ─────────────────────────────────────────
  const handleEmergencyTypeChange = useCallback((type) => {
    setEmergencyType(type);
    if (emergencyLocation && phase === 'located') {
      const newH = rankHospitals(localHospitals, emergencyLocation, type, trafficConditions, emergencyMode);
      setRankedHospitals(newH.slice(0, 3));
      setSelectedHospital(newH[0]);
      addAlert(`🔄 Emergency type changed to ${type} — hospitals re-ranked`, 'info');
    }
  }, [emergencyLocation, phase, trafficConditions, emergencyMode, localHospitals, rankHospitals, addAlert]);

  // ── Cleanup on unmount ────────────────────────────────────────────
  useEffect(() => () => {
    if (animRef.current)         clearInterval(animRef.current);
    if (rerouteTimerRef.current) clearInterval(rerouteTimerRef.current);
    if (trafficTimerRef.current) clearInterval(trafficTimerRef.current);
  }, []);

  // ── Mobile sidebar toggle ─────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── SOS overlay state ─────────────────────────────────────────────
  const [sosVisible, setSosVisible]       = useState(false);
  const sosPendingRef                     = useRef(null); // stores the pending dispatch args

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-body bg-gray-50 dark:bg-brand-bg text-gray-900 dark:text-brand-text transition-colors duration-300">
      <SOSOverlay
        visible={sosVisible}
        onCancel={handleSOSCancel}
        onConfirm={handleSOSConfirm}
      />
      <Header phase={phase} currentTime={currentTime} onMenuToggle={() => setSidebarOpen(o => !o)} />

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* ── Mobile overlay backdrop ──────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[200] md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Left sidebar ────────────────────────────────────────── */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-[300] md:z-auto
          w-80 shrink-0 flex flex-col overflow-hidden
          bg-white dark:bg-brand-bg border-r border-gray-200 dark:border-brand-border
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* Mobile close button */}
          <div className="flex items-center justify-between px-3 pt-3 md:hidden">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#4a7090', letterSpacing: '0.15em' }}>CONTROL PANEL</span>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ color: '#4a7090', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}
            >✕</button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-2.5">
            <EmergencyInput
              emergencyType={emergencyType}
              onChange={handleEmergencyTypeChange}
              phase={phase}
              emergencyLocation={emergencyLocation}
            />
            <AmbulancePanel
              ambulances={ambulances}
              selectedAmbulance={selectedAmbulance}
              onSelect={setSelectedAmbulance}
              trafficConditions={trafficConditions}
              phase={phase}
            />
            <HospitalPanel
              rankedHospitals={rankedHospitals}
              selectedHospital={selectedHospital}
              onSelect={setSelectedHospital}
              phase={phase}
              loading={hospitalLoading}
              emergencyType={emergencyType}
            />
            <RouteSelector
              routeMode={routeMode}
              onChange={setRouteMode}
              phase={phase}
              selectedHospital={selectedHospital}
              trafficConditions={trafficConditions}
              routeMetrics={routeMetrics}
            />
            <DispatchTimeline
              steps={dispatchTimeline}
              phase={phase}
            />
          </div>
        </div>

        {/* ── Map area ─────────────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden">
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
          />

          <Dashboard
            phase={phase}
            selectedAmbulance={selectedAmbulance}
            selectedHospital={selectedHospital}
            eta={eta}
            distance={distance}
            routeProgress={routeProgress}
            trafficConditions={trafficConditions}
            emergencyMode={emergencyMode}
            rerouteCount={rerouteCount}
          />

          <div className="absolute top-4 right-2 z-[1000] w-64 md:w-72">
            <AlertSystem alerts={alerts} onRemove={removeAlert} />
          </div>

          {/* Mobile dispatch button floating on map */}
          {phase === 'located' && selectedAmbulance && selectedHospital && (
            <button
              onClick={handleDispatch}
              className="btn-dispatch md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-[900] px-8 py-3 rounded-xl text-sm"
            >
              🚑 DISPATCH
            </button>
          )}
        </div>
      </div>

      <ControlPanel
        trafficEnabled={trafficEnabled}
        onTrafficToggle={setTrafficEnabled}
        emergencyMode={emergencyMode}
        onEmergencyModeToggle={handleEmergencyModeToggle}
        simulationSpeed={simulationSpeed}
        onSimulationSpeedChange={setSimulationSpeed}
        onSimulateTraffic={handleSimulateTraffic}
        onDispatch={handleDispatch}
        onReset={handleReset}
        phase={phase}
        selectedAmbulance={selectedAmbulance}
        selectedHospital={selectedHospital}
      />
    </div>
  );
}

