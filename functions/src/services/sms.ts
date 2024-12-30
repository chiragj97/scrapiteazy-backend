import twilio from "twilio";
import * as functions from "firebase-functions";
import * as dotenv from "dotenv";
// Load environment variables in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// Debug logging
console.log("Environment:", process.env.NODE_ENV);
console.log("Twilio Config:", {
  accountSid: process.env.TWILIO_ACCOUNT_SID || "from firebase config",
  fromNumber: process.env.TWILIO_PHONE_NUMBER || "from firebase config",
  usingEnvFile: process.env.NODE_ENV !== "production",
});

// Get credentials from environment or Firebase config
const accountSid = process.env.TWILIO_ACCOUNT_SID || functions.config().twilio?.account_sid;
const authToken = process.env.TWILIO_AUTH_TOKEN || functions.config().twilio?.auth_token;
const fromNumber = process.env.TWILIO_PHONE_NUMBER || functions.config().twilio?.phone_number;

// Add error checking
if (!accountSid || !authToken || !fromNumber) {
  throw new Error("Missing Twilio configuration");
}

const client = twilio(accountSid, authToken);

export const sendOTP = async (to: string, otp: string): Promise<boolean> => {
  try {
    console.log(`Attempting to send OTP to ${to} using number ${fromNumber}`);

    const message = await client.messages.create({
      body: [
        "Your ScrapitEazy verification code is:",
        `*${otp}*`,
        "Valid for 5 minutes.",
      ].join("\n"),
      from: fromNumber,
      to: `+91${to}`,
    });

    console.log("Message sent successfully:", message.sid);
    return true;
  } catch (error) {
    console.error("Error sending message:", {
      error: error instanceof Error ? error.message : "Unknown error",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code: (error as any)?.code,
      details: JSON.stringify(error, null, 2),
    });
    return false;
  }
};
