import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {MercadoPagoConfig, Payment, Preference} from "mercadopago";
import Stripe from "stripe";

const DAYS_MAP: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "365d": 365,
};

type AccessPlan = "7d" | "30d" | "365d" | "lifetime";

function getFunctionsConfigValue(path: string[]): string | undefined {
  try {
    let current: unknown = functions.config();
    for (const key of path) {
      if (!current || typeof current !== "object" || !(key in current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return typeof current === "string" ? current : undefined;
  } catch {
    return undefined;
  }
}

function getStripeSecret(): string | undefined {
  return process.env.STRIPE_SECRET || getFunctionsConfigValue(["stripe", "secret"]);
}

function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK || getFunctionsConfigValue(["stripe", "webhook"]);
}

function getMercadoPagoToken(): string | undefined {
  return process.env.MP_ACCESS_TOKEN || getFunctionsConfigValue(["mp", "access_token"]);
}

function getStripeClient(): Stripe {
  const secret = getStripeSecret();
  if (!secret) {
    throw new HttpsError("failed-precondition", "Stripe secret is not configured");
  }
  return new Stripe(secret, {apiVersion: "2023-10-16"});
}

function getMercadoPagoClients(): {preference: Preference; payment: Payment} {
  const token = getMercadoPagoToken();
  if (!token) {
    throw new HttpsError("failed-precondition", "Mercado Pago token is not configured");
  }

  const client = new MercadoPagoConfig({accessToken: token});
  return {
    preference: new Preference(client),
    payment: new Payment(client),
  };
}

function parsePlan(plan: unknown): AccessPlan {
  if (plan === "7d" || plan === "30d" || plan === "365d" || plan === "lifetime") {
    return plan;
  }
  throw new HttpsError("invalid-argument", "Invalid plan");
}

function parsePrice(price: unknown): number {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new HttpsError("invalid-argument", "Invalid price");
  }
  return price;
}

function parseMediaId(mediaId: unknown): string {
  if (typeof mediaId !== "string" || mediaId.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Invalid mediaId");
  }
  return mediaId.trim();
}

function calculateExpiry(plan: AccessPlan): admin.firestore.Timestamp | null {
  if (plan === "lifetime") return null;

  const days = DAYS_MAP[plan];
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return admin.firestore.Timestamp.fromDate(expiresAt);
}

async function grantAccess(data: {
  uid: string;
  mediaId: string;
  plan: AccessPlan;
  paymentId: string;
}) {
  const accessId = `${data.uid}_${data.mediaId}`;
  await admin.firestore().collection("mediaAccess").doc(accessId).set({
    buyerUid: data.uid,
    mediaId: data.mediaId,
    plan: data.plan,
    expiresAt: calculateExpiry(data.plan),
    active: true,
    paymentId: data.paymentId,
    createdAt: admin.firestore.Timestamp.now(),
  });
}

export const createMPCheckout = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Auth required");

  const mediaId = parseMediaId(req.data?.mediaId);
  const plan = parsePlan(req.data?.plan);
  const price = parsePrice(req.data?.price);

  const {preference} = getMercadoPagoClients();
  const notificationUrl = process.env.MP_WEBHOOK_URL ||
    `https://${process.env.GCLOUD_PROJECT ?? "PROJECT_ID"}.cloudfunctions.net/mpWebhook`;

  const result = await preference.create({
    body: {
      items: [{
        id: mediaId,
        title: mediaId,
        quantity: 1,
        unit_price: price,
      }],
      metadata: {uid, mediaId, plan},
      notification_url: notificationUrl,
    },
  });

  return {
    url: result.init_point || result.sandbox_init_point || null,
  };
});

export const createStripeCheckout = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Auth required");

  const mediaId = parseMediaId(req.data?.mediaId);
  const plan = parsePlan(req.data?.plan);
  const price = parsePrice(req.data?.price);

  const stripe = getStripeClient();
  const successUrl = process.env.STRIPE_SUCCESS_URL || "https://example.com/success";
  const cancelUrl = process.env.STRIPE_CANCEL_URL || "https://example.com/cancel";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "brl",
        product_data: {name: mediaId},
        unit_amount: Math.round(price * 100),
      },
      quantity: 1,
    }],
    metadata: {uid, mediaId, plan},
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return {url: session.url};
});

export const mpWebhook = onRequest(async (req, res) => {
  const body = req.body as {type?: string; data?: {id?: string | number}};
  if (body.type !== "payment" || !body.data?.id) {
    res.sendStatus(200);
    return;
  }

  const {payment} = getMercadoPagoClients();
  const paymentResult = await payment.get({id: body.data.id.toString()});
  if (paymentResult.status !== "approved") {
    res.sendStatus(200);
    return;
  }

  const metadata = paymentResult.metadata as {
    uid?: string;
    mediaId?: string;
    plan?: AccessPlan;
  } | undefined;

  if (!metadata?.uid || !metadata.mediaId || !metadata.plan) {
    res.sendStatus(200);
    return;
  }

  await grantAccess({
    uid: metadata.uid,
    mediaId: metadata.mediaId,
    plan: parsePlan(metadata.plan),
    paymentId: String(paymentResult.id),
  });

  res.sendStatus(200);
});

export const stripeWebhook = onRequest(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = getStripeWebhookSecret();
  if (!signature || typeof signature !== "string" || !webhookSecret) {
    res.status(400).send("Webhook Error");
    return;
  }

  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch {
    res.status(400).send("Webhook Error");
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const uid = session.metadata?.uid;
    const mediaId = session.metadata?.mediaId;
    const plan = session.metadata?.plan;

    if (uid && mediaId && plan && session.payment_intent) {
      await grantAccess({
        uid,
        mediaId,
        plan: parsePlan(plan),
        paymentId: String(session.payment_intent),
      });
    }
  }

  res.json({received: true});
});
