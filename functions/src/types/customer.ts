import {ScrapSold} from "./common";

export interface Customer {
    customerId: string;
    customerName: string;
    customerMobile: string;
    customerEmail: string;
    customerSavedAddresses: string[];
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Booking {
    bookingId: string;
    customerId: string;
    shopId?: string;
    scheduledDateTime: string;
    scrapTypes: string[];
    scrapSize: "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";
    scrapImage?: string;
    pickupLocation: string;
    pickupStatus:
    | "PENDING"
    | "REQUESTED"
    | "ACCEPTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";
    earnings: number;
    exactScrapSold: ScrapSold[];
    nearbyShopsNotified: string[];
    requestedAt: string;
    acceptedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
    cancelReason?: string;
    rating?: number;
    feedback?: string;
    createdAt: string;
    updatedAt: string;
    totalAmount?: number;
    startedAt?: string;
    estimatedCompletionTime?: string;
}
