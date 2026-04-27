// config.js — Variables del panel Edwin.
//
// El TOKEN no está aquí: viene en la URL (?k=...) la primera vez,
// se guarda en localStorage tras validación, y a partir de la 2ª visita
// se lee de localStorage.

window.IMAR_PANEL_CONFIG = {
  API_BASE: 'https://primary-production-2cf7.up.railway.app',
  ENDPOINTS: {
    AUTH:        '/webhook/imar/panel/auth',
    CATALOGOS:   '/webhook/imar/catalogos',           // reutilizado del form
    LIST:        '/webhook/imar/panel/incidencias',
    GET:         '/webhook/imar/panel/incidencia',     // ?id=
    UPDATE:      '/webhook/imar/panel/incidencia',     // PATCH ?id=
    CANCEL:      '/webhook/imar/panel/incidencia/cancel', // POST ?id=
    COMENTARIO_CREATE: '/webhook/imar/panel/comentario',  // POST ?id=
  },
  LS_TOKEN_KEY: 'imar_panel_token',
  VERSION: '0.2.0',
};
