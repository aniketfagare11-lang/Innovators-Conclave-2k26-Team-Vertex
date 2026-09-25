import { calculateDistance } from './geoUtils';

/**
 * emergencyCorridor.js
 * 
 * Simulated Emergency Green Corridor system.
 * Generates virtual intersections along a given route and manages 
 * their software-simulated priority states as the ambulance approaches.
 */

/**
 * Generate virtual intersections along a route polyline.
 * @param {Array} route waypoints [[lat, lng], [lat, lng], ...]
 * @param {Number} intervalKm distance between intersections (approx)
 * @returns {Array} array of intersection objects
 */
export function generateCorridorIntersections(route, intervalKm = 0.5) {
  if (!route || route.length < 2) return [];

  const intersections = [];
  let accumulatedDist = 0;
  let nextThreshold = intervalKm;
  let sequence = 1;

  for (let i = 1; i < route.length - 1; i++) {
    const prev = route[i - 1];
    const curr = route[i];
    
    // Using simple Haversine formula from geoUtils
    const segmentDist = calculateDistance(prev[0], prev[1], curr[0], curr[1]);
    accumulatedDist += segmentDist;

    if (accumulatedDist >= nextThreshold) {
      intersections.push({
        id: `INT-${String(sequence).padStart(2, '0')}`,
        name: `Virtual Intersection ${sequence}`,
        latitude: curr[0],
        longitude: curr[1],
        sequence: sequence,
        distanceFromStart: Math.round(accumulatedDist * 100) / 100,
        status: 'PREPARING',
        priority: 'REQUESTED',
        estimatedClearTime: null,
        simulated: true
      });
      sequence++;
      nextThreshold += intervalKm;
    }
  }

  return intersections;
}

/**
 * Updates intersection statuses based on ambulance position.
 * @param {Array} intersections Current intersections
 * @param {Array} currentAmbulancePos [lat, lng]
 * @returns {Array} Updated intersections
 */
export function updateCorridorStatus(intersections, currentAmbulancePos) {
  if (!intersections || intersections.length === 0 || !currentAmbulancePos) return intersections;

  // We find the closest intersection ahead of the ambulance
  // and manage the states: PREPARING -> PRIORITY -> CLEARED
  
  return intersections.map(int => {
    const dist = calculateDistance(currentAmbulancePos[0], currentAmbulancePos[1], int.latitude, int.longitude);
    
    // If we've passed it (or are very close), mark it as cleared
    if (dist < 0.05 && int.status !== 'CLEARED') {
      return { ...int, status: 'CLEARED', priority: 'COMPLETED' };
    }
    
    // If it's the immediate next intersection (within 1km), PRIORITY
    if (int.status !== 'CLEARED') {
      if (dist < 1.0) {
        return { ...int, status: 'PRIORITY', priority: 'ACTIVE' };
      }
      // Otherwise it remains PREPARING
      return { ...int, status: 'PREPARING', priority: 'REQUESTED' };
    }
    
    return int;
  });
}
