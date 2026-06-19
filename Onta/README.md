# ONTA STORE | Prototipo Web 70% Operativo

Prototipo comercial para ONTA STORE, tienda premium de ropa ubicada en CC Ventura Plaza Local 2-20, segundo piso, Cúcuta, Norte de Santander.

## Incluye

- Home premium responsive.
- Logo ONTA integrado.
- Logos de marcas suministradas: Monastery Couture, Giorgio Armani, Polo Ralph Lauren y Nike.
- Vitrina virtual / showroom organizado con fotos de modelo, prendas, showroom y detalles.
- Catálogo con filtros por categoría.
- Carrito visible en menú y barra de compra.
- Botón de pago online demo.
- Pedido por WhatsApp configurable.
- Registro de clientes ONTA VIP con cumpleaños, fechas especiales e intereses.
- Panel `admin.html` con métricas, demo de clientes, limpieza y exportación CSV.
- Sección de promociones, lanzamientos y videos demo.

## Configuración rápida

Editar `data/config.js`:

```js
window.ONTA_CONFIG = {
  storeName: 'ONTA STORE',
  city: 'Cúcuta, Norte de Santander',
  address: 'CC Ventura Plaza, Local 2-20, segundo piso, Cúcuta',
  instagram: 'https://www.instagram.com/ontastore.com.co/',
  whatsapp: '573000000000',
  currency: 'COP',
  paymentLink: '#pago'
};
```

Cambiar `whatsapp` por el número real de la tienda en formato internacional, sin `+`.

## Próximos pasos para producción

1. Conectar pasarela real: Wompi, PayU, Mercado Pago, Nequi, Bancolombia o Stripe.
2. Migrar catálogo a base de datos real o Shopify/WooCommerce si el cliente decide e-commerce completo.
3. Conectar clientes VIP a Google Sheet, Airtable, CRM o backend propio.
4. Insertar videos reales de Instagram/TikTok en la sección de lanzamientos.
5. Definir inventario real, tallas, colores y políticas de envío.

## Archivos principales

- `index.html`: página principal.
- `admin.html`: panel VIP.
- `style.css`: diseño premium.
- `script.js`: carrito, VIP, filtros, WhatsApp y demo de pago.
- `data/products.json`: catálogo demo.
- `assets/img`: imágenes ONTA.
- `assets/brands`: logos de marcas suministradas.
