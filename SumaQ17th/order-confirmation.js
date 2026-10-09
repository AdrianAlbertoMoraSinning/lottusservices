(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const publicId = params.get('order') || '';
  const sessionId = params.get('session_id') || '';
  const title = document.getElementById('confirmationTitle');
  const copy = document.getElementById('confirmationCopy');
  const ref = document.getElementById('confirmationRef');
  const retry = document.getElementById('confirmationRetry');
  const back = document.getElementById('confirmationBack');
  const PENDING_KEY = 'sumaqPendingCommerceOrder';

  ref.textContent = publicId ? `Order ${publicId}` : '';

  async function confirm() {
    retry.hidden = true;
    title.textContent = 'Confirming your payment…';
    copy.textContent = 'Please keep this page open for a moment while we confirm your order with Stripe.';
    try {
      const response = await fetch('/.netlify/functions/sumaq-confirm-order-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, publicId }),
        cache: 'no-store'
      });
      const json = await response.json().catch(() => ({}));
      if (response.status === 202) {
        title.textContent = 'Payment is still processing';
        copy.textContent = 'Stripe has not completed the payment yet. We will check again automatically.';
        setTimeout(confirm, 2000);
        return;
      }
      if (!response.ok || !json.data?.paid) throw new Error(json.error || 'Payment could not be confirmed.');
      const order = json.data.order || {};
      title.textContent = 'Your pickup order is confirmed';
      copy.textContent = order.pickup_date
        ? `Thank you. Your paid order has been sent to Sumaq for ${order.pickup_date}${order.pickup_time ? ` at ${String(order.pickup_time).slice(0,5)}` : ''}.`
        : 'Thank you. Your paid order has been sent to Sumaq and queued for preparation.';
      sessionStorage.removeItem(PENDING_KEY);
      sessionStorage.removeItem('sumaqPendingOrder');
      localStorage.removeItem('sumaqCart_pickup');
      if (order.order_type === 'shop') localStorage.removeItem('sumaqCart_shop');
      back.href = order.order_type === 'shop' ? 'shop.html' : 'order-pickup.html';
      back.textContent = order.order_type === 'shop' ? 'Back to Shop' : 'Back to Pickup';
    } catch (error) {
      title.textContent = 'We could not confirm the payment yet';
      copy.textContent = `${error.message} If you completed the payment, do not pay again. Use Retry or contact Sumaq with your order number.`;
      retry.hidden = false;
    }
  }

  retry.addEventListener('click', confirm);
  if (!sessionId) {
    title.textContent = 'Missing payment reference';
    copy.textContent = 'This confirmation link is incomplete. Please contact Sumaq if you already completed payment.';
    retry.hidden = true;
  } else {
    confirm();
  }
})();
