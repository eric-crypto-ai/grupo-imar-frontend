// config.js — Variables del formulario operario.
//
// Repo público: el TOKEN aquí es accesible para cualquiera con la URL del sitio
// (decisión D2.1 + BKL-021). Se rota desde la hoja config del Sheet v2 cuando se necesite.
// Mitigación pendiente: BKL-006 rate-limit en n8n (F2).

window.IMAR_CONFIG = {
  API_BASE: 'https://primary-production-2cf7.up.railway.app',
  WEBHOOK_TOKEN: '46b2a3db8cfd515f92a8897cd667d50a4f23d7825a03a1373fb26e3ed8cbb363',
  ENDPOINTS: {
    CATALOGOS:  '/webhook/imar/catalogos',
    CONFIG:     '/webhook/imar/config',                // F2-C · BKL-032 B1 · parámetros + defaults
    INCIDENCIA: '/webhook/imar/nueva-incidencia',
  },
  // Versión del frontend, útil para comparar contra Sheet config.version_schema en debug.
  VERSION: '0.2.0',
};
