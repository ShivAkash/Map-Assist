// pages/_app.tsx
import '../styles/globals.css';
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
