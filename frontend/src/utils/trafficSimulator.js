// ─── Traffic Engine (Real-time + Simulation) ──────────────────────

export const TRAFFIC_LEVELS = {
  LOW:    { label: 'Low',    color: '#00c853', hexOpacity: '#00c85366', multiplier: 1.0,  weight: 5 },
  MEDIUM: { label: 'Medium', color: '#ffd600', hexOpacity: '#ffd60066', multiplier: 1.45, weight: 6 },
  HIGH:   { label: 'High',   color: '#ff1744', hexOpacity: '#ff174466', multiplier: 2.15, weight: 7 },
};

const LEVEL_NAMES = ['LOW', 'MEDIUM', 'HIGH'];

function weightedRandom(weights = [0.40, 0.35, 0.25]) {
  const r = Math.random();
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (r < sum) return LEVEL_NAMES[i];
  }
  return 'LOW';
}

/**
 * Estimate traffic conditions based on time of day (rush hours vs off-peak).
 */
export function estimateTrafficFromTimeOfDay(hour = new Date().getHours()) {
  if ((hour >= 7 && hour < 10) || (hour >= 17 && hour < 20)) {
    return 'HIGH'; // Morning / Evening Rush
  } else if ((hour >= 10 && hour < 17) || (hour >= 20 && hour < 23)) {
    return 'MEDIUM'; // Normal Daytime / Evening
  } else {
    return 'LOW'; // Nighttime
  }
}

/**
 * Fetch real-time traffic incident data from TomTom Incident Details API v5.
 * Falls back to time-of-day estimation if key or API is unavailable.
 */
export async function fetchRealTimeTraffic(lat, lng) {
  const key = import.meta.env.VITE_TOMTOM_KEY;
  const estimatedLevel = estimateTrafficFromTimeOfDay();

  if (!key) {
    return { fallback: estimatedLevel };
  }

  // TomTom Incident Details API v5 — simple bbox query
  const bboxExpand = 0.12; // ~13 km radius
  const bbox = `${lng - bboxExpand},${lat - bboxExpand},${lng + bboxExpand},${lat + bboxExpand}`;
  const url =
    `https://api.tomtom.com/traffic/services/5/incidentDetails` +
    `?key=${key}` +
    `&bbox=${bbox}` +
    `&fields=%7Bincidents%7Btype%2Cgeometry%7Btype%2Ccoordinates%7D%2Cproperties%7BmagnitudeOfDelay%7D%7D%7D` +
    `&language=en-GB` +
    `&categoryFilter=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11` +
    `&timeValidityFilter=present`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`TomTom Incidents API returned ${res.status}`);
      return { fallback: estimatedLevel };
    }

    const data = await res.json();
    const incidents = data?.incidents || [];

    // Map incidents to a severity map keyed by index
    const incidentMap = {};
    incidents.forEach((inc, i) => {
      const delay = inc.properties?.magnitudeOfDelay ?? 0;
      let level = 'LOW';
      if (delay >= 3) level = 'HIGH';
      else if (delay >= 1) level = 'MEDIUM';
      incidentMap[`incident_${i}`] = level;
    });

    return incidentMap;
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('TomTom traffic fetch failed:', err.message);
    return { fallback: estimatedLevel };
  }
}

/**
 * Fetch TomTom Flow Segment data for a single coordinate.
 * Returns { currentSpeed, freeFlowSpeed, confidence } or null.
 */
export async function fetchFlowSegment(lat, lng) {
  const key = import.meta.env.VITE_TOMTOM_KEY;
  if (!key) return null;

  const url =
    `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json` +
    `?key=${key}&point=${lat},${lng}&unit=KMPH`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.flowSegmentData ?? null;
  } catch (_) {
    return null;
  }
}

/**
 * Derive traffic level from TomTom Flow Segment data.
 * Uses speed ratio: current / free-flow speed.
 */
export function levelFromFlowSegment(flowData) {
  if (!flowData) return 'MEDIUM';
  const ratio = flowData.currentSpeed / Math.max(flowData.freeFlowSpeed, 1);
  if (ratio < 0.4) return 'HIGH';
  if (ratio < 0.7) return 'MEDIUM';
  return 'LOW';
}

