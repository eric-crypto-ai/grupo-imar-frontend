// config.js — Variables del panel Edwin.
//
// Auth: dos modos co-existentes (D-USR-13 modo dual, F-AUTH A3 2026-05-11):
//   - JWT (D-USR-15): preferente desde A3. Login con usuario+contraseña → token en localStorage[LS_JWT_KEY].
//   - panel_key (D2.2, legacy): viene en la URL (?k=...) la primera vez, se guarda en localStorage[LS_TOKEN_KEY].
//     Mantenido por compatibilidad hasta que Eric rote la panel_key en A4.

window.IMAR_PANEL_CONFIG = {
  API_BASE: 'https://primary-production-2cf7.up.railway.app',
  ENDPOINTS: {
    // --- F-AUTH (D-USR-13/15) ---
    AUTH_LOGIN:          '/webhook/imar/auth/login',
    AUTH_ME:             '/webhook/imar/auth/me',
    AUTH_CAMBIO_PWD:     '/webhook/imar/auth/cambio-password',
    // --- Legacy panel_key validator (D2.2) ---
    AUTH:                '/webhook/imar/panel/auth',
    // --- Catálogos + config ---
    CATALOGOS:           '/webhook/imar/catalogos',
    CONFIG:              '/webhook/imar/config',
    CONFIG_PATCH:        '/webhook/imar/config',
    // --- Incidencias ---
    LIST:                '/webhook/imar/panel/incidencias',
    GET:                 '/webhook/imar/panel/incidencia',
    UPDATE:              '/webhook/imar/panel/incidencia',
    CANCEL:              '/webhook/imar/panel/incidencia/cancel',
    COMENTARIO_CREATE:   '/webhook/imar/panel/comentario',
    INCIDENCIA_CREATE:   '/webhook/imar/panel/incidencia/create',
    // --- Piezas ---
    PIEZAS_LIST:         '/webhook/imar/panel/piezas',
    PIEZA_GET:           '/webhook/imar/panel/pieza',
    PIEZA_MOVIMIENTO:    '/webhook/imar/panel/pieza/movimiento',
    PIEZA_CREATE:        '/webhook/imar/panel/pieza',
    PIEZA_UPDATE:        '/webhook/imar/panel/pieza',
  },
  LS_TOKEN_KEY: 'imar_panel_token',  // legacy panel_key
  LS_JWT_KEY:   'imar_jwt',          // F-AUTH A3 — JWT firmado HS256
  VERSION: '0.8.0',
  LS_FORCE_HARD_KEY: 'imar_force_hard_token',
};
