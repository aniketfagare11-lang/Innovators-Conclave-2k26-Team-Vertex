import { calculateDistance } from './geoUtils';

// ─── Emergency Profiles ────────────────────────────────────────────
export const EMERGENCY_PROFILES = {
  'Cardiac Arrest': { cardiac: 3.0, trauma: 0.5, neuro: 1.5, burn: 0.5, maternity: 0.5, general: 0.5, severity: 5, label: 'CRITICAL', color: '#ff3333' },
  'Heart Attack':   { cardiac: 3.0, trauma: 0.5, neuro: 1.5, burn: 0.5, maternity: 0.5, general: 0.5, severity: 5, label: 'CRITICAL', color: '#ff3333' },
  'Stroke':         { cardiac: 1.5, trauma: 0.5, neuro: 3.0, burn: 0.5, maternity: 0.5, general: 0.5, severity: 5, label: 'CRITICAL', color: '#ff3333' },
  'Accident':       { cardiac: 1.0, trauma: 3.0, neuro: 2.0, burn: 1.0, maternity: 0.5, general: 0.8, severity: 4, label: 'SEVERE',   color: '#ff8800' },
  'Trauma':         { cardiac: 1.5, trauma: 3.0, neuro: 2.5, burn: 1.0, maternity: 0.5, general: 0.8, severity: 4, label: 'SEVERE',   color: '#ffa500' },
  'Burn':           { cardiac: 1.0, trauma: 1.5, neuro: 1.0, burn: 3.0, maternity: 0.5, general: 0.8, severity: 3, label: 'MODERATE', color: '#ff5500' },
  'Pregnancy':      { cardiac: 1.0, trauma: 1.0, neuro: 1.0, burn: 0.5, maternity: 3.0, general: 1.0, severity: 3, label: 'MODERATE', color: '#aa88ff' },
  'General':        { cardiac: 0.8, trauma: 0.8, neuro: 0.8, burn: 0.8, maternity: 0.8, general: 3.0, severity: 2, label: 'MODERATE', color: '#00d4ff' }
};

const TRAFFIC_MULTIPLIERS = { LOW: 1.0, MEDIUM: 1.45, HIGH: 2.15 };
const EMERGENCY_REDUCTION  = 0.58;

export function getTrafficMultiplier(level, emergencyMode) {
  const base = TRAFFIC_MULTIPLIERS[level] || 1.0;
  return emergencyMode ? base * EMERGENCY_REDUCTION : base;
}

// ─── Ambulance Scoring ─────────────────────────────────────────────
// 35% Distance, 35% Estimated Travel Time, 20% Equipment Match, 10% Availability
export function scoreAmbulance(ambulance, emergencyLoc, trafficConditions, emergencyMode) {
  const dist = calculateDistance(ambulance.lat, ambulance.lng, emergencyLoc.lat, emergencyLoc.lng);
  const trafficLevel = trafficConditions[`amb_${ambulance.id}`] || 'LOW';
  const mult = getTrafficMultiplier(trafficLevel, emergencyMode);
  const effectiveDist = dist * mult;

  // 35% distance score
  const distScore = Math.max(0, 35 - effectiveDist * 3.5);

  // 35% ETA score
  const etaMins = (effectiveDist / 40) * 60;
  const timeScore = Math.max(0, 35 - etaMins * 2.0);

  // 20% equipment score
  const equipScore = (ambulance.equipment / 100) * 12 + (
    ambulance.type === 'Mobile ICU' ? 8 :
    ambulance.type === 'Cardiac Support' ? 7 :
    ambulance.type === 'Trauma Support' ? 7 :
    ambulance.type === 'Advanced Life Support' ? 6 : 4
  );

  // 10% availability score
  const availScore = ambulance.status === 'available' ? 10 : 0;

  return Math.round((distScore + timeScore + equipScore + availScore) * 10) / 10;
}

