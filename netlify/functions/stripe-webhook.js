const Stripe = require("stripe");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return textResponse(405, "Method not allowed.");
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    return textResponse(500, "Missing STRIPE_SECRET_KEY.");
  }

  if (!webhookSecret) {
    return textResponse(500, "Missing STRIPE_WEBHOOK_SECRET.");
  }

  const signature = event.headers["stripe-signature"];

  if (!signature) {
    return textResponse(400, "Missing Stripe signature.");
  }

  const stripe = new Stripe(stripeSecretKey);

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      webhookSecret
    );
  } catch (error) {
    return textResponse(400, `Webhook signature verification failed: ${error.message}`);
  }

  try {
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        const cancelAt = addMonthsUnix(subscription.start_date, 12);

        await stripe.subscriptions.update(session.subscription, {
          cancel_at: cancelAt,
          metadata: {
            ...subscription.metadata,
            auto_cancel_enabled: "true",
            auto_cancel_after_months: "12",
            auto_cancel_at_unix: String(cancelAt)
          }
        });
      }
    }

    return textResponse(200, "Webhook received.");
  } catch (error) {
    return textResponse(500, `Webhook handler error: ${error.message}`);
  }
};

function addMonthsUnix(unixSeconds, months) {
  const date = new Date(unixSeconds * 1000);
  date.setMonth(date.getMonth() + months);
  return Math.floor(date.getTime() / 1000);
}

function textResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/plain"
    },
    body
  };
}
