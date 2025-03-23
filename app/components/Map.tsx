'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.locatecontrol';
import 'leaflet.locatecontrol/dist/L.Control.Locate.css';
import { Location } from '../types/mobility';

// Extend Leaflet types to include locate control
declare module 'leaflet' {
  namespace Control {
    interface LocateOptions {
      position?: string;
      strings?: {
        title?: string;
        popup?: string;
        outsideMapBoundsMsg?: string;
      };
      locateOptions?: {
        maxZoom?: number;
        enableHighAccuracy?: boolean;
      };
    }

    class Locate extends Control {
      constructor(options?: LocateOptions);
      start(): void;
    }
  }
}

interface MapProps {
  currentLocation: Location;
  onLocationChange: (lat: number, lng: number) => void;
  routes: any[];
}

export default function Map({ currentLocation, onLocationChange, routes }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const [routeLayers, setRouteLayers] = useState<L.Polyline[]>([]);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [currentLocation.lat, currentLocation.lng],
        13
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Add click handler
      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      });

      // Start locating
      mapRef.current.locate({ 
        setView: true,
        maxZoom: 16,
        enableHighAccuracy: true
      });

      // Handle location found
      mapRef.current.on('locationfound', (e: L.LocationEvent) => {
        setUserLocation(e.latlng);
        onLocationChange(e.latlng.lat, e.latlng.lng);
        
        // Add a marker for the user's location
        L.marker(e.latlng, {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-content">📍</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          })
        }).addTo(mapRef.current!)
          .bindPopup('You are here')
          .openPopup();
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

  // Update map view when location changes
  useEffect(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.setView(userLocation, 13);
    }
  }, [userLocation]);

  // Handle markers and routes
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      // Clear existing layers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // Add markers for start and end locations
      if (userLocation) {
        const startMarker = L.marker(userLocation, {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-content">📍</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          })
        }).addTo(map);
      }

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
              return [coord[1], coord[0]];
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
            const endMarker = L.marker(endCoord as L.LatLngExpression, {
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
  }, [userLocation, routes]);

  return (
    <div className="w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      <style jsx global>{`
        .custom-marker {
          background: none;
          border: none;
        }
        .marker-content {
          font-size: 24px;
          text-align: center;
          line-height: 30px;
        }
      `}</style>
    </div>
  );
} 