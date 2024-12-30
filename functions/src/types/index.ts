export * from "./vendor";
export * from "./customer";
export * from "./common";

export interface Booking {
  bookingId: string;
  customerId: string;
  scheduledDateTime: string;
  scrapTypes: string[];
  scrapSize: string;
  scrapImage?: string;
  pickupLocation: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    completeAddress: string;
  };
  pickupStatus: string;
  earnings: number;
  exactScrapSold: any[];
  nearbyShopsNotified: string[];
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
}
