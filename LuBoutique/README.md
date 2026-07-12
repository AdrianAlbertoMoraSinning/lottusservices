# LuBoutique — High-End Apparel

Sitio web estático premium, responsive y listo para publicar en GitHub Pages o Netlify. El proyecto fue limpiado y reconstruido para LuBoutique; no contiene referencias a la tienda base anterior.

## Funcionalidades

- Hero editorial y colecciones para dama, caballero y sport wear.
- Catálogo desde `data/products.json` con filtros, tallas, colores y campos preparados para precio, descuento, SKU, galería y promociones.
- Bolsa persistente con `localStorage`, cantidades, eliminación y vaciado.
- Solicitud del pedido por WhatsApp o correo.
- Preparación para Stripe mediante `stripeCheckoutUrl` y `paymentMode` en la configuración.
- Registro VIP con consentimiento, preferencias, ciudad y cumpleaños.
- Panel local `admin.html` con métricas y exportación CSV.
- SEO básico, Open Graph, Schema.org, favicon y carga diferida.
- Páginas de privacidad, términos, envíos, devoluciones y cookies.
- Headers de seguridad para Netlify.

## Configuración obligatoria antes de publicar

Editar `data/config.js` y completar los datos reales:

```js
window.LUBOUTIQUE_CONFIG = {
  storeName: 'LuBoutique',
  city: 'Calgary, Alberta',
  address: 'Dirección real',
  whatsapp: '14035551234', // formato internacional, sin +
  phone: '+1 403 555 1234',
  email: 'info@dominio.com',
  instagram: 'https://instagram.com/...',
  facebook: '',
  tiktok: '',
  currency: 'CAD',
  locale: 'en-CA',
  paymentMode: 'whatsapp',
  stripeCheckoutUrl: ''
};
```

Los enlaces sociales vacíos se ocultan automáticamente. WhatsApp y correo muestran un aviso de configuración si todavía están vacíos.

## Catálogo

Editar `data/products.json`. Para activar precios, use un número mayor que cero en `price`. Mientras sea `0`, se mostrará `priceLabel`.

## Publicación

### GitHub Pages
1. Subir el contenido de esta carpeta a un repositorio.
2. Settings → Pages → Deploy from branch.
3. Seleccionar la rama principal y la carpeta raíz.

### Netlify
1. Importar el repositorio desde Netlify.
2. Build command: dejar vacío.
3. Publish directory: `.`

## Limitaciones actuales

- El panel y el formulario VIP usan almacenamiento local; no son multiusuario.
- No hay inventario ni autenticación real.
- Stripe requiere un checkout seguro o una función serverless antes de producción.
- Las políticas deben ser revisadas con los datos y reglas reales de la empresa.