/**
 * Generate traffic conditions for all ambulances and hospitals.
 * Biases the simulation weights using real TomTom incident data when available.
 */
export function generateTrafficConditions(ambulances, hospitals, weights, realIncidents = null) {
  const conditions = {};
  const hasRealData = realIncidents && Object.keys(realIncidents).length > 0;
  const incidentSeverities = hasRealData ? Object.values(realIncidents) : [];
  const highCount = incidentSeverities.filter(v => v === 'HIGH').length;
  const medCount  = incidentSeverities.filter(v => v === 'MEDIUM').length;

  // Bias weights based on observed incident severity distribution
  let adjustedWeights;
  if (highCount > 3)      adjustedWeights = [0.15, 0.30, 0.55];  // Heavy congestion
  else if (highCount > 1) adjustedWeights = [0.25, 0.40, 0.35];  // Moderate congestion
  else if (medCount > 2)  adjustedWeights = [0.35, 0.45, 0.20];  // Light congestion
  else                    adjustedWeights = weights || [0.45, 0.35, 0.20]; // Normal

  ambulances.forEach(a => { conditions[`amb_${a.id}`] = weightedRandom(adjustedWeights); });
  hospitals.forEach(h  => { conditions[`hosp_${h.id}`] = weightedRandom(adjustedWeights); });
  return conditions;
}

/**
 * Simulate a traffic spike — upgrades conditions toward HIGH
 */
export function simulateTrafficIncrease(current) {
  const upgraded = { ...current };
  Object.keys(upgraded).forEach(key => {
    const r = Math.random();
    if (upgraded[key] === 'LOW'    && r < 0.65) upgraded[key] = 'MEDIUM';
    if (upgraded[key] === 'MEDIUM' && r < 0.55) upgraded[key] = 'HIGH';
  });
  return upgraded;
}

/**
 * Gradually ease traffic back toward LOW
 */
export function easeTraffic(current) {
  const eased = { ...current };
  Object.keys(eased).forEach(key => {
    if (eased[key] === 'HIGH'   && Math.random() < 0.45) eased[key] = 'MEDIUM';
    if (eased[key] === 'MEDIUM' && Math.random() < 0.35) eased[key] = 'LOW';
  });
  return eased;
}

/**
 * Get overall traffic severity (0–1) from all conditions
 */
export function getOverallTrafficLevel(conditions) {
  const vals = Object.values(conditions);
  if (!vals.length) return 0;
  const scores = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  const avg = vals.reduce((s, v) => s + (scores[v] || 0), 0) / vals.length;
  return avg / 2;
}

/**
 * Returns true if current traffic load warrants auto-rerouting.
 * Triggered when >40% of tracked conditions are HIGH and progress is 10-85%.
 */
export function shouldReroute(conditions, routeProgress) {
  if (routeProgress < 10 || routeProgress > 85) return false;
  const vals = Object.values(conditions);
  if (!vals.length) return false;
  const heavyCount = vals.filter(v => v === 'HIGH').length;
  return heavyCount / vals.length > 0.4;
}

/**
 * Generate Google-Maps-style colored polyline segments along a route.
 * Segments cycle through the actual traffic level pool so colors vary realistically.
 */
export function generateTrafficSegments(route, conditions, emergencyMode) {
  if (!route || route.length < 4) return [];

  const numSegs = Math.min(24, Math.max(8, Math.floor(route.length / 6)));
  const segLen  = Math.floor(route.length / numSegs);
  const levels  = Object.values(conditions);
  const pool    = levels.length ? levels : ['LOW', 'MEDIUM', 'HIGH'];

  const segments = [];
  for (let i = 0; i < numSegs; i++) {
    const start = i * segLen;
    const end   = Math.min(start + segLen + 1, route.length);
    const lvl   = emergencyMode ? 'LOW' : pool[i % pool.length];
    const info  = TRAFFIC_LEVELS[lvl] || TRAFFIC_LEVELS.MEDIUM;
    segments.push({
      positions: route.slice(start, end),
      level:  lvl,
      color:  info.color,
      weight: info.weight,
    });
  }
  return segments;
}
