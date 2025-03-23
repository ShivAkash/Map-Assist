import { NextResponse } from 'next/server';
import { MobilityService } from '@/app/services/mobilityService';
import { Location } from '@/app/types/mobility';

// Debug environment variables
console.log('Environment variables:', {
  hasToken: !!process.env.HUGGINGFACE_API_TOKEN,
  tokenLength: process.env.HUGGINGFACE_API_TOKEN?.length,
  tokenPrefix: process.env.HUGGINGFACE_API_TOKEN?.substring(0, 3),
  allEnvVars: Object.keys(process.env)
});

const HUGGINGFACE_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
// Using Mistral-7B-Instruct, a superior model for chat and instructions
const MODEL_ID = 'mistralai/Mistral-7B-Instruct-v0.2';

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Place {
  name: string;
  type: string;
  distance: number;
  coordinates: { lat: number; lng: number };
  address: string;
  phone: string;
  website: string;
  opening_hours: string;
  rating: number | null;
  wheelchair: string;
  smoking: string;
  cuisine: string | null;
  brand: string | null;
  operator: string | null;
  capacity: string | null;
  fee: string;
  parking: string;
  public_transport: string;
  accessibility: {
    wheelchair: boolean;
    audio: boolean;
    visual: boolean;
  };
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  mode: string;
  name: string;
  intersections: any[];
  geometry: any;
}

// Helper function to calculate carbon footprint
function calculateCarbonFootprint(distance: number, mode: string): number {
  const distanceKm = distance / 1000; // Convert meters to kilometers
  switch (mode) {
    case 'walking':
      return 0;
    case 'cycling':
      return 0;
    case 'driving':
      return distanceKm * 0.2; // 0.2 kg CO2 per km for driving
    default:
      return distanceKm * 0.2;
  }
}

// Helper function to calculate relevance score for a result
function calculateRelevance(result: Place, searchTerm: string, isNearest: boolean): number {
  let score = 0;
  const searchLower = searchTerm.toLowerCase();
  const name = result.name.toLowerCase();
  const type = result.type.toLowerCase();

  // For nearest queries, prioritize exact type matches
  if (isNearest) {
    if (type === searchLower) {
      score += 3;
    }
    if (name.includes(searchLower)) {
      score += 2;
    }
  } else {
    // For regular queries, prioritize name matches
    if (name.includes(searchLower)) {
      score += 2;
    }
  }

  // Partial word match
  const searchWords = searchLower.split(' ');
  const matchedWords = searchWords.filter(word => name.includes(word));
  score += matchedWords.length * 0.5;

  // Type relevance
  if (type === 'station' || type === 'landmark' || type === 'attraction') {
    score += 1;
  }

  // Additional features
  if (result.rating) score += result.rating * 0.5;
  if (result.accessibility.wheelchair) score += 0.5;
  if (result.parking === 'yes') score += 0.3;
  if (result.public_transport === 'yes') score += 0.3;

  return score;
}

