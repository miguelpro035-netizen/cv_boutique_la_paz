# Matriz de trazabilidad — 15 guías del docente + capturas Whataform

Fuente: `GUIA TODO.rar` (15 PDF) y `GUIA TDO.pdf` (capturas de la plantilla de tienda de ropa).
Cada fila indica **dónde se implementó** y **cómo se probó** (navegador Chromium real, 390 px; 51/51 pruebas OK).

| Guía | Implementación en V&C Boutique |
|---|---|
| Bitácora de Eventos — Día 1 | `#liveContainer` con delegación (`data-prod`, `data-action="like"`), `click`, `dblclick`, `keyup` en `#chatInput`; ofertas relámpago inyectadas cada 20 s (Pregunta 17). Bitácora `#eventLog`. |
| Bitácora de Eventos — Día 2 | `#orderForm`: `change` en `#variantSelect`, `submit` + `preventDefault()`, `COMPRA_EXITOSA`, `reset()`; bitácora `#logDia2`; el pedido entra a la cola offline. |
| Jueves: jQuery y Efectos | `.accordion-btn/.accordion-panel` con `slideToggle('fast')`; **reto +0.5**: al elegir categoría cambia el degradado (`addClass/removeClass`) y el ícono (`.text()`) del `#temaBanner`. |
| Viernes: Maquetación UI | Resumen de pedido con desglose (subtotal, entrega, total, puntos), modal con Servicio · Monto · Tiempo restante, **temporizador 30 s** con `.fadeOut()` y «Tarifa Flash Expirada», **toast** `slideDown()` → 3 s → `fadeOut()`. |
| Event Bubbling y Diagnóstico PWA | Un solo listener delegado en `document` con `.off().on()`; clases semánticas (sin `.ad-banner`, `.promo-box`, `.social-ads`). |
| Arquitectura PWA Offline-First | `manifest.json`, `sw.js` (precaché + caché primero), detector `#estadoRed` (🟢/🟠), cola local con UI optimista «Guardado localmente – Pendiente de envío» → «Verificado al reconectar». |
| Laboratorio: lab-jquery | Subcarpeta `lab-jquery/` independiente con **su propio** `index.html`, `manifest.json`, `sw.js`, `styles.css`, `script.js`. |
| Maquetación UI (3 Empresas) | Navbar · tarjetas · calculador/resumen · modal; selector de tallas Disponible (verde) / Agotada (roja). |
| Karaoke PWA: Lazy + Asíncrono | 16 productos por `fetch` validando `res.ok`; `loading="lazy"` + `width/height`; tabla Fetch vs jQuery AJAX vs Axios y prueba en `lab-jquery/`. |
| Memory Leaks e Hidratación | `#contenedorMenu[data-hidratado]` + `#btnPWA` hidratado a los 500 ms; `.off()` antes de cada `.on()`; inicialización única (`window.__vcBoot`); `clearInterval` en `pagehide`. |
| Parte 1: Tree Shaking y XSS | Bloque `#reservas` (`.modulo-reservas`) con `.text()`; entrada `<script>alert('XSS')</script>` se imprime como texto (probado). jQuery se sirve **local** (`vendor/`), sin CDN ni archivos sin uso. |
| Parte 2: Responsividad crítica | `min-height:100dvh`, objetivos táctiles ≥ 44 px, `min-width:0` + `text-overflow:ellipsis`, `@media (orientation:landscape) and (max-height:500px)`; bloque `#deseos` (lista blindada con delegación). |
| Guía Técnica PWA (inge Miguel) | Viewport PWA, **marco de smartphone en PC** (`@media (min-width:1025px)`, conmutable), menú hamburguesa `slideToggle(300)`, **filtro de 3 capas** `#capa1 → #capa2 → #resultadoFiltro`, validación con `fadeIn/fadeOut` y alerta `slideDown().delay(3000).slideUp()`, detección móvil por `innerWidth`/`userAgent`. |
| Guía Visual y Conceptual del DOM | Ej.1 **modo oscuro/claro** (`classList.toggle('dark-mode')`, persistente, respeta `prefers-color-scheme`); Ej.2 filtros con `dataset`; Ej.3 menú; Ej.4 validación con `preventDefault()`; estructura `index.html` + `styles.css` + `script.js`. |
| Layout Visual (3 Empresas) | Búsqueda con `keyup`, filtro por pestañas (`removeClass('active').addClass('active')`), panel desplegable `slideToggle('slow')` por tarjeta, `.animate()` sobre el total, contador de ítems. |

## Capturas Whataform
Título de tienda con chips *Ubicación / Acerca de*, carrusel de destacados, programa de lealtad (**V&C Puntos**), aviso de despacho el mismo día, historias circulares con lista modal «Colección (N)», pestañas de categoría fijas, badge «★ TOP», botón «+», barra de carrito fija, botón volver arriba, «Acerca de mi tienda» (acordeones), pie con *Conócenos* y *Redes sociales*, modal «Accede o crea tu cuenta», carrito vacío con *Finalizar pedido / Seguir comprando*.

## Guía unificada C3-A2 (capturas nuevas)
CLS: todas las imágenes tienen `width/height` (720×900) y contenedores con `aspect-ratio`. Service Worker como proxy offline: ✔. DOMPurify y BEM se aplican en los **3 catálogos de clientes**; la boutique usa `textContent` y no inyecta HTML externo, por eso no necesita sanitizador.

## Alcance y límites
- Cuentas, pedidos y puntos se guardan en el navegador (sin servidor ni pagos). Para producción se necesita backend.
- Redes sociales: enlaces pendientes (aviso en pantalla) hasta tener las URL reales. Hora de corte de despacho (12:00), tarifas de entrega (Bs 0/15/25) y precios de «Look Básico/Combo» son **datos demo**: se ajustan en `CFG` de `script.js` y en el HTML.
- Tree Shaking real requiere un empaquetador (Vite/Rollup); aquí se aplicó manualmente (sin librerías ni archivos sin uso).
