import {Request, Response} from "express";
import {db} from "../../config/firebase";
import {ApiError} from "../../utils/ApiError";
import {handleError} from "../../middlewares/error";
import {Vendor, DeviceToken} from "../../types";
import {sendOTP} from "../../services/sms";

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

export const vendorLogin = async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") {
      throw new ApiError(405, "Method not allowed");
    }

    const {mobile} = req.body;

    if (!mobile) {
      throw new ApiError(400, "Mobile number is required");
    }

    // Check if vendor exists
    const vendorSnapshot = await db
      .collection("vendors")
      .where("vendorMobile", "==", mobile)
      .get();

    if (vendorSnapshot.empty) {
      throw new ApiError(404, "Vendor not registered");
    }

    const timestamp = new Date().toISOString();
    const vendorData = vendorSnapshot.docs[0].data() as Vendor;

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const otpData = {
      otpId: "",
      userId: vendorData.vendorId,
      userType: "VENDOR",
      otp,
      expiresAt,
      verified: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const otpRef = await db.collection("otps").add(otpData);
    await otpRef.update({otpId: otpRef.id});

    // TODO: Integrate SMS service to send OTP

    const smsSent = await sendOTP(mobile, otp);
    if (!smsSent) {
      throw new ApiError(500, "Failed to send OTP. Please try again.");
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: {
        otpId: otpRef.id,
      },
    });
  } catch (error) {
    handleError(error, res);
  }
};
