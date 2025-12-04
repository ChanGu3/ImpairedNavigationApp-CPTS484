import { HOSTNAME } from "./hostname";

export interface Trip {
  to_location: string;
  from_location: string;
}

export interface PastTrip {
  id: number;
  destination_location: string;
  complete_date: string;
}

export class TripService {
  private static baseUrl = `${HOSTNAME}/api/user`;

  /**
   * Get the current active trip
   */
  static async getCurrentTrip(): Promise<Trip | null> {
    try {
      const response = await fetch(`${this.baseUrl}/current_trip`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching current trip:", error);
      return null;
    }
  }

  /**
   * Start a new trip
   */
  static async startTrip(fromLocation: string, toLocation: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/current_trip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          from_location: fromLocation,
          to_location: toLocation,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Error starting trip:", error);
      return false;
    }
  }

  /**
   * End the current trip
   */
  static async endTrip(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/current_trip`, {
        method: "DELETE",
        credentials: "include",
      });

      return response.ok;
    } catch (error) {
      console.error("Error ending trip:", error);
      return false;
    }
  }

  /**
   * Get all past trips
   */
  static async getPastTrips(): Promise<PastTrip[]> {
    try {
      const response = await fetch(`${this.baseUrl}/past_trip`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching past trips:", error);
      return [];
    }
  }

  /**
   * Get the most recent past trip
   */
  static async getMostRecentTrip(): Promise<PastTrip | null> {
    try {
      const trips = await this.getPastTrips();
      if (trips.length === 0) return null;
      
      // Sort by date descending and return the first one
      const sorted = trips.sort((a, b) => 
        new Date(b.complete_date).getTime() - new Date(a.complete_date).getTime()
      );
      
      return sorted[0];
    } catch (error) {
      console.error("Error fetching most recent trip:", error);
      return null;
    }
  }

  /**
   * Add a location to past trips (called when navigation is complete)
   */
  static async addToPastTrips(destinationLocation: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/past_trip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          destination_location: destinationLocation,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Error adding to past trips:", error);
      return false;
    }
  }
}
