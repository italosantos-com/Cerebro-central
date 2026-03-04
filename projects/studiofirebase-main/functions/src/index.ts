/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Import custom functions
import { enforceAdminProfileSettings } from './adminProfile';
import { setAdminRole } from './roles';
import {
  createMPCheckout,
  createStripeCheckout,
  mpWebhook,
  stripeWebhook,
} from "./payments";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

if (admin.apps.length === 0) {
	admin.initializeApp();
}

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const processScheduledMessages = onSchedule(
	"every 1 minutes",
	async () => {
		const db = admin.firestore();
		const now = admin.firestore.Timestamp.now();

		const pendingSnap = await db
			.collection("scheduled_messages")
			.where("status", "==", "pending")
			.where("scheduledAt", "<=", now)
			.limit(50)
			.get();

		if (pendingSnap.empty) {
			logger.info("[Scheduler] Nenhuma mensagem pendente.");
			return;
		}

		const adminsSnap = await db.collection("admins").get();
		const adminUids = adminsSnap.docs.map((doc) => doc.id);

		for (const doc of pendingSnap.docs) {
			const data = doc.data();
			const batch = db.batch();
			const sentAt = admin.firestore.Timestamp.now();

			adminUids.forEach((adminUid) => {
				const notificationRef = db.collection("admin_notifications").doc();
				batch.set(notificationRef, {
					adminUid,
					type: "scheduled_message",
					message: data.message || "",
					scheduledAt: data.scheduledAt,
					sentAt,
					status: "sent",
					scheduleId: doc.id,
					createdAt: sentAt,
				});
			});

			batch.update(doc.ref, {
				status: "sent",
				sentAt,
			});

			await batch.commit();
		}
	},
);

// Export custom functions
export { enforceAdminProfileSettings, setAdminRole };
export { createMPCheckout, createStripeCheckout, mpWebhook, stripeWebhook };
