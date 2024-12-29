import {Response} from "express";
import {ApiError} from "../utils/ApiError";
import * as logger from "firebase-functions/logger";

export const handleError = (error: unknown, response: Response) => {
  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  logger.error("Unexpected error:", error);
  return response.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
