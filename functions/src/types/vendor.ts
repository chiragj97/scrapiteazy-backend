export interface Vendor {
    vendorId: string;
    vendorName: string;
    vendorEmail?: string;
    vendorMobile: string;
    verificationDocumentIds: string[];
    shopIds: string[];
    vendorImage?: string;
    referredVendorIds: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Shop {
    shopId: string;
    shopName: string;
    shopLocation: string; // addressId
    vendorId: string;
    shopsDocumentId?: string;
    shopLevel: "BRONZE" | "SILVER" | "GOLD";
    totalShopSaleTillDate: number;
    createdAt: string;
    updatedAt: string;
}
