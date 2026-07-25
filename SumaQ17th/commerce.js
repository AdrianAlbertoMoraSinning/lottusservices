(function () {
  'use strict';

  var commerceMode = document.body.getAttribute('data-commerce') || '';
  var cartStorageKey = 'sumaqCart_' + commerceMode;
  var ordersStorageKey = 'sumaqCommerceOrders';
  var pendingOrderKey = 'sumaqPendingCommerceOrder';
  var rawCatalogs = window.SUMAQ_CATALOGS || {};
  var rawItems = rawCatalogs[commerceMode] || [];

  function normalizeItem(item) {
    if (!Array.isArray(item)) return item;
    return {
      id: item[0], name: item[1], category: item[2], description: item[3],
      price: Number(item[4]), unit: item[5], image: item[6]
    };
  }

  var menuItems = rawItems.map(normalizeItem).filter(function (item) {
    return item && item.id && item.name && Number.isFinite(Number(item.price));
  });

  function readJson(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* ignore */ }
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(value) || 0);
  }

  var currentCart = readJson(cartStorageKey, []);
  if (!Array.isArray(currentCart)) currentCart = [];

  function findItem(id) {
    return menuItems.find(function (item) { return item.id === id; });
  }

  function calculateSubtotal() {
    return currentCart.reduce(function (sum, line) {
      var item = findItem(line.id);
      return sum + (item ? Number(item.price) * Number(line.qty || 0) : 0);
    }, 0);
  }

  function renderMenu() {
    var root = document.getElementById('catalog');
    if (!root) return;

    if (!menuItems.length) {
      root.innerHTML = '<div class="catalog-error"><h3>Menu temporarily unavailable</h3><p>Please refresh the page or contact SumaQ.</p></div>';
      return;
    }

    var categories = [];
    menuItems.forEach(function (item) {
      if (categories.indexOf(item.category) === -1) categories.push(item.category);
    });

    var requested = new URLSearchParams(window.location.search).get('category');
    if (requested && categories.indexOf(requested) !== -1) root.setAttribute('data-category', requested);
    var selected = root.getAttribute('data-category') || 'All';
    var visibleItems = selected === 'All' ? menuItems : menuItems.filter(function (item) { return item.category === selected; });

    var filterHtml = '<div class="category-filter" style="grid-column:1/-1">' + ['All'].concat(categories).map(function (category) {
      return '<button type="button" class="' + (selected === category ? 'active' : '') + '" data-category="' + category.replace(/"/g, '&quot;') + '">' + category + '</button>';
    }).join('') + '</div>';

    var cardsHtml = visibleItems.map(function (item) {
      return '<article class="product-card">' +
        '<img src="' + item.image + '" alt="' + item.name.replace(/"/g, '&quot;') + '" loading="lazy">' +
        '<div class="product-copy">' +
          '<span class="eyebrow">' + item.category + '</span>' +
          '<h3>' + item.name + '</h3>' +
          '<p>' + item.description + '</p>' +
          '<div class="product-meta"><strong>' + formatMoney(item.price) + '</strong><small>per ' + item.unit + '</small></div>' +
          '<div class="product-order-controls">' +
            '<label>Quantity<input class="catalog-qty" type="number" min="1" max="99" value="1" aria-label="Quantity for ' + item.name.replace(/"/g, '&quot;') + '"></label>' +
            '<button class="btn primary add-to-order" type="button" data-id="' + item.id + '">Add to order</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');

    root.innerHTML = filterHtml + cardsHtml;

    root.querySelectorAll('[data-category]').forEach(function (button) {
      button.addEventListener('click', function () {
        root.setAttribute('data-category', button.getAttribute('data-category'));
        renderMenu();
      });
    });

    root.querySelectorAll('.add-to-order').forEach(function (button) {
      button.addEventListener('click', function () {
        var quantityInput = button.closest('.product-copy').querySelector('.catalog-qty');
        var quantity = Math.max(1, Math.min(99, Number(quantityInput.value) || 1));
        var id = button.getAttribute('data-id');
        var existing = currentCart.find(function (line) { return line.id === id; });
        if (existing) existing.qty += quantity;
        else currentCart.push({ id: id, qty: quantity });
        writeJson(cartStorageKey, currentCart);
        renderCart();
        button.textContent = 'Added ✓';
        window.setTimeout(function () { button.textContent = 'Add to order'; }, 900);
      });
    });
  }

  function renderCart() {
    var root = document.getElementById('cartItems');
    var itemCount = currentCart.reduce(function (sum, line) { return sum + Number(line.qty || 0); }, 0);
    document.querySelectorAll('[data-cart-count]').forEach(function (node) { node.textContent = itemCount; });
    if (!root) return;

    if (!currentCart.length) {
      root.innerHTML = '<p class="empty-state">Your cart is empty. Select a quantity and add your favourite dishes.</p>';
    } else {
      root.innerHTML = currentCart.map(function (line) {
        var item = findItem(line.id);
        if (!item) return '';
        return '<div class="cart-row">' +
          '<img src="' + item.image + '" alt="">' +
          '<div><strong>' + item.name + '</strong><small>' + formatMoney(item.price) + ' / ' + item.unit + '</small></div>' +
          '<div class="qty"><button type="button" data-action="minus" data-id="' + line.id + '">−</button><span>' + line.qty + '</span><button type="button" data-action="plus" data-id="' + line.id + '">+</button></div>' +
          '<strong>' + formatMoney(Number(item.price) * Number(line.qty)) + '</strong>' +
        '</div>';
      }).join('');
    }

    var subtotal = calculateSubtotal();
    var tax = subtotal * 0.05;
    document.getElementById('subtotal').textContent = formatMoney(subtotal);
    document.getElementById('tax').textContent = formatMoney(tax);
    document.getElementById('grandTotal').textContent = formatMoney(subtotal + tax);

    root.querySelectorAll('button[data-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.getAttribute('data-id');
        var line = currentCart.find(function (entry) { return entry.id === id; });
        if (!line) return;
        line.qty += button.getAttribute('data-action') === 'plus' ? 1 : -1;
        currentCart = currentCart.filter(function (entry) { return entry.qty > 0; });
        writeJson(cartStorageKey, currentCart);
        renderCart();
      });
    });
  }

  function displayPaymentReturn() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;
    var message = document.getElementById('checkoutMsg');
    var orderId = params.get('order') || '';
    if (message) {
      message.className = 'checkout-success';
      message.textContent = 'Demo payment approved. Pickup order ' + orderId + ' is confirmed and paid.';
    }
    window.history.replaceState({}, '', window.location.pathname);
  }

  var checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!currentCart.length) {
        window.alert('Please add at least one dish to your order.');
        return;
      }
      if (!checkoutForm.reportValidity()) return;

      var customerData = Object.fromEntries(new FormData(checkoutForm).entries());
      var subtotal = Number(calculateSubtotal().toFixed(2));
      var tax = Number((subtotal * 0.05).toFixed(2));
      var order = Object.assign({
        id: 'SQ-' + Date.now().toString(36).toUpperCase(),
        type: commerceMode,
        createdAt: new Date().toISOString(),
        status: 'Awaiting payment',
        paymentStatus: 'Pending (demo)',
        items: currentCart.map(function (line) {
          var item = findItem(line.id);
          return Object.assign({}, item, { qty: line.qty });
        }),
        subtotal: subtotal,
        tax: tax,
        total: Number((subtotal + tax).toFixed(2))
      }, customerData);

      var orders = readJson(ordersStorageKey, []);
      if (!Array.isArray(orders)) orders = [];
      orders.unshift(order);
      writeJson(ordersStorageKey, orders);
      sessionStorage.setItem(pendingOrderKey, JSON.stringify(order));
      window.location.href = 'order-payment.html';
    });
  }

  try {
    renderMenu();
    renderCart();
    displayPaymentReturn();
  } catch (error) {
    console.error('SumaQ commerce initialization failed:', error);
    var catalogRoot = document.getElementById('catalog');
    if (catalogRoot) catalogRoot.innerHTML = '<div class="catalog-error"><h3>We could not load the pickup menu.</h3><p>Please refresh this page. If the problem continues, contact SumaQ.</p></div>';
  }
}());
