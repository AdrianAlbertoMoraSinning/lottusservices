const ALLOWED_ACTIONS = new Set([
  'create-reservation',
  'create-event',
  'create-order',
  'complete-demo-order',
  'ensure-menu-jan-2026'
]);

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing Netlify environment variable: ${name}`);
  return value;
}

async function request(path, { method = 'GET', body, prefer = 'return=representation' } = {}) {
  const url = env('SUPABASE_URL').replace(/\/$/, '') + '/rest/v1/' + path;
  const response = await fetch(url, {
    method,
    headers: {
      apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
      'Content-Type': 'application/json',
      Prefer: prefer
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


const OFFICIAL_MENU = require('../../assets/data/official-menu-jan-2026.json');
const OFFICIAL_MENU_SENTINEL = '__sumaq_menu_jan_2026_v1__';
async function ensureOfficialMenuCatalog(){
  const marker = await request(`menu_items?slug=eq.${OFFICIAL_MENU_SENTINEL}&select=slug&limit=1`);
  if (Array.isArray(marker) && marker.length) return {alreadySynced:true,version:OFFICIAL_MENU.version};
  const now = new Date().toISOString();
  await request('menu_items?active=eq.true',{method:'PATCH',body:{active:false,updated_at:now}});
  const rows=(OFFICIAL_MENU.food||[]).map(item=>({
    slug:item.id,
    name:item.name,
    category:item.category,
    description:[item.description,item.optionText].filter(Boolean).join(' '),
    price:Number(item.price||0),
    unit:item.unit||'unit',
    image_url:item.image||'',
    active:true,
    sort_order:Number(item.sortOrder||0),
    updated_at:now
  }));
  if(rows.length)await request('menu_items?on_conflict=slug',{method:'POST',body:rows,prefer:'resolution=merge-duplicates,return=representation'});
  await request('menu_items?on_conflict=slug',{method:'POST',body:{slug:OFFICIAL_MENU_SENTINEL,name:'SumaQ menu January 2026 sync marker',category:'__system',description:OFFICIAL_MENU.version,price:0,unit:'system',image_url:'',active:false,sort_order:99999,updated_at:now},prefer:'resolution=merge-duplicates,return=representation'});
  return {alreadySynced:false,version:OFFICIAL_MENU.version,items:rows.length};
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const { action, payload = {} } = JSON.parse(event.body || '{}');
    if (!ALLOWED_ACTIONS.has(action)) throw new Error('Unsupported action.');
    let data;

    if (action === 'ensure-menu-jan-2026') {
      data = await ensureOfficialMenuCatalog();
    }

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
      const order = {
        public_id: cleanText(payload.id, 60),
        order_type: payload.type === 'shop' ? 'shop' : 'pickup',
        customer_name: cleanText(payload.customerName, 160),
        email: cleanEmail(payload.email),
        phone: cleanText(payload.phone, 40),
        pickup_date: payload.pickupDate || null,
        pickup_time: payload.pickupTime || null,
        fulfillment: cleanText(payload.fulfillment || 'Store pickup', 80),
        notes: cleanText(payload.notes, 2000),
        subtotal: Number(payload.subtotal || 0),
        tax: Number(payload.tax || 0),
        total: Number(payload.total || 0),
        status: 'Awaiting payment',
        payment_status: 'Pending (demo)'
      };
      const created = (await request('orders', { method: 'POST', body: order }))[0];
      const lines = (payload.items || []).slice(0, 100).map((item) => ({
        order_id: created.id,
        product_slug: cleanText(item.id, 100),
        product_name: cleanText(item.name, 200),
        unit_price: Number(item.price || 0),
        quantity: Number(item.qty || 0),
        line_total: Number(item.price || 0) * Number(item.qty || 0)
      }));
      if (lines.length) await request('order_items', { method: 'POST', body: lines });
      data = { ...created, items: lines };
    }

    if (action === 'complete-demo-order') {
      const id = cleanText(payload.publicId, 60);
      data = (await request(`orders?public_id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: {
          status: 'Confirmed',
          payment_status: 'Paid (demo)',
          paid_at: new Date().toISOString()
        }
      }))[0];
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Request failed' })
    };
  }
};
