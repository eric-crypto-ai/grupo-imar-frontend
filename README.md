# grupo-imar-frontend

Monorepo de frontends del sistema interno de gestión de incidencias de mantenimiento de **Grupo Imar**.

## Estructura

```
.
├── form/    Formulario móvil para operarios. Crea incidencias.
├── panel/   Panel móvil para Edwin. Gestiona ciclo de vida.
└── docs/    Punteros a la documentación del proyecto (Obsidian).
```

## URLs (GitHub Pages)

- Formulario operario: https://eric-crypto-ai.github.io/grupo-imar-frontend/form/
- Panel Edwin:        https://eric-crypto-ai.github.io/grupo-imar-frontend/panel/

## Stack

- HTML/JS estático.
- GitHub Pages para hosting.
- n8n como capa de escritura/lectura (los frontends no tocan Sheets directamente).
- Google Sheets como BBDD.
- Telegram para notificaciones.

## Documentación

La fuente de verdad técnica vive en el vault de Obsidian del proyecto:

- Documento maestro: `01 Documentación/01. Documento maestro de contexto — Grupo Imar.md`
- Principios de diseño: `01 Documentación/02. Principios de diseño y reglas del sistema.md`
- Arquitectura: `01 Documentación/Arquitectura/decisiones_arquitectura.md`
- Roadmap: `02 Roadmap/roadmap_general.md`

## Despliegue

Push a `main` → GitHub Pages despliega automáticamente.

## Estado

MVP en construcción (F1 del roadmap). Hoy contiene placeholders para verificar el deploy.
