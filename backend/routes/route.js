const express = require('express');
const router = express.Router();

function interpolate(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function addWaypoint(lat, lng, scale = 0.004) {
  return [lat + (Math.random() - 0.5) * scale, lng + (Math.random() - 0.5) * scale];
}

function generateRoute(from, through, to, steps = 120) {
  const midAB1 = addWaypoint((from[0] * 2 + through[0]) / 3, (from[1] * 2 + through[1]) / 3, 0.003);
  const midAB2 = addWaypoint((from[0] + through[0] * 2) / 3, (from[1] + through[1] * 2) / 3, 0.003);
  const midBC1 = addWaypoint((through[0] * 2 + to[0]) / 3, (through[1] * 2 + to[1]) / 3, 0.003);
  const midBC2 = addWaypoint((through[0] + to[0] * 2) / 3, (through[1] + to[1] * 2) / 3, 0.003);

  const leg1Waypoints = [from, midAB1, midAB2, through];
  const leg2Waypoints = [through, midBC1, midBC2, to];

  const points = [];
  const stepsL1 = Math.floor(steps * 0.45);
  const stepsL2 = steps - stepsL1;

  for (let i = 0; i < stepsL1; i++) {
    const t = i / stepsL1;
    const seg = t * (leg1Waypoints.length - 1);
    const idx = Math.floor(seg);
    const frac = seg - idx;
    if (idx < leg1Waypoints.length - 1) {
      points.push(interpolate(leg1Waypoints[idx], leg1Waypoints[idx + 1], frac));
    }
  }

  points.push(through);

  for (let i = 0; i <= stepsL2; i++) {
    const t = i / stepsL2;
    const seg = t * (leg2Waypoints.length - 1);
    const idx = Math.floor(seg);
    const frac = seg - idx;
    if (idx < leg2Waypoints.length - 1) {
      points.push(interpolate(leg2Waypoints[idx], leg2Waypoints[idx + 1], frac));
    }
  }

  return points;
}

// POST /api/calculate-route
router.post('/', (req, res) => {
  const { ambulance, emergency, hospital, emergencyMode = false } = req.body;

  if (!ambulance || !emergency || !hospital) {
    return res.status(400).json({ error: 'ambulance, emergency, hospital coordinates required' });
  }

  const from = [ambulance.lat, ambulance.lng];
  const through = [emergency.lat, emergency.lng];
  const to = [hospital.lat, hospital.lng];

  const routePoints = generateRoute(from, through, to, 120);

  // Haversine for each segment to get total distance
  function haversine(a, b) {
    const R = 6371;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  let totalDistance = 0;
  for (let i = 1; i < routePoints.length; i++) {
    totalDistance += haversine(routePoints[i - 1], routePoints[i]);
  }

  const normalTime = (totalDistance / 35) * 60;
  const optimizedTime = normalTime * (emergencyMode ? 0.58 : 0.78);

  res.json({
    route: routePoints,
    totalPoints: routePoints.length,
    totalDistance: Math.round(totalDistance * 100) / 100,
    normalTime: Math.round(normalTime * 10) / 10,
    optimizedTime: Math.round(optimizedTime * 10) / 10,
    pickupIndex: Math.floor(routePoints.length * 0.45),
    calculatedAt: new Date().toISOString()
  });
});

module.exports = router;
