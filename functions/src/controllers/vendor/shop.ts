import {Request, Response} from "express";
import {db} from "../../config/firebase";
import {Shop, Address} from "../../types";
import {ApiError} from "../../utils/ApiError";
import {handleError} from "../../middlewares/error";
import {FieldValue} from "firebase-admin/firestore";

// Add Shop
export const addShop = async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") {
      throw new ApiError(405, "Method not allowed");
    }

    const {vendorId, shopName, shopAddress, shopsDocumentId} = req.body;

    if (!vendorId || !shopName || !shopAddress) {
      throw new ApiError(400, "Missing required fields");
    }

    const timestamp = new Date().toISOString();

    // First create address
    const addressData: Address = {
      addressId: "",
      addressCoordinates: shopAddress.coordinates,
      completeAddress: shopAddress.completeAddress,
      shopId: "", // Will be updated after shop creation
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const addressRef = await db.collection("addresses").add(addressData);
    addressData.addressId = addressRef.id;
    await addressRef.update({addressId: addressRef.id});

    // Create shop
    const shopData: Shop = {
      shopId: "",
      shopName,
      shopLocation: addressRef.id,
      vendorId,
      ...(shopsDocumentId && {shopsDocumentId}), // Only add if provided
      shopLevel: "BRONZE",
      totalShopSaleTillDate: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const shopRef = await db.collection("shops").add(shopData);
    shopData.shopId = shopRef.id;
    await shopRef.update({shopId: shopRef.id});

    // Update address with shopId
    await addressRef.update({shopId: shopRef.id});

    // Update vendor's shopIds array
    await db
      .collection("vendors")
      .doc(vendorId)
      .update({
        shopIds: FieldValue.arrayUnion(shopRef.id),
        updatedAt: timestamp,
      });

    res.status(200).json({
      success: true,
      data: shopData,
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Get Vendor's Shops
export const getVendorShops = async (req: Request, res: Response) => {
  try {
    if (req.method !== "GET") {
      throw new ApiError(405, "Method not allowed");
    }

    const vendorId = req.query.vendorId as string;

    if (!vendorId) {
      throw new ApiError(400, "Vendor ID is required");
    }

    const vendorDoc = await db.collection("vendors").doc(vendorId).get();
    if (!vendorDoc.exists) {
      throw new ApiError(404, "Vendor not found");
    }

    const shopsSnapshot = await db
      .collection("shops")
      .where("vendorId", "==", vendorId)
      .get();

    const shops = await Promise.all(
      shopsSnapshot.docs.map(async (doc) => {
        const shopData = doc.data() as Shop;
        const addressDoc = await db
          .collection("addresses")
          .doc(shopData.shopLocation)
          .get();
        return {
          ...shopData,
          address: addressDoc.data(),
        };
      })
    );

    res.status(200).json({
      success: true,
      data: shops,
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Update Shop
export const updateShop = async (req: Request, res: Response) => {
  try {
    if (req.method !== "PUT") {
      throw new ApiError(405, "Method not allowed");
    }

    const {shopId} = req.params;
    const updates = req.body;

    if (!shopId) {
      throw new ApiError(400, "Shop ID is required");
    }

    // Add shop validation
    const shopDoc = await db.collection("shops").doc(shopId).get();
    if (!shopDoc.exists) {
      throw new ApiError(404, "Shop not found");
    }
    const timestamp = new Date().toISOString();
    const allowedUpdates = ["shopName", "shopsDocumentId"];
    const filteredUpdates = Object.keys(updates)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, {} as any);

    if (Object.keys(filteredUpdates).length === 0) {
      throw new ApiError(400, "No valid updates provided");
    }

    await db
      .collection("shops")
      .doc(shopId)
      .update({
        ...filteredUpdates,
        updatedAt: timestamp,
      });

    res.status(200).json({
      success: true,
      message: "Shop updated successfully",
    });
  } catch (error) {
    handleError(error, res);
  }
};
