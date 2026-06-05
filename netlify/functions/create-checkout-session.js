const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed." });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return response(500, { error: "Missing STRIPE_SECRET_KEY." });
    }

    if (!process.env.SITE_URL) {
      return response(500, { error: "Missing SITE_URL." });
    }

    const { promoCode, websiteAmount, maintenanceAmount } = JSON.parse(event.body || "{}");

    const allowedCodes = ["1000", "1050"];

    if (!allowedCodes.includes(String(promoCode))) {
      return response(400, { error: "Invalid promo code." });
    }

    const websiteCents = toCents(websiteAmount);
    const maintenanceCents = String(promoCode) === "1000" ? 4000 : toCents(maintenanceAmount);

    if (!websiteCents || websiteCents <= 0) {
      return response(400, { error: "Website payment amount is required." });
    }

    if (!maintenanceCents || maintenanceCents <= 0) {
      return response(400, { error: "Monthly maintenance amount is required." });
    }

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
          promoCode: String(promoCode),
          term_months: "12",
          websiteAmount_cad: centsToCad(websiteCents),
          maintenanceAmount_cad: centsToCad(maintenanceCents)
        }
      },
      metadata: {
        promoCode: String(promoCode),
        term_months: "12",
        websiteAmount_cad: centsToCad(websiteCents),
        maintenanceAmount_cad: centsToCad(maintenanceCents)
      },
      success_url: `${process.env.SITE_URL}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/payment.html`
    });

    return response(200, { url: session.url });
  } catch (error) {
    return response(500, { error: error.message });
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

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
