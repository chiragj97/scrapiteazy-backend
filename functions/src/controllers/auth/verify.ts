import {Request, Response} from "express";
import {db} from "../../config/firebase";
import {ApiError} from "../../utils/ApiError";
import {handleError} from "../../middlewares/error";
// Single handler for both Firebase and Express
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const {otpId, otp, deviceToken, deviceType} = req.body;

    if (!otpId || !otp) {
      throw new ApiError(400, "OTP and OTP ID are required");
    }

    // Get OTP document
    const otpDoc = await db.collection("otps").doc(otpId).get();
    if (!otpDoc.exists) {
      throw new ApiError(404, "Invalid OTP ID");
    }

    const otpData = otpDoc.data();
    if (!otpData) {
      throw new ApiError(404, "OTP data not found");
    }

        // Add OTP interface
        interface OTPData {
            expiresAt: string;
            verified: boolean;
            otp: string;
            userId: string;
            userType: "VENDOR" | "CUSTOMER";
        }

        // Type assertion
        const typedOTPData = otpData as OTPData;

        const timestamp = new Date().toISOString();

        // Check if OTP is expired
        if (new Date(typedOTPData.expiresAt) < new Date()) {
          throw new ApiError(400, "OTP has expired");
        }

        // Check if OTP is already verified
        if (typedOTPData.verified) {
          throw new ApiError(400, "OTP already used");
        }

        // Verify OTP
        if (typedOTPData.otp !== otp) {
          throw new ApiError(400, "Invalid OTP");
        }

        // Mark OTP as verified
        await otpDoc.ref.update({
          verified: true,
          updatedAt: timestamp,
        });

        // Get user data based on userType
        const userCollection = typedOTPData.userType === "VENDOR" ? "vendors" : "customers";
        const userDoc = await db.collection(userCollection).doc(typedOTPData.userId).get();
        const userData = userDoc.data();

        // Register device token if provided
        if (deviceToken && deviceType) {
          const tokenData = {
            tokenId: "",
            userId: typedOTPData.userId,
            userType: typedOTPData.userType,
            token: deviceToken,
            deviceType,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          const tokenRef = await db.collection("deviceTokens").add(tokenData);
          await tokenRef.update({tokenId: tokenRef.id});
        }

        // Generate session token
        const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

        // Store session
        await db.collection("sessions").add({
          sessionId: "",
          userId: typedOTPData.userId,
          userType: typedOTPData.userType,
          token: sessionToken,
          createdAt: timestamp,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        res.status(200).json({
          success: true,
          message: "OTP verified successfully",
          data: {
            user: {
              ...userData,
              userType: typedOTPData.userType,
            },
            sessionToken,
          },
        });
  } catch (error) {
    handleError(error, res);
  }
};
