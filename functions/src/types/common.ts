export interface VerificationDocument {
    documentId: string;
    documentImage: string;
    documentType: "AADHAR" | "DRIVING_LICENSE" | "VOTER_ID" | "OTHER";
    documentNumber: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
  }

export interface Scrap {
    scrapId: string;
    scrapName: string;
    scrapCategory:
      | "PAPER"
      | "PLASTIC"
      | "METAL"
      | "EWASTE"
      | "MIXED_SCRAP"
      | "OTHERS";
    scrapAmountAsPer: "KG" | "PIECE";
    scrapAmount: number;
    createdAt: string;
    updatedAt: string;
  }

export interface ScrapSold {
    scrapId: string;
    weight: number;
  }

export interface Address {
    addressId: string;
    addressCoordinates: {
      latitude: number;
      longitude: number;
    };
    completeAddress: string;
    customerId?: string;
    shopId?: string;
    createdAt: string;
    updatedAt: string;
  }

export interface AddressInput {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    completeAddress: string;
  }

export interface DeviceToken {
    tokenId: string;
    userId: string;
    userType: "VENDOR" | "CUSTOMER";
    token: string;
    deviceType: string;
    createdAt: string;
    updatedAt: string;
  }

export interface Notification {
    notificationId: string;
    userId: string;
    userType: "CUSTOMER" | "VENDOR";
    title: string;
    body: string;
    data?: Record<string, string>;
    isRead: boolean;
    createdAt: string;
  }
