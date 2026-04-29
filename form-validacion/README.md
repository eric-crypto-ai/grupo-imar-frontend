# /form-validacion/ — Formulario operario (F1)

Frontend móvil para que el operario registre incidencias de mantenimiento.

- **URL desplegada:** https://eric-crypto-ai.github.io/grupo-imar-frontend/form-validacion/
- **Versión actual:** `v0.1.1`.
- **Fase:** F1 — desplegado, pendiente cierre formal por validación de uso real (≥ 1 semana, ≥ 5 incidencias creadas vía form).
- **Documentación técnica:** vault Obsidian → `01 Documentación/Arquitectura/03. Arquitectura del sistema — Grupo Imar.md`.

> **Nota sobre la ruta `/form-validacion/`** — el formulario está montado bajo este path durante la fase de validación previa con Eric, antes de exponerlo al operario en planta vía QR (F4). Cuando se promueva a producción operativa se renombrará a `/form/` o equivalente; mientras tanto evita confusión con un form "ya en planta".

## Stack

HTML/CSS/JS estático. Sin frameworks (P9 — mobile-first, carga rápida, sin dependencias). Servido por GitHub Pages.

```
form-validacion/
├── index.html      Markup + 5 pantallas (loading / form / sending / success / error)
├── styles.css      Mobile-first, target táctil ≥ 44 px
├── app.js          Lógica: carga catálogos, valida cliente, POST a n8n
└── config.js       API_BASE + WEBHOOK_TOKEN + VERSION (token público — repo público, BKL-021)
```

## Flujo

1. **Al cargar:** `GET /webhook/imar/catalogos` con Bearer token → puebla `<select>` operario y máquina (agrupada por departamento).
2. **Operario rellena:**
   - Operario (lista cerrada, 23 nombres).
   - Máquina (lista cerrada, 15 máquinas agrupadas por LAM/MAS/SER/EST/TRO/VEN/ENG).
   - ¿Máquina parada? Toggle Sí/No.
   - Descripción (texto libre, mínimo 5 caracteres).
   - Observaciones (opcional).
3. **Al enviar:** `POST /webhook/imar/nueva-incidencia` → muestra pantalla "enviando…".
4. **Resultado:**
   - 200 OK → pantalla con `INC-YYYY-NNNN` + "Edwin ha sido avisado".
   - 401 / 400 / 429 / red → pantalla de error con detalle + botones reintentar / volver.

El operario no rellena `categoría`, `tipo_fallo`, `motivo_fallo` ni `prioridad` (decisión D-EXC-1 + P4 actualizado — esa clasificación la hace Edwin desde el panel).

## Endpoints consumidos

Workflows en n8n:

- `IMAR_FORM_CATALOGOS_LIST` (`Dr2ROIdb1hbUYVTY`) — GET catálogos vivos.
- `IMAR_FORM_INCIDENCIA` v0.2.2 (`A1SJzjjJvd4wXJzI`) — POST creación, con rate-limit aplicativo (3 / 5 min por operario, 10 / min global — BKL-006 cerrada 2026-04-29).

## Test local

Es estático. Basta con servir la carpeta o abrir `index.html`:

```bash
cd form-validacion && python3 -m http.server 8000
# abrir http://localhost:8000
```

CORS abierto desde el webhook (`Access-Control-Allow-Origin: *`).

## Token y seguridad

`config.js` contiene `WEBHOOK_TOKEN`. Es **público de facto** (repo público, sitio público). Decisión D2.1 + BKL-021.

- **Fuente de verdad del token:** hoja `config` del Sheet operativo, celda `B13` (clave `webhook_token_form`) tras la rotación 2026-04-28.
- **Rotar token:** actualizar `B13` en el Sheet → actualizar `WEBHOOK_TOKEN` en `config.js` → bump `VERSION` → commit + push. Si los dos valores se desincronizan el form devuelve 401 (BKL-021 — caso resuelto en commit `e9912c8`, 2026-04-29).
- **Revocación urgente:** desactivar el workflow `IMAR_FORM_INCIDENCIA` en n8n (corta cualquier llamada inmediatamente).
- **Mitigación contra abuso:** rate-limit aplicativo en `IMAR_FORM_INCIDENCIA` v0.2.2 (BKL-006 cerrada 2026-04-29) — 3 envíos / 5 min por operario, 10 / min global.

## Histórico de cambios

- 2026-04-29 — Reescritura del README para reflejar estado real (v0.1.1, ruta `/form-validacion/`, rate-limit BKL-006 cerrada, sincronización de token con `config!B13`). Antes la ruta y los hechos mencionados (BKL-006 abierta, ruta `/form/`) quedaron obsoletos tras los commits `b72e43e`, `6cf4687` y `e9912c8`.
- 2026-04-28 — Rotación de tokens y rename a `/form-validacion/` para validación previa de Eric antes de planta.
- 2026-04-27 — Versión inicial v0.1.0 (F1). Carga catálogos, valida y envía. Test e2e OK.
