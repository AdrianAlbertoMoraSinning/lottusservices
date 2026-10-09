const OFFICIAL_MENU = require('../../SumaQ17th/assets/data/official-menu-jan-2026.json');

const ALLOWED_ACTIONS = new Set([
  'create-reservation',
  'create-event',
  'create-order'
]);

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing Netlify environment variable: ${name}`);
  return value;
}

async function request(path, { method = 'GET', body } = {}) {
  const url = env('SUPABASE_URL').replace(/\/$/, '') + '/rest/v1/' + path;
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(url, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Supabase error ${response.status}`);
  }
  return data;
}

function cleanText(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanEmail(value) {
  const email = cleanText(value, 254);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('A valid email is required.');
  return email;
}

function normalizeTime(value) {
  const raw = cleanText(value, 30)
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!match) throw new Error('Invalid reservation time.');
  let hours = Number(match[1]);
  const minutes = match[2];
  const period = match[3];
  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  if (hours > 23 || Number(minutes) > 59) throw new Error('Invalid reservation time.');
  return `${String(hours).padStart(2, '0')}:${minutes}:00`;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function quantity(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error('Invalid item quantity.');
  return n;
}

function officialPickupMatch(slug) {
  const requested = cleanText(slug, 120);
  const food = Array.isArray(OFFICIAL_MENU?.food) ? OFFICIAL_MENU.food : [];
  const base = food
    .filter((item) => requested === item.id || requested.startsWith(`${item.id}-`))
    .sort((a, b) => b.id.length - a.id.length)[0];
  if (!base) return null;
  const suffix = requested === base.id ? '' : requested.slice(base.id.length + 1);
  const variants = Array.isArray(base.variants) ? base.variants : [];
  if (variants.length) {
    if (!suffix) throw new Error(`Please select an option for ${base.name}.`);
    const variant = variants.find((v) => v.id === suffix);
    if (!variant) throw new Error(`Invalid option for ${base.name}.`);
    return { base, variant };
  }
  if (suffix) return null;
  return { base, variant: null };
}

async function validatedOrderLines(type, payloadItems) {
  const incoming = Array.isArray(payloadItems) ? payloadItems.slice(0, 100) : [];
  if (!incoming.length) throw new Error('Order is empty.');

  if (type === 'pickup') {
    const rows = await request('menu_items?select=slug,name,price,active&active=eq.true');
    const central = new Map((rows || []).map((row) => [row.slug, row]));
    return incoming.map((item) => {
      const matched = officialPickupMatch(item.id);
      if (!matched) throw new Error('One or more pickup items are no longer available.');
      const { base, variant } = matched;
      const live = central.get(base.id);
      if (!live || live.active === false) throw new Error(`${base.name} is no longer available.`);
      const qty = quantity(item.qty);
      const unitPrice = variant ? Number(variant.price) : Number(live.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Invalid price for ${base.name}.`);
      const productName = variant ? `${live.name || base.name} — ${variant.label}` : (live.name || base.name);
      return {
        product_slug: variant ? `${base.id}-${variant.id}` : base.id,
        product_name: cleanText(productName, 200),
        unit_price: roundMoney(unitPrice),
        quantity: qty,
        line_total: roundMoney(unitPrice * qty)
      };
    });
  }

  const rows = await request('shop_products?select=slug,name,price,active&active=eq.true');
  const products = new Map((rows || []).map((row) => [row.slug, row]));
  return incoming.map((item) => {
    const slug = cleanText(item.id, 100);
    const live = products.get(slug);
    if (!live || live.active === false) throw new Error('One or more shop items are no longer available.');
    const qty = quantity(item.qty);
    const unitPrice = Number(live.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Invalid price for ${live.name}.`);
    return {
      product_slug: slug,
      product_name: cleanText(live.name, 200),
      unit_price: roundMoney(unitPrice),
      quantity: qty,
      line_total: roundMoney(unitPrice * qty)
    };
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { action, payload = {} } = JSON.parse(event.body || '{}');
    if (!ALLOWED_ACTIONS.has(action)) throw new Error('Unsupported action.');
    let data;

    if (action === 'create-reservation') {
      const row = {
        first_name: cleanText(payload.firstName, 80),
        last_name: cleanText(payload.lastName, 80),
        email: cleanEmail(payload.email),
        phone: cleanText(payload.phone, 40),
        reservation_date: cleanText(payload.date, 10),
        reservation_time: normalizeTime(payload.time),
        adults: Number(payload.adults || 0),
        minors: Number(payload.minors || 0),
        party_size: Number(payload.partySize || 0),
        notes: cleanText(payload.notes, 2000),
        status: cleanText(payload.status || 'Booked', 40),
        deposit_required: Boolean(payload.depositRequired),
        deposit_amount: Number(payload.depositAmount || 0),
        payment_status: cleanText(payload.paymentStatus || 'No payment required', 80),
        paid_at: payload.paidAt || null
      };
      data = (await request('reservations', { method: 'POST', body: row }))[0];
    }

    if (action === 'create-event') {
      const row = {
        first_name: cleanText(payload.firstName, 80),
        last_name: cleanText(payload.lastName, 80),
        email: cleanEmail(payload.email),
        phone: cleanText(payload.phone, 40),
        event_date: payload.eventDate || null,
        estimated_guests: payload.guests ? Number(payload.guests) : null,
        message: cleanText(payload.message, 3000),
        status: 'New'
      };
      data = (await request('private_event_inquiries', { method: 'POST', body: row }))[0];
    }

    if (action === 'create-order') {
      const type = payload.type === 'shop' ? 'shop' : 'pickup';
      const lines = await validatedOrderLines(type, payload.items);
      const subtotal = roundMoney(lines.reduce((sum, item) => sum + Number(item.line_total), 0));
      const tax = roundMoney(subtotal * 0.05);
      const total = roundMoney(subtotal + tax);
      const publicId = cleanText(payload.id, 60);
      if (!publicId) throw new Error('Order ID is required.');

      const order = {
        public_id: publicId,
        order_type: type,
        customer_name: cleanText(payload.customerName, 160),
        email: cleanEmail(payload.email),
        phone: cleanText(payload.phone, 40),
        pickup_date: payload.pickupDate || null,
        pickup_time: payload.pickupTime || null,
        fulfillment: cleanText(payload.fulfillment || 'Store pickup', 80),
        notes: cleanText(payload.notes, 2000),
        subtotal,
        tax,
        total,
        status: 'Awaiting payment',
        payment_status: 'Pending'
      };
      const created = (await request('orders', { method: 'POST', body: order }))[0];
      const storedLines = lines.map((line) => ({ ...line, order_id: created.id }));
      if (storedLines.length) await request('order_items', { method: 'POST', body: storedLines });
      data = { ...created, items: storedLines };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ data })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: error.message || 'Request failed' })
    };
  }
};
