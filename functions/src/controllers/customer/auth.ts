import {Request, Response} from "express";
import {db} from "../../config/firebase";
import {Customer, DeviceToken, Address, AddressInput} from "../../types";
import {ApiError} from "../../utils/ApiError";
import {handleError} from "../../middlewares/error";
import {sendOTP} from "../../services/sms";

// Customer Registration
export const registerCustomer = async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") {
      throw new ApiError(405, "Method not allowed");
    }

    const {
      customerName,
      customerEmail,
      customerMobile,
      addresses,
      deviceToken,
      deviceType,
    } = req.body;

    if (!customerName || !customerMobile) {
      throw new ApiError(400, "Missing required fields");
    }

    // Check email if provided
    if (customerEmail) {
      const existingCustomerByEmail = await db
        .collection("customers")
        .where("customerEmail", "==", customerEmail)
        .get();

      if (!existingCustomerByEmail.empty) {
        throw new ApiError(400, "Customer with this email already exists");
      }
    }

    // Check mobile
    const existingCustomerByMobile = await db
      .collection("customers")
      .where("customerMobile", "==", customerMobile)
      .get();

    if (!existingCustomerByMobile.empty) {
      throw new ApiError(400, "Customer with this mobile already exists");
    }

    const timestamp = new Date().toISOString();

    // Create customer
    const customerData: Customer = {
      customerId: "",
      customerName,
      customerEmail,
      customerMobile,
      customerSavedAddresses: [],
      isVerified: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const customerRef = await db.collection("customers").add(customerData);
    customerData.customerId = customerRef.id;
    await customerRef.update({customerId: customerRef.id});

    // Add addresses if provided
    if (addresses && addresses.length > 0) {
      const addressPromises = addresses.map(async (addr: AddressInput) => {
        const addressData: Address = {
          addressId: "",
          addressCoordinates: addr.coordinates,
          completeAddress: addr.completeAddress,
          customerId: customerRef.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        const addressRef = await db.collection("addresses").add(addressData);
        addressData.addressId = addressRef.id;
        await addressRef.update({addressId: addressRef.id});

        return addressRef.id;
      });

      const addressIds = await Promise.all(addressPromises);
      await customerRef.update({
        customerSavedAddresses: addressIds,
        updatedAt: timestamp,
      });
      customerData.customerSavedAddresses = addressIds;
    }

    // Register device token if provided
    if (deviceToken && deviceType) {
      const tokenData: DeviceToken = {
        tokenId: "",
        userId: customerRef.id,
        userType: "CUSTOMER",
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
      data: customerData,
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Customer Login
export const customerLogin = async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") {
      throw new ApiError(405, "Method not allowed");
    }

    const {mobile} = req.body;

    if (!mobile) {
      throw new ApiError(400, "Mobile number is required");
    }

    // Check if customer exists
    const customerSnapshot = await db
      .collection("customers")
      .where("customerMobile", "==", mobile)
      .get();

    if (customerSnapshot.empty) {
      throw new ApiError(404, "Customer not registered");
    }

    const timestamp = new Date().toISOString();
    const customerData = customerSnapshot.docs[0].data() as Customer;

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const otpData = {
      otpId: "",
      userId: customerData.customerId,
      userType: "CUSTOMER",
      otp,
      expiresAt,
      verified: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const otpRef = await db.collection("otps").add(otpData);
    await otpRef.update({otpId: otpRef.id});

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
