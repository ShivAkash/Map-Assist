import { Location, MobilityResponse, Route, MobilityAmenity, RouteStep } from '../types/mobility';

const OPENSTREETMAP_API = 'https://nominatim.openstreetmap.org';
const OSRM_API = 'http://router.project-osrm.org/route/v1';

export class MobilityService {
  private static instance: MobilityService;
  private constructor() {}

  static getInstance(): MobilityService {
    if (!MobilityService.instance) {
      MobilityService.instance = new MobilityService();
    }
    return MobilityService.instance;
  }

  async getLocationDetails(location: Location): Promise<MobilityAmenity[]> {
    try {
      const response = await fetch(
        `${OPENSTREETMAP_API}/reverse?format=json&lat=${location.lat}&lon=${location.lng}`
      );
      const data = await response.json();
      
      // Transform OSM data into MobilityAmenity format
      return [{
        type: 'location',
        name: data.display_name,
        location: {
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lon)
        },
        accessibility: this.getAccessibilityFeatures(data),
        realTimeInfo: {
          status: 'active',
          nextUpdate: new Date(Date.now() + 300000).toISOString() // 5 minutes
        }
      }];
    } catch (error) {
      console.error('Error fetching location details:', error);
      return [];
    }
  }

  async calculateRoute(
    start: Location,
    end: Location,
    mode: string = 'driving'
  ): Promise<Route> {
    try {
      // Convert mode to OSRM compatible format
      const osrmMode = mode === 'driving' ? 'driving' : 
                      mode === 'walking' ? 'walking' : 
                      mode === 'cycling' ? 'cycling' : 'driving';

      // OSRM expects coordinates in [longitude, latitude] order
      const response = await fetch(
        `${OSRM_API}/${osrmMode}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`
      );
      const data = await response.json();

      if (data.code !== 'Ok') {
        throw new Error('Route calculation failed');
      }

      const route = data.routes[0];
      
      // The coordinates from OSRM are already in [longitude, latitude] order
      // We need to swap them to [latitude, longitude] for Leaflet
      const routeCoordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
      
      // Create a single step with the full route geometry
      const steps = [{
        instruction: 'Route',
        distance: route.distance,
        duration: route.duration,
        mode: osrmMode,
        polyline: routeCoordinates
      }];

      return {
        mode: this.getTransportMode(mode),
        distance: route.distance,
        duration: route.duration,
        carbonFootprint: this.calculateCarbonFootprint(route.distance, mode),
        accessibility: this.getAccessibilityForMode(mode),
        steps
      };
    } catch (error) {
      console.error('Error calculating route:', error);
      throw error;
    }
  }

  private getTransportMode(mode: string) {
    const modes: Record<string, any> = {
      driving: {
        id: 'car',
        name: 'Car',
        icon: '🚗',
        isSustainable: false,
        accessibility: 'high'
      },
      walking: {
        id: 'walk',
        name: 'Walking',
        icon: '🚶',
        isSustainable: true,
        accessibility: 'high'
      },
      cycling: {
        id: 'bike',
        name: 'Cycling',
        icon: '🚲',
        isSustainable: true,
        accessibility: 'medium'
      }
    };
    return modes[mode] || modes.driving;
  }

  private calculateCarbonFootprint(distance: number, mode: string): number {
    // Rough carbon footprint calculation (in kg CO2)
    const factors: Record<string, number> = {
      driving: 0.2,    // 0.2 kg CO2 per km
      cycling: 0.0,    // No emissions
      walking: 0.0     // No emissions
    };
    return (distance / 1000) * (factors[mode] || 0.2);
  }

  private getAccessibilityForMode(mode: string) {
    return {
      wheelchair: mode === 'driving' || mode === 'walking',
      visual: true,
      audio: true
    };
  }

  private getAccessibilityFeatures(osmData: any): string[] {
    const features = [];
    if (osmData.tags) {
      if (osmData.tags.wheelchair === 'yes') features.push('wheelchair');
      if (osmData.tags.tactile_paving === 'yes') features.push('tactile');
      if (osmData.tags.audio_signals === 'yes') features.push('audio');
    }
    return features;
  }

  async getRealTimeUpdates(location: Location): Promise<any> {
    // This would integrate with real-time APIs like TfL or other transport APIs
    // For now, returning mock data
    return {
      traffic: 'Moderate',
      weather: 'Clear',
      incidents: []
    };
  }

  async getMobilityResponse(
    start: Location,
    end: Location,
    mode: string = 'driving'
  ): Promise<MobilityResponse> {
    const [route, amenities, realTimeUpdates] = await Promise.all([
      this.calculateRoute(start, end, mode),
      this.getLocationDetails(start),
      this.getRealTimeUpdates(start)
    ]);

    return {
      routes: [route],
      amenities,
      sustainability: {
        carbonFootprint: route.carbonFootprint || 0,
        greenScore: route.mode.isSustainable ? 100 : 50
      },
      accessibility: route.accessibility,
      realTimeUpdates
    };
  }
} 