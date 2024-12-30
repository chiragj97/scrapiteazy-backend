import * as admin from "firebase-admin";
import {db} from "../config/firebase";
import {vendors, shops, customers} from "./data";

export const seedDatabase = async () => {
  try {
    // Seed vendors
    const vendorRefs = await Promise.all(
      vendors.map(async (vendor) => {
        const docRef = await db.collection("vendors").add({
          ...vendor,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await docRef.update({vendorId: docRef.id});
        return docRef;
      })
    );

    // Seed shops
    await Promise.all(
      shops.map(async (shop, index) => {
        const vendorId = vendorRefs[index % vendorRefs.length].id;
        const docRef = await db.collection("shops").add({
          ...shop,
          vendorId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await docRef.update({shopId: docRef.id});

        // Update vendor's shopIds
        await vendorRefs[index % vendorRefs.length].update({
          shopIds: admin.firestore.FieldValue.arrayUnion(docRef.id),
        });
      })
    );

    // Seed customers
    await Promise.all(
      customers.map(async (customer) => {
        const docRef = await db.collection("customers").add({
          ...customer,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await docRef.update({customerId: docRef.id});
      })
    );

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
};
