'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '../types/mobility';

interface MapProps {
  currentLocation: Location;
  onLocationChange: (lat: number, lng: number) => void;
  routes: any[];
}

export default function Map({ currentLocation, onLocationChange, routes }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map and get user location
  useEffect(() => {
    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      // Initialize map with default view
      mapRef.current = L.map('map').setView([0, 0], 1);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(mapRef.current);

      // Add click handler
      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      });

      // Start locating
      mapRef.current.locate({
        setView: true,
        maxZoom: 16,
        enableHighAccuracy: true,
        timeout: 10000
      });

      // Handle location found
      mapRef.current.on('locationfound', (e: L.LocationEvent) => {
        const location = e.latlng;
        setUserLocation(location);
        onLocationChange(location.lat, location.lng);

        // Update or create user marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(location);
        } else {
          userMarkerRef.current = L.marker(location, {
            icon: L.divIcon({
              className: 'custom-marker',
              html: '<div class="marker-content">📍</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            })
          }).addTo(mapRef.current!);
        }
      });

      // Handle location error
      mapRef.current.on('locationerror', (e: L.ErrorEvent) => {
        console.error('Geolocation error:', e.message);
      });
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle routes
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      // Clear existing route layers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Polyline) {
          map.removeLayer(layer);
        }
      });

      // Add route if available
      if (routes && routes.length > 0) {
        const route = routes[0];
        if (route.geometry && route.geometry.coordinates && route.geometry.coordinates.length > 0) {
          try {
            // The coordinates are in [lng, lat] format from OSRM
            const coordinates = route.geometry.coordinates.map((coord: [number, number]) => {
              if (!Array.isArray(coord) || coord.length !== 2 || 
                  typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
                throw new Error('Invalid coordinate format');
              }
              // Convert from [lng, lat] to [lat, lng] for Leaflet
              return [Number(coord[1]), Number(coord[0])];
            });

            // Validate coordinates before creating the route line
            if (coordinates.length < 2) {
              console.warn('Route has less than 2 coordinates, skipping route visualization');
              return;
            }

            // Create the route line
            const routeLine = L.polyline(coordinates as L.LatLngExpression[], {
              color: '#3b82f6',
              weight: 5,
              opacity: 0.8
            }).addTo(map);

            // Add end marker
            const endCoord = coordinates[coordinates.length - 1];
            L.marker(endCoord as L.LatLngExpression, {
              icon: L.divIcon({
                className: 'custom-marker',
                html: '<div class="marker-content">🏁</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
              })
            }).addTo(map);

            // Fit bounds to show the entire route
            const bounds = routeLine.getBounds();
            map.fitBounds(bounds, { padding: [50, 50] });
          } catch (error) {
            console.error('Error creating route visualization:', error);
            console.log('Route data:', route);
          }
        }
      }
    }
  }, [routes]);

  return (
    <div id="map" style={{ width: '100%', height: '100%' }} />
  );
} 