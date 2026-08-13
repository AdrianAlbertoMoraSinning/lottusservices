const { json, env, getInvoice, cents, stripeRequest, supabaseRequest } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    let input = {};
    try { input = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request body' }); }
    const token = String(input.token || '').trim();
    const invoiceNumber = String(input.invoice_number || '').trim();
    if (!token && !invoiceNumber) return json(400, { error: 'Invoice reference is required.' });

    const invoice = await getInvoice({ token, invoiceNumber });
    if (!invoice) return json(404, { error: 'Invoice not found.' });
    if (String(invoice.status || '').toLowerCase() === 'paid') return json(409, { error: 'This invoice is already paid.' });

    const amount = cents(invoice.total_amount ?? invoice.final_amount);
    if (!Number.isInteger(amount) || amount < 50) return json(400, { error: 'Invoice amount is not valid for online payment.' });

    const siteUrl = env('SITE_URL', 'https://rbmoving.ca').replace(/\/$/, '');
    const invoiceToken = invoice.public_token || token;
    const successUrl = `${siteUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}${invoiceToken ? `&token=${encodeURIComponent(invoiceToken)}` : ''}`;
    const cancelUrl = `${siteUrl}/payment.html?${invoiceToken ? `token=${encodeURIComponent(invoiceToken)}` : `invoice=${encodeURIComponent(invoice.invoice_number)}`}&cancelled=1`;

    const params = {
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: invoice.invoice_number,
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': `RB Moving Invoice ${invoice.invoice_number}`,
      'line_items[0][price_data][product_data][description]': invoice.booking_reference ? `Final invoice for booking ${invoice.booking_reference}` : 'Final RB Moving invoice',
      'line_items[0][price_data][unit_amount]': amount,
      'line_items[0][quantity]': 1,
      'metadata[invoice_number]': invoice.invoice_number,
      'metadata[invoice_token]': invoiceToken || '',
      'payment_intent_data[metadata][invoice_number]': invoice.invoice_number,
      'payment_intent_data[metadata][invoice_token]': invoiceToken || ''
    };
    if (invoice.client_email) params.customer_email = invoice.client_email;

    const session = await stripeRequest('/checkout/sessions', params);

    // Best-effort traceability. Checkout creation still succeeds if this update fails.
    try {
      const query = invoiceToken
        ? `public_token=eq.${encodeURIComponent(invoiceToken)}`
        : `invoice_number=eq.${encodeURIComponent(invoice.invoice_number)}`;
      await supabaseRequest(`/rest/v1/invoices?${query}`, {
        method: 'PATCH',
        body: {
          stripe_checkout_session_id: session.id,
          stripe_payment_status: session.payment_status || 'unpaid',
          updated_at: new Date().toISOString()
        }
      });
    } catch (traceError) {
      console.warn('Unable to save Stripe checkout trace:', traceError.message);
    }

    return json(200, { url: session.url, session_id: session.id });
  } catch (error) {
    console.error('create-stripe-checkout:', error);
    return json(500, { error: 'Unable to start secure payment right now. Please contact RB Moving.' });
  }
};
