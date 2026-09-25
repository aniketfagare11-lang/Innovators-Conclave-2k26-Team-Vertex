// ─── Geo Utilities ────────────────────────────────────────────────

function toRad(deg) { return deg * Math.PI / 180; }

/**
 * Haversine distance in km
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Snap a coordinate to the nearest drivable road using OSRM
 */
export async function snapToRoad(lat, lng) {
  try {
    const url = `https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}?number=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('snap failed');
    const data = await res.json();
    if (data.waypoints && data.waypoints.length > 0) {
      const [snappedLng, snappedLat] = data.waypoints[0].location;
      return { lat: snappedLat, lng: snappedLng };
    }
  } catch (_) { /* silent fallback */ }
  return { lat, lng };
}

/**
 * Generate a random coordinate within radiusKm of center
 */
export function generateNearbyCoords(lat, lng, radiusKm) {
  const r = radiusKm / 111.32;
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  return {
    lat: lat + w * Math.cos(t),
    lng: lng + (w * Math.sin(t)) / Math.cos(toRad(lat))
  };
}

/**
 * Generate road-snapped realistic ambulance units near hospitals, major roads, and junctions.
 */
export async function generateRoadAmbulances(emergencyLat, emergencyLng, count = 6, nearbyHospitals = []) {
  const ambulanceSpecs = [
    { type: 'Basic Life Support', equipmentType: 'BLS' },
    { type: 'Advanced Life Support', equipmentType: 'ALS' },
    { type: 'Mobile ICU', equipmentType: 'ICU' },
    { type: 'Cardiac Support', equipmentType: 'Cardiac' },
    { type: 'Trauma Support', equipmentType: 'Trauma' },
    { type: 'Mobile ICU', equipmentType: 'ICU' }
  ];
  const driverNames = ['Driver Rajesh', 'Driver Suresh', 'Driver Anita', 'Driver Vikram', 'Driver Priya', 'Driver Arun'];
  const statusChoices = ['available', 'available', 'available', 'busy', 'returning', 'maintenance'];
  const units = [];

  for (let i = 0; i < count; i++) {
    // Alternate placing near a hospital vs nearby road junction
    let baseLat = emergencyLat;
    let baseLng = emergencyLng;
    let radiusKm = 0.5 + Math.random() * 2.2;

    if (nearbyHospitals && nearbyHospitals.length > 0 && i % 2 === 0) {
      const hosp = nearbyHospitals[i % nearbyHospitals.length];
      baseLat = hosp.lat;
      baseLng = hosp.lng;
      radiusKm = 0.2 + Math.random() * 0.6;
    }

    const nearby = generateNearbyCoords(baseLat, baseLng, radiusKm);
    const snapped = await snapToRoad(nearby.lat, nearby.lng);
    const spec = ambulanceSpecs[i % ambulanceSpecs.length];
    const status = statusChoices[i % statusChoices.length];
    const isStationary = status === 'busy' || status === 'maintenance';

    units.push({
      id: i + 1,
      name: `AMB-${String(i + 1).padStart(3, '0')}`,
      lat: snapped.lat,
      lng: snapped.lng,
      equipment: 65 + Math.floor(Math.random() * 35),
      status,
      type: spec.type,
      equipmentType: spec.equipmentType,
      driver: driverNames[i % driverNames.length],
      crewSize: 2 + Math.floor(Math.random() * 2),
      speed: isStationary ? 0 : 35 + Math.floor(Math.random() * 25),
    });
  }
  return units;
}

// ─── Core road-route fetcher ───────────────────────────────────────
/**
 * Fetch a real-road route from OSRM (primary) or ORS (secondary).
 * Returns { waypoints, distanceKm, durationMin } or null on failure.
 */
async function fetchRoadRoute(waypoints, profile = 'driving-car') {
  // ── OSRM (primary) ────────────────────────────────────────────────
  const coordStr = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const osrmUrls = [
    `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=false`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=false`,
  ];
  for (const url of osrmUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      const r = data?.routes?.[0];
      const coords = r?.geometry?.coordinates;
      if (coords && coords.length > 10) {
        return {
          waypoints: coords.map(([lng, lat]) => [lat, lng]),
          distanceKm: Math.round((r.distance / 1000) * 100) / 100,
          durationMin: Math.round((r.duration / 60) * 10) / 10,
        };
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('OSRM instance failed:', e.message);
    }
  }

  // ── ORS (secondary) ───────────────────────────────────────────────
  try {
    const body = {
      coordinates: waypoints.map(([lat, lng]) => [lng, lat]),
      instructions: false,
      geometry_simplify: false,
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': import.meta.env.VITE_ORS_API_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const feat = data?.features?.[0];
      const coords = feat?.geometry?.coordinates;
      if (coords && coords.length > 10) {
        const props = feat?.properties?.summary;
        return {
          waypoints: coords.map(([lng, lat]) => [lat, lng]),
          distanceKm: props?.distance ? Math.round((props.distance / 1000) * 100) / 100 : null,
          durationMin: props?.duration ? Math.round((props.duration / 60) * 10) / 10 : null,
        };
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('ORS failed:', e.message);
  }

  return null;
}

// ─── Triple-route system ───────────────────────────────────────────
/**
 * Generate three real-road routes — ALL from routing APIs, never perturbed.
 *   - normal:      OSRM shortest (route[0])
 *   - optimal:     OSRM alternative (route[1]) or ORS avoid-tollways
 *   - alternative: ORS avoid-highways or OSRM route[2] or ORS standard
 */
export async function generateDualRoutes(from, through, to) {
  const f = Array.isArray(from)    ? from    : [from.lat,    from.lng];
  const m = Array.isArray(through) ? through : [through.lat, through.lng];
  const t = Array.isArray(to)      ? to      : [to.lat,      to.lng];

  // Fire all requests in parallel
  const [osrmResult, orsAvoidResult, orsHighwayResult] = await Promise.all([
    fetchOsrmAllRoutes(f, m, t),
    fetchOrsAvoidRoute(f, m, t, ['tollways', 'ferries']),
    fetchOrsAvoidRoute(f, m, t, ['highways']),
  ]);

  const toRouteObj = (r) => r ? {
    waypoints: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: Math.round((r.distance / 1000) * 100) / 100,
    durationMin: Math.round((r.duration / 60) * 10) / 10,
  } : null;

  // Normal = OSRM route[0]
  const normalObj = toRouteObj(osrmResult?.routes?.[0]) || await fetchRoadRoute([f, m, t]);

  // Optimal = OSRM route[1] (genuine road alternative) → fallback ORS avoid-tollways
  const optimalObj = toRouteObj(osrmResult?.routes?.[1]) || orsAvoidResult;

  // Alternative = ORS avoid-highways (completely different road network) → OSRM route[2] → ORS standard
  const alternativeObj = orsHighwayResult
    || toRouteObj(osrmResult?.routes?.[2])
    || await fetchRoadRoute([f, m, t]); // last resort: same as normal (no off-road)

  const fallback = normalObj || { waypoints: [], distanceKm: null, durationMin: null };

  return {
    shortest:    (normalObj      || fallback).waypoints,
    optimal:     (optimalObj     || normalObj || fallback).waypoints,
    alternative: (alternativeObj || normalObj || fallback).waypoints,
    metrics: {
      normal:      { distanceKm: (normalObj      || fallback).distanceKm, durationMin: (normalObj      || fallback).durationMin },
      optimal:     { distanceKm: (optimalObj     || normalObj || fallback).distanceKm, durationMin: (optimalObj     || normalObj || fallback).durationMin },
      alternative: { distanceKm: (alternativeObj || normalObj || fallback).distanceKm, durationMin: (alternativeObj || normalObj || fallback).durationMin },
    },
  };
}

/** Fetch all OSRM routes (up to 3 alternatives) in one request */
async function fetchOsrmAllRoutes(f, m, t) {
  const coordStr = `${f[1]},${f[0]};${m[1]},${m[0]};${t[1]},${t[0]}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=false&alternatives=3`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.routes?.length ? data : null;
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('OSRM all-routes failed:', e.message);
    return null;
  }
}

/**
 * Fetch ORS route avoiding specified features — produces a genuinely different road path.
 * avoidFeatures: array like ['tollways','ferries'] or ['highways']
 */
async function fetchOrsAvoidRoute(f, m, t, avoidFeatures) {
  try {
    const body = {
      coordinates: [[f[1], f[0]], [m[1], m[0]], [t[1], t[0]]],
      instructions: false,
      geometry_simplify: false,
      options: { avoid_features: avoidFeatures },
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': import.meta.env.VITE_ORS_API_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const feat = data?.features?.[0];
    const coords = feat?.geometry?.coordinates;
    if (!coords || coords.length < 10) return null;
    const props = feat?.properties?.summary;
    return {
      waypoints: coords.map(([lng, lat]) => [lat, lng]),
      distanceKm: props?.distance ? Math.round((props.distance / 1000) * 100) / 100 : null,
      durationMin: props?.duration ? Math.round((props.duration / 60) * 10) / 10 : null,
    };
  } catch (e) {
    if (e.name !== 'AbortError') console.warn(`ORS avoid [${avoidFeatures}] failed:`, e.message);
    return null;
  }
}

/**
 * Reroute from current ambulance position to hospital.
 * Returns { primary, alternates } using real roads.
 */
export async function rerouteFromPosition(currentPos, hospitalPos) {
  const f = currentPos; // [lat, lng]
  const t = Array.isArray(hospitalPos) ? hospitalPos : [hospitalPos.lat, hospitalPos.lng];

  // Primary reroute via real roads
  const primary = await fetchRoadRoute([f, t], 'driving-car');
  if (!primary) return null;

  // Try to get an alternate at the same time
  let alternate = null;
  try {
    const coordStr = `${f[1]},${f[0]};${t[1]},${t[0]}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=false&alternatives=true`;
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const altRoute = data?.routes?.[1];
      if (altRoute?.geometry?.coordinates?.length > 2) {
        alternate = {
          waypoints: altRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          durationSecs: altRoute.duration,
          distanceMeters: altRoute.distance,
        };
      }
    }
  } catch (_) {}

  return { primary, alternates: alternate ? [alternate] : [] };
}

/**
 * Backwards-compat wrapper for code that still calls generateRouteWaypoints.
 */
export async function generateRouteWaypoints(from, through, to) {
  const { shortest } = await generateDualRoutes(from, through, to);
  return { primary: shortest, alternates: [] };
}

/**
 * Pick-up index in a route array (~42% along the route)
 */
export function getPickupIndex(route) {
  return Math.floor(route.length * 0.42);
}

/**
 * Bearing in degrees between two lat/lng pairs (for marker rotation)
 */
export function getBearing(from, to) {
  const lat1 = toRad(from[0]), lat2 = toRad(to[0]);
  const dLng = toRad(to[1] - from[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**
 * Generate static fallback hospitals near a given lat/lng.
 * Used when backend or Overpass API is unreachable.
 */
function generateFallbackHospitals(lat, lng) {
  const offsets = [
    { dlat:  0.018, dlng:  0.012, name: 'City General Hospital',     type: 'Multi-Specialty',  capability: 88, beds: 450, cardiac: true,  trauma: true,  neuro: true,  rating: 4.3 },
    { dlat: -0.022, dlng:  0.025, name: 'Apollo Medical Centre',     type: 'Super-Specialty',  capability: 94, beds: 320, cardiac: true,  trauma: true,  neuro: false, rating: 4.6 },
    { dlat:  0.031, dlng: -0.018, name: 'Metro Trauma & Care',       type: 'Trauma Centre',    capability: 82, beds: 200, cardiac: false, trauma: true,  neuro: true,  rating: 4.1 },
    { dlat: -0.009, dlng: -0.034, name: 'District Government Hospital', type: 'Government',   capability: 72, beds: 800, cardiac: false, trauma: true,  neuro: false, rating: 3.8 },
    { dlat:  0.041, dlng:  0.038, name: 'Sunrise Multi-Specialty',   type: 'Multi-Specialty',  capability: 79, beds: 150, cardiac: true,  trauma: false, neuro: false, rating: 4.0 },
  ];
  return offsets.map((o, i) => ({
    id: 1000 + i,
    name: o.name,
    shortName: o.name.length > 20 ? o.name.substring(0, 17) + '...' : o.name,
    lat: lat + o.dlat,
    lng: lng + o.dlng,
    type: o.type,
    capability: o.capability,
    beds: o.beds,
    cardiac: o.cardiac,
    trauma: o.trauma,
    neuro: o.neuro,
    burn: false,
    maternity: false,
    pediatric: i % 2 === 0,
    address: '',
    rating: o.rating,
    icon: '🏥',
    isFallback: true,
  }));
}

/**
 * Fetch nearby hospitals from our backend API (/api/hospitals/nearby).
 * Flow: Frontend -> Backend -> Overpass API -> Backend -> Frontend
 * Falls back to static generated hospitals when backend/Overpass is unreachable.
 */
export async function fetchHospitalsFromBackend(lat, lng) {
  try {
    const API_BASE = import.meta.env.VITE_BACKEND_URL || 'https://innovators-conclave-2k26-team-verte.vercel.app';
    const backendUrl = `${API_BASE}/api/hospitals/nearby?lat=${lat}&lng=${lng}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(backendUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    const data = await res.json();
    const hospitals = data.hospitals || [];
    if (hospitals.length > 0) return hospitals;
    // Overpass returned empty — fall through to static fallback
    throw new Error('Overpass returned 0 hospitals');
  } catch (error) {
    console.warn('Hospital fetch failed, using fallback data:', error.message);
    return generateFallbackHospitals(lat, lng);
  }
}

/** Backwards compatibility alias used by legacy callers in App.jsx */
export async function fetchNearbyHospitals(lat, lng) {
  return await fetchHospitalsFromBackend(lat, lng);
}
