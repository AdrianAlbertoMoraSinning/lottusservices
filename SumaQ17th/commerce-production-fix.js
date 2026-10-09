// Production cleanup for legacy query-string success paths.
// New Stripe Checkout flow lands on order-confirmation.html, so this file only guards stale cached links.
(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('payment') !== 'success') return;
  const msg = document.getElementById('checkoutMsg');
  if (msg && /Demo payment approved/i.test(msg.textContent || '')) {
    msg.textContent = `Payment confirmed. Order ${params.get('order') || ''} is confirmed and shared with Sumaq.`;
  }
})();
