export interface Location {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: 'building' | 'user_location';
}

export interface RouteWaypoint {
  distance: number; // distance in meters
  direction: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  landmark?: string;
}

export interface Route {
  id: string;
  name: string;
  fromLocationId: string;
  toLocationId: string;
  waypoints: RouteWaypoint[];
  estimatedSteps: number;
  distance: number; // in meters
}

export class GPSNavigationService {
  // Mock GPS data
  private static locations: Location[] = [
    {
      id: 'school',
      name: 'school',
      displayName: 'School',
      latitude: 46.7319,
      longitude: -117.1542,
      type: 'building'
    },
    {
      id: 'current_location',
      name: 'current location',
      displayName: 'Current Location',
      latitude: 46.7300,
      longitude: -117.1560,
      type: 'user_location'
    }
  ];

  // Mock route data - 3 different routes to School
  private static routes: Route[] = [
    {
      id: 'route_1_to_school',
      name: 'Direct Route to School',
      fromLocationId: 'current_location',
      toLocationId: 'school',
      waypoints: [
        { distance: 45, direction: 'northeast' },
        { distance: 15, direction: 'east' },
        { distance: 75, direction: 'north' },
        { distance: 10, direction: 'west' },
        { distance: 35, direction: 'north' }
      ],
      estimatedSteps: 48,
      distance: 180
    },
    {
      id: 'route_2_to_school',
      name: 'Scenic Route to School',
      fromLocationId: 'current_location',
      toLocationId: 'school',
      waypoints: [
        { distance: 50, direction: 'northeast' },
        { distance: 30, direction: 'southeast' },
        { distance: 60, direction: 'north' },
        { distance: 20, direction: 'northwest' },
        { distance: 60, direction: 'north' }
      ],
      estimatedSteps: 75,
      distance: 220
    },
    {
      id: 'route_3_to_school',
      name: 'Accessible Route to School',
      fromLocationId: 'current_location',
      toLocationId: 'school',
      waypoints: [
        { distance: 40, direction: 'northeast' },
        { distance: 20, direction: 'northwest' },
        { distance: 80, direction: 'north' },
        { distance: 30, direction: 'east' },
        { distance: 30, direction: 'north' }
      ],
      estimatedSteps: 70,
      distance: 200
    }
  ];

  /**
   * Find a location by name (case insensitive, partial matching)
   */
  static findLocation(locationName: string): Location | null {
    const searchName = locationName.toLowerCase().trim();
    
    // First try exact match
    let location = this.locations.find(loc => 
      loc.name.toLowerCase() === searchName
    );
    
    if (location) return location;
    
    // Try partial match
    location = this.locations.find(loc => 
      loc.name.toLowerCase().includes(searchName) || 
      searchName.includes(loc.name.toLowerCase())
    );
    
    return location || null;
  }

  /**
   * Get all available routes to a destination
   */
  static getRoutesToDestination(destinationId: string): Route[] {
    return this.routes.filter(route => route.toLocationId === destinationId);
  }

  /**
   * Find the shortest route to a destination based on actual distance
   */
  static getShortestRoute(destinationId: string): Route | null {
    const routes = this.getRoutesToDestination(destinationId);
    if (routes.length === 0) return null;
    
    // Sort by distance (shortest first) for most accurate route selection
    routes.sort((a, b) => a.distance - b.distance);
    return routes[0];
  }

  /**
   * Get route by preference (shortest distance, fewest steps, or accessible)
   */
  static getRouteByPreference(destinationId: string, preference: 'shortest' | 'accessible' | 'scenic' = 'shortest'): Route | null {
    const routes = this.getRoutesToDestination(destinationId);
    if (routes.length === 0) return null;
    
    switch (preference) {
      case 'shortest':
        routes.sort((a, b) => a.distance - b.distance);
        return routes[0];
      case 'accessible':
        // Look for routes with 'accessible' in the name
        const accessibleRoute = routes.find(route => 
          route.name.toLowerCase().includes('accessible')
        );
        return accessibleRoute || routes[0];
      case 'scenic':
        // Look for routes with 'scenic' in the name
        const scenicRoute = routes.find(route => 
          route.name.toLowerCase().includes('scenic')
        );
        return scenicRoute || routes.sort((a, b) => b.distance - a.distance)[0]; // fallback to longest route
      default:
        return routes[0];
    }
  }

