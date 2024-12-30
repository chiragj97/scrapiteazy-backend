import {Request, Response} from "express";
import {db, messaging} from "../../config/firebase";
import {Booking, Address, Shop, Customer} from "../../types";
import {ApiError} from "../../utils/ApiError";
import {handleError} from "../../middlewares/error";
import {calculateDistance} from "../../utils/distance";
// Helper function to populate booking data
const populateBookingData = async (booking: Booking) => {
  // Populate shop data for all notified shops
  let shopsData: (Shop & { address: Address })[] = [];
  if (booking.nearbyShopsNotified && booking.nearbyShopsNotified.length > 0) {
    shopsData = await Promise.all(
      booking.nearbyShopsNotified.map(async (shopId) => {
        const shopDoc = await db.collection("shops").doc(shopId).get();
        const shop = shopDoc.data() as Shop;

        const shopAddressDoc = await db
          .collection("addresses")
          .doc(shop.shopLocation)
          .get();
        return {
          ...shop,
          address: shopAddressDoc.data() as Address,
        };
      })
    );
  }

  // Populate customer data
  const customerDoc = await db
    .collection("customers")
    .doc(booking.customerId)
    .get();
  const customerData = customerDoc.data() as Customer;

  // Populate scrap details
  const scrapDetails = await Promise.all(
    booking.exactScrapSold.map(async (scrap) => {
      const scrapDoc = await db.collection("scraps").doc(scrap.scrapId).get();
      return {
        ...scrap,
        scrapDetails: scrapDoc.data(),
      };
    })
  );

  return {
    ...booking,
    notifiedShops: shopsData,
    customer: customerData,
    exactScrapSold: scrapDetails,
  };
};

