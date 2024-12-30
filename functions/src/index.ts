/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";
import vendorRoutes from "./routes/vendor.routes";
import authRoutes from "./routes/auth.routes";
import bookingRoutes from "./routes/booking.routes";

const app = express();

// Middleware
app.use(cors({origin: true}));
app.use(express.json());

// Basic test route
app.get("/test", (req, res) => {
  res.json({message: "Hello from Firebase Functions!"});
});

// Routes
app.use("/vendor", vendorRoutes);
app.use("/auth", authRoutes);
app.use("/booking", bookingRoutes);

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest(app);
