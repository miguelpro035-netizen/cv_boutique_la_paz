/* =====================================================================
   V&C BOUTIQUE · LA PAZ — script.js
   Diseño Web II (SIS-0141) · UPDS Sede La Paz
   Organizado por las 15 guías del docente (ver docs/IMPLEMENTACION_GUIAS.md)
   Reglas transversales: textContent/.text() (anti-XSS), .off().on() antes de
   delegar, inicialización única, limpieza de temporizadores (Memory Leaks).
   ===================================================================== */
(function () {
  'use strict';
  if (window.__vcBoot) return;              // Guía Memory Leaks: inicializar UNA sola vez
  window.__vcBoot = true;
  const $ = window.jQuery;

  /* ---------- 0. CONFIGURACIÓN Y UTILIDADES ---------- */
  const CFG = { cutoffHour: 12, pointsPerBs: 10, checkoutSeconds: 30, toastMs: 3000, flashMs: 20000,
                img: { w: 720, h: 900 }, liveVariants: { 'Look Básico (1 prenda)': 120, 'Combo Doble (2 prendas)': 220 } };
  const state = { products: [], category: 'Todos', search: '', style: '', price: '', sort: 'featured',
                  cart: read('vc-cart', []), favorites: read('vc-favorites', []), profile: read('vc-profile', null),
                  timer: null, seconds: CFG.checkoutSeconds, lastFocus: null, flashIdx: 0 };
  const timers = [];                         // todos los setInterval se registran para limpiarlos en pagehide

  const $id = (id) => document.getElementById(id);
  const money = (n) => `Bs ${Number(n).toFixed(2).replace(/\.00$/, '')}`;
  const money2 = (n) => `Bs ${Number(n).toFixed(2)}`;
  function read(key, fallback) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch (e) { return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* almacenamiento bloqueado: la app sigue funcionando */ } }
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = String(text); return n; }
  function every(fn, ms) { const t = setInterval(fn, ms); timers.push(t); return t; }

  /** Bitácora (Día 1 / Día 2): usa textContent, nunca innerHTML con datos del usuario. */
  function logEvent(type, message, boxId) {
    const box = $id(boxId || 'eventLog'); if (!box) return;
    box.prepend(el('p', '', `[${new Date().toLocaleTimeString()}] ${type}: ${message}`));
    while (box.children.length > 20) box.lastElementChild.remove();
  }
  /** Toast superior derecho: .slideDown(), 3 s visible, .fadeOut() (Guía Maquetación UI · reto +0.5). */
  function toast(title, message) {
    const item = el('div', 'toast'); item.append(el('strong', '', title), el('span', '', message));
    $id('toastRegion').prepend(item);
    $(item).hide().slideDown(220);
    setTimeout(() => $(item).fadeOut(300, () => item.remove()), CFG.toastMs);
  }
  /** Guía unificada C3-A2: DOMPurify.sanitize antes de inyectar HTML proveniente de JSON/BD. */
  const safeHtml = (html) => (window.DOMPurify ? window.DOMPurify.sanitize(String(html ?? '')) : String(html ?? '').replace(/[<>&]/g, ''));
  const findProduct = (id) => state.products.find((p) => p.id === Number(id));

  /* ---------- 1. DETECCIÓN MÓVIL/TABLET + VISTA (Guía Técnica PWA §1, método B) ---------- */
  const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad/i.test(navigator.userAgent);
  console.log(isMobile ? 'Dispositivo Móvil o Tablet Detectado: Cargando Modo PWA' : 'Escritorio detectado: vista adaptable de pantalla completa');
  document.documentElement.dataset.dispositivo = isMobile ? 'movil' : 'escritorio';
  // En laptop/PC se abre por defecto a pantalla amplia; en móvil conserva su presentación natural.
  // Se usa una clave nueva para que una preferencia antigua de «marco» no reduzca la vista del laptop.
  document.documentElement.dataset.vista = read('vc-view-v2', isMobile ? 'marco' : 'pc');

  /* ---------- 2. MODO OSCURO / CLARO (Guía DOM · Ejemplo 1: classList.toggle) ---------- */
  function paintTheme() {
    const dark = document.body.classList.contains('dark-mode');
    $id('themeColorMeta').setAttribute('content', dark ? '#17121a' : '#c94f83');
    $id('themeBtn').setAttribute('aria-pressed', String(dark));
    $id('themeBtn').textContent = dark ? '☀' : '◐';
  }
  function initTheme() {
    const saved = read('vc-theme', null);
    const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark-mode', dark);
    paintTheme();
  }

  /* ---------- 3. HIDRATACIÓN + MENÚ HAMBURGUESA (Guía Memory Leaks §3 · Técnica PWA §4) ---------- */
  function hydrateInterface() {
    const $box = $('#contenedorMenu');
    if ($box.attr('data-hidratado') === 'true') return;         // evita hidratar dos veces
    $('#btnPWA').removeClass('btn-estatico').text('☰').attr('aria-label', 'Menú interactivo (hidratado)')
      .off('click').on('click', function () {                   // adjunta eventos SIN redibujar el DOM
        const $nav = $('#navMenu');
        $nav.stop(true, true).slideToggle(300, () => $('#btnPWA').attr('aria-expanded', String($nav.is(':visible'))));
        logEvent('MENU', 'Menú hamburguesa alternado (slideToggle 300 ms)');
      });
    $box.attr('data-hidratado', 'true'); $('#appShell').attr('data-hidratado', 'true');
    logEvent('HYDRATION', 'Interfaz estática conectada con controladores DOM');
  }

  /* ---------- 4. CATÁLOGO ASÍNCRONO (Guía Karaoke PWA: Fetch + Lazy Loading) ---------- */
  async function loadProducts() {
    try {
      const res = await fetch('data/products.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);          // fetch solo rechaza ante fallos de red
      state.products = await res.json();
      renderAll();
      logEvent('CATÁLOGO', `${state.products.length} productos cargados desde JSON (Fetch API)`);
    } catch (err) {
      $id('catalogStatus').textContent = 'No se pudo cargar el catálogo. Usa un servidor local o GitHub Pages.';
      $id('productGrid').replaceChildren(el('p', 'loading-card', 'No fue posible cargar data/products.json.'));
      console.error('Catálogo:', err);
    }
  }
  function renderAll() { renderProducts(); renderFeatured(); renderStories(); renderLiveProducts(); renderCart(); }

  function sizesBox(p) {                                          // chips Disponible (verde) / Agotada (rojo)
    const box = el('div', 'size-chips');
    p.sizes.forEach((s) => box.append(el('span', `size-chip ${p.soldOut.includes(s) ? 'agotado' : 'disponible'}`, s === 'Única' ? 'Talla única' : s)));
    return box;
  }
  function productCard(p) {
    const card = el('article', 'product-card'); card.dataset.id = p.id; card.dataset.category = p.category; card.dataset.style = p.style;
    const wrap = el('div', 'product-image-wrap');
    const img = el('img'); img.src = p.image; img.alt = p.name; img.width = CFG.img.w; img.height = CFG.img.h; img.loading = 'lazy'; img.decoding = 'async';
    const fav = el('button', `favorite-button${state.favorites.includes(p.id) ? ' is-favorite' : ''}`, state.favorites.includes(p.id) ? '♥' : '♡');
    fav.type = 'button'; fav.dataset.action = 'favorite'; fav.setAttribute('aria-label', 'Añadir a favoritos');
    wrap.append(img, el('span', 'product-badge', p.featured ? '★ TOP' : p.badge), fav);
    const info = el('div', 'product-info');
    const price = el('span', 'product-price', money(p.price)); if (p.oldPrice) price.append(el('span', 'product-old-price', money(p.oldPrice)));
    const meta = el('div', 'product-meta'); meta.append(price, el('span', 'product-category', p.style));
    const acc = el('button', 'accordion-btn card-accordion', 'Tallas y disponibilidad '); acc.type = 'button'; acc.dataset.speed = 'slow'; acc.setAttribute('aria-expanded', 'false'); acc.append(el('span', '', '+'));
    const panel = el('div', 'accordion-panel'); panel.style.display = 'none'; panel.append(sizesBox(p), el('small', '', `Stock: ${p.stock} unidades`));
    const actions = el('div', 'product-actions');
    const add = el('button', 'add-button', 'AÑADIR +'); add.type = 'button'; add.dataset.action = 'add';
    const detail = el('button', 'detail-button', 'VER DETALLE'); detail.type = 'button'; detail.dataset.action = 'detail';
    actions.append(add, detail);
    info.append(el('span', 'product-category', p.category), el('h3', 'product-name', p.name), el('p', 'product-desc', p.description), meta, acc, panel, actions);
    card.append(wrap, info); return card;
  }
  function filteredList() {
    const list = state.products.filter((p) =>
      (state.category === 'Todos' || p.category === state.category) &&
      (!state.search || `${p.name} ${p.category} ${p.style}`.toLowerCase().includes(state.search)) &&
      (!state.style || p.style === state.style) &&
      (!state.price || (state.price === 'low' ? p.price <= 100 : state.price === 'mid' ? p.price > 100 && p.price <= 200 : p.price > 200)));
    if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return list;
  }
  function renderProducts() {
    const list = filteredList();
    $id('productGrid').replaceChildren(...list.map(productCard));
    $id('resultCount').textContent = `${list.length} ${list.length === 1 ? 'producto' : 'productos'}`;
    $id('catalogStatus').textContent = 'Prendas seleccionadas para tu estilo.';
    $id('emptyState').hidden = list.length !== 0; $id('productGrid').hidden = list.length === 0;
  }

  /* Carrusel de destacados (captura Whataform) */
  function renderFeatured() {
    const picks = state.products.filter((p) => p.featured).concat(state.products.filter((p) => !p.featured).slice(0, 2));
    $id('featuredTrack').replaceChildren(...picks.map((p) => {
      const card = el('article', 'featured-card'); card.dataset.id = p.id;
      const body = el('div', 'featured-body');
      const add = el('button', 'button button-light', 'Agregar'); add.type = 'button'; add.dataset.action = 'add'; add.dataset.id = p.id;
      body.append(el('span', 'featured-cat', p.category.toUpperCase()), el('h3', '', p.name.toUpperCase()), el('p', '', p.description), el('strong', '', money2(p.price)), add);
      const img = el('img'); img.src = p.image; img.alt = p.name; img.width = CFG.img.w; img.height = CFG.img.h; img.loading = 'lazy';
      card.append(body, img); return card;
    }));
  }
  /* Historias circulares → lista modal «Colección (N)» (captura Whataform) */
  function collectionsMap() {
    const map = new Map();
    state.products.forEach((p) => [...p.collections, p.category].forEach((c) => { if (!map.has(c)) map.set(c, []); if (!map.get(c).includes(p)) map.get(c).push(p); }));
    return map;
  }
  function renderStories() {
    const items = [...collectionsMap().entries()]; const used = new Set();
    $id('storiesTrack').replaceChildren(...items.map(([name, list]) => {
      const cover = list.find((p) => !used.has(p.id)) || list[0]; used.add(cover.id);   // portadas distintas por colección
      const b = el('button', 'story-circle'); b.type = 'button'; b.dataset.action = 'story'; b.dataset.name = name;
      const img = el('img'); img.src = cover.image; img.alt = ''; img.width = 88; img.height = 88; img.loading = 'lazy';
      const ring = el('span', 'story-ring'); ring.append(img); b.append(ring, el('span', 'story-name', name)); return b;
    }));
  }
  function openStory(name) {
    const list = collectionsMap().get(name) || [];
    $id('storyTitle').textContent = `${name} (${list.length})`;
    $id('storyList').replaceChildren(...list.map((p) => {
      const row = el('article', 'story-row'); row.dataset.id = p.id;
      const img = el('img'); img.src = p.image; img.alt = p.name; img.width = 52; img.height = 65; img.loading = 'lazy';
      const txt = el('div', 'story-row-text'); txt.append(el('strong', '', p.name), el('small', '', p.description));
      const add = el('button', 'round-add', '+'); add.type = 'button'; add.dataset.action = 'add'; add.dataset.id = p.id; add.setAttribute('aria-label', `Añadir ${p.name}`);
      row.append(img, txt, el('b', '', money(p.price)), add); return row;
    }));
    openModal('storyModal');
  }
  /* Live (Día 1): productos destacados con data-prod + oferta relámpago rotativa (Pregunta 17) */
  function liveCard(p, flash) {
    const card = el('article', `live-product${flash ? ' flash' : ''}`); card.dataset.id = p.id;
    const img = el('img'); img.src = p.image; img.alt = p.name; img.width = CFG.img.w; img.height = CFG.img.h; img.loading = 'lazy';
    const body = el('div'); const btn = el('button', '', flash ? '⚡ OFERTA RELÁMPAGO' : 'AÑADIR AL CARRITO'); btn.type = 'button'; btn.dataset.prod = p.name; btn.dataset.id = p.id;
    body.append(el('strong', '', p.name), el('small', '', money(p.price)), btn); card.append(img, body); return card;
  }
  function renderLiveProducts() { $id('liveProducts').replaceChildren(...[0, 1, 12].map((i) => liveCard(state.products[i]))); rotateFlash(); }
  function rotateFlash() {                                         // inyecta/retira ofertas dinámicamente: la delegación las captura igual
    if (!state.products.length) return;
    const host = $id('liveProducts'); const old = host.querySelector('.flash'); if (old) old.remove();
    state.flashIdx = (state.flashIdx + 3) % state.products.length;
    const fresh = liveCard(state.products[state.flashIdx], true); host.append(fresh); $(fresh).hide().fadeIn(300);
    logEvent('OFERTA_NUEVA', `Oferta relámpago inyectada al DOM: ${state.products[state.flashIdx].name}`);
  }

  /* ---------- 5. FILTROS: categoría, tema dinámico y 3 capas ---------- */
  const THEMES = {
    Todos: ['tema-todos', '✦', 'Toda la colección', 'Explora todas las prendas seleccionadas de V&C.'],
    Blusas: ['tema-blusas', '✿', 'Blusas y camisas', 'Texturas suaves y cortes que se combinan con todo.'],
    Pantalones: ['tema-pantalones', '◈', 'Pantalones y jeans', 'Siluetas versátiles de día a noche.'],
    Vestidos: ['tema-vestidos', '❀', 'Vestidos y faldas', 'Movimiento y feminidad para cada ocasión.'],
    Abrigos: ['tema-abrigos', '❄', 'Abrigos y suéteres', 'Capas elegantes para La Paz.'],
    Accesorios: ['tema-accesorios', '✧', 'Accesorios', 'El detalle final que completa tu look.'],
    Calzado: ['tema-calzado', '♞', 'Calzado', 'Comodidad con estilo propio.']
  };
  function setCategory(category) {
    state.category = category;
    $('.category-pill').removeClass('active').filter(function () { return this.dataset.category === category; }).addClass('active');
    const t = THEMES[category] || THEMES.Todos;                    // Reto Jueves: addClass/removeClass + cambio de ícono sin recargar
    $('#temaBanner').removeClass(Object.values(THEMES).map((x) => x[0]).join(' ')).addClass(t[0]);
    $('#temaIcono').text(t[1]); $('#temaTitulo').text(t[2]); $('#temaTexto').text(t[3]);
    renderProducts(); logEvent('FILTER', `Categoría: ${category}`);
  }
  function setupLayers() {                                         // Guía Técnica PWA §4: cascada capa1 → capa2 → capa3
    $('#capa1').off('change.vc').on('change.vc', function () {
      const style = $(this).val(); const $c2 = $('#capa2');
      $c2.html('<option value="">-- Seleccione categoría --</option>').prop('disabled', false);
      if (style) {
        [...new Set(state.products.filter((p) => p.style === style).map((p) => p.category))].forEach((c) => $c2.append($('<option>').val(c).text(c)));
      } else { $c2.prop('disabled', true); $('#resultadoFiltro').text('Seleccione las capas anteriores...'); }
    });
    $('#capa2').off('change.vc').on('change.vc', function () {
      const style = $('#capa1').val(), cat = $(this).val();
      const $r = $('#resultadoFiltro');
      if (!cat) { $r.text('Seleccione las capas anteriores...'); return; }
      const items = state.products.filter((p) => p.style === style && p.category === cat);
      $r.empty().append($('<span>').text(`Capa 3: ${cat} · ${style} — ${items.length} ${items.length === 1 ? 'prenda' : 'prendas'}: ${items.map((p) => p.name).join(', ')}`),
        $('<button type="button" class="button button-outline layer-go">').text('VER EN CATÁLOGO ↗').data({ style, cat }));
    });
    $('#resultadoFiltro').off('click.vc', '.layer-go').on('click.vc', '.layer-go', function () {
      state.style = $(this).data('style'); $('#styleFilter').val(state.style);
      setCategory($(this).data('cat')); document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ---------- 6. CARRITO Y RESUMEN DE PEDIDO (Guía Viernes: calculador + desglose) ---------- */
  const cartQty = () => state.cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = () => state.cart.reduce((s, i) => { const p = findProduct(i.id); return s + (p ? p.price * i.qty : 0); }, 0);
  const deliveryFee = () => Number($id('deliveryCart').value) || 0;
  const orderTotal = () => subtotal() + (state.cart.length ? deliveryFee() : 0);
  const pointsFor = (total) => Math.floor(total / CFG.pointsPerBs);
  const persistCart = () => write('vc-cart', state.cart);
  function addToCart(id, size) {
    const p = findProduct(id); if (!p) return;
    const found = state.cart.find((x) => x.id === p.id);
    if (found) { found.qty = Math.min(found.qty + 1, p.stock); if (size) found.size = size; } else state.cart.push({ id: p.id, qty: 1, size: size || p.sizes.find((s) => !p.soldOut.includes(s)) });
    persistCart(); renderCart(); toast('Añadido a tu carrito', `${p.name} · ${money(p.price)}`); logEvent('CARRITO', `${p.name} añadido`);
    $('#cartTotal, #cartBarTotal').stop(true).animate({ opacity: .4 }, 90).animate({ opacity: 1 }, 180);   // Layout visual: .animate() resalta el monto
  }
  function renderCart() {
    const host = $id('cartItems'); const qty = cartQty();
    $id('cartCount').textContent = qty; $id('cartBarCount').textContent = qty; $id('drawerCount').textContent = `(${qty})`;
    const sub = subtotal(), total = orderTotal();
    $id('cartSubtotal').textContent = money(sub); $id('cartDelivery').textContent = money(state.cart.length ? deliveryFee() : 0);
    $id('cartTotal').textContent = money(total); $id('cartPoints').textContent = pointsFor(total); $id('cartBarTotal').textContent = money2(total);
    $id('checkoutBtn').disabled = !state.cart.length;
    if (!state.cart.length) {
      const empty = el('div', 'cart-empty'); empty.append(el('span', 'cart-empty-icon', '🛒'), el('p', '', 'Tu carrito está vacío'), el('small', '', 'Agrega productos para continuar con tu pedido'));
      host.replaceChildren(empty); return;
    }
    host.replaceChildren(...state.cart.map((item) => {
      const p = findProduct(item.id); if (!p) return document.createComment('');
      const row = el('article', 'cart-line'); row.dataset.id = p.id;
      const img = el('img'); img.src = p.image; img.alt = p.name; img.width = 70; img.height = 88;
      const info = el('div', 'cart-line-info'); const ctr = el('div', 'quantity-controls');
      const mk = (txt, act, label) => { const b = el('button', '', txt); b.type = 'button'; b.dataset.action = act; b.dataset.id = p.id; b.setAttribute('aria-label', label); return b; };
      ctr.append(mk('−', 'qty-minus', 'Quitar una unidad'), el('span', '', item.qty), mk('+', 'qty-plus', 'Añadir una unidad'));
      info.append(el('h3', '', p.name), el('p', '', `${money(p.price)}${item.size ? ' · Talla ' + item.size : ''}`), ctr);
      const rm = mk('×', 'remove', 'Quitar producto'); rm.classList.add('remove-item');
      row.append(img, info, rm); return row;
    }));
  }
  function openDrawer() { $id('cartDrawer').classList.add('is-open'); $id('cartDrawer').setAttribute('aria-hidden', 'false'); $id('drawerBackdrop').classList.add('is-open'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { $id('cartDrawer').classList.remove('is-open'); $id('cartDrawer').setAttribute('aria-hidden', 'true'); $id('drawerBackdrop').classList.remove('is-open'); document.body.style.overflow = ''; }

  /* ---------- 7. MODALES (fadeIn/fadeOut jQuery) ---------- */
  function openModal(id) {
    state.lastFocus = document.activeElement;
    $('#modalBackdrop').stop(true, true).prop('hidden', false).hide().fadeIn(200);
    const $m = $('#' + id); $m.stop(true, true).prop('hidden', false).hide().fadeIn(220, () => { const f = $m.find('input:visible,select:visible,button:visible').not('.modal-close')[0]; if (f) f.focus(); });
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    stopCountdown();
    $('.modal:visible').stop(true, true).fadeOut(200, function () { this.hidden = true; });
    $('#modalBackdrop').stop(true, true).fadeOut(200, function () { this.hidden = true; });
    document.body.style.overflow = ''; if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
  }
  function showProduct(id) {
    const p = findProduct(id); if (!p) return;
    const layout = el('div', 'product-detail-layout'); const img = el('img'); img.src = p.image; img.alt = p.name; img.width = CFG.img.w; img.height = CFG.img.h;
    const info = el('div'); const title = el('h2', '', p.name); title.id = 'productModalTitle';
    const grid = el('div', 'talla-grid'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Selector de talla');
    let chosen = p.sizes.find((s) => !p.soldOut.includes(s));
    p.sizes.forEach((s) => { const out = p.soldOut.includes(s); const b = el('button', `talla-btn ${out ? 'agotado' : 'disponible'}${s === chosen ? ' active' : ''}`, s === 'Única' ? 'Única' : s); b.type = 'button'; b.dataset.size = s; b.disabled = out; b.title = out ? 'Agotada' : 'Disponible'; grid.append(b); });
    const add = el('button', 'button button-solid button-full', 'AÑADIR AL CARRITO ↗'); add.type = 'button'; add.dataset.action = 'detail-add'; add.dataset.id = p.id;
    const desc = el('p', 'detail-desc'); desc.innerHTML = safeHtml(p.description);   // DOMPurify: HTML dinámico siempre sanitizado
    info.append(el('p', 'eyebrow', p.category.toUpperCase()), title, desc, el('div', 'detail-price', money(p.price)), el('p', 'legend', '● Disponible   ● Agotada'), grid, add);
    layout.append(img, info); $id('productModalContent').replaceChildren(layout); openModal('productModal');
    logEvent('CLICK', `Detalle abierto: ${p.name}`);
  }
  /* Checkout con temporizador asíncrono de 30 s (Guía Viernes · reto +0.5) */
  function startCountdown() {
    stopCountdown(); state.seconds = CFG.checkoutSeconds; $id('countdown').textContent = '00:30';
    state.timer = setInterval(() => {
      state.seconds -= 1; $id('countdown').textContent = `00:${String(Math.max(0, state.seconds)).padStart(2, '0')}`;
      if (state.seconds <= 0) {
        stopCountdown();
        $('#checkoutModal').fadeOut(300, function () { this.hidden = true; });          // .fadeOut() al expirar
        $('#modalBackdrop').fadeOut(300, function () { this.hidden = true; }); document.body.style.overflow = '';
        toast('Tarifa Flash Expirada', 'El tiempo para confirmar terminó. Revisa tu carrito para continuar.'); logEvent('CHECKOUT', 'Temporizador expirado (00:00)');
      }
    }, 1000);
  }
  function stopCountdown() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }

  /* ---------- 8. CUENTA, LEALTAD Y PEDIDOS OFFLINE-FIRST ---------- */
  const accounts = () => read('vc-accounts', {});
  function saveProfile(profile) { state.profile = profile; write('vc-profile', profile); if (profile) { const a = accounts(); a[profile.email] = profile; write('vc-accounts', a); } paintLoyalty(); }
  function paintLoyalty() {
    const line = $id('pointsLine'); const p = state.profile;
    line.hidden = !p; if (p) line.textContent = `Hola ${p.name}: tienes ${p.points || 0} V&C Puntos.`;
    $id('joinLoyalty').textContent = p ? 'Ver mi cuenta' : 'Únete';
  }
  function accountView(view) {
    ['accountChooser', 'loginForm', 'accountForm', 'accountProfile'].forEach((id) => { $id(id).hidden = id !== view; });
    $id('accountFeedback').textContent = '';
    if (view === 'accountProfile') {
      $id('profileName').textContent = state.profile.name; $id('profilePoints').textContent = state.profile.points || 0;
      const orders = read('vc-order-queue', []).filter((o) => o.email === state.profile.email || !o.email).slice(-5).reverse();
      $id('ordersList').replaceChildren(...(orders.length ? orders.map((o) => { const li = el('li'); li.append(el('b', '', o.id), el('span', '', ` · ${money(o.total)} · ${o.status}`)); return li; }) : [el('li', '', 'Aún no tienes pedidos.')]));
    }
  }
  function openAccount() { accountView(state.profile ? 'accountProfile' : 'accountChooser'); openModal('accountModal'); }
  function buildOrder(extra) {
    const o = Object.assign({ id: `VC-${Date.now()}`, email: state.profile ? state.profile.email : '', createdAt: new Date().toISOString(),
      status: navigator.onLine ? 'Pendiente de coordinación' : 'Guardado localmente - Pendiente de envío' }, extra);   // UI optimista (Guía Offline-First)
    const queue = read('vc-order-queue', []); queue.push(o); write('vc-order-queue', queue);
    if (state.profile) { state.profile.points = (state.profile.points || 0) + pointsFor(o.total); saveProfile(state.profile); }
    return o;
  }
  function syncQueue() {                                           // al volver la red: pendiente → verificado
    const queue = read('vc-order-queue', []); let n = 0;
    queue.forEach((o) => { if (o.status.startsWith('Guardado localmente')) { o.status = 'Verificado al reconectar'; n++; } });
    if (n) { write('vc-order-queue', queue); toast('Sincronización', `${n} registro(s) pasaron de «pendiente» a «verificado».`); logEvent('SYNC', `${n} pedido(s) verificados`); }
  }
  function updateNetworkStatus() {                                 // Guía Offline-First §6
    const online = navigator.onLine;
    $('#estadoRed').text(online ? '🟢 En línea' : '🟠 Modo Offline Activo (Datos Locales)').css(online ? { background: '#dcfce7', color: '#14532d' } : { background: '#ffedd5', color: '#7c2d12' });
    $('#estadoDot').toggleClass('is-offline', !online).attr('aria-label', online ? 'En línea' : 'Sin conexión');
    if (online) { syncQueue(); setTimeout(() => $('#estadoRed').fadeOut(400), 3000); } else $('#estadoRed').stop(true, true).show();
    logEvent('RED', online ? 'Conexión restablecida' : 'Sin conexión; se mantiene la experiencia local');
  }
  function updateDispatch() {                                      // BOM: Date + captura «Para despacho el mismo día»
    const h = new Date().getHours();
    $('#despachoMsg').html('').append(document.createTextNode(h < CFG.cutoffHour ? 'Agenda tu pedido hasta las ' : 'El corte de hoy ya pasó (era a las '),
      $('<b>').text(`${CFG.cutoffHour}:00 HRS`), document.createTextNode(h < CFG.cutoffHour ? ' para despacho hoy.' : '): saldrá mañana.'));
  }

  /* ---------- 9. FORMULARIOS Y BLOQUES DE PRÁCTICA ---------- */
  /* Guía Técnica PWA §4 + DOM Ej.4: validación con fadeIn/fadeOut y alerta slideDown().delay().slideUp() */
  function validateContact(showAll) {
    const nombre = $('#nombre').val().trim(), correo = $('#correo').val().trim(), mensaje = $('#mensaje').val().trim();
    const checks = [['#errNombre', nombre.length >= 2, '#nombre'], ['#errCorreo', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo), '#correo'], ['#errMensaje', mensaje.length >= 8, '#mensaje']];
    let valido = true;
    checks.forEach(([err, ok, field]) => { if (!ok) valido = false; if (!ok && (showAll || $(field).data('tocado'))) $(err).stop(true, true).fadeIn(); else $(err).stop(true, true).fadeOut(); });
    return valido;
  }
  /* Guía Parte 1 · Bloque 1: reservas con .text() — la entrada hostil se imprime como texto */
  function addReservation(nombre, sala) {
    const $item = $('<li>').addClass('item-reserva');
    $item.append($('<strong>').text(nombre + ' — '), $('<span>').text(sala));
    $('#listaReservas').append($item);
  }
  /* Guía Parte 2 · Bloque 2: lista blindada (truncado, 44 px, delegación sin fugas) */
  function addWish(tema) {
    const $fila = $('<div>').addClass('fila-deseo');
    $fila.append($('<span>').addClass('titulo-truncado').attr('title', tema).text(tema), $('<button>').attr({ type: 'button', 'aria-label': 'Quitar de la lista' }).addClass('btn-tactil btn-quitar').text('✕'));
    $('#listaDeseos').append($fila);
  }
  const saveWishes = () => write('vc-deseos', $('#listaDeseos .titulo-truncado').map(function () { return $(this).text(); }).get());
  const saveReservas = () => write('vc-reservas', $('#listaReservas li').map(function () { return [[$(this).find('strong').text().replace(/ — $/, ''), $(this).find('span').text()]]; }).get());

  /* ---------- 10. EVENTOS: delegación global (Event Bubbling) ---------- */
  function setupEvents() {
    /* Un solo listener en document para tarjetas, carrito, historias, etc.: .off() previo evita duplicados. */
    $(document).off('click.vc', '[data-action]').on('click.vc', '[data-action]', function () {
      const action = this.dataset.action; const id = this.dataset.id || $(this).closest('[data-id]').attr('data-id');
      switch (action) {
        case 'add': addToCart(id); break;
        case 'detail': showProduct(id); break;
        case 'story': openStory(this.dataset.name); logEvent('CLICK', `Colección abierta: ${this.dataset.name}`); break;
        case 'favorite': {
          const pid = Number(id); state.favorites = state.favorites.includes(pid) ? state.favorites.filter((x) => x !== pid) : [...state.favorites, pid]; write('vc-favorites', state.favorites);
          const on = state.favorites.includes(pid); $(this).toggleClass('is-favorite', on).text(on ? '♥' : '♡'); toast('Favoritos', on ? 'Prenda guardada en favoritos.' : 'Prenda retirada de favoritos.'); break; }
        case 'qty-minus': case 'qty-plus': {
          const it = state.cart.find((x) => x.id === Number(id)); if (!it) break; const p = findProduct(id);
          it.qty = Math.min(it.qty + (action === 'qty-plus' ? 1 : -1), p.stock); if (it.qty <= 0) state.cart = state.cart.filter((x) => x.id !== Number(id)); persistCart(); renderCart(); break; }
        case 'remove': state.cart = state.cart.filter((x) => x.id !== Number(id)); persistCart(); renderCart(); break;
        case 'detail-add': { const size = $('.talla-btn.active').data('size'); addToCart(id, size); logEvent('VARIANTE', `Talla seleccionada: ${size}`); closeModal(); openDrawer(); break; }
        case 'live-shop': document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' }); logEvent('LIVE', 'Acceso a productos destacados'); break;
        default:
      }
    });
    /* Selector de talla: removeClass('active').addClass('active') (Layout visual · filter tabs) */
    $(document).off('click.vc', '.talla-btn:not([disabled])').on('click.vc', '.talla-btn:not([disabled])', function () { $('.talla-btn').removeClass('active'); $(this).addClass('active'); logEvent('CHANGE', `Talla ${$(this).data('size')} elegida`); });
    /* Acordeón jQuery (Guía Jueves): slideToggle('fast') o 'slow' en tarjetas */
    $(document).off('click.vc', '.accordion-btn').on('click.vc', '.accordion-btn', function () {
      const $b = $(this), open = $b.attr('aria-expanded') === 'true';
      $b.attr('aria-expanded', String(!open)).find('span').text(open ? '+' : '−');
      $b.next('.accordion-panel').stop(true, true).slideToggle($b.data('speed') || 'fast');
    });
    $(document).off('click.vc', '[data-modal-open]').on('click.vc', '[data-modal-open]', function (e) { e.preventDefault(); openModal(this.dataset.modalOpen); });
    $(document).off('click.vc', '[data-scroll]').on('click.vc', '[data-scroll]', function () { document.querySelector(this.dataset.scroll).scrollIntoView({ behavior: 'smooth' }); });
    $(document).off('click.vc', '[data-social]').on('click.vc', '[data-social]', function (e) { e.preventDefault(); toast(this.dataset.social, 'Enlace oficial pendiente: configúralo con la URL real de la boutique.'); });
    $(document).off('click.vc', '[data-close-drawer]').on('click.vc', '[data-close-drawer]', closeDrawer);
    $(document).off('click.vc', '[data-close-modal]').on('click.vc', '[data-close-modal]', closeModal);
    $('#modalBackdrop').off('click.vc').on('click.vc', closeModal); $('#drawerBackdrop').off('click.vc').on('click.vc', closeDrawer);
    $(document).off('click.vc', '.cart-open').on('click.vc', '.cart-open', openDrawer);
    $(document).off('click.vc', '.account-open').on('click.vc', '.account-open', openAccount);
    $(document).off('keydown.vc').on('keydown.vc', (e) => { if (e.key === 'Escape') { closeDrawer(); closeModal(); } });

    /* Categorías, búsqueda (keyup), ordenamiento y filtros */
    $('#categoryPills').off('click.vc', '.category-pill').on('click.vc', '.category-pill', function () { setCategory(this.dataset.category); });
    $('#searchInput').off('keyup.vc input.vc').on('keyup.vc input.vc', function () { const q = $(this).val().trim().toLowerCase(); if (q === state.search) return; state.search = q; renderProducts(); });
    $('#sortSelect').off('change.vc').on('change.vc', function () { state.sort = this.value; logEvent('CHANGE', `Orden: ${this.value}`); renderProducts(); });
    $('#styleFilter').off('change.vc').on('change.vc', function () { state.style = this.value; logEvent('CHANGE', `Estilo: ${this.value || 'Todos'}`); renderProducts(); });
    $('#priceFilter').off('change.vc').on('change.vc', function () { state.price = this.value; logEvent('CHANGE', `Precio: ${this.value || 'Todos'}`); renderProducts(); });
    $('#clearFilters').off('click.vc').on('click.vc', () => { $('#searchInput').val(''); $('#styleFilter, #priceFilter').val(''); state.search = ''; state.style = ''; state.price = ''; setCategory('Todos'); });
    $('#searchFocus').off('click.vc').on('click.vc', () => { document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => $id('searchInput').focus(), 400); });
    setupLayers();

    /* Tema y vista */
    $('#themeBtn').off('click.vc').on('click.vc', () => { const dark = document.body.classList.toggle('dark-mode'); write('vc-theme', dark ? 'dark' : 'light'); paintTheme(); logEvent('DOM', `classList.toggle('dark-mode') → ${dark ? 'oscuro' : 'claro'}`); });
    $('#viewToggle').off('click.vc').on('click.vc', () => { const v = document.documentElement.dataset.vista === 'pc' ? 'marco' : 'pc'; document.documentElement.dataset.vista = v; write('vc-view-v2', v); toast('Vista', v === 'pc' ? 'Ancho completo de escritorio.' : 'Marco de smartphone centrado.'); });
    $('#navMenu a').off('click.vc').on('click.vc', () => { if ($('#btnPWA').is(':visible')) $('#navMenu').slideUp(200); });
    $('#toTop').off('click.vc').on('click.vc', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    $(window).off('scroll.vc').on('scroll.vc', () => $('#toTop').toggleClass('show', window.scrollY > 600));

    /* Carruseles (flechas) */
    $('#historias').off('click.vc', '.carousel-arrow').on('click.vc', '.carousel-arrow', function () { const t = $id('storiesTrack'); t.scrollBy({ left: (this.classList.contains('stories-next') ? 1 : -1) * t.clientWidth * .8, behavior: 'smooth' }); });

    /* Carrito y checkout */
    $('#deliveryCart').off('change.vc').on('change.vc', function () { renderCart(); logEvent('CHANGE', `Entrega: ${this.selectedOptions[0].textContent}`); });
    $('#checkoutBtn').off('click.vc').on('click.vc', () => {
      if (!state.cart.length) return; closeDrawer();
      $id('confService').textContent = `${cartQty()} prenda(s) · ${$id('deliveryCart').selectedOptions[0].textContent.split(' · ')[0]}`;
      $id('checkoutTotal').textContent = money(orderTotal()); $id('checkoutForm').reset(); if (state.profile) $id('checkoutName').value = state.profile.name;
      openModal('checkoutModal'); startCountdown();
    });
    $('#checkoutForm').off('submit.vc').on('submit.vc', function (e) {
      e.preventDefault(); if (!this.reportValidity()) return;
      const o = buildOrder({ name: $('#checkoutName').val().trim(), phone: $('#checkoutPhone').val().trim(), note: $('#checkoutNote').val().trim(), items: state.cart.map((x) => ({ ...x })), total: orderTotal(), delivery: deliveryFee() });
      stopCountdown(); state.cart = []; persistCart(); renderCart(); closeModal();
      toast('Pedido registrado', `Código ${o.id}. ${o.status}.`); logEvent('SUBMIT', `Pedido ${o.id} · ${money(o.total)} · ${o.status}`);
      if ('serviceWorker' in navigator && 'SyncManager' in window) navigator.serviceWorker.ready.then((r) => r.sync.register('vc-pending-orders')).catch(() => {});
    });

    /* Cuenta */
    $('#joinLoyalty').off('click.vc').on('click.vc', openAccount);
    $('#chooseLogin').off('click.vc').on('click.vc', () => accountView('loginForm'));
    $('#chooseRegister').off('click.vc').on('click.vc', () => accountView('accountForm'));
    $('.back-account').off('click.vc').on('click.vc', () => accountView('accountChooser'));
    $('#accountForm').off('submit.vc').on('submit.vc', function (e) {
      e.preventDefault(); const name = $('#accountName').val().trim(), email = $('#accountEmail').val().trim().toLowerCase();
      if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) { $('#accountFeedback').text('Revisa tu nombre y correo.'); return; }
      saveProfile({ name, email, points: (accounts()[email] || {}).points || 0 }); logEvent('CUENTA', `Cuenta local creada: ${name}`); toast('Cuenta creada', 'Tus datos quedaron guardados en este dispositivo.'); accountView('accountProfile');
    });
    $('#loginForm').off('submit.vc').on('submit.vc', function (e) {
      e.preventDefault(); const acc = accounts()[$('#loginEmail').val().trim().toLowerCase()];
      if (!acc) { $('#accountFeedback').text('No encontramos esa cuenta en este dispositivo. Crea una nueva.'); return; }
      saveProfile(acc); logEvent('CUENTA', `Sesión iniciada: ${acc.name}`); accountView('accountProfile');
    });
    $('#logoutBtn').off('click.vc').on('click.vc', () => { saveProfile(null); localStorage.removeItem('vc-profile'); paintLoyalty(); accountView('accountChooser'); logEvent('CUENTA', 'Sesión cerrada'); });

    /* Contacto: validación en tiempo real */
    $('#nombre, #correo, #mensaje').off('input.vc blur.vc').on('input.vc blur.vc', function () { $(this).data('tocado', true); validateContact(false); });
    $('#pwaForm').off('submit.vc').on('submit.vc', function (e) {
      e.preventDefault();
      if (!validateContact(true)) return;
      const queue = read('vc-contact-queue', []); queue.push({ name: $('#nombre').val().trim(), email: $('#correo').val().trim(), message: $('#mensaje').val().trim(), createdAt: new Date().toISOString() }); write('vc-contact-queue', queue);
      $('#successAlert').stop(true, true).slideDown().delay(CFG.toastMs).slideUp(); this.reset(); $('#nombre, #correo, #mensaje').removeData('tocado');
      logEvent('SUBMIT', 'Consulta de contacto validada y guardada'); toast('Consulta recibida', 'Tu mensaje quedó guardado localmente.');
    });

    /* Bloque 1 · Reservas anti-XSS */
    $('#formReserva').off('submit').on('submit', function (e) {
      e.preventDefault(); const nombre = $('#clienteNombre').val().trim(), sala = $('#salaSelect').val(); if (!nombre) return;
      addReservation(nombre, sala); saveReservas(); this.reset(); logEvent('SUBMIT', `Reserva registrada (${sala})`);
    });
    /* Bloque 2 · Lista de deseos blindada */
    $('#btnPedir').off('click').on('click', function () { const tema = $('#inputDeseo').val().trim(); if (!tema) return; addWish(tema); saveWishes(); $('#inputDeseo').val('').trigger('focus'); });
    $('#inputDeseo').off('keydown.vc').on('keydown.vc', (e) => { if (e.key === 'Enter') $('#btnPedir').trigger('click'); });
    $('#listaDeseos').off('click', '.btn-quitar').on('click', '.btn-quitar', function () { $(this).closest('.fila-deseo').remove(); saveWishes(); });

    /* Bitácora Día 1: delegación en #liveContainer (data-prod, data-action) */
    const live = $id('liveContainer');
    live.addEventListener('click', (e) => {
      const prod = e.target.closest('[data-prod]');
      if (prod) { logEvent('OFERTA_CLICK', `Producto seleccionado: ${prod.dataset.prod}`); addToCart(prod.dataset.id); return; }
      if (e.target.closest('[data-action="like"]')) { $id('likeCount').textContent = Number($id('likeCount').textContent) + 1; logEvent('LIKE_STREAM', '¡El usuario envió un ❤️ al Live!'); }
    });
    live.addEventListener('dblclick', (e) => { if (e.target.closest('.live-product')) { $id('likeCount').textContent = Number($id('likeCount').textContent) + 1; logEvent('DBLCLICK', 'Corazones enviados al Live (doble clic)'); } });
    $id('chatInput').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') { if (e.target.value.trim()) logEvent('CHAT_ENVIADO', e.target.value.trim()); e.target.value = ''; return; }
      logEvent('CHAT_INPUT', `Tecleando mensaje: "${e.target.value}"`);
    });
    $id('sendLiveChat').addEventListener('click', () => { const i = $id('chatInput'); if (i.value.trim()) logEvent('CHAT_ENVIADO', i.value.trim()); i.value = ''; });
    /* Bitácora Día 2: change + submit con preventDefault */
    $id('variantSelect').addEventListener('change', (e) => logEvent('CAMBIO_VARIANTE', `El cliente seleccionó: ${e.target.value}`, 'logDia2'));
    $id('orderForm').addEventListener('submit', (e) => {
      e.preventDefault(); const usuario = $id('userSocial').value.trim(), variante = $id('variantSelect').value;
      if (usuario.length < 2) { logEvent('VALIDACIÓN', 'Escribe tu usuario para confirmar', 'logDia2'); return; }
      const o = buildOrder({ name: usuario, source: 'live', variant: variante, total: CFG.liveVariants[variante] });
      logEvent('COMPRA_EXITOSA', `Pedido ${o.id} confirmado para ${usuario} (${variante}) 🎉 — ${o.status}`, 'logDia2'); e.target.reset();
    });

    window.addEventListener('online', updateNetworkStatus); window.addEventListener('offline', updateNetworkStatus);
    window.addEventListener('pagehide', () => { timers.forEach(clearInterval); stopCountdown(); });      // limpieza de temporizadores
  }

  /* ---------- 11. PWA: Service Worker (Guía Offline-First §4) ---------- */
  function registerPWA() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => { console.log('Service Worker PWA Registrado con Éxito:', reg.scope); logEvent('PWA', `Service Worker activo: ${reg.scope}`); })
        .catch((err) => console.error('Fallo en Registro de SW:', err));
      navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'SYNC_AVAILABLE') syncQueue(); });
    });
  }

  /* ---------- INICIO ---------- */
  function init() {
    initTheme(); setupEvents(); paintLoyalty();
    read('vc-reservas', []).forEach(([n, s]) => addReservation(n, s)); read('vc-deseos', []).forEach(addWish);
    logEvent('DISPOSITIVO', isMobile ? 'Dispositivo Móvil o Tablet Detectado: Cargando Modo PWA' : 'Escritorio: marco de smartphone');
    loadProducts(); updateNetworkStatus(); updateDispatch(); every(updateDispatch, 60000); every(rotateFlash, CFG.flashMs);
    setTimeout(hydrateInterface, 500); registerPWA();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
