# V&C BOUTIQUE | LA PAZ

Proyecto académico de Diseño Web II — UPDS, construido con HTML5, CSS3, JavaScript, jQuery y arquitectura PWA.

## Estructura

```text
VC_BOUTIQUE_LA_PAZ/
├── index.html · styles.css · script.js · sw.js · manifest.json
├── data/products.json         # 16 productos (Fetch API)
├── assets/images/             # fotografías WebP 720×900
├── icons/                     # íconos PWA 192 y 512
├── vendor/jquery-3.6.0.min.js # jQuery local (funciona offline)
├── lab-jquery/                # práctica independiente: index, styles, script, manifest.json, sw.js
└── docs/IMPLEMENTACION_GUIAS.md   # matriz de trazabilidad con las 15 guías
```

## Cómo ejecutar

No abrir los HTML con doble clic (`file://`), porque Fetch API y Service Worker necesitan un servidor HTTP/HTTPS.

1. Extrae el ZIP.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta `python -m http.server 8000`.
4. Visita `http://localhost:8000/`.
5. Laboratorio: `http://localhost:8000/lab-jquery/`.

Para instalar como PWA y probar el Service Worker se requiere `localhost` o un hosting HTTPS como GitHub Pages. En GitHub Pages, sube el contenido manteniendo la estructura de carpetas.

## Funciones incluidas

- **Modo claro/oscuro**, marco de smartphone en PC (conmutable), filtro de 3 capas, historias, carrusel de destacados, programa de lealtad (V&C Puntos), checkout con temporizador, cola offline con verificación al reconectar. Ver la matriz completa en `docs/IMPLEMENTACION_GUIAS.md`.


- Catálogo asíncrono de 16 productos desde `data/products.json` mediante Fetch API.
- Imágenes con `loading="lazy"`, filtros por categoría, estilo y rango de precio, búsqueda y ordenamiento.
- Fichas de producto, selección de talla, favoritos, carrito lateral con cantidades y subtotal en bolivianos.
- Perfil local, formulario de contacto con validación en tiempo real y confirmación de pedido.
- Persistencia local con `localStorage` y cola local de pedidos/consultas para uso sin conexión.
- Sección de actividad en vivo: click, dblclick, keyup, change y submit registrados en una bitácora.
- jQuery: selectores, `off().on()`, delegación de eventos, `slideDown()`, `slideUp()`, `slideToggle()`, `fadeIn()`, `fadeOut()`, `animate()`, `append()` y `text()`.
- Modal de confirmación con cuenta regresiva de 30 segundos y alerta de expiración; toast con permanencia de 3 segundos.
- PWA: manifest, iconos, Service Worker, Cache Storage, detector Online/Offline y fallback de navegación.
- Responsive móvil/tablet/escritorio: en laptop abre en ancho completo (sin marco de celular), con catálogo de 4–5 columnas; en tablet usa 3 columnas y en móvil 2. Incluye áreas táctiles de 44 px, zoom accesible, separación y ajuste landscape.

## Consideraciones técnicas importantes

- **No es una tienda conectada a un backend real:** las cuentas, pedidos y consultas se guardan en el navegador del dispositivo. No se procesa ningún pago ni se envía un pedido a un servidor. Para producción se necesita backend, base de datos, autenticación y pasarela de pago.
- **WhatsApp:** no se añadió un número ni enlace de contacto inventado. Se puede incorporar cuando la boutique proporcione el número oficial.
- **Hydration:** se implementa una simulación académica de hidratación sobre el DOM estático (`data-hidratado`), ya que el proyecto se entrega como sitio estático y no tiene servidor SSR.
- **Tree Shaking:** se aplicó limpieza de dependencias y de código no utilizado; no se configuró un bundler de producción. La técnica Tree Shaking real requiere un proceso de empaquetado como Vite/Rollup y se documenta como optimización conceptual en la guía del proyecto.
- jQuery se sirve local desde `vendor/`; solo las fuentes de Google requieren conexión (hay fuente de respaldo). La tienda conserva la funcionalidad principal con JavaScript nativo si jQuery no está disponible, aunque los efectos visuales jQuery no se ejecutan sin descargar la librería.

## Recomendación de pruebas

Prueba en Chrome y Brave/Opera; móvil a 360 px; modo horizontal; modo avión después de abrir una vez; búsquedas con texto largo; cantidades; formularios vacíos; y entrada literal de texto como `<script>alert(1)</script>` en los campos para comprobar que se representa como texto y no se ejecuta.
