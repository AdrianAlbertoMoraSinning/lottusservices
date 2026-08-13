const { json, stripeGet, markInvoicePaid } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const sessionId = String(event.queryStringParameters?.session_id || '').trim();
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) return json(400, { error: 'Invalid session.' });
  try {
    const session = await stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (session.payment_status === 'paid') {
      try { await markInvoicePaid(session); } catch (e) { console.warn('Status sync warning:', e.message); }
    }
    return json(200, {
      session_id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
      currency: session.currency,
      invoice_number: session.metadata?.invoice_number || session.client_reference_id || null,
      customer_email: session.customer_details?.email || session.customer_email || null,
      payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null
    });
  } catch (error) {
    console.error('stripe-session-status:', error);
    return json(500, { error: 'Unable to verify payment status.' });
  }
};