// Schedule Pickup
export const schedulePickup = async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") {
      throw new ApiError(405, "Method not allowed");
    }

    const {
      customerId,
      scheduledDateTime,
      scrapTypes,
      scrapSize,
      scrapImage,
      pickupLocation,
    } = req.body;

    if (
      !customerId ||
      !scheduledDateTime ||
      !scrapTypes ||
      !scrapSize ||
      !pickupLocation ||
      !pickupLocation.coordinates ||
      !pickupLocation.completeAddress
    ) {
      throw new ApiError(400, "Missing required fields");
    }

    // Validate scheduled date is not in the past
    const scheduledDate = new Date(scheduledDateTime);
    if (scheduledDate.getTime() < Date.now()) {
      throw new ApiError(400, "Cannot schedule pickup for past date");
    }

    // Validate customer exists
    const customerDoc = await db.collection("customers").doc(customerId).get();
    if (!customerDoc.exists) {
      throw new ApiError(404, "Customer not found");
    }

    const timestamp = new Date().toISOString();

    // Find 5 nearest shops
    const shopsSnapshot = await db.collection("shops").get();
    const shops = (await Promise.all(
      shopsSnapshot.docs.map(async (doc) => {
        try {
          const shopData = doc.data() as Shop;
          if (!shopData.shopLocation) {
            return null;
          }

          const shopAddressDoc = await db
            .collection("addresses")
            .doc(shopData.shopLocation)
            .get();

          if (!shopAddressDoc.exists) {
            return null;
          }

          const shopAddress = shopAddressDoc.data() as Address;
          if (!shopAddress.addressCoordinates) {
            return null;
          }

          return {
            ...shopData,
            distance: calculateDistance(
              pickupLocation.coordinates,
              shopAddress.addressCoordinates
            ),
          };
        } catch (error) {
          console.error(`Error processing shop ${doc.id}:`, error);
          return null;
        }
      })
    )).filter((shop): shop is (Shop & { distance: number }) => shop !== null);

    const nearestShops = shops
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    if (nearestShops.length === 0) {
      throw new ApiError(400, "No shops available in your area");
    }

    // Create booking
    const bookingData: Booking = {
      bookingId: "",
      customerId,
      scheduledDateTime,
      scrapTypes,
      scrapSize,
      ...(scrapImage && {scrapImage}),
      pickupLocation,
      pickupStatus: "REQUESTED",
      earnings: 0,
      exactScrapSold: [],
      nearbyShopsNotified: nearestShops.map((shop) => shop.shopId),
      requestedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const bookingRef = await db.collection("bookings").add(bookingData);
    bookingData.bookingId = bookingRef.id;
    await bookingRef.update({bookingId: bookingRef.id});

    // Populate the response data
    const populatedBooking = await populateBookingData(bookingData);

    // Send notifications to nearby shops
    const notificationPromises = nearestShops.map(async (shop) => {
      // Get vendor's device tokens
      const tokenSnapshot = await db
        .collection("deviceTokens")
        .where("userId", "==", shop.vendorId)
        .where("userType", "==", "VENDOR")
        .get();

      const notificationData = {
        title: "New Pickup Request",
        body: `New ${scrapSize} pickup request nearby`,
        data: {
          bookingId: bookingRef.id,
          type: "NEW_PICKUP_REQUEST",
        },
      };

      // Store notification
      await db.collection("notifications").add({
        notificationId: "",
        userId: shop.vendorId,
        userType: "VENDOR",
        ...notificationData,
        isRead: false,
        createdAt: timestamp,
      });

      // Send FCM notifications
      const tokens = tokenSnapshot.docs.map((doc) => doc.data().token);
      if (tokens.length > 0) {
        await Promise.all(
          tokens.map((token) =>
            messaging.send({
              token,
              notification: {
                title: notificationData.title,
                body: notificationData.body,
              },
              data: notificationData.data,
            })
          )
        );
      }
    });

    await Promise.all(notificationPromises);

    res.status(200).json({
      success: true,
      data: {
        booking: populatedBooking,
        notifiedShops: nearestShops.map((shop) => ({
          ...shop,
          distance: `${shop.distance.toFixed(2)} km`,
        })),
      },
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Get Customer's Bookings
export const getCustomerBookings = async (req: Request, res: Response) => {
  try {
    if (req.method !== "GET") {
      throw new ApiError(405, "Method not allowed");
    }

    const customerId = req.query.customerId as string;
    const status = req.query.status as string;

    if (!customerId) {
      throw new ApiError(400, "Customer ID is required");
    }

    const customerDoc = await db.collection("customers").doc(customerId).get();
    if (!customerDoc.exists) {
      throw new ApiError(404, "Customer not found");
    }

    let query = db.collection("bookings").where("customerId", "==", customerId);

    if (status) {
      query = query
        .where("pickupStatus", "==", status)
        .orderBy("createdAt", "desc");
    } else {
      query = query.orderBy("createdAt", "desc");
    }

    const bookingsSnapshot = await query.get();

    const bookings = await Promise.all(
      bookingsSnapshot.docs.map(async (doc) => {
        const bookingData = doc.data() as Booking;
        return populateBookingData(bookingData);
      })
    );

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Cancel Booking
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") {
      throw new ApiError(405, "Method not allowed");
    }

    const {bookingId, cancelReason} = req.body;

    if (!bookingId || !cancelReason) {
      throw new ApiError(400, "Booking ID and cancel reason are required");
    }

    const timestamp = new Date().toISOString();

    const bookingRef = await db.collection("bookings").doc(bookingId).get();
    if (!bookingRef.exists) {
      throw new ApiError(404, "Booking not found");
    }

    const bookingData = bookingRef.data() as Booking;
    if (!["REQUESTED", "ACCEPTED"].includes(bookingData.pickupStatus)) {
      throw new ApiError(400, "Booking cannot be cancelled in current status");
    }

    await bookingRef.ref.update({
      pickupStatus: "CANCELLED",
      cancelReason,
      cancelledAt: timestamp,
      updatedAt: timestamp,
    });

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Rate Booking
export const rateBooking = async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") {
      throw new ApiError(405, "Method not allowed");
    }

    const {bookingId, rating, feedback} = req.body;

    if (!bookingId || !rating) {
      throw new ApiError(400, "Booking ID and rating are required");
    }

    const timestamp = new Date().toISOString();
    const bookingRef = await db.collection("bookings").doc(bookingId).get();

    if (!bookingRef.exists) {
      throw new ApiError(404, "Booking not found");
    }

    const bookingData = bookingRef.data() as Booking;
    if (bookingData.pickupStatus !== "COMPLETED") {
      throw new ApiError(400, "Can only rate completed bookings");
    }

    await bookingRef.ref.update({
      rating,
      feedback,
      updatedAt: timestamp,
    });

    res.status(200).json({
      success: true,
      message: "Rating submitted successfully",
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Update Booking Status
export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") {
      throw new ApiError(405, "Method not allowed");
    }

    const {bookingId, status, estimatedCompletionTime} = req.body;

    if (!bookingId || !status) {
      throw new ApiError(400, "Booking ID and status are required");
    }

    const timestamp = new Date().toISOString();
    const bookingRef = await db.collection("bookings").doc(bookingId).get();

    if (!bookingRef.exists) {
      throw new ApiError(404, "Booking not found");
    }

    const bookingData = bookingRef.data() as Booking;
    const validTransitions: Record<Booking["pickupStatus"], string[]> = {
      PENDING: ["REQUESTED"],
      REQUESTED: ["ACCEPTED", "CANCELLED"],
      ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!validTransitions[bookingData.pickupStatus]?.includes(status)) {
      throw new ApiError(400, "Invalid status transition");
    }

    const updates = {
      pickupStatus: status,
      updatedAt: timestamp,
      ...(status === "IN_PROGRESS" && {
        startedAt: timestamp,
        ...(estimatedCompletionTime && {estimatedCompletionTime}),
      }),
      ...(status === "COMPLETED" && {
        completedAt: timestamp,
      }),
    };

    await bookingRef.ref.update(updates);

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
    });
  } catch (error) {
    handleError(error, res);
  }
};
