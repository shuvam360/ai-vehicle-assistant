import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [22.5726, 88.3639]; // Kolkata center [lat, lon]

export function RouteMap({ routeData = null }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef([]);

  // Initialize Leaflet map instance once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 13,
        zoomControl: true,
      });

      // Standard OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Handle container resize when switching tabs
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  // Update routes, polylines, and markers whenever routeData changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove previous route polylines and markers
    routeLayersRef.current.forEach(layer => {
      try {
        map.removeLayer(layer);
      } catch {
        // ignore
      }
    });
    routeLayersRef.current = [];

    if (!routeData) {
      // Default idle state: show current vehicle position pin
      const idleIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: `<div class="marker-pulse-wrapper"><div class="marker-dot-vehicle">🚗</div></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const idleMarker = L.marker(DEFAULT_CENTER, { icon: idleIcon })
        .addTo(map)
        .bindPopup('<strong>Vehicle Position</strong><br/>Kolkata Origin');
      routeLayersRef.current.push(idleMarker);
      map.setView(DEFAULT_CENTER, 13);
      return;
    }

    const allPoints = [];

    // 1. Draw Alternative Routes first (lighter dashed line)
    if (routeData.alternatives && Array.isArray(routeData.alternatives)) {
      routeData.alternatives.forEach((alt, idx) => {
        if (!alt.geometry || !Array.isArray(alt.geometry)) return;
        // Backend returns [lon, lat] GeoJSON coordinates -> convert to [lat, lon] for Leaflet
        const altLatLons = alt.geometry.map(([lon, lat]) => [lat, lon]);
        if (altLatLons.length === 0) return;

        const altLine = L.polyline(altLatLons, {
          color: '#94a3b8',
          weight: 4,
          opacity: 0.75,
          dashArray: '8, 10',
          lineCap: 'round',
        }).addTo(map);

        altLine.bindPopup(
          `<strong>Alternative Route ${idx + 1}</strong><br/>Distance: ${alt.distance_km} km<br/>Est. Duration: ${alt.duration_min} min`
        );

        routeLayersRef.current.push(altLine);
        allPoints.push(...altLatLons);
      });
    }

    // 2. Draw Primary Route (prominent solid line)
    if (routeData.primary && routeData.primary.geometry) {
      const primaryLatLons = routeData.primary.geometry.map(([lon, lat]) => [lat, lon]);
      if (primaryLatLons.length > 0) {
        const primaryLine = L.polyline(primaryLatLons, {
          color: '#06b6d4',
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        primaryLine.bindPopup(
          `<strong>Primary Route</strong><br/>Distance: ${routeData.primary.distance_km} km<br/>Est. Duration: ${routeData.primary.duration_min} min`
        );

        routeLayersRef.current.push(primaryLine);
        allPoints.push(...primaryLatLons);
      }
    }

    // 3. Start Marker (Vehicle Origin)
    const startCoord = routeData.start_coordinates || [88.3639, 22.5726];
    const startLatLon = [startCoord[1], startCoord[0]];
    allPoints.push(startLatLon);

    const startIcon = L.divIcon({
      className: 'custom-start-marker',
      html: `<div class="marker-pulse-wrapper"><div class="marker-dot-start">🚗</div><div class="marker-label">START</div></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const startMarker = L.marker(startLatLon, { icon: startIcon })
      .addTo(map)
      .bindPopup('<strong>Vehicle Origin</strong><br/>Kolkata GPS Lock');
    routeLayersRef.current.push(startMarker);

    // 4. End Marker (Destination)
    const endCoord = routeData.end_coordinates || startCoord;
    const endLatLon = [endCoord[1], endCoord[0]];
    allPoints.push(endLatLon);

    const endIcon = L.divIcon({
      className: 'custom-end-marker',
      html: `<div class="marker-pulse-wrapper"><div class="marker-dot-end">🏁</div><div class="marker-label">DEST</div></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const endMarker = L.marker(endLatLon, { icon: endIcon })
      .addTo(map)
      .bindPopup(`<strong>${routeData.destination || 'Destination'}</strong><br/>Primary ETA: ${routeData.primary?.duration_min || '--'} min`);
    routeLayersRef.current.push(endMarker);

    // 5. Fit map bounds to encompass all route points
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
      });
    }
  }, [routeData]);

  return (
    <div className="map-wrapper-card">
      <div id="route-map-container" ref={mapContainerRef} className="leaflet-map-element" />
    </div>
  );
}
