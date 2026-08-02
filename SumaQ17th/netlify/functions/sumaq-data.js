const ALLOWED_ACTIONS = new Set([
  'create-reservation',
  'create-event',
  'create-order',
  'complete-demo-order'
]);

function env(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing Netlify environment variable: ${name}`);
  }

  return value;
}

async function request(path, { method = 'GET', body } = {}) {
  const url =
    env('SUPABASE_URL').replace(/\/$/, '') +
    '/rest/v1/' +
    path;

  const response = await fetch(url, {
    method,
    headers: {
      apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Supabase error ${response.status}`
    );
  }

  return data;
}

function cleanText(value, max = 1000) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function cleanEmail(value) {
  const email = cleanText(value, 254);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('A valid email is required.');
  }

  return email;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  }

  try {
    const {
      action,
      payload = {}
    } = JSON.parse(event.body || '{}');

    if (!ALLOWED_ACTIONS.has(action)) {
      throw new Error('Unsupported action.');
    }

    let data;

    if (action === 'create-reservation') {
      const row = {
        first_name: cleanText(payload.firstName, 80),
        last_name: cleanText(payload.lastName, 80),
        email: cleanEmail(payload.email),
        phone: cleanText(payload.phone, 40),
        reservation_date: cleanText(payload.date, 10),
        reservation_time: cleanText(payload.time, 10),
        adults: Number(payload.adults || 0),
        minors: Number(payload.minors || 0),
        party_size: Number(payload.partySize || 0),
        notes: cleanText(payload.notes, 2000),
        status: cleanText(payload.status || 'Booked', 40),
        deposit_required: Boolean(payload.depositRequired),
        deposit_amount: Number(payload.depositAmount || 0),
        payment_status: cleanText(
          payload.paymentStatus || 'No payment required',
          80
        ),
        paid_at: payload.paidAt || null
      };

      data = (
        await request('reservations', {
          method: 'POST',
          body: row
        })
      )[0];
    }

    if (action === 'create-event') {
      const row = {
        first_name: cleanText(payload.firstName, 80),
        last_name: cleanText(payload.lastName, 80),
        email: cleanEmail(payload.email),
        phone: cleanText(payload.phone, 40),
        event_date: payload.eventDate || null,
        estimated_guests: payload.guests
          ? Number(payload.guests)
          : null,
        message: cleanText(payload.message, 3000),
        status: 'New'
      };

      data = (
        await request('private_event_inquiries', {
          method: 'POST',
          body: row
        })
      )[0];
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
        fulfillment: cleanText(
          payload.fulfillment || 'Store pickup',
          80
        ),
        notes: cleanText(payload.notes, 2000),
        subtotal: Number(payload.subtotal || 0),
        tax: Number(payload.tax || 0),
        total: Number(payload.total || 0),
        status: 'Awaiting payment',
        payment_status: 'Pending (demo)'
      };

      const created = (
        await request('orders', {
          method: 'POST',
          body: order
        })
      )[0];

      const lines = (payload.items || [])
        .slice(0, 100)
        .map((item) => ({
          order_id: created.id,
          product_slug: cleanText(item.id, 100),
          product_name: cleanText(item.name, 200),
          unit_price: Number(item.price || 0),
          quantity: Number(item.qty || 0),
          line_total:
            Number(item.price || 0) *
            Number(item.qty || 0)
        }));

      if (lines.length) {
        await request('order_items', {
          method: 'POST',
          body: lines
        });
      }

      data = {
        ...created,
        items: lines
      };
    }

    if (action === 'complete-demo-order') {
      const id = cleanText(payload.publicId, 60);

      data = (
        await request(
          `orders?public_id=eq.${encodeURIComponent(id)}`,
          {
            method: 'PATCH',
            body: {
              status: 'Confirmed',
              payment_status: 'Paid (demo)',
              paid_at: new Date().toISOString()
            }
          }
        )
      )[0];
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data
      })
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error.message || 'Request failed'
      })
    };
  }
};
