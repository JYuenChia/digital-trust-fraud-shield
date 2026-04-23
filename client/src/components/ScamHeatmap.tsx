import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import crimeData from '@/assets/crimeStats.json';

type CrimePoint = {
  state: string;
  lat: number;
  lng: number;
  count: number;
};

function HeatLayer() {
  const map = useMap();

  useEffect(() => {
    const items = crimeData as CrimePoint[];
    const maxCount = Math.max(...items.map((item) => item.count), 1);

    const points: [number, number, number][] = items.map((point) => [
      point.lat,
      point.lng,
      // Keep each point visible while preserving relative intensity.
      Math.max(0.35, point.count / maxCount),
    ]);

    const bounds = L.latLngBounds(items.map((point) => [point.lat, point.lng] as [number, number]));
    map.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 6,
    });

    const heatLayer = (L as any).heatLayer(points, {
      radius: 20,
      blur: 15,
      maxZoom: 10,
      minOpacity: 0.5,
      gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map]);

  return null;
}

export default function ScamHeatmap() {
  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-inner border border-border">
      <MapContainer center={[4.21, 101.97]} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <HeatLayer />
      </MapContainer>
    </div>
  );
}
