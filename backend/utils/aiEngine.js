// LifeLine AI - Core AI Decision Engine
// Scoring system for ambulance selection and hospital ranking

const EMERGENCY_PROFILES = {
  'Cardiac Arrest': { cardiac: 3.0, trauma: 0.5, neuro: 1.5, burn: 0.5, maternity: 0.5, general: 0.5, severity: 5, speedWeight: 3.0 },
  'Heart Attack':   { cardiac: 3.0, trauma: 0.5, neuro: 1.5, burn: 0.5, maternity: 0.5, general: 0.5, severity: 5, speedWeight: 3.0 },
  'Stroke':         { cardiac: 1.5, trauma: 0.5, neuro: 3.0, burn: 0.5, maternity: 0.5, general: 0.5, severity: 5, speedWeight: 3.0 },
  'Accident':       { cardiac: 1.0, trauma: 3.0, neuro: 2.0, burn: 1.0, maternity: 0.5, general: 0.8, severity: 4, speedWeight: 2.5 },
  'Trauma':         { cardiac: 1.5, trauma: 3.0, neuro: 2.5, burn: 1.0, maternity: 0.5, general: 0.8, severity: 4, speedWeight: 2.0 },
  'Burn':           { cardiac: 1.0, trauma: 1.5, neuro: 1.0, burn: 3.0, maternity: 0.5, general: 0.8, severity: 3, speedWeight: 1.8 },
  'Pregnancy':      { cardiac: 1.0, trauma: 1.0, neuro: 1.0, burn: 0.5, maternity: 3.0, general: 1.0, severity: 3, speedWeight: 1.5 },
  'General':        { cardiac: 0.8, trauma: 0.8, neuro: 0.8, burn: 0.8, maternity: 0.8, general: 3.0, severity: 2, speedWeight: 1.0 }
};

const TRAFFIC_MULTIPLIERS = { LOW: 1.0, MEDIUM: 1.45, HIGH: 2.15 };
const EMERGENCY_MODE_REDUCTION = 0.58;

/**
 * Calculate haversine distance between two points (km)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * Math.PI / 180; }

/**
 * Score an ambulance for selection
 * 35% Distance, 35% Estimated Travel Time, 20% Equipment Match, 10% Availability
 */
function scoreAmbulance(ambulance, emergencyLoc, trafficConditions, emergencyMode) {
  const distance = calculateDistance(ambulance.lat, ambulance.lng, emergencyLoc.lat, emergencyLoc.lng);
  const trafficLevel = trafficConditions[`amb_${ambulance.id}`] || 'LOW';
  let trafficMult = TRAFFIC_MULTIPLIERS[trafficLevel] || 1.0;
  if (emergencyMode) trafficMult *= EMERGENCY_MODE_REDUCTION;

  const effectiveDistance = distance * trafficMult;

  // 35% distance score (max 35)
  const distanceScore = Math.max(0, 35 - effectiveDistance * 3.5);

  // 35% ETA score (max 35)
  const etaMinutes = (effectiveDistance / 40) * 60;
  const timeScore = Math.max(0, 35 - etaMinutes * 2.0);

  // 20% equipment score (max 20)
  const equipmentScore = (ambulance.equipment / 100) * 12 + (
    ambulance.type === 'Mobile ICU' ? 8 :
    ambulance.type === 'Cardiac Support' ? 7 :
    ambulance.type === 'Trauma Support' ? 7 :
    ambulance.type === 'Advanced Life Support' ? 6 : 4
  );

  // 10% availability score (max 10)
  const availabilityScore = ambulance.status === 'available' ? 10 : 0;

  const total = distanceScore + timeScore + equipmentScore + availabilityScore;

  return {
    score: Math.round(total * 10) / 10,
    distance: Math.round(distance * 100) / 100,
    trafficLevel,
    estimatedArrival: Math.round(etaMinutes * 10) / 10
  };
}

/**
 * Score a hospital for a given emergency
 * 35% Distance, 35% Estimated Travel Time, 20% Emergency Specialty Match, 10% Rating
 */
function scoreHospital(hospital, emergencyLoc, emergencyType, trafficConditions, emergencyMode) {
  const distance = calculateDistance(hospital.lat, hospital.lng, emergencyLoc.lat, emergencyLoc.lng);
  const trafficLevel = trafficConditions[`hosp_${hospital.id}`] || 'LOW';
  let trafficMult = TRAFFIC_MULTIPLIERS[trafficLevel] || 1.0;
  if (emergencyMode) trafficMult *= EMERGENCY_MODE_REDUCTION;

  const effectiveDistance = distance * trafficMult;

  // 35% distance score (max 35)
  const distanceScore = Math.max(0, 35 - effectiveDistance * 2.5);

  // 35% travel time score (max 35)
  const etaMinutes = (effectiveDistance / 40) * 60;
  const timeScore = Math.max(0, 35 - etaMinutes * 1.5);

  // 20% specialty match score (max 20)
  const profile = EMERGENCY_PROFILES[emergencyType] || EMERGENCY_PROFILES['General'];
  let specialtyScore = 0;
  if (hospital.cardiac && profile.cardiac > 1.0) specialtyScore += 6;
  if (hospital.trauma && profile.trauma > 1.0) specialtyScore += 6;
  if (hospital.neuro && profile.neuro > 1.0) specialtyScore += 6;
  if (hospital.burn && profile.burn > 1.0) specialtyScore += 6;
  if (hospital.maternity && profile.maternity > 1.0) specialtyScore += 6;
  specialtyScore += (hospital.capability / 100) * 8;
  specialtyScore = Math.min(specialtyScore, 20);

  // 10% rating score (max 10)
  const ratingScore = ((hospital.rating || 4.0) / 5) * 10;

  const total = distanceScore + timeScore + specialtyScore + ratingScore;

  return {
    score: Math.round(total * 10) / 10,
    distance: Math.round(distance * 100) / 100,
    trafficLevel,
    estimatedTime: Math.round(etaMinutes * 10) / 10,
    normalTime: Math.round((distance / 40 * 60) * 10) / 10,
    capabilityBreakdown: {
      cardiac: hospital.cardiac,
      trauma: hospital.trauma,
      neuro: hospital.neuro,
      burn: hospital.burn,
      maternity: hospital.maternity,
      capability: hospital.capability
    }
  };
}

module.exports = { calculateDistance, scoreAmbulance, scoreHospital, EMERGENCY_PROFILES };

