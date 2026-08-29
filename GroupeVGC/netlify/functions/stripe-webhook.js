const { json, env, rawBody, verifyStripeSignature, markInvoicePaid } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const payload = rawBody(event);
  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const webhookSecret = env('STRIPE_WEBHOOK_SECRET');
  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    console.warn('Stripe webhook signature verification failed.');
    return json(400, { error: 'Invalid webhook signature' });
  }

  let stripeEvent;
  try { stripeEvent = JSON.parse(payload); }
  catch { return json(400, { error: 'Invalid webhook payload' }); }

  try {
    if (stripeEvent.type === 'checkout.session.completed' || stripeEvent.type === 'checkout.session.async_payment_succeeded') {
      const session = stripeEvent.data?.object;
      if (session?.payment_status === 'paid') await markInvoicePaid(session);
    }
    return json(200, { received: true });
  } catch (error) {
    console.error('stripe-webhook:', error);
    return json(500, { error: 'Webhook processing failed' });
  }
};
