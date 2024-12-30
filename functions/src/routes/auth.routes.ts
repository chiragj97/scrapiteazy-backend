import express from "express";
import {registerVendor} from "../controllers/vendor/auth";
import {registerCustomer} from "../controllers/customer/auth";

const router = express.Router();

// Vendor auth routes
router.post("/vendor/register", registerVendor);

// Customer auth routes
router.post("/customer/register", registerCustomer);

export default router;
