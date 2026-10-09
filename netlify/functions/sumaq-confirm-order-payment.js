const Stripe = require('stripe');

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing Netlify environment variable: ${name}`);
  return value;
}

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

async function supabase(path, { method = 'GET', body, prefer = 'return=representation' } = {}) {
  const base = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: prefer },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase error ${response.status}`);
  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const { sessionId, publicId } = JSON.parse(event.body || '{}');
    const sessionID = String(sessionId || '').trim().slice(0, 200);
    const expectedPublicId = String(publicId || '').trim().slice(0, 80);
    if (!sessionID) throw new Error('Stripe session is required.');

    const stripe = new Stripe(env('STRIPE_SECRET_KEY'));
    const session = await stripe.checkout.sessions.retrieve(sessionID);
    const metadataPublicId = String(session?.metadata?.sumaqOrderPublicId || '').trim();
    if (!metadataPublicId) throw new Error('This payment is not linked to a Sumaq order.');
    if (expectedPublicId && metadataPublicId !== expectedPublicId) throw new Error('Order reference does not match this payment.');
    if (session.payment_status !== 'paid') {
      return json(202, { data: { paid: false, publicId: metadataPublicId, paymentStatus: session.payment_status } });
    }

    const orders = await supabase(`orders?public_id=eq.${encodeURIComponent(metadataPublicId)}&select=id,public_id,order_type,customer_name,pickup_date,pickup_time,total,status,payment_status&limit=1`);
    if (!orders?.length) throw new Error('Order not found.');
    const order = orders[0];

    if (!/^Paid/i.test(order.payment_status || '')) {
      const updated = await supabase(`orders?id=eq.${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        body: {
          status: 'Confirmed',
          payment_status: 'Paid',
          stripe_session_id: session.id,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
      if (updated?.length) Object.assign(order, updated[0]);
    }

    return json(200, { data: { paid: true, order } });
  } catch (error) {
    console.error(error);
    return json(400, { error: error.message || 'Payment confirmation failed.' });
  }
};
