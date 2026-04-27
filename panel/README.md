# /panel/ — Panel Edwin (F2-A)

Panel móvil para que Edwin gestione el ciclo de vida completo de las incidencias.

- **URL desplegada:** https://eric-crypto-ai.github.io/grupo-imar-frontend/panel/?k=&lt;panel_key&gt;
- **Fase:** F2-A (núcleo).
- **Documentación técnica:** vault Obsidian → `02 Roadmap/Fases planificadas (detalle)/F2_panel_edwin.md`.

## Stack

HTML/CSS/JS estático sin frameworks (P9). Hash routing manual. Servido por GitHub Pages.

```
panel/
├── index.html      Markup. 4 pantallas: loading / auth-error / lista / ficha + modal cancelar + toast
├── styles.css      Mobile-first, target táctil ≥ 46-50 px
├── app.js          Auth + router + lista + ficha + edición inline + cancelación
└── config.js       API_BASE + ENDPOINTS + LS_TOKEN_KEY (token NO está aquí — viene en URL)
```

## Auth (D2.2)

1. Eric envía a Edwin por Telegram **una sola vez** la URL `…/panel/?k=<panel_key>`.
2. El panel valida `k` contra `IMAR_PANEL_AUTH_VALIDATE`.
3. Si OK: guarda `k` en `localStorage` con clave `imar_panel_token` y limpia la URL (`history.replaceState`).
4. A partir de la 2ª visita: el panel lee el token de `localStorage`. Re-valida cada inicio (si Eric ha rotado la `panel_key`, fuerza re-login con URL nueva).
5. Para revocar: cambiar `panel_key` en hoja `config` del Sheet v2 + reactivar `IMAR_PANEL_AUTH_VALIDATE` (no hace falta — el cambio es inmediato porque el workflow lee config en cada request).

## Endpoints consumidos

| Endpoint | Workflow | Cuándo |
|---|---|---|
| `POST /webhook/imar/panel/auth` | `IMAR_PANEL_AUTH_VALIDATE` | Login automático al cargar |
| `GET /webhook/imar/catalogos` | `IMAR_FORM_CATALOGOS_LIST` v0.2 | Tras login (máquinas + operarios + proveedores) |
| `GET /webhook/imar/panel/incidencias` | `IMAR_PANEL_INCIDENCIAS_LIST` | Vista lista (con filtros como query params) |
| `GET /webhook/imar/panel/incidencia?id=` | `IMAR_PANEL_INCIDENCIA_GET` | Vista ficha |
| `PATCH /webhook/imar/panel/incidencia?id=` | `IMAR_PANEL_INCIDENCIA_UPDATE` | Botón "Guardar cambios" |
| `POST /webhook/imar/panel/incidencia/cancel?id=` | `IMAR_PANEL_INCIDENCIA_CANCEL` | Modal "Cancelar incidencia" |

Todos exigen `Authorization: Bearer <panel_key>`.

## Routing (hash)

| Hash | Vista |
|---|---|
| `#/lista` (default) | Listado con tabs Activas / Todas / Cerradas + búsqueda |
| `#/incidencia/<id>` | Ficha de la incidencia con edición inline |

Back button funcional. Compartir el link de una incidencia en Telegram funciona.

## UX

### Lista
- 3 tabs: **Activas** (no-Finalizada/Cancelada, default) · **Todas** · **Cerradas** (Resuelta/Finalizada/Cancelada).
- Búsqueda por id o texto en descripción (debounce 350ms).
- Tarjeta clicable con borde de color según estado.

### Ficha
- Cabecera con id (monoespaciado), fecha, operario y badge de estado actual.
- 4 secciones:
  1. **Reportado** (read-only): máquina + departamento + máquina parada + descripción + observaciones del operario.
  2. **Clasificación** (editable): categoría · tipo de fallo · motivo de fallo · prioridad.
  3. **Asignación** (editable): origen Interno/Externo (toggle) → si Externo aparece select proveedor.
  4. **Estado** (editable): select estado + textarea "comentario del cambio" (se guarda en historial si cambia el estado).
  5. **Trabajo realizado** (editable): fechas inicio/fin, qué se hizo, ¿quedó solucionado? toggle, trabajo pendiente.
- Botón sticky **Guardar cambios** + botón **Cancelar incidencia** (abre modal con motivo obligatorio ≥ 3 chars).
- **Histórico** read-only abajo: cronología de cambios de estado (`Nueva → En curso · 2026-04-27 18:36 · edwin`).

### Reglas semánticas que el cliente respeta
- No se puede pasar a `Finalizada` sin `motivo_fallo` rellenado (se enseña hint, validación final en backend).
- No se puede pasar a `Cancelada` desde el form de edición — hay que usar el modal "Cancelar incidencia" para forzar el motivo.
- Si `solvendo=No`, conviene rellenar `trabajo_pendiente`.

## Test local

```bash
cd panel && python3 -m http.server 8000
# luego abrir http://localhost:8000/?k=<panel_key>
```

CORS abierto desde el webhook (Access-Control-Allow-Origin: *).

## Limitaciones conocidas (F2-A)

| # | Limitación | Plan |
|---|---|---|
| L1 | Sin comentarios cronológicos (solo histórico de estados) | F2-B: workflow + UI de comentarios |
| L2 | Sin crear incidencia manual desde panel | F2-B |
| L3 | Sin polling auto-refresh | F2-C |
| L4 | Sin dashboard con KPIs (solo lista) | F2-C |
| L5 | Si la `panel_key` se filtra y Eric no ha rotado todavía, cualquiera entra | Mitigación: rotar inmediato + auditoría en F2-C (BKL-008) |
| L6 | Edición de fechas con `datetime-local` puede ser tosca en algunos navegadores antiguos | Aceptable para Edwin con móvil moderno |

## Histórico de cambios

- 2026-04-27 — Versión inicial v0.1.0 (F2-A). 4 archivos. Login automático, lista con filtros, ficha con edición inline, cancelación con modal. Test e2e desde curl OK.
