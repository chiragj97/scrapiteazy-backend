import * as admin from "firebase-admin";
import {readFileSync} from "fs";
import {join} from "path";

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../../permissions.json"), "utf-8")
);

admin.initializeApp({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credential: admin.credential.cert(serviceAccount as any),
});

export const db = admin.firestore();
export const messaging = admin.messaging();
