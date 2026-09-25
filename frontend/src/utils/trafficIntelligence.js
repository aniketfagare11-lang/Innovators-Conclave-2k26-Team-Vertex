import { 
  TRAFFIC_LEVELS, 
  fetchRealTimeTraffic, 
  fetchFlowSegment,
  simulateTrafficIncrease as legacySimulateIncrease
} from './trafficSimulator';

export const TRAFFIC_SOURCES = {
  TOMTOM: 'TOMTOM',
  SIMULATION: 'SIMULATION'
};

export const SEVERITY = {
  NORMAL:   { id: 'NORMAL',   congestionRange: [0, 25],  multiplier: 1.0, color: '#00c853' },
  MODERATE: { id: 'MODERATE', congestionRange: [26, 55], multiplier: 1.4, color: '#ffd600' },
  HEAVY:    { id: 'HEAVY',    congestionRange: [56, 85], multiplier: 2.1, color: '#ff1744' },
  CRITICAL: { id: 'CRITICAL', congestionRange: [86, 100],multiplier: 3.5, color: '#b71c1c' }
};

/**
 * Creates a normalized traffic state.
 * @param {Number} intensity 0.0 to 1.0
 * @param {Object} tomtomData optional real data
 */
export function createTrafficState(intensity = 0.0, tomtomData = null) {
  const source = tomtomData ? TRAFFIC_SOURCES.TOMTOM : TRAFFIC_SOURCES.SIMULATION;
  const congestionScore = Math.min(100, Math.max(0, Math.floor(intensity * 100)));
  
  let severityObj = SEVERITY.NORMAL;
  if (congestionScore >= SEVERITY.CRITICAL.congestionRange[0]) severityObj = SEVERITY.CRITICAL;
  else if (congestionScore >= SEVERITY.HEAVY.congestionRange[0]) severityObj = SEVERITY.HEAVY;
  else if (congestionScore >= SEVERITY.MODERATE.congestionRange[0]) severityObj = SEVERITY.MODERATE;

  return {
    source,
    intensity,
    congestionScore,
    severity: severityObj.id,
    timestamp: new Date().toISOString(),
    rawTomTom: tomtomData
  };
}

/**
 * Deterministic traffic spike. 
 * Increases intensity by a fixed step, triggering higher severity.
 */
export function triggerTrafficSpike(currentState) {
  if (!currentState) return createTrafficState(0.3); // Jump to moderate
  
  let newIntensity = currentState.intensity + 0.35; // Significant jump
  if (newIntensity > 1.0) newIntensity = 1.0;
  
  return createTrafficState(newIntensity, currentState.rawTomTom);
}

/**
 * Assesses the traffic for a given route using the normalized state.
 */
export function getRouteTraffic(route, trafficState) {
  if (!route || route.length === 0 || !trafficState) return null;

  const severityObj = SEVERITY[trafficState.severity] || SEVERITY.NORMAL;
  
  // Calculate a mock base delay depending on route length
  const baseMinutes = route.length * 0.05;
  const estimatedDelay = baseMinutes * severityObj.multiplier;
  
  // Average speed mock
  const averageSpeed = 60 / severityObj.multiplier;

  return {
    congestionScore: trafficState.congestionScore,
    severity: trafficState.severity,
    estimatedDelay: parseFloat(estimatedDelay.toFixed(1)),
    averageSpeed: parseFloat(averageSpeed.toFixed(1)),
    confidence: trafficState.source === TRAFFIC_SOURCES.TOMTOM ? 95 : 60,
    source: trafficState.source
  };
}

/**
 * Adapts normalized traffic state back into the legacy conditions map format
 * expected by App.jsx (e.g. { amb_1: 'HIGH', hosp_1: 'MEDIUM' })
 */
export function adaptStateToLegacyConditions(trafficState, ambulances, hospitals) {
  const conditions = {};
  
  // Map normalized SEVERITY to legacy TRAFFIC_LEVELS ('LOW', 'MEDIUM', 'HIGH')
  let legacyLevel = 'LOW';
  if (trafficState.severity === 'CRITICAL' || trafficState.severity === 'HEAVY') {
    legacyLevel = 'HIGH';
  } else if (trafficState.severity === 'MODERATE') {
    legacyLevel = 'MEDIUM';
  }

  ambulances.forEach(a => { conditions[`amb_${a.id}`] = legacyLevel; });
  hospitals.forEach(h => { conditions[`hosp_${h.id}`] = legacyLevel; });
  
  return conditions;
}
