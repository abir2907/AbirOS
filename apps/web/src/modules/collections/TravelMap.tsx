import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { PlaceRow } from '@/lib/api';

/** Free OpenStreetMap map of places that have coordinates. */
export function TravelMap({ places }: { places: PlaceRow[] }) {
  const pts = places.filter((p) => p.lat != null && p.lng != null);
  return (
    <div className="h-72 overflow-hidden rounded-lg border">
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pts.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat!, p.lng!]}
            radius={7}
            pathOptions={{
              color: p.status === 'visited' ? '#34d399' : '#7c7bf5',
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              {p.name}
              {p.country ? `, ${p.country}` : ''}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
