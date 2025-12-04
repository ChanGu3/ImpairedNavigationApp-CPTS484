import { HOSTNAME } from "./hostname";

export interface EmergencyContact {
  id: number;
  contact_name: string;
  contact_tel: string;
}

export class EmergencyContactService {
  private static baseUrl = `${HOSTNAME}/api/user/emergency_contact`;

  /**
   * Get all emergency contacts
   */
  static async getEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching emergency contacts:", error);
      return [];
    }
  }

  /**
   * Get a specific emergency contact
   */
  static async getEmergencyContact(id: number): Promise<EmergencyContact | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching emergency contact:", error);
      return null;
    }
  }

  /**
   * Add a new emergency contact
   */
  static async addEmergencyContact(
    contactName: string,
    contactTel: string
  ): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          contact_name: contactName,
          contact_tel: contactTel,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Error adding emergency contact:", error);
      return false;
    }
  }

  /**
   * Delete an emergency contact
   */
  static async deleteEmergencyContact(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      return response.ok;
    } catch (error) {
      console.error("Error deleting emergency contact:", error);
      return false;
    }
  }
}
