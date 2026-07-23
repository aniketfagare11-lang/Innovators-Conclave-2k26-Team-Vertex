import React, { useEffect, useRef, useState, useContext } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import { SimulationContext } from '../context/SimulationContext';

// Fix default leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── DivIcon factory ───────────────────────────────────────────────
function divIcon(html, size = [32, 32]) {
  return L.divIcon({ html, className: '', iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });
}

const label = (text, color) =>
  `<span style="position:absolute;bottom:-17px;left:50%;transform:translateX(-50%);font-size:9px;white-space:nowrap;color:${color};font-family:monospace;background:rgba(0,0,0,0.6);padding:0 3px;border-radius:2px">${text}</span>`;

// Hospital icons — two variants: with name label and icon-only
const hospIcon = (cls, size, color, name, showName) => divIcon(
  `<div class="hospital-marker ${cls}" style="position:relative">🏥${
    showName ? label(name, color) : ''
  }</div>`, size
);

const icons = {
  emergency: divIcon(`<div class="emergency-marker">🆘</div>`),
  ambulanceSelected:  (name) => divIcon(`<div class="ambulance-marker selected"  style="position:relative">🚑${label(name, '#00d4ff')}</div>`, [36, 36]),
  ambulanceAvailable: (name) => divIcon(`<div class="ambulance-marker available" style="position:relative">🚑${label(name, '#00ff88')}</div>`),
  ambulanceBusy:      (name) => divIcon(`<div class="ambulance-marker busy"      style="position:relative">🚑${label(name, '#ffa500')}</div>`),
  movingAmbulance: divIcon(`<div class="moving-ambulance">🚑</div>`, [38, 38]),
};

// Build hospital icon based on rank and whether name should be shown
function getHospitalIcon(hospital, rank, showName) {
  if (rank === 1) return hospIcon('rank-1', [30, 30], '#00ff88', hospital.shortName, showName);
  if (rank === 2) return hospIcon('rank-2', [28, 28], '#00d4ff', hospital.shortName, showName);
  if (rank === 3) return hospIcon('rank-3', [28, 28], '#ffa500', hospital.shortName, showName);
  return hospIcon('default',  [24, 24], '#4a7090', hospital.shortName, showName);
}

// ─── Map click handler ─────────────────────────────────────────────
function MapClickHandler({ onMapClick, active }) {
  useMapEvents({ click(e) { if (active) onMapClick(e.latlng); } });
  return null;
}

