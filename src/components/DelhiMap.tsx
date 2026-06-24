'use client';

import { useEffect, useState } from 'react';

interface FlagMarker {
  id: string;
  flagId: string;
  location: string;
  latitude: number;
  longitude: number;
  zone: string;
  status: string;
  healthScore: number;
  fabricType: string;
}

interface DelhiMapProps {
  flags: FlagMarker[];
  onFlagClick: (flag: FlagMarker) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Active: '#22C55E',
  Damaged: '#EF4444',
  Retired: '#9CA3AF',
  UnderRepair: '#F59E0B',
};

export default function DelhiMap({ flags, onFlagClick }: DelhiMapProps) {
  const [mounted, setMounted] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Fix default marker icon issue
      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map('delhi-map', {
        center: [28.6139, 77.2090],
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Add flag markers
      flags.forEach((flag) => {
        const color = STATUS_COLORS[flag.status] || '#6B7280';
        const size = flag.status === 'Damaged' ? 14 : 10;

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: ${color};
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.5)'" onmouseout="this.style.transform='scale(1)'"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([flag.latitude, flag.longitude], { icon }).addTo(map);

        marker.bindPopup(`
          <div style="min-width: 180px; font-family: system-ui;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">${flag.flagId} — ${flag.location}</div>
            <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Zone: ${flag.zone}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
              <span style="font-size: 11px;">${flag.status}</span>
            </div>
            <div style="font-size: 11px; color: #666;">Health: ${flag.healthScore}% | Fabric: ${flag.fabricType.replace(/([A-Z])/g, ' $1').trim()}</div>
            <div style="margin-top: 6px; font-size: 10px; color: #999;">Click marker for details</div>
          </div>
        `);

        marker.on('click', () => onFlagClick(flag));
      });

      // Add zone circles
      const zones: Record<string, [number, number]> = {
        Central: [28.62, 77.22],
        South: [28.53, 77.22],
        North: [28.69, 77.21],
        East: [28.63, 77.29],
        West: [28.63, 77.09],
        'New Delhi': [28.59, 77.20],
        'North West': [28.71, 77.11],
        'South West': [28.56, 77.18],
      };

      Object.entries(zones).forEach(([name, center]) => {
        L.circle(center, {
          radius: 3000,
          color: '#FF9933',
          fillColor: '#FF9933',
          fillOpacity: 0.04,
          weight: 1,
          dashArray: '5 5',
        }).addTo(map);

        L.marker(center, {
          icon: L.divIcon({
            className: 'zone-label',
            html: `<div style="font-size: 10px; font-weight: 600; color: #FF9933; white-space: nowrap; text-shadow: 1px 1px 2px white;">${name}</div>`,
            iconSize: [0, 0],
          }),
        }).addTo(map);
      });

      setMapInstance(map);
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [mounted, flags]);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] rounded-xl bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        id="delhi-map"
        className="w-full h-[500px] rounded-xl border border-gray-200"
        style={{ zIndex: 0 }}
      />
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg border border-gray-100 z-[1000]">
        <div className="text-[10px] font-semibold text-gray-500 mb-2">FLAG STATUS</div>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-gray-600">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
