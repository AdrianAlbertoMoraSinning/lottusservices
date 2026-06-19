# ONTA STORE - Portal Boutique Premium Prototipo 70% Operativo

Este paquete contiene un prototipo web estático listo para publicar en Netlify, GitHub Pages o cualquier hosting básico.

## Incluye

- Landing premium para ONTA STORE.
- Logo del oso e imágenes anexas integradas.
- Vitrina virtual / recorrido por showroom.
- Catálogo de productos con filtros.
- Carrito local funcional.
- Envío de pedido por WhatsApp configurable.
- Sección de pago online preparada para conectar Wompi, PayU, Mercado Pago, Stripe, Nequi o link del comercio.
- Registro de clientes ONTA VIP con cumpleaños, fechas especiales e intereses.
- Panel admin VIP (`admin.html`) con métricas y exportación CSV.
- Sección de videos/promociones/lanzamientos en modo demo.
- Diseño responsive móvil/desktop.

## Configuración rápida

Editar `data/config.js`:

```js
window.ONTA_CONFIG = {
  whatsapp: '573000000000',
  paymentLink: '#pago'
};
```

Cambiar `whatsapp` por el número real de ONTA Store con indicativo de país, sin signos ni espacios.

## Para publicar

Subir toda la carpeta al hosting. La página principal es `index.html`. El panel de clientes es `admin.html`.

## Próxima fase para producción

- Conectar pasarela de pago real.
- Conectar catálogo a Google Sheets, Shopify, WooCommerce o CMS.
- Conectar base de clientes a Google Sheets/CRM.
- Agregar videos reales de Instagram/Reels en la sección de campañas.
- Ajustar inventario real, precios, tallas y disponibilidad.
- Agregar política de envíos, cambios y privacidad.
