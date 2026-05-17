import { useEffect, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix de iconos (Leaflet por defecto referencia paths que el bundler no resuelve).
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import { BRAND } from '@/config/branding';
// Centro inicial del mapa cuando un cliente no tiene coordenadas. Configurable
// por deployment via VITE_MAP_DEFAULT_CENTER (formato "lat,lng").
const DEFAULT_CENTER = BRAND.mapDefaultCenter;
const DEFAULT_ZOOM = 12;
const PICKED_ZOOM = 16;

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// Recentra el mapa cuando cambian las coordenadas externas (geocoding, GPS, etc.).
function Recenter({ lat, lng }) {
  const map = useMap();
  const last = useRef(null);
  useEffect(() => {
    if (lat == null || lng == null) return;
    const next = `${lat},${lng}`;
    if (last.current === next) return;
    last.current = next;
    map.setView([lat, lng], PICKED_ZOOM);
  }, [lat, lng, map]);
  return null;
}

export function LocationPicker({ lat, lng, onChange, height = 256 }) {
  const hasPoint = lat != null && lng != null;
  const center = hasPoint ? [lat, lng] : DEFAULT_CENTER;
  const zoom = hasPoint ? PICKED_ZOOM : DEFAULT_ZOOM;

  return (
    <div className="rounded-lg overflow-hidden border border-stone-200" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        <Recenter lat={lat} lng={lng} />
        {hasPoint && (
          <Marker
            position={[lat, lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = e.target.getLatLng();
                onChange(ll.lat, ll.lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
