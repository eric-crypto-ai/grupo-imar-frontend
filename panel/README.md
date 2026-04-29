# /panel/ — Panel Edwin

Panel móvil para que Edwin gestione el ciclo de vida completo de las incidencias **y** el catálogo de piezas + stock.

- **URL desplegada:** https://eric-crypto-ai.github.io/grupo-imar-frontend/panel/?k=&lt;panel_key&gt;
- **Versión actual:** `v0.4.1` (cache-busting de `v0.4.0` — BKL-022).
- **Fases cubiertas:** F2-A + F2-B + F6-A + F6-B desplegadas. F2-C y F6-C en backlog.
- **Documentación técnica:** vault Obsidian → `02 Roadmap/Fases planificadas (detalle)/F2_panel_edwin.md` y `F6_piezas_stock.md`.

## Stack

HTML/CSS/JS estático sin frameworks (P9). Hash routing manual. Servido por GitHub Pages.

```
panel/
├── index.html      Markup. Pantallas: loading / auth-error / lista / ficha / nueva / piezas / pieza + modales + toast
├── styles.css      Mobile-first, target táctil ≥ 46-50 px
├── app.js          Auth + router + lista + ficha + creación manual + piezas + movimientos de stock
└── config.js       API_BASE + ENDPOINTS + LS_TOKEN_KEY + VERSION (token NO está aquí — viene en URL)
```

## Auth (D2.2)

1. Eric envía a Edwin por Telegram **una sola vez** la URL `…/panel/?k=<panel_key>`.
2. El panel valida `k` contra `IMAR_PANEL_AUTH_VALIDATE`.
3. Si OK: guarda `k` en `localStorage` con clave `imar_panel_token` y limpia la URL (`history.replaceState`).
4. A partir de la 2ª visita: el panel lee el token de `localStorage`. Re-valida en cada inicio (si Eric ha rotado la `panel_key`, fuerza re-login con URL nueva).
5. **Para revocar:** cambiar `panel_key` en hoja `config` del Sheet (clave `panel_key`, celda `B15` desde la rotación 2026-04-28). El cambio es inmediato — el workflow lee `config` en cada request.

## Endpoints consumidos

| Endpoint | Workflow | Cuándo |
|---|---|---|
| `POST /webhook/imar/panel/auth` | `IMAR_PANEL_AUTH_VALIDATE` | Login automático al cargar |
| `GET /webhook/imar/catalogos` | `IMAR_FORM_CATALOGOS_LIST` | Tras login (máquinas + operarios + proveedores) |
| `GET /webhook/imar/panel/incidencias` | `IMAR_PANEL_INCIDENCIAS_LIST` | Vista lista (filtros como query params) |
| `GET /webhook/imar/panel/incidencia?id=` | `IMAR_PANEL_INCIDENCIA_GET` | Vista ficha |
| `PATCH /webhook/imar/panel/incidencia?id=` | `IMAR_PANEL_INCIDENCIA_UPDATE` | Botón "Guardar cambios" |
| `POST /webhook/imar/panel/incidencia/cancel?id=` | `IMAR_PANEL_INCIDENCIA_CANCEL` | Modal "Cancelar incidencia" |
| `POST /webhook/imar/panel/comentario?id=` | `IMAR_PANEL_COMENTARIO_CREATE` (F2-B) | Añadir comentario cronológico en ficha |
| `POST /webhook/imar/panel/incidencia/create` | `IMAR_PANEL_INCIDENCIA_CREATE` (F2-B) | FAB `+` → crear incidencia manual desde panel |
| `GET /webhook/imar/panel/piezas` | `IMAR_PANEL_PIEZAS_LIST` (F6-A) | Vista `#/piezas` (con filtros) |
| `GET /webhook/imar/panel/pieza?id=` | `IMAR_PANEL_PIEZA_GET` (F6-A) | Vista `#/pieza/<id>` |
| `POST /webhook/imar/panel/pieza/movimiento` | `IMAR_PANEL_PIEZA_MOVIMIENTO` (F6-B) | Registrar entrada/salida/ajuste de stock |

Todos exigen `Authorization: Bearer <panel_key>`. CORS abierto desde el webhook (`Access-Control-Allow-Origin: *`).

## Routing (hash)

| Hash | Vista |
|---|---|
| `#/lista` (default) | Listado de incidencias con tabs Activas / Todas / Cerradas + búsqueda |
| `#/incidencia/<id>` | Ficha de incidencia con edición inline + comentarios |
| `#/nueva` | Formulario de creación manual de incidencia (F2-B, FAB `+` desde lista) |
| `#/piezas` | Catálogo de piezas con filtros (búsqueda, máquina, stock_bajo) — F6-A |
| `#/pedidos-pieza` | Atajo: `#/piezas` con filtro `stock_bajo` forzado — F6-A |
| `#/pieza/<id>` | Ficha de pieza + historial + acciones de movimiento — F6-A/B |

