import express from "express";
import { validatePhonePeCallback } from "../services/PhonePeService";
import PaymentWebhookEvent from "../models/PaymentWebhookEvent";
import OutboxMessage from "../models/OutboxMessage";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  // Use the rawBody set by express.json verify middleware in app.ts
  const rawBody = (req as any).rawBody as string | undefined;
  if (!rawBody) {
    console.warn("No rawBody available for signature verification");
    return res.status(400).send("raw body required");
  }

  const authHeader = (req.headers["authorization"] || "") as string;

  let callbackResult;
  try {
    callbackResult = validatePhonePeCallback(authHeader, rawBody);
  } catch (err) {
    console.warn("PhonePe webhook signature mismatch or invalid payload", err);
    return res.status(401).send("invalid signature");
  }

  const payload = callbackResult.payload;

  const eventId =
    payload?.eventId ||
    payload?.id ||
    payload?.data?.transactionId ||
    JSON.stringify(payload).slice(0, 200);

  try {
    const existing = await PaymentWebhookEvent.findOne({ eventId }).lean();
    if (!existing) {
      await PaymentWebhookEvent.create({
        eventId,
        eventType: payload?.event || payload?.type || null,
        payload,
        status: "PENDING",
      });

      // enqueue processing via outbox
      await OutboxMessage.create({
        type: "process_payment_webhook",
        payload: { eventId },
        status: "PENDING",
        attempts: 0,
      });
    } else {
      console.info("duplicate webhook received, eventId=", eventId);
    }
  } catch (err) {
    console.error("failed to persist webhook event", err);
    return res.status(500).send("db error");
  }

  return res.status(200).send("ok");
});

export default router;
