export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface TransportMode {
  id: string;
  name: string;
  icon: string;
  isSustainable: boolean;
  accessibility: 'high' | 'medium' | 'low';
}

export interface Route {
  mode: TransportMode;
  distance: number;
  duration: number;
  carbonFootprint?: number;
  accessibility: {
    wheelchair: boolean;
    visual: boolean;
    audio: boolean;
  };
  steps: RouteStep[];
  geometry?: {
    type: string;
    coordinates: [number, number][];
  };
  destination?: {
    name: string;
    type: string;
    address: string;
  };
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  mode: string;
  polyline: [number, number][];
}

export interface MobilityAmenity {
  type: string;
  name: string;
  location: Location;
  accessibility: string[];
  realTimeInfo?: {
    status: string;
    nextUpdate?: string;
  };
}

export interface MobilityResponse {
  routes: Route[];
  amenities: MobilityAmenity[];
  sustainability: {
    carbonFootprint: number;
    greenScore: number;
  };
  accessibility: {
    wheelchair: boolean;
    visual: boolean;
    audio: boolean;
  };
  realTimeUpdates: {
    traffic: string;
    weather: string;
    incidents: string[];
  };
} 