import {Vendor, Shop, Customer} from "../types";

export const vendors: Partial<Vendor>[] = [
  {
    vendorName: "John's Recycling",
    vendorEmail: "john@recycling.com",
    vendorMobile: "9876543210",
    vendorImage: "https://example.com/john.jpg",
    verificationDocumentIds: [],
    shopIds: [],
    referredVendorIds: [],
  },
  {
    vendorName: "Green Scrap Solutions",
    vendorEmail: "green@scrap.com",
    vendorMobile: "9876543211",
    vendorImage: "https://example.com/green.jpg",
    verificationDocumentIds: [],
    shopIds: [],
    referredVendorIds: [],
  },
];

export const shops: Partial<Shop>[] = [
  {
    shopName: "Central Recycling Hub",
    shopLocation: "address_id_1",
    shopLevel: "GOLD",
    totalShopSaleTillDate: 50000,
  },
  {
    shopName: "East Side Scrap",
    shopLocation: "address_id_2",
    shopLevel: "SILVER",
    totalShopSaleTillDate: 25000,
  },
];

export const customers: Partial<Customer>[] = [
  {
    customerName: "Alice Smith",
    customerMobile: "9876543212",
    customerEmail: "alice@example.com",
    customerSavedAddresses: [],
    isVerified: true,
  },
  {
    customerName: "Bob Johnson",
    customerMobile: "9876543213",
    customerEmail: "bob@example.com",
    customerSavedAddresses: [],
    isVerified: true,
  },
];
