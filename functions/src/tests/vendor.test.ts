/* eslint-disable no-invalid-this */
import * as admin from "firebase-admin";
import {expect} from "chai";
import {registerVendor} from "../controllers/vendor/auth";
import {addShop, getVendorShops} from "../controllers/vendor/shop";

describe("Vendor APIs", function() {
  this.timeout(10000);

  beforeEach(async function() {
    // Clean up existing test data
    const vendors = await admin.firestore().collection("vendors").get();
    await Promise.all(vendors.docs.map((doc) => doc.ref.delete()));
  });

  describe("registerVendor", function() {
    it("should register a new vendor successfully", async function() {
      const req = {
        body: {
          vendorName: "Test Vendor",
          vendorEmail: "test" + Date.now() + "@vendor.com", // Unique email
          vendorMobile: "9876543214",
          deviceToken: "test_device_token",
          deviceType: "ANDROID",
        },
      };

      let responseData: {statusCode: number; data: any} | undefined;
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            responseData = {statusCode: code, data};
            console.log("Register Vendor Response:", responseData);
            return res;
          },
        }),
      };

      await registerVendor(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(200);
      expect(responseData!.data.success).to.be.true;
      expect(responseData!.data.data.vendorId).to.exist;
    });

    it("should fail when email already exists", async function() {
      // First register a vendor
      const existingEmail = "test" + Date.now() + "@vendor.com";
      await admin.firestore().collection("vendors").add({
        vendorName: "Existing Vendor",
        vendorEmail: existingEmail,
        vendorMobile: "9876543210",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = {
        body: {
          vendorName: "Test Vendor",
          vendorEmail: existingEmail,
          vendorMobile: "9876543214",
          deviceToken: "test_device_token",
          deviceType: "ANDROID",
        },
      };

      let responseData: {statusCode: number; data: any} | undefined;
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            responseData = {statusCode: code, data};
            return res;
          },
        }),
      };

      await registerVendor(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(400);
      expect(responseData!.data.message).to.equal("Vendor with this email already exists");
    });

    it("should fail when mobile already exists", async function() {
      const existingMobile = "9876543210";
      await admin.firestore().collection("vendors").add({
        vendorName: "Existing Vendor",
        vendorEmail: "existing@vendor.com",
        vendorMobile: existingMobile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = {
        body: {
          vendorName: "Test Vendor",
          vendorEmail: "test" + Date.now() + "@vendor.com",
          vendorMobile: existingMobile,
          deviceToken: "test_device_token",
          deviceType: "ANDROID",
        },
      };

      let responseData: {statusCode: number; data: any} | undefined;
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            responseData = {statusCode: code, data};
            return res;
          },
        }),
      };

      await registerVendor(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(400);
      expect(responseData!.data.message).to.equal("Vendor with this mobile already exists");
    });
  });

  describe("Shop Management", function() {
    let vendorId: string;

    beforeEach(async function() {
      // Create a test vendor
      const vendorRef = await admin.firestore().collection("vendors").add({
        vendorName: "Test Vendor",
        vendorEmail: "test" + Date.now() + "@vendor.com",
        vendorMobile: "9876543214",
        shopIds: [],
        verificationDocumentIds: [],
        referredVendorIds: [],
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await vendorRef.update({vendorId: vendorRef.id});
      vendorId = vendorRef.id;
    });

    it("should add a shop successfully", async function() {
      const req = {
        method: "POST",
        body: {
          vendorId: vendorId,
          shopName: "Test Shop",
          shopAddress: {
            coordinates: {
              latitude: 23.0225,
              longitude: 72.5714,
            },
            completeAddress: "Test Address",
          },
        },
      };

      let responseData: {statusCode: number; data: any} | undefined;
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            responseData = {statusCode: code, data};
            console.log("Add Shop Response:", responseData);
            return res;
          },
        }),
      };

      await addShop(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(200);
      expect(responseData!.data.success).to.be.true;
      expect(responseData!.data.data.shopId).to.exist;
    });

    it("should get vendor shops", async function() {
      // First create an address
      const addressRef = await admin.firestore().collection("addresses").add({
        addressId: "",
        addressCoordinates: {
          latitude: 23.0225,
          longitude: 72.5714,
        },
        completeAddress: "Test Address",
        shopId: "", // Will be updated
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const addressId = addressRef.id;
      await addressRef.update({addressId});

      // Then add a shop
      const shopRef = await admin.firestore().collection("shops").add({
        vendorId,
        shopId: "",
        shopName: "Test Shop",
        shopLocation: addressId, // Link to address
        shopLevel: "BRONZE",
        totalShopSaleTillDate: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const shopId = shopRef.id;
      await shopRef.update({shopId});

      // Update address with shopId
      await addressRef.update({shopId});

      // Update vendor's shopIds array
      await admin.firestore().collection("vendors").doc(vendorId).update({
        shopIds: admin.firestore.FieldValue.arrayUnion(shopId),
      });

      const req = {
        method: "GET",
        query: {vendorId},
      };

      let responseData: {statusCode: number; data: any} | undefined;
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            responseData = {statusCode: code, data};
            return res;
          },
        }),
      };

      await getVendorShops(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(200);
      expect(responseData!.data.success).to.be.true;
      expect(responseData!.data.data).to.be.an("array").with.lengthOf(1);
    });
  });
});