export async function POST(req: Request) {
  try {
    const { message, location } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!HUGGINGFACE_API_TOKEN) {
      console.error('Hugging Face API token is not configured. Please check your .env.local file');
      return NextResponse.json(
        { error: 'API configuration error - Token not found' },
        { status: 500 }
      );
    }

    // Get mobility data if location is provided
    let mobilityData = null;
    if (location) {
      const mobilityService = MobilityService.getInstance();
      const startLocation: Location = {
        lat: location.lat || 51.505,
        lng: location.lng || -0.09,
        name: location.name
      };

      // Check if the message is requesting a route
      const isRouteRequest = message.toLowerCase().includes('route') || 
                           message.toLowerCase().includes('directions') ||
                           message.toLowerCase().includes('how to get to');

      // Determine the most appropriate transport mode
      let transportMode = 'walking';
      const messageLower = message.toLowerCase();
      
      if (messageLower.includes('bus') || messageLower.includes('train') || 
          messageLower.includes('tube') || messageLower.includes('metro') || 
          messageLower.includes('public transport')) {
        transportMode = 'driving'; // Using driving mode for public transport routes
      } else if (messageLower.includes('bike') || messageLower.includes('cycle')) {
        transportMode = 'cycling';
      }

      if (isRouteRequest) {
        // Extract destination type from the message
        const destinationMatch = message.match(/to (.+?)(?:\s*from|$)/i);
        let destinationType = destinationMatch ? destinationMatch[1] : 'Destination';
        
        // Check if this is a "nearest" query
        const isNearestQuery = message.toLowerCase().includes('nearest');
        
        // Helper function to calculate distance between two points
        function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        }

        // Fetch nearby places using Overpass API with better search parameters
        const radius = 10000; // 10km radius
        const overpassQuery = `[out:json][timeout:25];
          (
            node["amenity"](around:${radius},${startLocation.lat},${startLocation.lng});
            way["amenity"](around:${radius},${startLocation.lat},${startLocation.lng});
            relation["amenity"](around:${radius},${startLocation.lat},${startLocation.lng});
            node["shop"](around:${radius},${startLocation.lat},${startLocation.lng});
            way["shop"](around:${radius},${startLocation.lat},${startLocation.lng});
            relation["shop"](around:${radius},${startLocation.lat},${startLocation.lng});
            node["leisure"](around:${radius},${startLocation.lat},${startLocation.lng});
            way["leisure"](around:${radius},${startLocation.lat},${startLocation.lng});
            relation["leisure"](around:${radius},${startLocation.lat},${startLocation.lng});
          );
          out body;
          >;
          out skel qt;`;

        try {
          const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(overpassQuery)}`
          });

          if (!overpassResponse.ok) {
            console.error('Overpass API error:', {
              status: overpassResponse.status,
              statusText: overpassResponse.statusText
            });
            throw new Error(`Overpass API error: ${overpassResponse.statusText}`);
          }

          const overpassData = await overpassResponse.json();
          
          if (!overpassData.elements || overpassData.elements.length === 0) {
            console.log('No places found in the area');
            // Return a basic response with a nearby point
            const angle = Math.random() * 2 * Math.PI;
            const distance = 0.01; // 1km
            const endLocation = {
              lat: startLocation.lat + distance * Math.sin(angle),
              lng: startLocation.lng + distance * Math.cos(angle),
              name: destinationType
            };
            
            mobilityData = {
              routes: [{
                mode: {
                  name: transportMode,
                  isSustainable: transportMode === 'walking' || transportMode === 'cycling'
                },
                distance: calculateDistance(startLocation.lat, startLocation.lng, endLocation.lat, endLocation.lng) * 1000,
                duration: 0,
                carbonFootprint: 0,
                accessibility: {
                  wheelchair: true,
                  audio: true,
                  visual: true
                },
                steps: [],
                geometry: {
                  type: 'LineString',
                  coordinates: [[startLocation.lng, startLocation.lat], [endLocation.lng, endLocation.lat]]
                }
              }],
              amenities: [],
              sustainability: {
                carbonFootprint: 0,
                greenScore: transportMode === 'walking' || transportMode === 'cycling' ? 100 : 50
              },
              accessibility: {
                wheelchair: true,
                audio: true,
                visual: true
              },
              realTimeUpdates: {
                traffic: 'Moderate',
                weather: 'Clear',
                incidents: []
              }
            };
            return NextResponse.json({ 
              response: `I couldn't find any ${destinationType} in the area. I've shown you a route to a nearby point instead.`,
              mobilityData
            });
          }
          
          // Process and format the places data with enhanced information
          const places = overpassData.elements.map((element: any) => {
            const lat = element.lat || element.center?.lat;
            const lng = element.lon || element.center?.lng;
            const distance = calculateDistance(startLocation.lat, startLocation.lng, lat, lng);
            
            // Get additional details from Nominatim API
            const nominatimUrl = `https://nominatim.openstreetmap.org/lookup?format=json&osm_ids=${element.type}${element.id}`;
            
            return {
              name: element.tags?.name || 'Unnamed Place',
              type: element.tags?.amenity || element.tags?.shop || element.tags?.leisure || 'unknown',
              distance: distance,
              coordinates: { lat, lng },
              address: element.tags?.['addr:street'] || 'Address not available',
              phone: element.tags?.phone || 'Phone not available',
              website: element.tags?.website || 'Website not available',
              opening_hours: element.tags?.['opening_hours'] || 'Hours not available',
              rating: element.tags?.['rating'] || null,
              wheelchair: element.tags?.['wheelchair'] || 'unknown',
              smoking: element.tags?.['smoking'] || 'unknown',
              cuisine: element.tags?.['cuisine'] || null,
              brand: element.tags?.['brand'] || null,
              operator: element.tags?.['operator'] || null,
              capacity: element.tags?.['capacity'] || null,
              fee: element.tags?.['fee'] || 'unknown',
              parking: element.tags?.['parking'] || 'unknown',
              public_transport: element.tags?.['public_transport'] || 'unknown',
              accessibility: {
                wheelchair: element.tags?.['wheelchair'] === 'yes',
                audio: element.tags?.['audio'] === 'yes',
                visual: element.tags?.['visual'] === 'yes'
              }
            };
          });

          // Sort places by relevance and distance
          places.sort((a: Place, b: Place) => {
            const relevanceA = calculateRelevance(a, destinationType, isNearestQuery);
            const relevanceB = calculateRelevance(b, destinationType, isNearestQuery);
            
            if (isNearestQuery) {
              // For nearest queries, prioritize distance first, then relevance
              if (Math.abs(a.distance - b.distance) < 0.1) {
                return relevanceB - relevanceA;
              }
              return a.distance - b.distance;
            } else {
              // For regular queries, prioritize relevance first, then distance
              if (Math.abs(relevanceA - relevanceB) < 0.1) {
                return a.distance - b.distance;
              }
              return relevanceB - relevanceA;
            }
          });

          // Select the best matching place
          const selectedPlace = places[0];
          if (!selectedPlace) {
            throw new Error('No suitable place found');
          }

          const endLocation = {
            lat: selectedPlace.coordinates.lat,
            lng: selectedPlace.coordinates.lng,
            name: selectedPlace.name
          };

          // Calculate the route using OSRM with enhanced parameters
          const routeResponse = await fetch(
            `http://router.project-osrm.org/route/v1/${transportMode}/${startLocation.lng},${startLocation.lat};${endLocation.lng},${endLocation.lat}?overview=full&geometries=geojson&steps=true&annotations=true`
          );
          const routeData = await routeResponse.json();

          if (routeData.code === 'Ok') {
            const route = routeData.routes[0];
            const steps = route.legs[0].steps.map((step: RouteStep, index: number) => ({
              instruction: step.instruction,
              distance: step.distance,
              duration: step.duration,
              mode: step.mode,
              name: step.name,
              intersections: step.intersections,
              geometry: step.geometry
            }));

            mobilityData = {
              routes: [{
                mode: {
                  name: transportMode,
                  isSustainable: transportMode === 'walking' || transportMode === 'cycling'
                },
                distance: route.distance,
                duration: route.duration,
                carbonFootprint: calculateCarbonFootprint(route.distance, transportMode),
                accessibility: {
                  wheelchair: true,
                  audio: true,
                  visual: true
                },
                steps: steps,
                geometry: {
                  type: 'LineString',
                  coordinates: route.geometry.coordinates
                },
                destination: {
                  name: selectedPlace.name,
                  type: selectedPlace.type,
                  address: selectedPlace.address,
                  phone: selectedPlace.phone,
                  website: selectedPlace.website,
                  opening_hours: selectedPlace.opening_hours,
                  accessibility: selectedPlace.accessibility
                }
              }],
              amenities: [],
              sustainability: {
                carbonFootprint: calculateCarbonFootprint(route.distance, transportMode),
                greenScore: transportMode === 'walking' || transportMode === 'cycling' ? 100 : 50
              },
              accessibility: {
                wheelchair: true,
                audio: true,
                visual: true
              },
              realTimeUpdates: {
                traffic: 'Moderate',
                weather: 'Clear',
                incidents: []
              }
            };

            // Create a detailed response with all relevant information
            const response = `I've found ${selectedPlace.name} (${selectedPlace.type}) at ${selectedPlace.address}.
            ${selectedPlace.opening_hours !== 'Hours not available' ? `Opening hours: ${selectedPlace.opening_hours}` : ''}
            ${selectedPlace.phone !== 'Phone not available' ? `Phone: ${selectedPlace.phone}` : ''}
            ${selectedPlace.website !== 'Website not available' ? `Website: ${selectedPlace.website}` : ''}
            ${selectedPlace.accessibility.wheelchair ? 'Wheelchair accessible' : 'Not wheelchair accessible'}
            The route is ${(route.distance / 1000).toFixed(2)} km long and will take approximately ${Math.round(route.duration / 60)} minutes.
            ${steps.map((step: { instruction: string; distance: number }, index: number) => `${index + 1}. ${step.instruction} (${(step.distance / 1000).toFixed(2)} km)`).join('\n')}`;

            return NextResponse.json({ 
              response,
              mobilityData
            });
          } else {
            console.error('OSRM route calculation failed:', routeData);
            // Return a basic response without route data
            mobilityData = {
              routes: [{
                mode: {
                  name: transportMode,
                  isSustainable: transportMode === 'walking' || transportMode === 'cycling'
                },
                distance: calculateDistance(startLocation.lat, startLocation.lng, endLocation.lat, endLocation.lng) * 1000,
                duration: 0,
                carbonFootprint: 0,
                accessibility: {
                  wheelchair: true,
                  audio: true,
                  visual: true
                },
                steps: [],
                geometry: {
                  type: 'LineString',
                  coordinates: [[startLocation.lng, startLocation.lat], [endLocation.lng, endLocation.lat]]
                }
              }],
              amenities: [],
              sustainability: {
                carbonFootprint: 0,
                greenScore: transportMode === 'walking' || transportMode === 'cycling' ? 100 : 50
              },
              accessibility: {
                wheelchair: true,
                audio: true,
                visual: true
              },
              realTimeUpdates: {
                traffic: 'Moderate',
                weather: 'Clear',
                incidents: []
              }
            };
          }
        } catch (e) {
          console.error('Error fetching places:', e);
        }
      } else {
        // For non-route requests, just get basic mobility data
        mobilityData = await mobilityService.getMobilityResponse(startLocation, startLocation);
      }
    }

    // Create a mobility-focused prompt optimized for Mistral
    const prompt = `<s>[INST] You are a mobility assistant. Provide concise, relevant information based on the user's question. Always respond in English only.

    Current location: ${location ? `${location.name || 'London, UK'} (${location.lat}, ${location.lng})` : 'London, UK (51.505, -0.09)'}
    
    ${mobilityData ? `Current mobility data:
    - Available transport modes: ${mobilityData.routes.map(r => r.mode.name).join(', ')}
    - Real-time updates: ${mobilityData.realTimeUpdates.traffic} traffic, ${mobilityData.realTimeUpdates.weather} weather
    ` : ''}
    
    User question: ${message}
    
    Guidelines:
    1. Always respond in English only
    2. Be concise and direct
    3. Only include information that was explicitly asked for
    4. For route requests:
       - Provide the route details
       - Include distance and duration
       - Only mention transport mode if specified in the question
    5. For accessibility queries:
       - Only respond if specifically asked about accessibility
       - Do not assume any specific accessibility needs
    6. For sustainability:
       - Only provide sustainability information if specifically asked
    7. For transport mode selection:
       - Only suggest transport modes if asked
       - Do not make assumptions about user preferences
    8. When asked about the destination name, always include the name: ${mobilityData?.routes[0]?.destination?.name || 'Not available'}
    
    [/INST]</s>`;

    console.log('Sending request to Hugging Face API...');
    
    // Add retry logic
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      try {
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${MODEL_ID}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUGGINGFACE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: prompt,
              options: {
                wait_for_model: true,
                use_cache: false
              },
              parameters: {
                max_new_tokens: 300,
                temperature: 0.7,
                top_p: 0.95,
                do_sample: true,
                return_full_text: false,
                repetition_penalty: 1.2,
                length_penalty: 1.0,
                stop: ["</s>", "[/INST]"],
                truncation: true,
              },
            }),
          }
        );

        if (response.status === 503) {
          // Model is loading, wait and retry
          console.log(`Model is loading, retries left: ${retries - 1}`);
          await delay(30000); // Wait 30 seconds for model to load
          retries--;
          continue;
        }

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Hugging Face API error:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            headers: Object.fromEntries(response.headers.entries())
          });
          throw new Error(`Hugging Face API error: ${response.statusText} (${response.status})`);
        }

        const data = await response.json();
        console.log('Received response from Hugging Face:', data);
        
        // Handle the response format for this specific model
        const generatedText = Array.isArray(data) ? data[0].generated_text : data.generated_text;
        
        // Clean up the response to remove any prompt text and special tokens
        const cleanResponse = generatedText
          .replace(prompt, '')
          .replace(/<\/?s>/g, '')
          .replace(/\[\/INST\]/g, '')
          .trim();

        // Extract route coordinates if present
        const routeMatch = cleanResponse.match(/ROUTE_DATA: (\{[\s\S]*?\})/);
        let routeData = null;
        if (routeMatch) {
          try {
            routeData = JSON.parse(routeMatch[1]);
            console.log('Parsed route data:', routeData);
          } catch (e) {
            console.error('Error parsing route data:', e);
          }
        }

        // Remove the route data from the response
        const finalResponse = cleanResponse.replace(/ROUTE_DATA: .*$/, '').trim();
        
        // Add destination information if available
        const destinationInfo = mobilityData?.routes[0]?.destination ? 
          `Destination: ${mobilityData.routes[0].destination.name} (${mobilityData.routes[0].destination.type})\nAddress: ${mobilityData.routes[0].destination.address}\n\n` : '';
        
        // Format the mobility data with the route
        const formattedMobilityData = routeData ? {
          routes: [{
            mode: routeData.mode,
            distance: routeData.distance,
            duration: routeData.duration,
            carbonFootprint: routeData.carbonFootprint,
            accessibility: routeData.accessibility,
            steps: routeData.steps
          }],
          amenities: mobilityData?.amenities || [],
          sustainability: {
            carbonFootprint: routeData.carbonFootprint || 0,
            greenScore: routeData.mode.isSustainable ? 100 : 50
          },
          accessibility: routeData.accessibility,
          realTimeUpdates: mobilityData?.realTimeUpdates || {
            traffic: 'Moderate',
            weather: 'Clear',
            incidents: []
          }
        } : mobilityData;

        return NextResponse.json({ 
          response: destinationInfo + finalResponse,
          mobilityData: formattedMobilityData
        });
      } catch (error) {
        lastError = error;
        console.error(`Attempt failed, retries left: ${retries - 1}`, error);
        retries--;
        if (retries > 0) {
          await delay(5000); // Wait 5 seconds before retrying
        }
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('All retry attempts failed');
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
} 