const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return response(405, "Method not allowed.");
  }

  const signature = event.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    return response(500, "Missing STRIPE_WEBHOOK_SECRET.");
  }

  let stripeEvent;

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (error) {
    return response(400, `Webhook signature verification failed: ${error.message}`);
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

    return response(200, "Webhook received.");
  } catch (error) {
    return response(500, `Webhook handler error: ${error.message}`);
  }
};

function addMonthsUnix(unixSeconds, months) {
  const date = new Date(unixSeconds * 1000);
  date.setMonth(date.getMonth() + months);
  return Math.floor(date.getTime() / 1000);
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/plain"
    },
    body
  };
}
