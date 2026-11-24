# Revisión y mejoras aplicadas

Se conservaron las tres carpetas, su identidad visual, estructura HTML/CSS/JS, catálogo de productos, filtros, carrito, formularios, modo claro/oscuro, PWA y funcionamiento offline.

## Mejoras realizadas

- **Filo Real:** se incorporó una fotografía de ambiente de barbería con apariencia realista en la portada, optimizada a WebP para reducir su peso. Se actualizó el texto alternativo y el Service Worker ahora precarga la imagen con una nueva versión de caché.
- **Los tres catálogos:** se verificó que los archivos JSON sean válidos, que las imágenes declaradas en los productos existan y que los scripts JavaScript pasen la comprobación sintáctica.
- **PWA:** se revisaron las rutas incluidas en las listas de precarga de los Service Workers; no se encontraron archivos faltantes.
- **Estructura:** se mantuvieron los nombres de carpetas y la organización para que puedas abrir cada catálogo por separado.

## Importante antes de presentar al cliente

- La fotografía nueva de Filo Real es una imagen generada con apariencia fotográfica; no representa necesariamente el local ni a los barberos reales. Para una entrega comercial, reemplázala por una fotografía autorizada del establecimiento o del equipo.
- Las imágenes SVG de productos son ilustraciones, no fotografías exactas de los artículos. En Maison Illimani conviene sustituirlas por fotos originales de cada frasco y empaque para que marcas, etiquetas y presentaciones sean fieles al producto.
- Brindis 3600 conserva sus recursos gráficos y su funcionamiento técnico; no se añadieron recursos promocionales nuevos para bebidas alcohólicas.
- En los tres `data/site.json` faltan datos que solo el cliente puede confirmar: WhatsApp, dirección exacta y redes sociales. Los precios, horarios, stock, nombres y descripciones de ejemplo también deben validarse antes de publicar.

## Cómo abrir cada catálogo

Abre una terminal dentro de la carpeta de cada catálogo y ejecuta:

```bash
python -m http.server 8000
```

Después entra desde el navegador a `http://localhost:8000/`. No abras `index.html` directamente con `file://`, porque Fetch API y el Service Worker requieren un servidor local o HTTPS.
