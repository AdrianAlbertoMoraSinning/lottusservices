const Stripe = require("stripe");

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { error: "Method not allowed." });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const siteUrl = process.env.SITE_URL;

    if (!stripeSecretKey) {
      return jsonResponse(500, { error: "Missing STRIPE_SECRET_KEY." });
    }

    if (!siteUrl) {
      return jsonResponse(500, { error: "Missing SITE_URL." });
    }

    let body;

    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { error: "Invalid request body." });
    }

    const promoCode = String(body.promoCode || "").trim();
    const allowedCodes = ["1000", "1050"];

    if (!allowedCodes.includes(promoCode)) {
      return jsonResponse(400, { error: "Invalid promo code." });
    }

    const websiteCents = toCents(body.websiteAmount);
    const maintenanceCents = promoCode === "1000" ? 4000 : toCents(body.maintenanceAmount);

    if (!websiteCents || websiteCents <= 0) {
      return jsonResponse(400, { error: "Website payment amount is required." });
    }

    if (!maintenanceCents || maintenanceCents <= 0) {
      return jsonResponse(400, { error: "Monthly maintenance amount is required." });
    }

    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true
      },
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "Website Development Payment"
            },
            unit_amount: websiteCents
          },
          quantity: 1
        },
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "Monthly Website Maintenance - 12 Months"
            },
            recurring: {
              interval: "month",
              interval_count: 1
            },
            unit_amount: maintenanceCents
          },
          quantity: 1
        }
      ],
      subscription_data: {
        metadata: {
          promoCode,
          term_months: "12",
          websiteAmount_cad: centsToCad(websiteCents),
          maintenanceAmount_cad: centsToCad(maintenanceCents)
        }
      },
      metadata: {
        promoCode,
        term_months: "12",
        websiteAmount_cad: centsToCad(websiteCents),
        maintenanceAmount_cad: centsToCad(maintenanceCents)
      },
      success_url: `${siteUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/payment.html`
    });

    return jsonResponse(200, { url: session.url });
  } catch (error) {
    return jsonResponse(500, { error: error.message || "Unexpected server error." });
  }
};

function toCents(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number * 100);
}

function centsToCad(cents) {
  return (cents / 100).toFixed(2);
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
