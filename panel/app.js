// app.js — Panel Edwin (Grupo Imar, F2-A).
// Sin frameworks. Vanilla JS, ES2020.

(function () {
  'use strict';

  const cfg = window.IMAR_PANEL_CONFIG;
  if (!cfg) { console.error('IMAR_PANEL_CONFIG no cargado'); return; }

  // ---------- Estado global ----------
  let TOKEN = null;
  let CATALOGOS = null;        // {maquinas, operarios, proveedores}
  let CONFIG_VALORES = null;   // {estados, prioridades, categorias, tipos_fallo, motivos_fallo, origen_intervencion}
  let CACHE_LISTA = null;      // último listado cargado
  let CACHE_INC   = null;      // incidencia actual en ficha
  let CACHE_HIST  = null;      // historial de la incidencia actual
  let CACHE_COM   = null;      // comentarios de la incidencia actual

  const FILTRO_ACTUAL = { kind: 'activas', q: '' };

  // Listas de enums (las leo de catálogos que vienen del workflow CATALOGOS)
  // Nota: CATALOGOS no incluye estos enums. Los voy a leer del Sheet config con
  // un endpoint adicional o los hardcodeo aquí (aceptable, son listas estables).
  // Decisión: hardcodeo aquí para evitar 1 request extra, aceptando duplicación
  // de lista cerrada. Si se cambia en config debe sincronizarse aquí.
  const ENUMS = {
    estados:        ['Nueva','En curso','Pendiente de pieza','Pausada','Resuelta','Finalizada','Cancelada'],
    prioridades:    ['Baja','Media','Alta'],
    categorias:     ['Correctivo','Preventivo','Mejora'],
    tipos_fallo:    ['Mecánica','Eléctrica','Neumática','Hidráulica','Software/Control','Seguridad','Otra'],
    motivos_fallo:  ['Desgaste','Rotura','Accidente','Mal uso','Limpieza','Mantenimiento','Diseño'],
    origen_intervencion: ['Interno','Externo'],
  };

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const qs = (sel, ctx) => (ctx || document).querySelector(sel);
  const qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  const SCREENS = ['screen-loading', 'screen-auth-error', 'screen-lista', 'screen-ficha'];
  function showScreen(id) {
    SCREENS.forEach((s) => (s === id ? show(s) : hide(s)));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function authHeader() { return { 'Authorization': 'Bearer ' + TOKEN }; }

  function toast(msg, type = '') {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast ' + type;
    setTimeout(() => el.classList.add('hidden'), 10);
    requestAnimationFrame(() => {
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 3500);
    });
  }

  function fmtFecha(s) {
    if (!s) return '';
    return s.replace('T', ' ').slice(0, 16);
  }

  // ---------- API ----------
  async function apiGet(endpoint, params) {
    const url = new URL(cfg.API_BASE + endpoint);
    if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.append(k, v));
    const r = await fetch(url, { method: 'GET', headers: authHeader() });
    return await parseResp(r);
  }
  async function apiPost(endpoint, body, params) {
    const url = new URL(cfg.API_BASE + endpoint);
    if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.append(k, v));
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : '{}',
    });
    return await parseResp(r);
  }
  async function apiPatch(endpoint, body, params) {
    const url = new URL(cfg.API_BASE + endpoint);
    if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.append(k, v));
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : '{}',
    });
    return await parseResp(r);
  }
  async function parseResp(r) {
    let data;
    try { data = await r.json(); } catch { data = {}; }
    return { ok: r.ok, status: r.status, data };
  }

  // ---------- Auth ----------
  async function autenticar() {
    // 1. Buscar key en URL ?k=
    const url = new URL(window.location.href);
    const k = url.searchParams.get('k');

    if (k) {
      // Validar y guardar
      TOKEN = k;
      const r = await apiPost(cfg.ENDPOINTS.AUTH);
      if (r.ok && r.data && r.data.success) {
        localStorage.setItem(cfg.LS_TOKEN_KEY, k);
        // Limpiar la URL para no exponer la key en el hash compartido
        url.searchParams.delete('k');
        window.history.replaceState({}, '', url.pathname + (url.hash || ''));
        return true;
      } else {
        TOKEN = null;
        return false;
      }
    }

    // 2. Si no hay key en URL, buscar en localStorage
    const stored = localStorage.getItem(cfg.LS_TOKEN_KEY);
    if (!stored) return false;
    TOKEN = stored;
    // Validar (revalidar siempre — si Eric ha rotado la key, hay que detectarlo)
    const r = await apiPost(cfg.ENDPOINTS.AUTH);
    if (!r.ok || !r.data || !r.data.success) {
      localStorage.removeItem(cfg.LS_TOKEN_KEY);
      TOKEN = null;
      return false;
    }
    return true;
  }

  // ---------- Catálogos ----------
  async function cargarCatalogos() {
    const r = await apiGet(cfg.ENDPOINTS.CATALOGOS);
    if (!r.ok || !r.data || !r.data.success) throw new Error('No se pudieron cargar catálogos');
    CATALOGOS = r.data;
  }

  function lookupMaquina(id) {
    return CATALOGOS && CATALOGOS.maquinas.find((m) => m.id_maquina === id);
  }
  function lookupOperario(id) {
    return CATALOGOS && CATALOGOS.operarios.find((o) => o.id_operario === id);
  }

  // ---------- Router ----------
  function parseHash() {
    const h = (window.location.hash || '#/lista').slice(1);
    const m = h.match(/^\/incidencia\/([^/?]+)$/);
    if (m) return { route: 'ficha', id: decodeURIComponent(m[1]) };
    return { route: 'lista' };
  }
  function navigate(path) { window.location.hash = path; }
  function onHashChange() { dispatch(); }

  async function dispatch() {
    const r = parseHash();
    if (r.route === 'ficha') {
      await renderFicha(r.id);
    } else {
      await renderLista();
    }
  }

  // ---------- Lista ----------
  async function renderLista() {
    showScreen('screen-lista');
    $('lista-meta').textContent = 'Cargando…';
    $('lista-incidencias').innerHTML = '';
    hide('lista-vacia');

    const params = {};
    if (FILTRO_ACTUAL.kind === 'activas') {
      // por defecto el endpoint excluye terminales
    } else if (FILTRO_ACTUAL.kind === 'todas') {
      params.include_terminales = 'true';
    } else if (FILTRO_ACTUAL.kind === 'cerradas') {
      params.estado = 'Finalizada,Cancelada,Resuelta';
    }
    if (FILTRO_ACTUAL.q) params.q = FILTRO_ACTUAL.q;

    const r = await apiGet(cfg.ENDPOINTS.LIST, params);
    if (!r.ok || !r.data || !r.data.success) {
      $('lista-meta').textContent = 'Error: ' + (r.data?.detalle || r.status);
      return;
    }
    CACHE_LISTA = r.data.items || [];
    $('lista-meta').textContent = `${r.data.returned} de ${r.data.total} incidencias`;

    if (CACHE_LISTA.length === 0) {
      show('lista-vacia');
      return;
    }

    const cont = $('lista-incidencias');
    cont.innerHTML = '';
    CACHE_LISTA.forEach((it) => cont.appendChild(renderTarjeta(it)));
  }

  function renderTarjeta(it) {
    const el = document.createElement('div');
    el.className = 'tarjeta estado-' + (it.estado || 'Nueva').replace(/\s+/g, '-');
    el.dataset.id = it.id_incidencia;
    el.innerHTML = `
      <div class="tarjeta-row1">
        <span class="tarjeta-id">${escapeHtml(it.id_incidencia)}</span>
        <span class="badge estado-${(it.estado || 'Nueva').replace(/\s+/g,'-')}">${escapeHtml(it.estado || '—')}</span>
      </div>
      <p class="tarjeta-titulo">${escapeHtml(it.descripcion || '(sin descripción)')}</p>
      <div class="tarjeta-row2">
        <span><strong>${escapeHtml((lookupMaquina(it.id_maquina) || {}).nombre || it.id_maquina)}</strong></span>
        <span>${escapeHtml((lookupOperario(it.id_operario) || {}).nombre || it.id_operario)}</span>
        ${it.maquina_parada === 'Sí' ? '<span style="color:#b34c00;font-weight:600;">⏸ parada</span>' : ''}
        ${it.prioridad ? '<span class="badge prioridad ' + escapeHtml(it.prioridad) + '">' + escapeHtml(it.prioridad) + '</span>' : ''}
        <span style="margin-left:auto;color:#5b6371;">${fmtFecha(it.fecha_creacion)}</span>
      </div>
    `;
    el.addEventListener('click', () => navigate('/incidencia/' + encodeURIComponent(it.id_incidencia)));
    return el;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- Ficha ----------
  async function renderFicha(id) {
    showScreen('screen-loading');
    const r = await apiGet(cfg.ENDPOINTS.GET, { id });
    if (!r.ok || !r.data || !r.data.success) {
      toast(r.data?.detalle || 'No se pudo cargar la incidencia', 'error');
      navigate('/lista');
      return;
    }
    CACHE_INC  = r.data.incidencia;
    CACHE_HIST = r.data.historial || [];
    CACHE_COM  = r.data.comentarios || [];
    rellenarFicha(CACHE_INC);
    rellenarHistorial(CACHE_HIST);
    rellenarComentarios(CACHE_COM);
    showScreen('screen-ficha');
  }

  function poblarSelect(sel, valores, current, placeholder) {
    sel.innerHTML = '';
    if (placeholder !== undefined) {
      const o = document.createElement('option');
      o.value = ''; o.textContent = placeholder;
      sel.appendChild(o);
    }
    valores.forEach((v) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = v;
      if (v === current) o.selected = true;
      sel.appendChild(o);
    });
    if (current && !valores.includes(current)) {
      // Si el valor actual no está en la lista (datos legacy), lo añadimos
      const o = document.createElement('option');
      o.value = current; o.textContent = current; o.selected = true;
      sel.appendChild(o);
    }
  }

  function poblarSelectProveedores(current) {
    const sel = $('ed-proveedor_id');
    sel.innerHTML = '';
    const o = document.createElement('option');
    o.value = ''; o.textContent = '— sin asignar —';
    sel.appendChild(o);
    (CATALOGOS.proveedores || []).forEach((p) => {
      const op = document.createElement('option');
      op.value = p.id_proveedor;
      op.textContent = p.nombre + (p.especialidad ? ' — ' + p.especialidad : '');
      if (p.id_proveedor === current) op.selected = true;
      sel.appendChild(op);
    });
    if (current && !(CATALOGOS.proveedores || []).find((p) => p.id_proveedor === current)) {
      const op = document.createElement('option');
      op.value = current; op.textContent = current; op.selected = true;
      sel.appendChild(op);
    }
  }

  function rellenarFicha(inc) {
    $('ficha-id').textContent = inc.id_incidencia;
    $('ficha-fecha').textContent = fmtFecha(inc.fecha_creacion);
    $('ficha-operario').textContent = (lookupOperario(inc.id_operario) || {}).nombre || inc.id_operario;

    const eb = $('ficha-estado-badge');
    eb.textContent = inc.estado || '—';
    eb.className = 'badge estado-' + (inc.estado || 'Nueva').replace(/\s+/g, '-');

    const pb = $('ficha-prioridad-badge');
    if (inc.prioridad) {
      pb.textContent = inc.prioridad;
      pb.className = 'badge prioridad ' + inc.prioridad;
      pb.style.display = '';
    } else {
      pb.style.display = 'none';
    }

    // Read-only
    const maq = lookupMaquina(inc.id_maquina);
    $('ro-maquina').textContent = maq ? `${maq.nombre} (${maq.id_maquina})` : inc.id_maquina;
    $('ro-departamento').textContent = (maq && maq.departamento) || '—';
    $('ro-parada').textContent = inc.maquina_parada === 'Sí' ? 'Sí, parada' : 'No';
    $('ro-descripcion').textContent = inc.descripcion || '—';
    $('ro-observaciones-op').textContent = inc.observaciones || '—';

    // Editables
    poblarSelect($('ed-categoria'), ENUMS.categorias, inc.categoria);
    poblarSelect($('ed-tipo_fallo'), ENUMS.tipos_fallo, inc.tipo_fallo);
    poblarSelect($('ed-motivo_fallo'), ENUMS.motivos_fallo, inc.motivo_fallo, '— sin asignar —');
    poblarSelect($('ed-prioridad'), ENUMS.prioridades, inc.prioridad, '— sin asignar —');
    poblarSelect($('ed-estado'), ENUMS.estados, inc.estado);

    // Origen intervencion (toggle)
    const origenActual = inc.origen_intervencion || 'Interno';
    $('ed-origen_intervencion').value = origenActual;
    qsa('button[data-name="origen_intervencion"]').forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.value === origenActual ? 'true' : 'false')
    );
    poblarSelectProveedores(inc.proveedor_id || '');
    actualizarVisibilidadProveedor();

    // Solvendo (toggle)
    $('ed-solvendo').value = inc.solvendo || '';
    qsa('button[data-name="solvendo"]').forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.value === inc.solvendo ? 'true' : 'false')
    );

    $('ed-fecha_inicio_intervencion').value = toLocalDt(inc.fecha_inicio_intervencion);
    $('ed-fecha_fin_intervencion').value = toLocalDt(inc.fecha_fin_intervencion);
    $('ed-descripcion_trabajo_realizado').value = inc.descripcion_trabajo_realizado || '';
    $('ed-trabajo_pendiente').value = inc.trabajo_pendiente || '';
    $('ed-observaciones').value = inc.observaciones || '';
    $('ed-comentario_estado').value = '';

    // Hint prioridad sugerida
    const hint = $('hint-prioridad-sugerida');
    if (inc.prioridad_sugerida && !inc.prioridad) {
      hint.textContent = 'Sugerida automáticamente: ' + inc.prioridad_sugerida + '. Confirma o cambia.';
    } else {
      hint.textContent = '';
    }

    // Botón cancelar deshabilitado si ya está cancelada
    const btnCancelar = $('btn-cancelar-incidencia');
    if (inc.estado === 'Cancelada') {
      btnCancelar.disabled = true;
      btnCancelar.textContent = 'Ya cancelada';
    } else {
      btnCancelar.disabled = false;
      btnCancelar.textContent = 'Cancelar incidencia';
    }

    hide('ficha-error');
  }

  function rellenarComentarios(coms) {
    const ul = $('lista-comentarios');
    ul.innerHTML = '';
    if (!coms || coms.length === 0) {
      ul.innerHTML = '<li class="t">Sin comentarios.</li>';
      return;
    }
    coms.forEach((c) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="t">${fmtFecha(c.fecha)} · ${escapeHtml(c.autor || 'edwin')}</div>
        <p class="texto">${escapeHtml(c.texto || '')}</p>
      `;
      ul.appendChild(li);
    });
  }

  async function anadirComentario() {
    if (!CACHE_INC) return;
    const ta = $('com-texto');
    const texto = ta.value.trim();
    const errBox = $('com-error');
    errBox.classList.add('hidden');

    if (texto.length < 3) {
      errBox.textContent = 'Texto obligatorio (mínimo 3 caracteres).';
      errBox.classList.remove('hidden');
      return;
    }

    const btn = $('btn-add-comentario');
    btn.disabled = true;
    const prev = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>Añadiendo…';

    const r = await apiPost(cfg.ENDPOINTS.COMENTARIO_CREATE, { texto }, { id: CACHE_INC.id_incidencia });

    btn.disabled = false;
    btn.textContent = prev;

    if (r.ok && r.data && r.data.success && r.data.comentario) {
      ta.value = '';
      // Append optimista (evita un GET extra)
      CACHE_COM.push(r.data.comentario);
      rellenarComentarios(CACHE_COM);
      toast('Comentario añadido', 'success');
    } else {
      errBox.textContent = (r.data && r.data.detalle) || ('HTTP ' + r.status);
      errBox.classList.remove('hidden');
      toast('Error al añadir comentario', 'error');
    }
  }

  function rellenarHistorial(hist) {
    const ul = $('lista-historial');
    ul.innerHTML = '';
    if (!hist || hist.length === 0) {
      ul.innerHTML = '<li class="t">Sin eventos registrados.</li>';
      return;
    }
    hist.forEach((h) => {
      const li = document.createElement('li');
      const arrow = h.estado_anterior ? `${escapeHtml(h.estado_anterior)} → ${escapeHtml(h.estado_nuevo)}` : escapeHtml(h.estado_nuevo);
      li.innerHTML = `
        <div class="t">${fmtFecha(h.fecha_evento)} · ${escapeHtml(h.actor)}</div>
        <span class="e">${arrow}</span>
        ${h.comentario ? '<span>' + escapeHtml(h.comentario) + '</span>' : ''}
      `;
      ul.appendChild(li);
    });
  }

  function toLocalDt(s) {
    if (!s) return '';
    // s = 'YYYY-MM-DD HH:MM:SS' → input datetime-local quiere 'YYYY-MM-DDTHH:MM'
    return s.replace(' ', 'T').slice(0, 16);
  }
  function fromLocalDt(s) {
    if (!s) return '';
    return s.replace('T', ' ') + ':00';
  }

  function actualizarVisibilidadProveedor() {
    const origen = $('ed-origen_intervencion').value;
    $('campo-proveedor').style.display = origen === 'Externo' ? '' : 'none';
  }

  // ---------- Save ----------
  async function guardarCambios(e) {
    e.preventDefault();
    if (!CACHE_INC) return;

    const cambios = {};
    const FIELDS = [
      'categoria','tipo_fallo','motivo_fallo','prioridad','estado',
      'origen_intervencion','proveedor_id','solvendo','trabajo_pendiente','observaciones',
      'descripcion_trabajo_realizado',
    ];
    FIELDS.forEach((k) => {
      const el = $('ed-' + k);
      if (!el) return;
      let v = el.value;
      const orig = CACHE_INC[k] || '';
      if (v !== orig) cambios[k] = v;
    });

    // Datetime fields
    ['fecha_inicio_intervencion', 'fecha_fin_intervencion'].forEach((k) => {
      const el = $('ed-' + k);
      const v = el.value ? fromLocalDt(el.value) : '';
      const orig = CACHE_INC[k] || '';
      if (v !== orig) cambios[k] = v;
    });

    if (Object.keys(cambios).length === 0) {
      toast('No hay cambios para guardar');
      return;
    }

    // Si cambia estado y hay comentario_estado, lo enviamos también
    const com = $('ed-comentario_estado').value.trim();
    if (com && cambios.estado !== undefined) cambios.comentario_estado = com;

    const btn = $('btn-guardar');
    btn.disabled = true;
    const prev = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>Guardando…';

    const r = await apiPatch(cfg.ENDPOINTS.UPDATE, cambios, { id: CACHE_INC.id_incidencia });
    btn.disabled = false;
    btn.textContent = prev;

    if (r.ok && r.data && r.data.success) {
      toast('Cambios guardados', 'success');
      // Refrescar ficha
      await renderFicha(CACHE_INC.id_incidencia);
    } else {
      const detalle = (r.data && r.data.detalle) || ('HTTP ' + r.status);
      $('ficha-error').textContent = detalle;
      $('ficha-error').classList.remove('hidden');
      toast('Error al guardar', 'error');
    }
  }

  // ---------- Cancelación ----------
  function abrirModalCancelar() {
    $('modal-motivo').value = '';
    $('modal-error').classList.add('hidden');
    show('modal-cancelar');
  }
  function cerrarModalCancelar() {
    hide('modal-cancelar');
  }
  async function confirmarCancelacion() {
    const motivo = $('modal-motivo').value.trim();
    if (motivo.length < 3) {
      $('modal-error').textContent = 'Motivo obligatorio (mínimo 3 caracteres).';
      $('modal-error').classList.remove('hidden');
      return;
    }
    const btn = $('btn-modal-confirmar');
    btn.disabled = true;
    const prev = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>Cancelando…';

    const r = await apiPost(cfg.ENDPOINTS.CANCEL, { motivo_cancelacion: motivo }, { id: CACHE_INC.id_incidencia });

    btn.disabled = false;
    btn.textContent = prev;

    if (r.ok && r.data && r.data.success) {
      cerrarModalCancelar();
      toast('Incidencia cancelada', 'success');
      await renderFicha(CACHE_INC.id_incidencia);
    } else {
      $('modal-error').textContent = (r.data && r.data.detalle) || ('HTTP ' + r.status);
      $('modal-error').classList.remove('hidden');
    }
  }

  // ---------- Init ----------
  async function init() {
    $('ver').textContent = cfg.VERSION;

    // Tabs filtros
    qsa('.tabs button[data-filter]').forEach((b) => {
      b.addEventListener('click', () => {
        FILTRO_ACTUAL.kind = b.dataset.filter;
        qsa('.tabs button[data-filter]').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        renderLista();
      });
    });
    $('busqueda').addEventListener('input', debounce(() => {
      FILTRO_ACTUAL.q = $('busqueda').value.trim();
      renderLista();
    }, 350));
    $('btn-refresh').addEventListener('click', () => renderLista());

    // Volver a lista
    $('btn-volver-lista').addEventListener('click', () => navigate('/lista'));

    // Toggles (origen + solvendo)
    qsa('.toggle button[data-name][data-value]').forEach((b) => {
      b.addEventListener('click', () => {
        const name = b.dataset.name;
        // Desmarcar los hermanos del mismo grupo
        qsa('.toggle button[data-name="' + name + '"]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        $('ed-' + name).value = b.dataset.value;
        if (name === 'origen_intervencion') actualizarVisibilidadProveedor();
      });
    });

    // Form save
    $('form-edicion').addEventListener('submit', guardarCambios);

    // Cancelar incidencia
    $('btn-cancelar-incidencia').addEventListener('click', abrirModalCancelar);
    $('btn-modal-volver').addEventListener('click', cerrarModalCancelar);
    $('btn-modal-confirmar').addEventListener('click', confirmarCancelacion);

    // Comentarios
    $('btn-add-comentario').addEventListener('click', anadirComentario);

    // Hash routing
    window.addEventListener('hashchange', onHashChange);

    // Auth + carga catálogos
    showScreen('screen-loading');
    const ok = await autenticar();
    if (!ok) { showScreen('screen-auth-error'); return; }
    try {
      await cargarCatalogos();
    } catch (e) {
      showScreen('screen-auth-error');
      $('auth-error-detalle').textContent = 'No se han podido cargar los datos. Reintenta en unos segundos.';
      return;
    }

    // Default route
    if (!window.location.hash) navigate('/lista');
    dispatch();
  }

  function debounce(fn, ms) {
    let t;
    return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  }

  document.addEventListener('DOMContentLoaded', init);
})();
