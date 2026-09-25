import { getRouteTraffic } from './trafficIntelligence';
import { getIncidentImpact } from './incidentManager';

export const ROUTE_SCORING_WEIGHTS = {
  ETA: 0.30,
  CURRENT_TRAFFIC: 0.20,
  PREDICTED_TRAFFIC: 0.15,
  INCIDENT_IMPACT: 0.15,
  DISTANCE: 0.10,
  RELIABILITY: 0.10
};

/**
 * Normalizes a value where LOWER is better (e.g. ETA, Distance)
 */
function normalizeInverse(value, minExpected, maxExpected) {
  if (value == null) return 50; // fallback
  if (value <= minExpected) return 100;
  if (value >= maxExpected) return 0;
  return 100 - ((value - minExpected) / (maxExpected - minExpected) * 100);
}

/**
 * Normalizes a value where HIGHER is better (e.g. Confidence)
 */
function normalizeDirect(value, minExpected, maxExpected) {
  if (value == null) return 50; // fallback
  if (value >= maxExpected) return 100;
  if (value <= minExpected) return 0;
  return ((value - minExpected) / (maxExpected - minExpected) * 100);
}

export function scoreRoute(routeObj, context) {
  if (!routeObj || !routeObj.waypoints) return null;
  
  // 1. Base Impact
  const trafficImpact = getRouteTraffic(routeObj.waypoints, context.globalTrafficState);
  const incidentImpact = getIncidentImpact(routeObj.waypoints, context.incidents);
  
  // Combine delay (rough ETA)
  let baseEta = routeObj.durationMin || 0;
  if (trafficImpact) {
    // If we have intelligence layer active, use its delay estimate + distance base
    baseEta = (routeObj.distanceKm * 1.5) + trafficImpact.estimatedDelay; 
  }
  if (incidentImpact && incidentImpact.affected) baseEta += incidentImpact.additionalDelay;
  
  // 2. Normalization
  // ETA (Assume 2 min is amazing, 30 min is terrible)
  const etaScore = normalizeInverse(baseEta, 2, 30);
  
  // Distance (Assume 1km is amazing, 20km is terrible)
  const distanceScore = normalizeInverse(routeObj.distanceKm || (routeObj.waypoints.length * 0.05), 1, 20);
  
  // Current Traffic Congestion
  let currTrafficRaw = trafficImpact?.congestionScore || 0;
  if (incidentImpact?.affected && incidentImpact.severity === 'CRITICAL') currTrafficRaw += 30;
  else if (incidentImpact?.affected && incidentImpact.severity === 'HIGH') currTrafficRaw += 15;
  currTrafficRaw = Math.min(100, currTrafficRaw);
  
  const trafficScore = normalizeInverse(currTrafficRaw, 0, 100);
  
  // Predicted Traffic Congestion
  const predTrafficRaw = context.trafficPrediction?.predictedCongestion || currTrafficRaw;
  const predictedTrafficScore = normalizeInverse(predTrafficRaw, 0, 100);
  
  // Incident Impact Score (Risk Score)
  const incRisk = incidentImpact?.riskScore || 0;
  const incidentScore = normalizeInverse(incRisk, 0, 100);
  
  // Reliability 
  let reliabilityRaw = 60; // base simulation
  if (context.globalTrafficState?.source === 'TOMTOM') reliabilityRaw += 20;
  if (context.trafficPrediction?.confidence === 'HIGH') reliabilityRaw += 20;
  else if (context.trafficPrediction?.confidence === 'MEDIUM') reliabilityRaw += 10;
  
  if (incidentImpact?.affected) reliabilityRaw -= 10; // incidents add uncertainty
  reliabilityRaw = Math.min(100, Math.max(0, reliabilityRaw));
  
  const reliabilityScore = normalizeDirect(reliabilityRaw, 0, 100);
  
  // 3. Final Calculation
  const w = ROUTE_SCORING_WEIGHTS;
  
  let totalWeight = 1.0;
  if (!context.trafficPrediction) {
    totalWeight -= w.PREDICTED_TRAFFIC; // redistribute
  }
  
  let rawScore = (
    etaScore * w.ETA +
    trafficScore * w.CURRENT_TRAFFIC +
    (context.trafficPrediction ? predictedTrafficScore * w.PREDICTED_TRAFFIC : 0) +
    incidentScore * w.INCIDENT_IMPACT +
    distanceScore * w.DISTANCE +
    reliabilityScore * w.RELIABILITY
  );
  
  // Normalize back to 100 scale if weights redistributed
  const finalScore = Math.round(rawScore / totalWeight);
  
  return {
    id: routeObj.id,
    originalRoute: routeObj.waypoints,
    finalScore,
    factors: {
      eta: Math.round(etaScore),
      currentTraffic: Math.round(trafficScore),
      predictedTraffic: Math.round(predictedTrafficScore),
      incidentImpact: Math.round(incidentScore),
      distance: Math.round(distanceScore),
      reliability: Math.round(reliabilityScore)
    },
    raw: {
      etaMin: Math.round(baseEta * 10) / 10,
      distanceKm: Math.round(routeObj.distanceKm * 10) / 10,
      congestion: currTrafficRaw,
      predictedCongestion: predTrafficRaw,
      incidentRisk: incRisk,
      confidence: reliabilityRaw
    },
    weights: w
  };
}

export function rankRoutes(routeObjects, context) {
  if (!routeObjects || routeObjects.length === 0) return [];
  
  const scored = routeObjects.map(r => scoreRoute(r, context)).filter(Boolean);
  
  // Sort descending
  scored.sort((a, b) => b.finalScore - a.finalScore);
  
  // Assign ranking names
  scored.forEach((s, i) => {
    s.rank = i + 1;
    if (i === 0) s.recommendation = 'RECOMMENDED';
    else if (i === 1) s.recommendation = 'ALTERNATIVE';
    else s.recommendation = 'BACKUP';
    
    // Generate explanation
    s.explanation = generateExplanation(s, i === 0);
  });
  
  return scored;
}

function generateExplanation(scoreObj, isRecommended) {
  const reasons = [];
  const f = scoreObj.factors;
  
  if (isRecommended) {
    if (f.eta >= 70) reasons.push('✓ Highly competitive ETA');
    if (f.currentTraffic >= 60) reasons.push('✓ Favorable current traffic flow');
    if (f.predictedTraffic >= 60) reasons.push('✓ Stable predicted conditions');
    if (f.incidentImpact >= 80) reasons.push('✓ Lowest incident impact risk');
    if (f.reliability >= 70) reasons.push('✓ High route reliability & data confidence');
    
    if (reasons.length === 0) reasons.push('✓ Highest overall weighted score based on active metrics');
  } else {
    if (f.eta < 50) reasons.push('⚠️ Sub-optimal ETA due to path length or delays');
    if (f.currentTraffic < 50) reasons.push('⚠️ Significant current traffic congestion');
    if (f.predictedTraffic < 50) reasons.push('⚠️ Poor predicted traffic conditions');
    if (f.incidentImpact < 50) reasons.push('⚠️ Severe incident impact risk');
    
    if (reasons.length === 0) reasons.push('⚠️ Outperformed by recommended route');
  }
  
  return reasons;
}
