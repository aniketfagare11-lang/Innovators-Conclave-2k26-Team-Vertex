const express = require('express');
const router = express.Router();
const { scoreAmbulance, scoreHospital, calculateSurvivalProbability } = require('../utils/aiEngine');
const hospitals = require('../data/hospitals.json');

// POST /api/ai-decision
// Full AI decision: select best ambulance + rank hospitals
router.post('/', (req, res) => {
  const {
    emergencyLocation,
    emergencyType = 'Accident',
    ambulances = [],
    trafficConditions = {},
    emergencyMode = false
  } = req.body;

  if (!emergencyLocation) {
    return res.status(400).json({ error: 'emergencyLocation required' });
  }

  // Score ambulances
  const scoredAmbulances = ambulances.map(amb => {
    const scoring = scoreAmbulance(amb, emergencyLocation, trafficConditions, emergencyMode);
    return { ...amb, ...scoring };
  }).sort((a, b) => b.score - a.score);

  // Score hospitals
  const scoredHospitals = hospitals.map(h => {
    const scoring = scoreHospital(h, emergencyLocation, emergencyType, trafficConditions, emergencyMode);
    return { ...h, ...scoring };
  }).sort((a, b) => b.score - a.score);

  const bestAmbulance = scoredAmbulances[0];
  const bestHospital = scoredHospitals[0];

  // Estimated ETA for best route
  const totalTime = bestAmbulance ? bestAmbulance.estimatedArrival + (bestHospital?.estimatedTime || 5) : 10;
  const survivalProbability = calculateSurvivalProbability(totalTime, emergencyType);

  res.json({
    decision: {
      selectedAmbulance: bestAmbulance,
      rankedAmbulances: scoredAmbulances,
      recommendedHospital: bestHospital,
      rankedHospitals: scoredHospitals.slice(0, 3),
      estimatedTotalETA: Math.round(totalTime * 10) / 10,
      survivalProbability,
      emergencyMode,
      reasoning: {
        ambulanceSelection: `${bestAmbulance?.name} selected: lowest effective distance (${bestAmbulance?.distance}km) with ${bestAmbulance?.trafficLevel} traffic`,
        hospitalSelection: `${bestHospital?.name} recommended: best capability match for ${emergencyType} with score ${bestHospital?.score}`,
        survivalAnalysis: `Survival probability ${survivalProbability}% based on ${totalTime.toFixed(1)}min ETA`
      }
    },
    processedAt: new Date().toISOString()
  });
});

module.exports = router;
