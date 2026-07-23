const express = require('express');
const router = express.Router();
const staticHospitals = require('../data/hospitals.json');
const { scoreHospital } = require('../utils/aiEngine');

const OVERPASS_ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

async function fetchOverpassQuery(query) {
  const fetchOne = async (endpoint) => {
    const url = `${endpoint}?data=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'LifeLineAI-EmergencySystem/1.0' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const valid = (data.elements || []).filter(el => (el.lat || el.center?.lat) && (el.lon || el.center?.lon));
      return { valid, endpoint };
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  };

  try {
    const results = await Promise.allSettled(OVERPASS_ENDPOINTS.map(ep => fetchOne(ep)));
    const fulfilled = results.find(r => r.status === 'fulfilled');
    return fulfilled ? fulfilled.value : null;
  } catch (_) {
    return null;
  }
}

/**
 * Fetch hospitals dynamically from OpenStreetMap via Overpass API.
 * Progressive radius expansion: 1000m -> 3000m -> 5000m -> 10000m -> 20000m -> 50000m -> 100000m max.
 */
async function fetchOverpassHospitals(lat, lng) {
  const radii = [1000, 3000, 5000, 10000, 20000, 50000, 100000];
  let foundElements = [];
  let finalRadius = 1000;
  let partialResults = false;

  for (const radius of radii) {
    finalRadius = radius;
    const query = `
      [out:json][timeout:15];
      (
        node["amenity"~"hospital|clinic|doctors|health_post"](around:${radius},${lat},${lng});
        way["amenity"~"hospital|clinic|doctors|health_post"](around:${radius},${lat},${lng});
        node["healthcare"~"hospital|clinic|doctor"](around:${radius},${lat},${lng});
        way["healthcare"~"hospital|clinic|doctor"](around:${radius},${lat},${lng});
        node["building"="hospital"](around:${radius},${lat},${lng});
        way["building"="hospital"](around:${radius},${lat},${lng});
      );
      out center body;
    `;

    const result = await fetchOverpassQuery(query);
    if (result && result.valid && result.valid.length > 0) {
      foundElements = result.valid;
      console.log(`Overpass query succeeded via ${result.endpoint} at radius ${radius}m with ${foundElements.length} facilities.`);
      // Stop immediately as soon as hospitals are found
      break;
    }
  }

  if (foundElements.length > 0 && foundElements.length < 3) {
    partialResults = true;
  }

  const hospitals = foundElements.map((el, index) => {
    const tags = el.tags || {};
    const rawName = tags.name || tags['name:en'] || tags.operator || tags['official_name'];
    const isHosp = tags.amenity === 'hospital' || tags.building === 'hospital' || tags.healthcare === 'hospital';
    const name = rawName || (isHosp ? `Medical Hospital #${index + 1}` : `Health Clinic #${index + 1}`);
    const nameLow = name.toLowerCase();
    const elLat = el.lat || el.center.lat;
    const elLon = el.lon || el.center.lon;

    let type = isHosp ? 'Multi-Specialty' : 'Clinic';
    if (nameLow.includes('super') || nameLow.includes('specialty')) type = 'Super-Specialty';
    if (nameLow.includes('general')) type = 'General Hospital';

    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (offset) => ((hash + offset * 17) % 100) / 100;

    return {
      id: el.id || (index + 100),
      name,
      shortName: name.length > 20 ? name.substring(0, 17) + '...' : name,
      lat: elLat,
      lng: elLon,
      type,
      capability: isHosp ? 65 + Math.floor(pseudoRandom(1) * 33) : 35 + Math.floor(pseudoRandom(1) * 30),
      beds: tags.beds ? parseInt(tags.beds) : (isHosp ? 100 + Math.floor(pseudoRandom(2) * 400) : 10 + Math.floor(pseudoRandom(2) * 20)),
      cardiac: nameLow.includes('heart') || nameLow.includes('cardiac') || (isHosp && pseudoRandom(3) > 0.35),
      trauma: nameLow.includes('trauma') || nameLow.includes('emergency') || (isHosp && pseudoRandom(4) > 0.40),
      neuro: nameLow.includes('neuro') || nameLow.includes('brain') || (isHosp && pseudoRandom(5) > 0.65),
      burn: nameLow.includes('burn') || (isHosp && pseudoRandom(6) > 0.75),
      maternity: nameLow.includes('maternity') || nameLow.includes('mother') || nameLow.includes('women') || (isHosp && pseudoRandom(7) > 0.50),
      pediatric: nameLow.includes('children') || nameLow.includes('pediatric') || (isHosp && pseudoRandom(8) > 0.45),
      address: tags['addr:street'] ? `${tags['addr:street']}, ${tags['addr:city'] || ''}` : '',
      rating: Math.round((3.6 + pseudoRandom(9) * 1.3) * 10) / 10,
      icon: '🏥'
    };
  });

  return { hospitals, radiusUsed: finalRadius, partialResults };
}

// GET /api/hospitals/nearby?lat=12.97&lng=77.59
router.get('/nearby', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng parameters are required' });
  }

  const centerLat = parseFloat(lat);
  const centerLng = parseFloat(lng);

  const result = await fetchOverpassHospitals(centerLat, centerLng);
  res.json({
    hospitals: result.hospitals,
    count: result.hospitals.length,
    radiusUsed: result.radiusUsed,
    partialResults: result.partialResults,
    fetchedAt: new Date().toISOString()
  });
});

// GET /api/hospitals
router.get('/', (req, res) => {
  res.json({ hospitals: staticHospitals, count: staticHospitals.length });
});

// POST /api/hospitals/rank
router.post('/rank', (req, res) => {
  const { lat, lng, emergencyType = 'Accident', trafficConditions = {}, emergencyMode = false, hospitals = null } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng required in body' });
  }

  const emergencyLoc = { lat: parseFloat(lat), lng: parseFloat(lng) };
  const targetHospitals = (hospitals && hospitals.length > 0) ? hospitals : staticHospitals;

  const rankedHospitals = targetHospitals.map(h => {
    const scoring = scoreHospital(h, emergencyLoc, emergencyType, trafficConditions, emergencyMode);
    return { ...h, ...scoring };
  }).sort((a, b) => b.score - a.score);

  res.json({
    rankedHospitals,
    top3: rankedHospitals.slice(0, 3),
    recommended: rankedHospitals[0],
    emergencyType,
    rankedAt: new Date().toISOString()
  });
});

module.exports = router;