// ─── Hospital Scoring ──────────────────────────────────────────────
// 35% Distance, 35% Estimated Travel Time, 20% Emergency Specialty Match, 10% Rating
export function scoreHospital(hospital, emergencyLoc, emergencyType, trafficConditions, emergencyMode) {
  const dist = calculateDistance(hospital.lat, hospital.lng, emergencyLoc.lat, emergencyLoc.lng);
  const trafficLevel = trafficConditions[`hosp_${hospital.id}`] || 'LOW';
  const mult = getTrafficMultiplier(trafficLevel, emergencyMode);
  const effectiveDist = dist * mult;

  const profile = EMERGENCY_PROFILES[emergencyType] || EMERGENCY_PROFILES['General'];

  // 35% distance score
  const distScore = Math.max(0, 35 - effectiveDist * 2.5);

  // 35% estimated travel time score
  const etaMins = (effectiveDist / 40) * 60;
  const timeScore = Math.max(0, 35 - etaMins * 1.5);

  // 20% specialty match score
  let specialtyScore = 0;
  if (hospital.cardiac   && profile.cardiac > 1.0)   specialtyScore += 6;
  if (hospital.trauma    && profile.trauma > 1.0)    specialtyScore += 6;
  if (hospital.neuro     && profile.neuro > 1.0)     specialtyScore += 6;
  if (hospital.burn      && profile.burn > 1.0)      specialtyScore += 6;
  if (hospital.maternity && profile.maternity > 1.0) specialtyScore += 6;
  specialtyScore += (hospital.capability / 100) * 8;
  specialtyScore = Math.min(specialtyScore, 20);

  // 10% rating score
  const ratingScore = ((hospital.rating || 4.0) / 5) * 10;

  return {
    score:        Math.round((distScore + timeScore + specialtyScore + ratingScore) * 10) / 10,
    distance:     Math.round(dist * 100) / 100,
    trafficLevel,
    estimatedTime: Math.round(etaMins * 10) / 10,
    normalTime:   Math.round((dist / 40 * 60) * 10) / 10,
  };
}

// ─── Recommendation Explanation Generator ──────────────────────────
export function getRecommendationReasons(hospital, emergencyType, rankedHospitals = []) {
  const reasons = [];

  // Check if fastest time
  if (rankedHospitals.length > 0) {
    const isFastest = rankedHospitals.every(h => !h.estimatedTime || hospital.estimatedTime <= h.estimatedTime);
    if (isFastest) reasons.push('Fastest travel time');

    const isClosest = rankedHospitals.every(h => !h.distance || hospital.distance <= h.distance);
    if (isClosest && !reasons.includes('Fastest travel time')) reasons.push('Closest distance');
  }

  // Specialty matching reasons
  if ((emergencyType === 'Cardiac Arrest' || emergencyType === 'Heart Attack') && hospital.cardiac) {
    reasons.push('Cardiology unit available');
  }
  if (emergencyType === 'Stroke' && hospital.neuro) {
    reasons.push('Neurology center equipped');
  }
  if ((emergencyType === 'Accident' || emergencyType === 'Trauma') && hospital.trauma) {
    reasons.push('Trauma care center');
  }
  if (emergencyType === 'Burn' && hospital.burn) {
    reasons.push('Burn care specialized');
  }
  if (emergencyType === 'Pregnancy' && hospital.maternity) {
    reasons.push('Maternity department available');
  }

  // Traffic condition reason
  if (hospital.trafficLevel === 'LOW') {
    reasons.push('Low traffic corridor');
  }

  // High rating / capability
  if (hospital.rating >= 4.5) {
    reasons.push(`Top rated facility (⭐ ${hospital.rating})`);
  }

  if (reasons.length === 0) {
    reasons.push('Nearest suitable emergency facility');
  }

  return reasons;
}

// ─── Survival Color (retained for UI status colors if needed) ────────
export function getSurvivalColor(prob) {
  if (prob >= 80) return '#00ff88';
  if (prob >= 60) return '#ffa500';
  if (prob >= 40) return '#ff8800';
  return '#ff3333';
}

// ─── ETA formatting ────────────────────────────────────────────────
export function formatETA(minutes) {
  if (minutes == null) return '—';
  if (minutes < 1) return '< 1 min';
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return s > 0 ? `${m}m ${s}s` : `${m} min`;
}

