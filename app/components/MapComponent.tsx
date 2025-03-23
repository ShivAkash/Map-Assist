// pages/index.tsx
import React from 'react';
import dynamic from 'next/dynamic';
import ChatComponent from '../components/ChatComponent';

// Dynamically import the MapComponent to disable SSR for Leaflet.
const MapComponent = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
});

const Home: React.FC = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ textAlign: 'center' }}>Leaflet Map Chat Interface</h1>
      <MapComponent />
      <ChatComponent />
    </div>
  );
};

export default Home;
