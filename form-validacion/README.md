# /form/ — Formulario operario (F1)

Frontend móvil para que el operario registre incidencias de mantenimiento.

- **URL desplegada:** https://eric-crypto-ai.github.io/grupo-imar-frontend/form/
- **Fase:** F1 (MVP).
- **Documentación técnica:** vault Obsidian → `01 Documentación/Arquitectura/03. Arquitectura del sistema — Grupo Imar.md`.

## Stack

HTML/CSS/JS estático. Sin frameworks (P9 — mobile-first, carga rápida, sin dependencias). Servido por GitHub Pages.

```
form/
├── index.html      Markup + 5 pantallas (loading / form / sending / success / error)
├── styles.css      Mobile-first, target táctil ≥ 44 px
├── app.js          Lógica: carga catálogos, valida cliente, POST a n8n
└── config.js       API_BASE + WEBHOOK_TOKEN (público — repo público, BKL-021)
```

## Flujo

1. **Al cargar:** `GET /webhook/imar/catalogos` con Bearer token → puebla `<select>` operario y máquina (agrupada por departamento).
2. **Operario rellena:**
   - Operario (lista cerrada, 23 nombres)
   - Máquina (lista cerrada, 15 máquinas agrupadas por LAM/MAS/SER/EST/TRO/VEN/ENG)
   - ¿Máquina parada? Toggle Sí/No
   - Descripción (texto libre, mínimo 5 caracteres)
   - Observaciones (opcional)
3. **Al enviar:** `POST /webhook/imar/nueva-incidencia` → muestra pantalla "enviando…".
4. **Resultado:**
   - 200 OK → pantalla con `INC-YYYY-NNNN` + "Edwin ha sido avisado".
   - 401 / 400 / red → pantalla de error con detalle + botones reintentar/volver.

El operario no rellena `categoría`, `tipo_fallo`, `motivo_fallo` ni `prioridad` (decisión D-EXC-1 + P4 actualizado).

## Endpoints consumidos

Workflows en n8n:

- `IMAR_FORM_CATALOGOS_LIST` (`Dr2ROIdb1hbUYVTY`) — GET catálogos vivos.
- `IMAR_FORM_INCIDENCIA` v0.2.1 (`A1SJzjjJvd4wXJzI`) — POST creación.

## Test local

Es estático, basta con abrir `index.html` en el navegador (o servir con `python3 -m http.server 8000`).

```bash
cd form && python3 -m http.server 8000
# abrir http://localhost:8000
```

## Token y seguridad

`config.js` contiene `WEBHOOK_TOKEN`. Es **público de facto** (repo público, sitio público). Decisión D2.1 + BKL-021.

- **Rotar token:** cambiar valor en hoja `config` del Sheet v2 (clave `webhook_token_form`) + actualizar `config.js` + commit + push.
- **Revocación urgente:** desactivar `IMAR_FORM_INCIDENCIA` en n8n (corta cualquier llamada).

Mitigación pendiente: BKL-006 rate-limit aplicativo en n8n (F2).