  /**
   * Calculate route and return navigation instructions
   */
  static calculateRoute(destinationName: string, preference: 'shortest' | 'accessible' | 'scenic' = 'shortest'): {
    success: boolean;
    route?: Route;
    location?: Location;
    error?: string;
  } {
    // Find the destination location
    const destination = this.findLocation(destinationName);
    
    if (!destination) {
      return {
        success: false,
        error: "Sorry, we don't have GPS info about this location"
      };
    }

    // Get the best route
    const route = this.getRouteByPreference(destination.id, preference);
    
    if (!route) {
      return {
        success: false,
        error: "No route available to this destination"
      };
    }

    return {
      success: true,
      route,
      location: destination
    };
  }

  /**
   * Get user's current location
   */
  static getCurrentLocation(): Location {
    return this.locations.find(loc => loc.type === 'user_location') || this.locations[1];
  }

  /**
   * Get all available destinations
   */
  static getAvailableDestinations(): Location[] {
    return this.locations.filter(loc => loc.type === 'building');
  }

  /**
   * Add a new location (for future extensibility)
   */
  static addLocation(location: Omit<Location, 'id'>): Location {
    const newLocation: Location = {
      ...location,
      id: `location_${Date.now()}`
    };
    this.locations.push(newLocation);
    return newLocation;
  }

  /**
   * Add a new route (for future extensibility)
   */
  static addRoute(route: Omit<Route, 'id'>): Route {
    const newRoute: Route = {
      ...route,
      id: `route_${Date.now()}`
    };
    this.routes.push(newRoute);
    return newRoute;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  }

  /**
   * Find the closest destination to current location
   */
  static getClosestDestination(): Location | null {
    const currentLoc = this.getCurrentLocation();
    const destinations = this.getAvailableDestinations();
    
    if (destinations.length === 0) return null;
    
    let closestDestination = destinations[0];
    let shortestDistance = this.calculateDistance(
      currentLoc.latitude, currentLoc.longitude,
      closestDestination.latitude, closestDestination.longitude
    );
    
    for (let i = 1; i < destinations.length; i++) {
      const distance = this.calculateDistance(
        currentLoc.latitude, currentLoc.longitude,
        destinations[i].latitude, destinations[i].longitude
      );
      
      if (distance < shortestDistance) {
        shortestDistance = distance;
        closestDestination = destinations[i];
      }
    }
    
    return closestDestination;
  }

  /**
   * Convert meters to approximate steps (assuming average step length of 0.75 meters)
   */
  private static metersToSteps(meters: number): number {
    const averageStepLength = 0.75; // meters per step
    return Math.round(meters / averageStepLength);
  }

  /**
   * Generate step-by-step navigation instructions from route waypoints
   */
  static generateNavigationInstructions(route: Route, destinationName: string): string[] {
    const instructions: string[] = [];
    
    // Starting instruction
    instructions.push('Starting navigation from your current location');
    
    // Generate instructions for each waypoint
    route.waypoints.forEach((waypoint, index) => {
      const steps = this.metersToSteps(waypoint.distance);
      let instruction = '';
      
      // All directions are now compass directions
      instruction = `Head ${waypoint.direction} for ${steps} steps`;
      
      // Add landmark information if available
      if (waypoint.landmark) {
        instruction = `Head ${waypoint.direction} for ${steps} steps to the ${waypoint.landmark}`;
      }
      
      instructions.push(instruction);
    });
    
    // Arrival instruction
    instructions.push(`You have arrived at ${destinationName}`);
    
    return instructions;
  }
}