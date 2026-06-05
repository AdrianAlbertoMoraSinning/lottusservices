const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async function (event) {
  try {
    const { promoCode, websiteAmount, maintenanceAmount } = JSON.parse(event.body);

    const allowedCodes = ["1000", "1050"];
    if (!allowedCodes.includes(promoCode)) {
      return response(400, { error: "Invalid promo code." });
    }

    const websiteCents = toCents(websiteAmount);
    const maintenanceCents = promoCode === "1000" ? 4000 : toCents(maintenanceAmount);

    if (websiteCents <= 0 || maintenanceCents <= 0) {
      return response(400, { error: "Both payment amounts are required." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
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
          term_months: "12"
        }
      },
      metadata: {
        promoCode,
        websiteAmount,
        maintenanceAmount
      },
      success_url: `${process.env.SITE_URL}/payment-success.html`,
      cancel_url: `${process.env.SITE_URL}/payment.html`
    });

    return response(200, { url: session.url });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

function toCents(value) {
  return Math.round(Number(value) * 100);
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
