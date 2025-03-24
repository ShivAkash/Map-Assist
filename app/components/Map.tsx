'use client';

import { useEffect, useRef, useState } from 'react';
import { Location } from '../types/mobility';

// Only import Leaflet on the client side
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  require('leaflet/dist/leaflet.css');
}

interface MapProps {
  currentLocation: Location;
  onLocationChange: (lat: number, lng: number) => void;
  routes: any[];
}

export default function Map({ currentLocation, onLocationChange, routes }: MapProps) {
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastLocationRef = useRef<Location | null>(null);

  // Initialize map
  useEffect(() => {
    // Skip if Leaflet is not available (server-side)
    if (!L) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current && containerRef.current) {
      console.log('Initializing map with location:', currentLocation); // Debug log
      
      // Initialize map with current location
      mapRef.current = L.map('map', {
        center: [currentLocation.lat, currentLocation.lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: true
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(mapRef.current);

      // Add click handler
      mapRef.current.on('click', (e: any) => {
        console.log('Map clicked at:', e.latlng); // Debug log
        onLocationChange(e.latlng.lat, e.latlng.lng);
      });

      // Create user location marker
      userMarkerRef.current = L.marker([currentLocation.lat, currentLocation.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(mapRef.current);

      isInitializedRef.current = true;
      lastLocationRef.current = currentLocation;
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map view and marker when currentLocation changes
  useEffect(() => {
    if (mapRef.current && currentLocation && isInitializedRef.current) {
      const { lat, lng } = currentLocation;
      
      // Skip if location hasn't changed
      if (lastLocationRef.current && 
          lastLocationRef.current.lat === lat && 
          lastLocationRef.current.lng === lng) {
        return;
      }

      // Validate coordinates
      if (isNaN(lat) || isNaN(lng) || 
          lat < -90 || lat > 90 || 
          lng < -180 || lng > 180) {
        console.error('Invalid coordinates:', { lat, lng });
        return;
      }

      console.log('Updating map location to:', { lat, lng }); // Debug log
      
      // Update map view
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
      
      // Update marker position
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([lat, lng]);
      }

      lastLocationRef.current = currentLocation;
    }
  }, [currentLocation]);

  // Handle routes
  useEffect(() => {
    if (!mapRef.current || !L) return;

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
          console.log('Processing route:', route); // Debug log
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

          console.log('Creating route line with coordinates:', coordinates); // Debug log
          // Create the route line
          const routeLine = L.polyline(coordinates, {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.8
          }).addTo(map);

          // Add end marker
          const endCoord = coordinates[coordinates.length - 1];
          L.marker(endCoord, {
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div class="w-6 h-6 bg-red-500 rounded-full border-4 border-white shadow-lg"></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
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
  }, [routes]);

  return (
    <div 
      ref={containerRef}
      id="map" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        overflow: 'hidden'
      }} 
    />
  );
}