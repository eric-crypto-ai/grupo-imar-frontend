// demo-mode.js — Modo demo del panel.
//
// Activación (dos vías, sin persistir entre sesiones):
//   1) querystring ?demo=1 — uso manual, dura sólo mientras el qs esté en
//      la URL. Si recargas sin él, vuelve al modo real. Útil para probar
//      el demo desde el panel real sin contaminar el login de Edwin.
//   2) path /demo — usado por el rewrite Vercel intralogik.com/demo. Se
//      detecta en cada carga, así que sigue activo mientras el visitante
//      navegue dentro del path /demo.
//
// Funciona interceptando window.fetch ANTES de que se cargue app.js, así que
// el panel real no se modifica — sigue creyendo que habla con el backend n8n.
//
// NUNCA toca Sheets, ni n8n, ni los tokens reales de Grupo Imar.
//
// Histórico: en versiones <= 0.7.1 el modo demo se persistía en localStorage
// con la idea de "no perderlo entre navegaciones". Eso atrapaba a Edwin: si
// alguna vez se entraba al panel real con ?demo=1, el flag quedaba pegado y
// las visitas posteriores activaban el demo aunque la URL fuera la de
// producción. Eliminada la persistencia en 0.7.2.

(function () {
  'use strict';

  // Limpieza one-shot del flag persistido por versiones <= 0.7.1. Sin esto,
  // los navegadores que tengan imar_panel_demo=1 en localStorage seguirían
  // viendo el modo demo en el panel real al recargar tras desplegar 0.7.2.
  localStorage.removeItem('imar_panel_demo');

  const url = new URL(window.location.href);
  const flagInUrl  = url.searchParams.get('demo') === '1';
  const flagInPath = /(^|\/)demo(\/|$)/.test(window.location.pathname);

  if (!flagInUrl && !flagInPath) return;

  window.IMAR_DEMO = true;

  // Bypass de auth — el panel real busca un token en localStorage; le damos
  // uno ficticio para que apiPost(AUTH) llegue y nuestro interceptor responda OK.
  localStorage.setItem('imar_panel_token', 'demo-token');

  // ---------- Interceptor de fetch ----------
  const origFetch = window.fetch.bind(window);
  const HOST_INTRA = 'primary-production-2cf7.up.railway.app';

  window.fetch = async function (input, init) {
    // input puede ser string, URL, o Request — aceptar los tres.
    const reqUrl = typeof input === 'string'
      ? input
      : (input instanceof URL ? input.href : (input && input.url) || String(input));
    let parsed;
    try { parsed = new URL(reqUrl); } catch { return origFetch(input, init); }

    if (parsed.hostname !== HOST_INTRA || !parsed.pathname.startsWith('/webhook/imar/')) {
      return origFetch(input, init);
    }

    // Pequeña latencia para que el spinner se vea natural en las screenshots.
    await new Promise((r) => setTimeout(r, 80));

    const method = (init && init.method) || 'GET';
    const path   = parsed.pathname;
    const params = Object.fromEntries(parsed.searchParams.entries());
    const body   = (init && init.body) ? safeJson(init.body) : null;
    const data   = window.IMAR_DEMO_DATA;
    if (!data) return jsonResponse(500, { success: false, error: 'demo-data no cargado' });

    // ---- AUTH ----
    if (path === '/webhook/imar/panel/auth')        return jsonResponse(200, data.auth());

    // ---- CATÁLOGOS / CONFIG ----
    if (path === '/webhook/imar/catalogos')         return jsonResponse(200, data.catalogos());
    if (path === '/webhook/imar/config' && method === 'GET')   return jsonResponse(200, data.config());
    if (path === '/webhook/imar/config' && method === 'PATCH') return jsonResponse(200, { success: true, updated: body });

    // ---- INCIDENCIAS ----
    if (path === '/webhook/imar/panel/incidencias') {
      return jsonResponse(200, data.listIncidencias({ kind: params.kind, q: params.q }));
    }
    if (path === '/webhook/imar/panel/incidencia' && method === 'GET') {
      return jsonResponse(200, data.getIncidencia(params.id));
    }
    if (path === '/webhook/imar/panel/incidencia' && method === 'PATCH') {
      return jsonResponse(200, { success: true, updated: { id: params.id, ...body }, info: 'modo demo · cambios no se persisten' });
    }
    if (path === '/webhook/imar/panel/incidencia/cancel') {
      return jsonResponse(200, { success: true, cancelled: { id: params.id, motivo: body?.motivo_cancelacion } });
    }
    if (path === '/webhook/imar/panel/incidencia/create') {
      return jsonResponse(200, { success: true, id_incidencia: 'INC-DEM-NEW', info: 'modo demo' });
    }
    if (path === '/webhook/imar/panel/comentario') {
      return jsonResponse(200, { success: true, id_comentario: 'COM-DEM-NEW' });
    }

    // ---- PIEZAS ----
    if (path === '/webhook/imar/panel/piezas') {
      return jsonResponse(200, data.listPiezas(params));
    }
    if (path === '/webhook/imar/panel/pieza' && method === 'GET') {
      return jsonResponse(200, data.getPieza(params.id));
    }
    if (path === '/webhook/imar/panel/pieza' && method === 'POST') {
      return jsonResponse(200, { success: true, id_pieza: 'PZ-DEM-NEW' });
    }
    if (path === '/webhook/imar/panel/pieza' && method === 'PATCH') {
      return jsonResponse(200, { success: true });
    }
    if (path === '/webhook/imar/panel/pieza/movimiento') {
      return jsonResponse(200, { success: true, id_movimiento: 'MOV-DEM-NEW' });
    }

    // Fallback
    return jsonResponse(200, { success: true, info: 'modo demo · endpoint mockeado' });
  };

  function jsonResponse(status, payload) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  function safeJson(raw) { try { return JSON.parse(raw); } catch { return null; } }

  // ---------- Banner DOM ----------
  // Se inyecta cuando el DOM esté listo, para que aparezca en TODAS las screens.
  function inyectarBanner() {
    if (document.getElementById('demo-banner')) return;
    const b = document.createElement('div');
    b.id = 'demo-banner';
    b.setAttribute('role', 'status');
    b.innerHTML = `
      <strong>MODO DEMO</strong>
      <span class="dem-sep">·</span>
      <span>Datos ficticios de una PYME metalmecánica · los cambios no se guardan</span>
      <button type="button" id="demo-salir" aria-label="Salir del modo demo">Salir</button>
    `;
    document.body.insertBefore(b, document.body.firstChild);
    document.getElementById('demo-salir').addEventListener('click', () => {
      // Defensa en profundidad: limpia el residuo de versiones <= 0.7.1
      // donde el flag se persistía y podía atrapar al panel real.
      localStorage.removeItem('imar_panel_demo');
      localStorage.removeItem('imar_panel_token');
      // Si el path contiene /demo (intralogik.com/demo), redirige a la home
      // del producto. Si está en github.io o en otro contexto, recarga al
      // pathname (sin querystring) para que ?demo=1 no resucite el modo.
      if (/(^|\/)demo(\/|$)/.test(window.location.pathname)) {
        window.location.href = 'https://www.intralogik.com/';
      } else {
        window.location.href = window.location.pathname;
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inyectarBanner);
  } else {
    inyectarBanner();
  }

  // CSS del banner — inline para no añadir un fichero más.
  const css = document.createElement('style');
  css.textContent = `
    #demo-banner {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      padding: 0.55rem 0.85rem;
      background: #0d6efd;
      color: #fff;
      font-family: 'Geist', system-ui, -apple-system, sans-serif;
      font-size: 0.82rem;
      font-weight: 500;
      letter-spacing: 0.01em;
      box-shadow: 0 2px 6px rgba(13, 110, 253, 0.25);
    }
    #demo-banner strong { font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
    #demo-banner .dem-sep { opacity: 0.6; }
    #demo-banner span:not(.dem-sep) { opacity: 0.95; }
    #demo-banner button {
      margin-left: 0.4rem;
      background: rgba(255,255,255,0.18);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 4px;
      padding: 0.18rem 0.6rem;
      font: inherit;
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.12s;
    }
    #demo-banner button:hover  { background: rgba(255,255,255,0.32); }
    #demo-banner button:focus  { outline: 2px solid #fff; outline-offset: 1px; }
    @media (max-width: 540px) {
      #demo-banner { font-size: 0.76rem; gap: 0.35rem; padding: 0.45rem 0.55rem; flex-wrap: wrap; }
      #demo-banner span:not(.dem-sep) { flex: 1 1 100%; text-align: center; opacity: 0.92; font-size: 0.7rem; }
    }
  `;
  document.head.appendChild(css);

  console.info('[Intralogik] Modo demo activo · datos ficticios · cambios no se persisten');
})();
