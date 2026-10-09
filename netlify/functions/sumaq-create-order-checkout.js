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
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: prefer
    },
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
    const { publicId, preview = false } = JSON.parse(event.body || '{}');
    const id = String(publicId || '').trim().slice(0, 80);
    if (!id) throw new Error('Order ID is required.');

    const orders = await supabase(`orders?public_id=eq.${encodeURIComponent(id)}&select=id,public_id,order_type,customer_name,email,subtotal,tax,total,payment_status&limit=1`);
    if (!orders?.length) throw new Error('Order not found.');
    const order = orders[0];
    const items = await supabase(`order_items?order_id=eq.${encodeURIComponent(order.id)}&select=product_name,unit_price,quantity,line_total&order=id.asc`);
    if (!items?.length) throw new Error('Order has no items.');

    if (preview) {
      return json(200, {
        order: {
          publicId: order.public_id,
          orderType: order.order_type,
          subtotal: Number(order.subtotal || 0),
          tax: Number(order.tax || 0),
          total: Number(order.total || 0),
          paymentStatus: order.payment_status,
          items: items.map((item) => ({
            name: item.product_name,
            price: Number(item.unit_price || 0),
            qty: Number(item.quantity || 0),
            lineTotal: Number(item.line_total || 0)
          }))
        }
      });
    }

    if (/^Paid/i.test(order.payment_status || '')) throw new Error('This order is already paid.');

    const line_items = items.map((item) => ({
      quantity: Number(item.quantity || 1),
      price_data: {
        currency: 'cad',
        unit_amount: Math.round(Number(item.unit_price || 0) * 100),
        product_data: { name: String(item.product_name || 'Sumaq item').slice(0, 200) }
      }
    }));

    if (Number(order.tax || 0) > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: 'cad',
          unit_amount: Math.round(Number(order.tax) * 100),
          product_data: { name: 'GST' }
        }
      });
    }

    const stripe = new Stripe(env('STRIPE_SECRET_KEY'));
    const site = (process.env.SITE_URL || 'https://lottusservices.ca').replace(/\/$/, '');
    const basePath = `${site}/sumaq17th`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      customer_email: order.email || undefined,
      metadata: {
        sumaqOrderPublicId: order.public_id,
        sumaqOrderType: order.order_type
      },
      payment_intent_data: {
        metadata: {
          sumaqOrderPublicId: order.public_id,
          sumaqOrderType: order.order_type
        }
      },
      success_url: `${basePath}/order-confirmation.html?order=${encodeURIComponent(order.public_id)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${basePath}/order-payment.html?payment=cancelled`
    });

    await supabase(`orders?id=eq.${encodeURIComponent(order.id)}`, {
      method: 'PATCH',
      body: { stripe_session_id: session.id, updated_at: new Date().toISOString() },
      prefer: 'return=minimal'
    });

    return json(200, { url: session.url });
  } catch (error) {
    console.error(error);
    return json(400, { error: error.message || 'Checkout could not be created.' });
  }
};