// ─── Main MapView ──────────────────────────────────────────────────
export default function MapView({
  emergencyLocation,
  ambulances,
  selectedAmbulance,
  hospitals,
  rankedHospitals,
  selectedHospital,
  shortestRoute,
  optimalRoute,
  alternativeRoute,
  route,
  alternateRoutes,
  ambulancePosition,
  trafficSegments,
  trafficEnabled,
  phase,
  onMapClick,
  onSelectAmbulance,
  onSelectHospital,
  pickupIndex,
  onSelectAlternate,
  activeRouteType,
  routeMode,
}) {
  const mapRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useContext(SimulationContext);
  const tomtomKey = import.meta.env.VITE_TOMTOM_KEY;

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        if (mapRef.current) mapRef.current.flyTo([lat, lon], 14, { duration: 1.5 });
      } else {
        alert('Location not found');
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleLiveLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => mapRef.current?.flyTo([coords.latitude, coords.longitude], 15, { duration: 1.5 }),
        (err) => alert('Error obtaining location: ' + err.message)
      );
    } else {
      alert('Geolocation not supported by this browser.');
    }
  };

  useEffect(() => {
    if (emergencyLocation && mapRef.current) {
      mapRef.current.flyTo([emergencyLocation.lat, emergencyLocation.lng], 14, { duration: 1.2 });
    }
  }, [emergencyLocation]);

  useEffect(() => {
    if (route && route.length > 5 && mapRef.current) {
      mapRef.current.fitBounds(L.latLngBounds(route), { padding: [60, 60], duration: 1.5 });
    }
  }, [route]);

  const canClick = phase === 'idle' || phase === 'located';

  // Show hospital names on map labels only after ambulance is allocated
  const showHospitalNames = phase === 'enroute' || phase === 'arrived';

  const hospitalRankMap = {};
  rankedHospitals.forEach((h, i) => { hospitalRankMap[h.id] = i + 1; });

  const getAmbulanceIcon = (amb) => {
    if (selectedAmbulance?.id === amb.id) return icons.ambulanceSelected(amb.name);
    if (amb.status === 'busy') return icons.ambulanceBusy(amb.name);
    return icons.ambulanceAvailable(amb.name);
  };

  const baseUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* Search & Live Location bar */}
      <div className="absolute top-2.5 left-2 md:left-12 z-[1000] flex gap-1.5 bg-white/90 dark:bg-[#040c18]/90 p-1.5 rounded-lg border border-gray-200 dark:border-[#0f3060] backdrop-blur-md">
        <input
          type="text"
          placeholder="Search place..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="bg-transparent border border-gray-300 dark:border-[#0f3060] text-gray-900 dark:text-[#c8e0f4] px-2 py-1 rounded outline-none text-xs w-28 md:w-44 md:text-sm md:px-3 md:py-1.5"
        />
        <button onClick={handleSearch} className="bg-[#0284c7] text-white px-2 py-1 rounded text-xs font-semibold md:px-3 md:py-1.5 md:text-sm">
          Search
        </button>
        <button onClick={handleLiveLocation} className="bg-gray-100 dark:bg-[#0f3060] text-gray-800 dark:text-[#c8e0f4] border border-gray-300 dark:border-[#00d4ff] px-2 py-1 rounded text-xs font-semibold md:px-3 md:py-1.5 md:text-sm">
          📍
        </button>
      </div>

      {/* Alternate route legend */}
      {alternateRoutes && alternateRoutes.length > 0 && (
        <div className="absolute top-2.5 right-4 z-[1000] bg-white/90 dark:bg-[#040c18]/90 border border-gray-200 dark:border-[#0f3060] rounded-lg p-2 flex flex-col gap-1 text-xs backdrop-blur-md">
          <div style={{ fontFamily: 'var(--font-display)', color: '#ffa500', fontSize: 9, letterSpacing: '0.1em', marginBottom: 2 }}>
            ALTERNATE ROUTES
          </div>
          {alternateRoutes.map((alt, i) => (
            <button
              key={i}
              onClick={() => onSelectAlternate && onSelectAlternate(i)}
              style={{
                background: '#ffa50015', border: '1px solid #ffa50044', color: '#ffa500',
                padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-mono)',
                fontSize: 9, textAlign: 'left',
              }}
            >
              ↪ Alt {i + 1} — {Math.round(alt.distanceMeters / 1000 * 10) / 10} km · {Math.round(alt.durationSecs / 60)} min
            </button>
          ))}
        </div>
      )}

      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        zoomControl={true}
        attributionControl={true}
      >
        {/* Base tile layer */}
        <TileLayer
          key={`base-${theme}`}
          url={baseUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* TomTom Real-Time Traffic Tile Layer (if API key present) */}
        {tomtomKey && trafficEnabled && (
          <TileLayer
            key={`traffic-${theme}`}
            url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${tomtomKey}&tileSize=256`}
            attribution='Traffic &copy; <a href="https://www.tomtom.com">TomTom</a>'
            opacity={0.75}
            maxZoom={19}
            zIndex={400}
          />
        )}

        <MapClickHandler onMapClick={onMapClick} active={canClick} />

        {/* ── Alternate routes (orange dashed) ────────────────────── */}
        {alternateRoutes && alternateRoutes.map((alt, i) => (
          alt.waypoints.length > 1 && (
            <Polyline
              key={`alt-${i}`}
              positions={alt.waypoints}
              pathOptions={{ color: '#ff9800', weight: 4, opacity: 0.55, dashArray: '10 6' }}
            />
          )
        ))}

        {/* ── Traffic heat segments on active route ─────────────── */}
        {trafficEnabled && trafficSegments.map((seg, i) =>
          seg.positions.length > 1 && (
            <React.Fragment key={`traffic-${i}`}>
              {/* Glow / halo */}
              <Polyline
                positions={seg.positions}
                pathOptions={{ color: seg.color, weight: seg.weight + 6, opacity: 0.15 }}
              />
              {/* Main traffic band */}
              <Polyline
                positions={seg.positions}
                pathOptions={{ color: seg.color, weight: seg.weight, opacity: 0.72, lineCap: 'round', lineJoin: 'round' }}
              />
            </React.Fragment>
          )
        )}

        {/* ── NORMAL route — blue ──────────────────────────────────── */}
        {shortestRoute && shortestRoute.length > 1 && (
          <>
            <Polyline positions={shortestRoute} pathOptions={{ color: '#00d4ff', weight: 10, opacity: routeMode === 'normal' ? 0.15 : 0.05 }} />
            <Polyline
              positions={shortestRoute}
              pathOptions={{
                color: '#00d4ff',
                weight: routeMode === 'normal' ? 5 : 2,
                opacity: routeMode === 'normal' ? 0.95 : 0.25,
                dashArray: routeMode === 'normal' ? undefined : '8 6',
              }}
            />
          </>
        )}

        {/* ── OPTIMAL route — green ─────────────────────────────────── */}
        {optimalRoute && optimalRoute.length > 1 && (
          <>
            <Polyline positions={optimalRoute} pathOptions={{ color: '#00ff88', weight: 10, opacity: routeMode === 'optimal' ? 0.15 : 0.05 }} />
            <Polyline
              positions={optimalRoute}
              pathOptions={{
                color: '#00ff88',
                weight: routeMode === 'optimal' ? 5 : 2,
                opacity: routeMode === 'optimal' ? 0.95 : 0.25,
                dashArray: routeMode === 'optimal' ? undefined : '8 6',
              }}
            />
            {routeMode === 'optimal' && pickupIndex > 0 && (
              <Polyline positions={optimalRoute.slice(0, pickupIndex + 1)} pathOptions={{ color: '#ffe066', weight: 4, opacity: 0.90 }} />
            )}
          </>
        )}

        {/* ── ALTERNATIVE route — purple ────────────────────────────── */}
        {alternativeRoute && alternativeRoute.length > 1 && (
          <>
            <Polyline positions={alternativeRoute} pathOptions={{ color: '#c084fc', weight: 10, opacity: routeMode === 'alternative' ? 0.15 : 0.05 }} />
            <Polyline
              positions={alternativeRoute}
              pathOptions={{
                color: '#c084fc',
                weight: routeMode === 'alternative' ? 5 : 2,
                opacity: routeMode === 'alternative' ? 0.95 : 0.25,
                dashArray: routeMode === 'alternative' ? undefined : '8 6',
              }}
            />
            {routeMode === 'alternative' && pickupIndex > 0 && (
              <Polyline positions={alternativeRoute.slice(0, pickupIndex + 1)} pathOptions={{ color: '#ffe066', weight: 4, opacity: 0.90 }} />
            )}
          </>
        )}

        {/* Normal mode pickup leg */}
        {routeMode === 'normal' && shortestRoute && shortestRoute.length > 1 && pickupIndex > 0 && (
          <Polyline positions={shortestRoute.slice(0, pickupIndex + 1)} pathOptions={{ color: '#ffffff', weight: 4, opacity: 0.85 }} />
        )}

        {/* ── Hospital markers ─── only selected after dispatch ─────── */}
        {hospitals
          .filter(hospital =>
            // After ambulance dispatched, only show the destination hospital
            (phase === 'enroute' || phase === 'arrived')
              ? hospital.id === selectedHospital?.id
              : true
          )
          .map(hospital => (
          <Marker
            key={`hosp-${hospital.id}`}
            position={[hospital.lat, hospital.lng]}
            icon={getHospitalIcon(hospital, hospitalRankMap[hospital.id], showHospitalNames)}
            eventHandlers={{ click: () => onSelectHospital(hospital) }}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)', minWidth: 190 }}>
                <div style={{ fontWeight: 700, color: '#00d4ff', marginBottom: 4 }}>{hospital.name}</div>
                <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{hospital.type}</div>
                <div style={{ fontSize: 12 }}>🛏 {hospital.beds} beds &nbsp; ⭐ {hospital.rating}</div>
                {hospital.address && <div style={{ fontSize: 11, marginTop: 4, color: '#888' }}>{hospital.address}</div>}
                <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {hospital.cardiac  && <span style={{ background: '#ff333322', color: '#ff6666', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>❤️ Cardiac</span>}
                  {hospital.trauma   && <span style={{ background: '#ffa50022', color: '#ffa500', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>🩹 Trauma</span>}
                  {hospital.neuro    && <span style={{ background: '#00d4ff22', color: '#00d4ff', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>🧠 Neuro</span>}
                </div>
                {hospitalRankMap[hospital.id] && (
                  <div style={{ marginTop: 6, fontWeight: 700, color: '#00ff88', fontSize: 12 }}>
                    🏆 AI Rank #{hospitalRankMap[hospital.id]}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ── Static ambulance markers ───────────────────────────── */}
        {ambulances.map(amb =>
          (phase !== 'enroute' && phase !== 'arrived') && (
            <Marker
              key={`amb-${amb.id}`}
              position={[amb.lat, amb.lng]}
              icon={getAmbulanceIcon(amb)}
              eventHandlers={{ click: () => onSelectAmbulance(amb) }}
              zIndexOffset={selectedAmbulance?.id === amb.id ? 500 : 0}
            >
              <Popup>
                <div style={{ fontFamily: 'var(--font-body)', minWidth: 165 }}>
                  <div style={{ fontWeight: 700, color: '#00d4ff' }}>{amb.name}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{amb.type}</div>
                  <div style={{ fontSize: 12 }}>🔧 Equipment: {amb.equipment}%</div>
                  <div style={{ fontSize: 12 }}>
                    Status: <span style={{ color: amb.status === 'available' ? '#00ff88' : '#ffa500', fontWeight: 600 }}>
                      {amb.status.toUpperCase()}
                    </span>
                  </div>
                  {amb.distance && <div style={{ fontSize: 12 }}>📍 {amb.distance} km away</div>}
                  {amb.score    && <div style={{ fontSize: 12, color: '#00ff88', marginTop: 4 }}>AI Score: {amb.score}</div>}
                </div>
              </Popup>
            </Marker>
          )
        )}

        {/* ── Emergency marker ───────────────────────────────────── */}
        {emergencyLocation && (
          <Marker position={[emergencyLocation.lat, emergencyLocation.lng]} icon={icons.emergency} zIndexOffset={1000}>
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)' }}>
                <div style={{ fontWeight: 700, color: '#ff3333' }}>🆘 Emergency Location</div>
                <div style={{ fontSize: 11, marginTop: 4, color: '#aaa' }}>
                  {emergencyLocation.lat.toFixed(5)}, {emergencyLocation.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ── Moving ambulance ───────────────────────────────────── */}
        {ambulancePosition && (phase === 'enroute' || phase === 'arrived') && (
          <Marker position={ambulancePosition} icon={icons.movingAmbulance} zIndexOffset={2000}>
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)' }}>
                <div style={{ fontWeight: 700, color: '#00d4ff' }}>🚑 {selectedAmbulance?.name}</div>
                <div style={{ fontSize: 12, color: '#00ff88' }}>Live Tracking Active</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Click hint */}
      {canClick && !emergencyLocation && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#040c18]/85 border border-gray-200 dark:border-[#0f3060] rounded-lg px-4 py-2 z-[800] text-[13px] text-gray-800 dark:text-[#c8e0f4] backdrop-blur-md pointer-events-none shadow-lg">
          📍 Click anywhere on the map to set emergency location
        </div>
      )}

      {/* Route + Traffic legend */}
      {(shortestRoute?.length > 1 || optimalRoute?.length > 1 || alternativeRoute?.length > 1) && (
        <div style={{
          position: 'absolute', bottom: 52, left: 16, zIndex: 900,
          background: 'rgba(4,12,24,0.88)', border: '1px solid #0f3060',
          borderRadius: 8, padding: '8px 12px',
          backdropFilter: 'blur(10px)', fontSize: 10,
          fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          <div style={{ color: '#4a7090', fontSize: 8, letterSpacing: '0.08em', marginBottom: 2 }}>ROUTES</div>
          {[
            { color: '#00ff88', label: '🧠 Optimal', id: 'optimal' },
            { color: '#00d4ff', label: '🛣️ Normal',  id: 'normal' },
            { color: '#c084fc', label: '🔀 Alternative', id: 'alternative' },
          ].map(({ color, label, id }) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 3, background: color, borderRadius: 2, opacity: routeMode === id ? 1 : 0.35 }} />
              <span style={{ color: routeMode === id ? color : '#4a7090' }}>
                {label} {routeMode === id ? '(ACTIVE)' : ''}
              </span>
            </div>
          ))}
          {trafficEnabled && (
            <>
              <div style={{ color: '#4a7090', fontSize: 8, letterSpacing: '0.08em', marginTop: 4, marginBottom: 2 }}>TRAFFIC</div>
              {[['#00c853', 'LOW'], ['#ffd600', 'MED'], ['#ff1744', 'HIGH']].map(([color, lbl]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 4, background: color, borderRadius: 2 }} />
                  <span style={{ color: '#8ea8c0' }}>{lbl}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

    </div>
  );
}
