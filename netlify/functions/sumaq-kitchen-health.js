function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}
async function check(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, error: 'Supabase environment variables missing' };
  try {
    const r = await fetch(`${url.replace(/\/$/,'')}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const text = await r.text();
    return r.ok ? { ok: true } : { ok: false, error: text.slice(0, 240) || `HTTP ${r.status}` };
  } catch (e) { return { ok: false, error: e.message }; }
}
exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const orders = await check('orders?select=id,source_channel,external_order_id,kitchen_status&limit=1');
  const queue = await check('kitchen_print_jobs?select=id,status&limit=1');
  return json(200, {
    service: 'Sumaq Kitchen Order Hub',
    ready: Boolean(orders.ok && queue.ok && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    databaseMigration: Boolean(orders.ok && queue.ok),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    printAgentTokenConfigured: Boolean(process.env.SUMAQ_PRINT_AGENT_TOKEN),
    externalOrderTokenConfigured: Boolean(process.env.SUMAQ_ORDER_INGEST_TOKEN),
    details: { orders, queue }
  });
};