Back button funcional. Compartir el link de una incidencia o pieza en Telegram funciona.

## UX

### Lista de incidencias
- 3 tabs: **Activas** (no-Finalizada/Cancelada, default) · **Todas** · **Cerradas** (Resuelta/Finalizada/Cancelada).
- Búsqueda por id o texto en descripción (debounce 350 ms).
- Tarjeta clicable con borde de color según estado.
- FAB `+` para crear incidencia manual (F2-B).

### Ficha de incidencia
- Cabecera con id (monoespaciado), fecha, operario y badge de estado actual.
- Secciones:
  1. **Reportado** (read-only): máquina + departamento + máquina parada + descripción + observaciones del operario.
  2. **Clasificación** (editable): categoría · tipo de fallo · motivo de fallo · prioridad.
  3. **Asignación** (editable): origen Interno/Externo (toggle) → si Externo aparece select proveedor.
  4. **Estado** (editable): select estado + textarea "comentario del cambio" (se guarda en historial si cambia el estado).
  5. **Trabajo realizado** (editable): fechas inicio/fin, qué se hizo, ¿quedó solucionado? toggle, trabajo pendiente.
  6. **Bloqueo por pieza** (F6-B): si la incidencia está bloqueada por una pieza, link a `#/pieza/<id>` y aviso visible.
  7. **Comentarios** cronológicos (F2-B): listado + caja para añadir comentario nuevo.
- Botón sticky **Guardar cambios** + botón **Cancelar incidencia** (modal con motivo obligatorio ≥ 3 chars).
- **Histórico** read-only abajo: cronología de cambios de estado (`Nueva → En curso · 2026-04-27 18:36 · edwin`).

### Catálogo de piezas (F6-A/B)
- Listado con filtros: búsqueda, máquina, toggle "sólo stock bajo".
- Ficha de pieza con campos clave (código, descripción, ubicación, stock_actual, stock_min, alias, máquinas usuarias).
- Acciones de movimiento (F6-B): **entrada**, **salida**, **ajuste** — abre modal con motivo y cantidad. Llama a `IMAR_PANEL_PIEZA_MOVIMIENTO` y refresca la ficha.
- Sección "Movimientos recientes" con cronología.
- Sección "Incidencias bloqueadas por esta pieza" — link bidireccional.

### Reglas semánticas que el cliente respeta
- No se puede pasar a `Finalizada` sin `motivo_fallo` rellenado (hint en UI, validación final en backend).
- No se puede pasar a `Cancelada` desde el form de edición — hay que usar el modal "Cancelar incidencia" para forzar el motivo.
- Si `solvendo=No`, conviene rellenar `trabajo_pendiente`.
- Movimientos de stock requieren motivo y cantidad > 0; el backend recalcula `stock_actual` y dispara alerta si cae bajo `stock_min`.

## Test local

```bash
cd panel && python3 -m http.server 8000
# abrir http://localhost:8000/?k=<panel_key>
```

## Cache-busting (BKL-022)

`index.html` carga CSS/JS con `?v=<version>`. Al hacer release:
1. Bump `cfg.VERSION` en `config.js`.
2. Bump `?v=` en los 3 enlaces de `index.html` (styles, config, app).
3. Commit + push. Coordinar ambos números — si se desincroniza, los navegadores móviles sirven assets viejos.

## Limitaciones conocidas

| # | Limitación | Plan |
|---|---|---|
| L1 | Sin polling auto-refresh — Edwin tiene que recargar manualmente | F2-C |
| L2 | Sin dashboard con KPIs (sólo listas) | F2-C |
| L3 | Si la `panel_key` se filtra y Eric no ha rotado todavía, cualquiera entra | Mitigación: rotar inmediato + auditoría F2-C (BKL-008) |
| L4 | Edición de fechas con `datetime-local` puede ser tosca en navegadores antiguos | Aceptable para Edwin con móvil moderno |
| L5 | Sin alertas push de stock bajo (sólo aparece en sección "Piezas en alerta" del cron diario) | F6-C |
| L6 | `stock_min` provisional para algunas piezas (FAG=4) | F6-C — refinamiento tras ≥ 2 semanas de uso |

## Histórico de cambios

- 2026-04-29 — Reescritura del README para reflejar estado real desplegado (v0.4.1, F2-A/B + F6-A/B). Antes mencionaba sólo F2-A. Añadidos endpoints F2-B y F6-A/B, rutas `#/nueva`, `#/piezas`, `#/pieza/<id>`, sección de cache-busting (BKL-022), bloqueo por pieza en ficha y limitaciones actualizadas.
- 2026-04-28 — Despliegue acumulado v0.2.0 (comentarios), v0.2.1 (creación manual), v0.3.0 (piezas F6-A), v0.4.0 (movimientos F6-B), v0.4.1 (cache-busting BKL-022).
- 2026-04-27 — Versión inicial v0.1.0 (F2-A). Login automático, lista con filtros, ficha con edición inline, cancelación con modal. Test e2e desde curl OK.
