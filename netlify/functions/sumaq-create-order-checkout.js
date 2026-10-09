const Stripe = require('stripe');

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing Netlify environment variable: ${name}`);
  return value;
}

async function supabase(path) {
  const base = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase error ${response.status}`);
  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { publicId } = JSON.parse(event.body || '{}');
    const id = String(publicId || '').trim().slice(0, 80);
    if (!id) throw new Error('Order ID is required.');

    const orders = await supabase(`orders?public_id=eq.${encodeURIComponent(id)}&select=id,public_id,order_type,customer_name,email,subtotal,tax,total,payment_status&limit=1`);
    if (!orders?.length) throw new Error('Order not found.');
    const order = orders[0];

    if (/^Paid/i.test(order.payment_status || '')) {
      throw new Error('This order is already paid.');
    }

    const items = await supabase(`order_items?order_id=eq.${encodeURIComponent(order.id)}&select=product_name,unit_price,quantity,line_total&order=id.asc`);
    if (!items?.length) throw new Error('Order has no items.');

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
      success_url: `${basePath}/${order.order_type === 'shop' ? 'shop.html' : 'order-pickup.html'}?payment=success&order=${encodeURIComponent(order.public_id)}`,
      cancel_url: `${basePath}/order-payment.html?payment=cancelled`
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ url: session.url })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: error.message || 'Checkout could not be created.' })
    };
  }
};
