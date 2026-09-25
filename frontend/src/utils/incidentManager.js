export const INCIDENT_TYPES = {
  ACCIDENT: 'ACCIDENT',
  ROAD_BLOCK: 'ROAD_BLOCK',
  VEHICLE_BREAKDOWN: 'VEHICLE_BREAKDOWN',
  CONSTRUCTION: 'CONSTRUCTION',
  FLOODING: 'FLOODING',
  OTHER: 'OTHER'
};

export const INCIDENT_SEVERITY = {
  LOW: { id: 'LOW', delayMinutes: 2, label: 'Low', color: '#00c853' },
  MEDIUM: { id: 'MEDIUM', delayMinutes: 4, label: 'Medium', color: '#ffd600' },
  HIGH: { id: 'HIGH', delayMinutes: 8, label: 'High', color: '#ff9800' },
  CRITICAL: { id: 'CRITICAL', delayMinutes: 15, label: 'Critical', color: '#ff1744' }
};

export const INCIDENT_STATUS = {
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED'
};

export const INCIDENT_SOURCES = {
  SIMULATION: 'SIMULATION',
  USER: 'USER',
  SYSTEM: 'SYSTEM',
  API: 'API'
};

let incidentIdCounter = 1;

/**
 * Creates a normalized incident object
 */
export function createIncident(type, latitude, longitude, severityId = 'MEDIUM', source = INCIDENT_SOURCES.SIMULATION) {
  const severity = INCIDENT_SEVERITY[severityId] || INCIDENT_SEVERITY.MEDIUM;
  
  const formattedId = `INC-${String(incidentIdCounter++).padStart(3, '0')}`;
  
  // Format title based on type
  const title = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    id: formattedId,
    type,
    title,
    description: `${title} reported at location.`,
    latitude,
    longitude,
    severity: severity.id,
    status: INCIDENT_STATUS.ACTIVE,
    estimatedDelay: severity.delayMinutes,
    affectedRadius: 500, // meters
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source,
    simulated: source === INCIDENT_SOURCES.SIMULATION
  };
}

/**
 * Determines impact of active incidents on a given route.
 * Simple distance proximity check to see if route points fall within the affected radius.
 */
export function getIncidentImpact(route, incidents) {
  if (!route || !incidents || incidents.length === 0) return null;
  
  const activeIncidents = incidents.filter(i => i.status === INCIDENT_STATUS.ACTIVE);
  if (activeIncidents.length === 0) return null;

  let totalAdditionalDelay = 0;
  let maxSeverity = null;
  const affectingIncidents = [];

  // Simple geo distance utility (Haversine)
  const getDist = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  activeIncidents.forEach(inc => {
    // Check if any route point is within affected radius
    let isAffected = false;
    // Step by 5 to optimize loop
    for (let i = 0; i < route.length; i += 5) {
      const pt = route[i];
      if (getDist(pt[0], pt[1], inc.latitude, inc.longitude) <= inc.affectedRadius) {
        isAffected = true;
        break;
      }
    }

    if (isAffected) {
      affectingIncidents.push(inc);
      totalAdditionalDelay += inc.estimatedDelay;
      
      const sLevel = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      if (!maxSeverity || sLevel[inc.severity] > sLevel[maxSeverity]) {
        maxSeverity = inc.severity;
      }
    }
  });

  return {
    affected: affectingIncidents.length > 0,
    incidentCount: affectingIncidents.length,
    severity: maxSeverity || 'LOW',
    additionalDelay: totalAdditionalDelay,
    riskScore: affectingIncidents.length * 20
  };
}

/**
 * Clean integration with Traffic Intelligence Layer.
 * Wraps or updates a route traffic assessment with incident impact.
 */
export function applyIncidentImpact(trafficAssessment, incidentImpact) {
  if (!trafficAssessment) return null;
  if (!incidentImpact || !incidentImpact.affected) return trafficAssessment;

  return {
    ...trafficAssessment,
    estimatedDelay: trafficAssessment.estimatedDelay + incidentImpact.additionalDelay,
    severity: incidentImpact.severity === 'CRITICAL' ? 'CRITICAL' : trafficAssessment.severity, 
    // Elevate severity if the incident is CRITICAL
  };
}
