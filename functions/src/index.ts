/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import {registerVendor} from "./vendor/auth";

// Initialize express app
const app = express();

// Middleware
app.use(cors({origin: true}));
app.use(express.json());

// Basic test route
app.get("/test", (req, res) => {
  res.json({message: "Hello from Firebase Functions!"});
});

// Vendor routes
app.post("/register-vendor", registerVendor);

// Export the Express app as a Firebase Function
export const api = onRequest(app);


