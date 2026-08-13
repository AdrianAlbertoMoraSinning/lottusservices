const crypto = require('crypto');

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    },
    body: JSON.stringify(payload)
  };
}

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function supabaseConfig() {
  const url = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase server credentials are not configured.');
  return { url, key };
}

async function supabaseRequest(path, { method = 'GET', body } = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(url + path, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    const detail = payload?.message || payload?.hint || payload?.error || text || response.statusText;
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }
  return payload;
}

async function getInvoice({ token, invoiceNumber }) {
  if (token) {
    return supabaseRequest('/rest/v1/rpc/get_public_invoice_by_token', {
      method: 'POST',
      body: { p_token: token }
    });
  }
  if (invoiceNumber) {
    return supabaseRequest('/rest/v1/rpc/get_public_invoice', {
      method: 'POST',
      body: { p_invoice_number: invoiceNumber }
    });
  }
  return null;
}

function cents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

async function stripeRequest(path, params) {
  const secret = env('STRIPE_SECRET_KEY');
  if (!secret) throw new Error('Stripe server credentials are not configured.');
  const body = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') body.append(key, String(value));
  });
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed (${response.status})`);
  return payload;
}

async function stripeGet(path) {
  const secret = env('STRIPE_SECRET_KEY');
  if (!secret) throw new Error('Stripe server credentials are not configured.');
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secret}` }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed (${response.status})`);
  return payload;
}

function rawBody(event) {
  return event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
}

function verifyStripeSignature(payload, signatureHeader, secret, toleranceSeconds = 300) {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(',').map(x => x.trim());
  const timestamp = parts.find(x => x.startsWith('t='))?.slice(2);
  const signatures = parts.filter(x => x.startsWith('v1=')).map(x => x.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`, 'utf8').digest('hex');
  return signatures.some(sig => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch { return false; }
  });
}

async function markInvoicePaid(session) {
  const invoiceToken = session?.metadata?.invoice_token || '';
  const invoiceNumber = session?.metadata?.invoice_number || session?.client_reference_id || '';
  const paymentIntent = typeof session?.payment_intent === 'string' ? session.payment_intent : session?.payment_intent?.id || null;
  const patch = {
    status: 'Paid',
    stripe_payment_status: session?.payment_status || 'paid',
    stripe_checkout_session_id: session?.id || null,
    stripe_payment_intent_id: paymentIntent,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  let query = '';
  if (invoiceToken) query = `public_token=eq.${encodeURIComponent(invoiceToken)}`;
  else if (invoiceNumber) query = `invoice_number=eq.${encodeURIComponent(invoiceNumber)}`;
  else throw new Error('Stripe session does not contain an invoice reference.');

  const invoices = await supabaseRequest(`/rest/v1/invoices?${query}`, { method: 'PATCH', body: patch });
  const invoice = Array.isArray(invoices) ? invoices[0] : invoices;
  if (invoice?.booking_id) {
    await supabaseRequest(`/rest/v1/bookings?id=eq.${encodeURIComponent(invoice.booking_id)}`, {
      method: 'PATCH',
      body: {
        invoice_status: 'Paid',
        payment_status: 'Paid',
        updated_at: new Date().toISOString()
      }
    });
  }
  return invoice;
}

module.exports = {
  json, env, getInvoice, cents, stripeRequest, stripeGet,
  rawBody, verifyStripeSignature, markInvoicePaid, supabaseRequest
};
