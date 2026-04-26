# form/ — Formulario móvil del operario

Formulario que el operario rellena desde el móvil para crear una incidencia de mantenimiento.

## Acceso

URL: https://eric-crypto-ai.github.io/grupo-imar-frontend/form/

A partir de F4: cada máquina tendrá un QR físico apuntando a `/form/?maquina=MAQ-XXX` que precarga el campo máquina.

## Diseño

Mobile-first, sin login (P3 de principios + ADR D2.1). Pocos campos obligatorios. Listas cerradas en máquinas, operarios, tipos.

## Modelo de datos consumido

Escribe a la hoja `incidencias` del Sheet vía webhook n8n. Ver:
- `03 Stack de herramientas/Plataformas/Google/modelo_datos_sheet.md` (vault Obsidian, pendiente)
- Workflow `IMAR_FORM_INCIDENCIA` en n8n (pendiente)

## Estado

Placeholder. Se construye en F1.
