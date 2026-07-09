const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Stripe is not configured. Missing STRIPE_SECRET_KEY.' }) };
    }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const body = JSON.parse(event.body || '{}');
    const amount = Math.round(Number(body.amount || 0) * 100);
    const reservationId = String(body.reservationId || 'SUMAQ-RESERVATION');
    const description = String(body.description || 'SumaQ on 17th reservation deposit');

    if (!amount || amount < 50) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid deposit amount.' }) };
    }

    const siteUrl = (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
    const baseUrl = siteUrl || 'http://localhost:8888';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'cad',
          unit_amount: amount,
          product_data: { name: description }
        }
      }],
      metadata: { reservationId },
      success_url: `${baseUrl}/SumaQ17th/payment-success.html?reservation=${encodeURIComponent(reservationId)}`,
      cancel_url: `${baseUrl}/SumaQ17th/index.html#reservations`
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Stripe checkout failed.' }) };
  }
};
