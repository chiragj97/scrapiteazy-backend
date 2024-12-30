import express from "express";
import {addShop, getVendorShops} from "../controllers/vendor/shop";

const router = express.Router();

// Shop management routes
router.post("/add-shop", addShop);
router.get("/shops/:vendorId", getVendorShops);

export default router;
