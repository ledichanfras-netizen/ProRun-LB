import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface WorkoutMapProps {
  points?: [number, number][]; // [lat, lng] array
  height?: string;
  interactive?: boolean;
  currentPosition?: [number, number] | null; // For live tracking
}

export const WorkoutMap: React.FC<WorkoutMapProps> = ({
  points = [],
  height = '240px',
  interactive = true,
  currentPosition = null
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: interactive,
        attributionControl: false,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: false,
        doubleClickZoom: interactive
      });

      // CartoDB Positron Dark style or OpenStreetMap standard
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      mapInstanceRef.current = map;
      markerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    // Default center if no points yet
    if (points.length === 0 && !currentPosition) {
      map.setView([-23.5505, -46.6333], 13); // Default SP
      return;
    }

    // Draw route polyline if points exist
    if (points.length > 0) {
      if (polylineLayerRef.current) {
        polylineLayerRef.current.setLatLngs(points);
      } else {
        polylineLayerRef.current = L.polyline(points, {
          color: '#10b981', // Emerald ProRun
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);
      }

      // Start Marker (Green circle)
      const startPoint = points[0];
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: `<div style="background-color:#10b981; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      L.marker(startPoint, { icon: startIcon }).addTo(markerGroup);

      // Finish Marker (Checkered flag or orange circle)
      if (points.length > 1) {
        const finishPoint = points[points.length - 1];
        const finishIcon = L.divIcon({
          className: 'custom-finish-marker',
          html: `<div style="background-color:#f59e0b; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        L.marker(finishPoint, { icon: finishIcon }).addTo(markerGroup);
      }

      // Fit bounds
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [25, 25], maxZoom: 16 });
      } catch (e) {
        // Safe fallback
      }
    }

    // Draw current live position marker
    if (currentPosition) {
      const liveIcon = L.divIcon({
        className: 'custom-live-marker',
        html: `<div style="position:relative; width:18px; height:18px;">
          <div style="position:absolute; width:18px; height:18px; border-radius:50%; background:rgba(16,185,129,0.4); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:absolute; top:3px; left:3px; width:12px; height:12px; border-radius:50%; background:#10b981; border:2px solid white;"></div>
        </div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      L.marker(currentPosition, { icon: liveIcon }).addTo(markerGroup);

      if (points.length <= 1) {
        map.setView(currentPosition, 16);
      }
    }

    // Trigger resize to prevent grey tiles
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [points, currentPosition, interactive]);

  // Clean up
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%', borderRadius: '1.25rem', overflow: 'hidden', zIndex: 0 }}
      className="border border-white/10 shadow-inner"
    />
  );
};
