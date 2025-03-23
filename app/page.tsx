// pages/index.tsx
"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Chat from './components/Chat';
import { Location } from './types/mobility';

// Dynamically import the Map component to disable SSR for Leaflet
const Map = dynamic(() => import('./components/Map'), {
  ssr: false,
});

export default function Home() {
  const [currentLocation, setCurrentLocation] = useState<Location>({
    lat: 51.505,
    lng: -0.09,
    name: 'Loading location...'
  });
  const [mobilityData, setMobilityData] = useState<any>(null);

  useEffect(() => {
    // Get user's location using browser's Geolocation API
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Get location name using reverse geocoding
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            setCurrentLocation({
              lat: latitude,
              lng: longitude,
              name: data.display_name || 'Your location'
            });
          } catch (error) {
            console.error('Error getting location name:', error);
            setCurrentLocation({
              lat: latitude,
              lng: longitude,
              name: 'Your location'
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setCurrentLocation({
            lat: 51.505,
            lng: -0.09,
            name: 'London, UK (default)'
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, []);

  const handleLocationChange = (lat: number, lng: number) => {
    setCurrentLocation(prev => ({
      ...prev,
      lat,
      lng
    }));
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]">
          <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
            <Map
              currentLocation={currentLocation}
              onLocationChange={handleLocationChange}
              routes={mobilityData?.routes || []}
            />
          </div>
          <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
            <Chat
              currentLocation={currentLocation}
              onMobilityData={setMobilityData}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
