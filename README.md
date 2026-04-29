# grupo-imar-frontend

Monorepo de frontends del sistema interno de gestión de incidencias de mantenimiento de **Grupo Imar**.

## Estructura

```
.
├── form-validacion/   Formulario móvil para operarios. Crea incidencias. (F1)
├── panel/             Panel móvil para Edwin. Gestiona ciclo de vida + piezas + stock. (F2-A/B + F6-A/B)
└── docs/              Punteros a la documentación del proyecto (Obsidian).
```

> El formulario está montado en `/form-validacion/` (no `/form/`) durante la fase de validación previa con Eric, antes de exponerlo al operario en planta. Ver [form-validacion/README.md](form-validacion/README.md).

## URLs (GitHub Pages)

- Formulario operario: https://eric-crypto-ai.github.io/grupo-imar-frontend/form-validacion/
- Panel Edwin:         https://eric-crypto-ai.github.io/grupo-imar-frontend/panel/?k=&lt;panel_key&gt;

## Estado

Hito **2026-04-28**: F1 + F2-A/B + F6-A/B desplegadas e2e. Cierre formal de cada fase pendiente sólo de validación de uso real por Edwin.

| Fase | Componente | Versión desplegada | Estado |
|---|---|---|---|
| F1 | Formulario operario | form `v0.1.1` | 🟢 Desplegado · pendiente ≥ 1 semana de uso real |
| F2-A | Panel — núcleo (lista, ficha, edición, cancelación) | panel `v0.1.0` → integrado en `v0.4.1` | 🟢 Desplegado · pendiente validación móvil Edwin |
| F2-B | Panel — comentarios cronológicos + creación manual + cron Telegram | panel `v0.2.x` → integrado en `v0.4.1` | 🟢 Desplegado · primer cron OK 2026-04-28 |
| F2-C | Panel — dashboard, polling, BKL plataforma | — | ⏸ Pendiente ≥ 1 semana F2-A/B |
| F6-A | Panel — catálogo de piezas (lectura) | panel `v0.3.0` → integrado en `v0.4.1` | 🟢 Desplegado |
| F6-B | Panel — movimientos de stock + bloqueo de incidencias por pieza | panel `v0.4.0` → cache-bust `v0.4.1` | 🟢 Desplegado |
| F6-C | Panel — alertas + refinamiento `stock_min` | — | ⏸ Pendiente ≥ 2 semanas F6-B |
| F3, F4, F5, F7, F8 | — | — | ⏸ Backlog |

Detalle vivo y criterios de cierre en el roadmap del vault.

## Stack

- HTML/CSS/JS estático **sin frameworks** (P9 — mobile-first, carga rápida, sin dependencias).
- GitHub Pages para hosting (provisional, decisión final de hosting pendiente).
- **n8n** como única capa de escritura/lectura (P7) — los frontends nunca tocan Sheets directamente.
- Google Sheets como BBDD operativa (`Grupo Imar - Mantenimiento`, 11 hojas).
- Telegram para notificaciones (sólo eventos de P11).

## Documentación

Fuente de verdad técnica → vault Obsidian privado del proyecto:

- Documento maestro de contexto · `01 Documentación/01. Documento maestro de contexto — Grupo Imar.md`
- Principios de diseño y reglas del sistema · `01 Documentación/02. Principios de diseño y reglas del sistema.md`
- Arquitectura · `01 Documentación/Arquitectura/decisiones_arquitectura.md`
- Roadmap · `02 Roadmap/roadmap_general.md`
- Manual operativo Edwin (F6) · `06 Operativa Grupo Imar/manual_uso_piezas_edwin.md`

## Despliegue

Push a `main` → GitHub Pages despliega automáticamente. Coordinar `?v=<version>` en `index.html` con `cfg.VERSION` en `config.js` para cache-busting al hacer release (ver panel `v0.4.1` como referencia, BKL-022).

## Convenciones de versión

`config.js → cfg.VERSION` es la fuente de verdad de la versión desplegada de cada frontend. Se muestra en pantalla (footer/debug) y debe coincidir con el `?v=` de `index.html`.
