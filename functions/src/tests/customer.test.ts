/* eslint-disable no-invalid-this */
import * as admin from "firebase-admin";
import {db} from "../config/firebase";
import {expect} from "chai";
import {registerCustomer} from "../controllers/customer/auth";
import {
  schedulePickup,
  getCustomerBookings,
  updateBookingStatus,
  cancelBooking,
} from "../controllers/customer/booking";

describe("Customer APIs", () => {
  before(function() {
    this.timeout(30000);
  });

  beforeEach(async function() {
    // Simpler cleanup approach
    const collections = ["customers", "bookings"];

    for (const collection of collections) {
      const snapshot = await db.collection(collection).get();
      const deleteOps = snapshot.docs.map((doc) => doc.ref.delete());
      await Promise.all(deleteOps);
    }
  });

  describe("registerCustomer", function() {
    it("should register a new customer successfully", async function() {
      const req = {
        method: "POST",
        body: {
          customerName: "Test Customer",
          customerEmail: "test" + Date.now() + "@customer.com",
          customerMobile: "9876543214",
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

      await registerCustomer(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(200);
      expect(responseData!.data.success).to.be.true;
      expect(responseData!.data.data.customerId).to.exist;
    });

    it("should fail when email already exists", async function() {
      // First register a customer
      const existingEmail = "test" + Date.now() + "@customer.com";
      await admin.firestore().collection("customers").add({
        customerName: "Existing Customer",
        customerEmail: existingEmail,
        customerMobile: "9876543210",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = {
        method: "POST",
        body: {
          customerName: "Test Customer",
          customerEmail: existingEmail,
          customerMobile: "9876543214",
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

      await registerCustomer(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(400);
      expect(responseData!.data.message).to.equal("Customer with this email already exists");
    });

    it("should fail when mobile already exists", async function() {
      const existingMobile = "9876543210";
      await admin.firestore().collection("customers").add({
        customerName: "Existing Customer",
        customerEmail: "existing@customer.com",
        customerMobile: existingMobile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = {
        method: "POST",
        body: {
          customerName: "Test Customer",
          customerEmail: "test" + Date.now() + "@customer.com",
          customerMobile: existingMobile,
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

      await registerCustomer(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(400);
      expect(responseData!.data.message).to.equal("Customer with this mobile already exists");
    });
  });

  describe("Booking Management", function() {
    let customerId: string;
    let vendorId: string;
    let shopId: string;

    beforeEach(async function() {
      // Create a test customer
      const customerRef = await admin.firestore().collection("customers").add({
        customerName: "Test Customer",
        customerEmail: "test" + Date.now() + "@customer.com",
        customerMobile: "9876543214",
        customerSavedAddresses: [],
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await customerRef.update({customerId: customerRef.id});
      customerId = customerRef.id;

      // Create a test vendor and shop for distance calculation
      const vendorRef = await admin.firestore().collection("vendors").add({
        vendorName: "Test Vendor",
        vendorEmail: "vendor" + Date.now() + "@test.com",
        vendorMobile: "9876543215",
        shopIds: [],
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      vendorId = vendorRef.id;
      await vendorRef.update({vendorId});

      // Create shop address
      const shopAddressRef = await admin.firestore().collection("addresses").add({
        addressId: "",
        addressCoordinates: {
          latitude: 23.0225,
          longitude: 72.5714,
        },
        completeAddress: "Test Shop Address",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await shopAddressRef.update({addressId: shopAddressRef.id});

      // Create a shop
      const shopRef = await admin.firestore().collection("shops").add({
        shopId: "",
        shopName: "Test Shop",
        shopLocation: shopAddressRef.id,
        vendorId,
        shopLevel: "BRONZE",
        totalShopSaleTillDate: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      shopId = shopRef.id;
      await shopRef.update({shopId});
      await vendorRef.update({
        shopIds: admin.firestore.FieldValue.arrayUnion(shopId),
      });
    });

    it("should schedule a pickup successfully", async function() {
      const req = {
        method: "POST",
        body: {
          customerId,
          scheduledDateTime: new Date(Date.now() + 86400000).toISOString(),
          scrapTypes: ["PAPER", "PLASTIC"],
          scrapSize: "MEDIUM",
          pickupLocation: {
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
            return res;
          },
        }),
      };

      await schedulePickup(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(200);
      expect(responseData!.data.success).to.be.true;
      expect(responseData!.data.data.booking).to.exist;
      expect(responseData!.data.data.notifiedShops).to.be.an("array");
    });

    it("should fail scheduling pickup for past date", async function() {
      const req = {
        method: "POST",
        body: {
          customerId,
          scheduledDateTime: new Date(Date.now() - 86400000).toISOString(),
          scrapTypes: ["PAPER", "PLASTIC"],
          scrapSize: "MEDIUM",
          pickupLocation: {
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
            return res;
          },
        }),
      };

      await schedulePickup(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(400);
      expect(responseData!.data.message).to.equal("Cannot schedule pickup for past date");
    });

    it("should get customer bookings", async function() {
      // First create a booking
      const bookingRef = await admin.firestore().collection("bookings").add({
        bookingId: "",
        customerId,
        scheduledDateTime: new Date(Date.now() + 86400000).toISOString(),
        scrapTypes: ["PAPER", "PLASTIC"],
        scrapSize: "MEDIUM",
        pickupStatus: "REQUESTED",
        pickupLocation: {
          coordinates: {
            latitude: 23.0225,
            longitude: 72.5714,
          },
          completeAddress: "Test Address",
        },
        earnings: 0,
        exactScrapSold: [],
        nearbyShopsNotified: [shopId],
        requestedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await bookingRef.update({bookingId: bookingRef.id});

      const req = {
        method: "GET",
        query: {customerId},
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

      await getCustomerBookings(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(200);
      expect(responseData!.data.success).to.be.true;
      expect(responseData!.data.data).to.be.an("array").with.lengthOf(1);
    });

    it("should update booking status successfully", async function() {
      // First create a booking
      const bookingRef = await admin.firestore().collection("bookings").add({
        bookingId: "",
        customerId,
        scheduledDateTime: new Date(Date.now() + 86400000).toISOString(),
        scrapTypes: ["PAPER", "PLASTIC"],
        scrapSize: "MEDIUM",
        pickupStatus: "REQUESTED",
        pickupLocation: {
          coordinates: {
            latitude: 23.0225,
            longitude: 72.5714,
          },
          completeAddress: "Test Address",
        },
        earnings: 0,
        exactScrapSold: [],
        nearbyShopsNotified: [shopId],
        requestedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const bookingId = bookingRef.id;
      await bookingRef.update({bookingId});

      const req = {
        method: "POST",
        body: {
          bookingId,
          status: "ACCEPTED",
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

      await updateBookingStatus(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(200);
      expect(responseData!.data.success).to.be.true;
      expect(responseData!.data.message).to.equal("Booking status updated successfully");

      // Verify status in database
      const updatedBooking = await bookingRef.get();
      expect(updatedBooking.data()?.pickupStatus).to.equal("ACCEPTED");
    });

    it("should fail updating status with invalid transition", async function() {
      // Create booking with COMPLETED status
      const bookingRef = await admin.firestore().collection("bookings").add({
        bookingId: "",
        customerId,
        scheduledDateTime: new Date(Date.now() + 86400000).toISOString(),
        scrapTypes: ["PAPER", "PLASTIC"],
        scrapSize: "MEDIUM",
        pickupStatus: "COMPLETED",
        pickupLocation: {
          coordinates: {
            latitude: 23.0225,
            longitude: 72.5714,
          },
          completeAddress: "Test Address",
        },
        earnings: 0,
        exactScrapSold: [],
        nearbyShopsNotified: [shopId],
        requestedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const bookingId = bookingRef.id;
      await bookingRef.update({bookingId});

      const req = {
        method: "POST",
        body: {
          bookingId,
          status: "ACCEPTED",
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

      await updateBookingStatus(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(400);
      expect(responseData!.data.message).to.equal("Invalid status transition");
    });

    it("should cancel booking successfully", async function() {
      // Create a booking in REQUESTED status
      const bookingRef = await admin.firestore().collection("bookings").add({
        bookingId: "",
        customerId,
        scheduledDateTime: new Date(Date.now() + 86400000).toISOString(),
        scrapTypes: ["PAPER", "PLASTIC"],
        scrapSize: "MEDIUM",
        pickupStatus: "REQUESTED",
        pickupLocation: {
          coordinates: {
            latitude: 23.0225,
            longitude: 72.5714,
          },
          completeAddress: "Test Address",
        },
        earnings: 0,
        exactScrapSold: [],
        nearbyShopsNotified: [shopId],
        requestedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const bookingId = bookingRef.id;
      await bookingRef.update({bookingId});

      const req = {
        method: "POST",
        body: {
          bookingId,
          cancelReason: "Changed my mind",
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

      await cancelBooking(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(200);
      expect(responseData!.data.success).to.be.true;
      expect(responseData!.data.message).to.equal("Booking cancelled successfully");

      // Verify status in database
      const updatedBooking = await bookingRef.get();
      expect(updatedBooking.data()?.pickupStatus).to.equal("CANCELLED");
      expect(updatedBooking.data()?.cancelReason).to.equal("Changed my mind");
    });

    it("should fail cancelling completed booking", async function() {
      // Create a booking in COMPLETED status
      const bookingRef = await admin.firestore().collection("bookings").add({
        bookingId: "",
        customerId,
        scheduledDateTime: new Date(Date.now() + 86400000).toISOString(),
        scrapTypes: ["PAPER", "PLASTIC"],
        scrapSize: "MEDIUM",
        pickupStatus: "COMPLETED",
        pickupLocation: {
          coordinates: {
            latitude: 23.0225,
            longitude: 72.5714,
          },
          completeAddress: "Test Address",
        },
        earnings: 0,
        exactScrapSold: [],
        nearbyShopsNotified: [shopId],
        requestedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const bookingId = bookingRef.id;
      await bookingRef.update({bookingId});

      const req = {
        method: "POST",
        body: {
          bookingId,
          cancelReason: "Changed my mind",
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

      await cancelBooking(req as any, res as any);
      expect(responseData).to.not.be.undefined;
      expect(responseData!.statusCode).to.equal(400);
      expect(responseData!.data.message).to.equal("Booking cannot be cancelled in current status");
    });
  });
});
