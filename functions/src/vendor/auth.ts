import {Request, Response} from "express";
import {db} from "../config/firebase";
import {ApiError} from "../utils/ApiError";
import {handleError} from "../middlewares/error";
import {Vendor, DeviceToken} from "../types";

export const registerVendor = async (req: Request, res: Response) => {
  try {
    const {vendorName, vendorEmail, vendorMobile, deviceToken, deviceType} = req.body;

    if (!vendorName || !vendorMobile) {
      throw new ApiError(400, "Missing required fields");
    }

    // Check email if provided
    if (vendorEmail) {
      const existingVendorByEmail = await db
        .collection("vendors")
        .where("vendorEmail", "==", vendorEmail)
        .get();

      if (!existingVendorByEmail.empty) {
        throw new ApiError(400, "Vendor with this email already exists");
      }
    }

    // Check mobile
    const existingVendorByMobile = await db
      .collection("vendors")
      .where("vendorMobile", "==", vendorMobile)
      .get();

    if (!existingVendorByMobile.empty) {
      throw new ApiError(400, "Vendor with this mobile already exists");
    }

    const timestamp = new Date().toISOString();

    // Create vendor
    const vendorData: Vendor = {
      vendorId: "",
      vendorName,
      vendorEmail,
      vendorMobile,
      verificationDocumentIds: [],
      shopIds: [],
      referredVendorIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const vendorRef = await db.collection("vendors").add(vendorData);
    vendorData.vendorId = vendorRef.id;
    await vendorRef.update({vendorId: vendorRef.id});

    // Register device token if provided
    if (deviceToken && deviceType) {
      const tokenData: DeviceToken = {
        tokenId: "",
        userId: vendorRef.id,
        userType: "VENDOR",
        token: deviceToken,
        deviceType,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const tokenRef = await db.collection("deviceTokens").add(tokenData);
      await tokenRef.update({tokenId: tokenRef.id});
    }

    res.status(200).json({
      success: true,
      data: vendorData,
    });
  } catch (error) {
    handleError(error, res);
  }
};
