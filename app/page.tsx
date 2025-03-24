// pages/index.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
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
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const hasSetInitialLocationRef = useRef(false);
  const isGettingLocationRef = useRef(false);
  const lastLocationRef = useRef<Location | null>(null);

  // Get initial location using browser's Geolocation API
  useEffect(() => {
    const getLocation = async () => {
      if ('geolocation' in navigator && !hasSetInitialLocationRef.current && !isGettingLocationRef.current) {
        isGettingLocationRef.current = true;
        try {
          console.log('Getting initial location...'); // Debug log
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });

          const { latitude, longitude } = position.coords;
          console.log('Got initial coordinates:', { latitude, longitude }); // Debug log
          
          // Only update if coordinates are valid
          if (!isNaN(latitude) && !isNaN(longitude) && 
              latitude >= -90 && latitude <= 90 && 
              longitude >= -180 && longitude <= 180) {
            await handleLocationChange(latitude, longitude);
            hasSetInitialLocationRef.current = true;
          } else {
            console.error('Invalid initial coordinates:', { latitude, longitude });
          }
        } catch (error) {
          console.error('Geolocation error:', error);
          // Keep default location on error
          hasSetInitialLocationRef.current = true;
        } finally {
          isGettingLocationRef.current = false;
        }
      }
    };

    getLocation();
  }, []);

  const handleLocationChange = async (lat: number, lng: number) => {
    // Ensure coordinates are numbers
    const latitude = Number(lat);
    const longitude = Number(lng);

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      console.error('Invalid coordinates:', lat, lng);
      return;
    }

    // Skip if location hasn't changed
    if (lastLocationRef.current && 
        lastLocationRef.current.lat === latitude && 
        lastLocationRef.current.lng === longitude) {
      return;
    }

    console.log('Updating location to:', { latitude, longitude }); // Debug log

    // Update location immediately
    setCurrentLocation(prev => ({
      ...prev,
      lat: latitude,
      lng: longitude
    }));

    // Reverse geocode to get location name
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = await response.json();
      console.log('Reverse geocoding result:', data); // Debug log
      
      setCurrentLocation(prev => ({
        ...prev,
        name: data.display_name || 'Unknown location'
      }));
      
      lastLocationRef.current = {
        lat: latitude,
        lng: longitude,
        name: data.display_name || 'Unknown location'
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setCurrentLocation(prev => ({
        ...prev,
        name: 'Unknown location'
      }));
      
      lastLocationRef.current = {
        lat: latitude,
        lng: longitude,
        name: 'Unknown location'
      };
    }
  };

  return (
    <main className="relative w-full h-screen">
      <div className="absolute inset-0">
        <Map
          currentLocation={currentLocation}
          onLocationChange={handleLocationChange}
          routes={mobilityData?.routes || []}
        />
      </div>
      
      <div className={`fixed right-4 top-4 z-[1000] transition-all duration-300 ${
        isChatMinimized ? 'w-12 h-12' : 'w-96 h-[600px]'
      }`}>
        <div className="relative w-full h-full bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          {!isChatMinimized && (
            <button
              onClick={() => setIsChatMinimized(!isChatMinimized)}
              className="absolute right-2 top-2 z-10 p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {isChatMinimized ? (
            <div 
              className="w-full h-full flex items-center justify-center cursor-pointer" 
              onClick={() => setIsChatMinimized(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          ) : (
            <Chat
              currentLocation={currentLocation}
              onMobilityData={setMobilityData}
            />
          )}
        </div>
      </div>
    </main>
  );
}
