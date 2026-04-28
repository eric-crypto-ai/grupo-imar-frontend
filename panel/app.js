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
  let CACHE_PIEZAS_LISTA = null;  // último listado de piezas (F6-A)
  let CACHE_PIEZA = null;         // pieza actual en ficha (F6-A)
  let MODAL_MOV_CTX = null;       // contexto al abrir modal: { id_pieza, source: 'pieza'|'incidencia', id_incidencia? }

  const FILTRO_ACTUAL = { kind: 'activas', q: '' };
  const FILTRO_PIEZAS = { q: '', familia: '', id_maquina: '', stock_bajo: false };

  // F6-B: motivos válidos por tipo de movimiento.
  const MOTIVOS_POR_TIPO = {
    'Entrada':    ['Compra','Devolución_proveedor','Inventario','Otro'],
    'Salida':     ['Consumo','Roto','Inventario','Otro'],
    'Ajuste':     ['Inventario','Otro'],
    'Devolución': ['Devolución_proveedor','Otro'],
  };

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
    // F6-A: lista cerrada de tipos y familias de pieza (ver arquitectura §3.10).
    familias_pieza: ['Mecánica','Eléctrica','Neumática','Consumible','Fijación'],
  };

  // Mapeo familia → CSS class (sin acentos para clases CSS).
  function familiaCss(f) {
    const map = {'Mecánica':'Mecanica', 'Eléctrica':'Electrica', 'Neumática':'Neumatica', 'Consumible':'Consumible', 'Fijación':'Fijacion'};
    return map[f] || 'Otros';
  }

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const qs = (sel, ctx) => (ctx || document).querySelector(sel);
  const qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  const SCREENS = ['screen-loading', 'screen-auth-error', 'screen-lista', 'screen-ficha', 'screen-nueva', 'screen-piezas', 'screen-pieza'];
  function showScreen(id) {
    SCREENS.forEach((s) => (s === id ? show(s) : hide(s)));
    window.scrollTo({ top: 0, behavior: 'instant' });
    syncNavPrincipal(id);
  }

  function syncNavPrincipal(id) {
    // Mostrar nav solo en pantallas de listado (lista incidencias / piezas).
    const showNav = (id === 'screen-lista' || id === 'screen-piezas');
    const nav = $('nav-principal');
    if (!nav) return;
    nav.classList.toggle('hidden', !showNav);
    if (!showNav) return;
    const active = id === 'screen-piezas' ? 'piezas' : 'lista';
    qsa('#nav-principal button[data-nav]').forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.nav === active ? 'true' : 'false')
    );
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
    if (h === '/nueva') return { route: 'nueva' };
    if (h === '/piezas') return { route: 'piezas' };
    if (h === '/pedidos-pieza') return { route: 'pedidos' };
    const mInc = h.match(/^\/incidencia\/([^/?]+)$/);
    if (mInc) return { route: 'ficha', id: decodeURIComponent(mInc[1]) };
    const mPz = h.match(/^\/pieza\/([^/?]+)$/);
    if (mPz) return { route: 'pieza', id: decodeURIComponent(mPz[1]) };
    return { route: 'lista' };
  }
  function navigate(path) { window.location.hash = path; }
  function onHashChange() { dispatch(); }

  async function dispatch() {
    const r = parseHash();
    if (r.route === 'ficha') {
      await renderFicha(r.id);
    } else if (r.route === 'nueva') {
      renderNueva();
    } else if (r.route === 'piezas') {
      await renderPiezas();
    } else if (r.route === 'pedidos') {
      // Vista #/pedidos-pieza = piezas con filtro stock_bajo forzado.
      FILTRO_PIEZAS.stock_bajo = true;
      await renderPiezas();
      // Marcar el toggle UI también para que Edwin vea el filtro activo.
      const cb = $('piezas-stock-bajo'); if (cb) cb.checked = true;
    } else if (r.route === 'pieza') {
      await renderPieza(r.id);
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
    await rellenarPiezasConsumidas();
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

  // ---------- Nueva incidencia (manual desde panel) ----------
  function renderNueva() {
    showScreen('screen-nueva');

    poblarSelect($('nueva-categoria'), ENUMS.categorias, 'Preventivo');
    poblarSelect($('nueva-tipo_fallo'), ENUMS.tipos_fallo, '', '— sin asignar —');
    poblarSelect($('nueva-prioridad'), ENUMS.prioridades, '', '— se sugiere automática —');

    // Máquinas
    const selM = $('nueva-id_maquina');
    selM.innerHTML = '<option value="">— elige máquina —</option>';
    (CATALOGOS.maquinas || []).forEach((m) => {
      const o = document.createElement('option');
      o.value = m.id_maquina;
      o.textContent = m.nombre + (m.departamento ? ' (' + m.departamento + ')' : '');
      selM.appendChild(o);
    });

    // Operarios
    const selO = $('nueva-id_operario');
    selO.innerHTML = '<option value="">— elige operario —</option>';
    (CATALOGOS.operarios || []).forEach((o) => {
      const op = document.createElement('option');
      op.value = o.id_operario;
      op.textContent = o.nombre + (o.departamento_habitual ? ' (' + o.departamento_habitual + ')' : '');
      selO.appendChild(op);
    });

    // Proveedores
    const selP = $('nueva-proveedor_id');
    selP.innerHTML = '<option value="">— sin asignar —</option>';
    (CATALOGOS.proveedores || []).forEach((p) => {
      const op = document.createElement('option');
      op.value = p.id_proveedor;
      op.textContent = p.nombre + (p.especialidad ? ' — ' + p.especialidad : '');
      selP.appendChild(op);
    });

    // Reset toggles + form
    $('nueva-maquina_parada').value = 'No';
    qsa('button[data-name="nueva-maquina_parada"]').forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.value === 'No' ? 'true' : 'false'));
    $('nueva-origen_intervencion').value = 'Interno';
    qsa('button[data-name="nueva-origen_intervencion"]').forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.value === 'Interno' ? 'true' : 'false'));
    $('campo-nueva-proveedor').style.display = 'none';
    $('nueva-descripcion').value = '';
    $('nueva-observaciones').value = '';
    hide('nueva-error');
  }

  async function crearNueva(e) {
    e.preventDefault();
    const errBox = $('nueva-error');
    errBox.classList.add('hidden');

    const body = {
      id_maquina: $('nueva-id_maquina').value,
      id_operario: $('nueva-id_operario').value,
      descripcion: $('nueva-descripcion').value.trim(),
      maquina_parada: $('nueva-maquina_parada').value,
      categoria: $('nueva-categoria').value,
      tipo_fallo: $('nueva-tipo_fallo').value,
      prioridad: $('nueva-prioridad').value,
      origen_intervencion: $('nueva-origen_intervencion').value,
      observaciones: $('nueva-observaciones').value.trim(),
    };
    if (body.origen_intervencion === 'Externo') {
      body.proveedor_id = $('nueva-proveedor_id').value;
    }

    if (!body.id_maquina) { errBox.textContent = 'Elige una máquina.'; show('nueva-error'); return; }
    if (!body.id_operario) { errBox.textContent = 'Elige un operario.'; show('nueva-error'); return; }
    if (!body.descripcion || body.descripcion.length < 3) { errBox.textContent = 'Descripción obligatoria (mínimo 3 caracteres).'; show('nueva-error'); return; }

    const btn = $('btn-crear-nueva');
    btn.disabled = true;
    const prev = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>Creando…';

    const r = await apiPost(cfg.ENDPOINTS.INCIDENCIA_CREATE, body);

    btn.disabled = false;
    btn.textContent = prev;

    if (r.ok && r.data && r.data.success && r.data.id_incidencia) {
      toast('Creada: ' + r.data.id_incidencia, 'success');
      navigate('/incidencia/' + encodeURIComponent(r.data.id_incidencia));
    } else {
      errBox.textContent = (r.data && r.data.detalle) || ('HTTP ' + r.status);
      show('nueva-error');
      toast('Error al crear', 'error');
    }
  }

  // ---------- Piezas (F6-A) ----------

  function poblarFiltrosPiezas() {
    // Familias (lista cerrada).
    const selF = $('piezas-familia');
    if (selF.options.length <= 1) {
      ENUMS.familias_pieza.forEach((f) => {
        const o = document.createElement('option');
        o.value = f; o.textContent = f;
        selF.appendChild(o);
      });
    }
    // Máquinas (del catálogo).
    const selM = $('piezas-id_maquina');
    if (selM.options.length <= 1) {
      (CATALOGOS.maquinas || []).forEach((m) => {
        const o = document.createElement('option');
        o.value = m.id_maquina;
        o.textContent = m.nombre + (m.departamento ? ' (' + m.departamento + ')' : '');
        selM.appendChild(o);
      });
    }
  }

  async function renderPiezas() {
    showScreen('screen-piezas');
    poblarFiltrosPiezas();

    $('piezas-meta').textContent = 'Cargando…';
    $('lista-piezas').innerHTML = '';
    hide('piezas-vacia');

    const params = {};
    if (FILTRO_PIEZAS.q)          params.q = FILTRO_PIEZAS.q;
    if (FILTRO_PIEZAS.familia)    params.familia = FILTRO_PIEZAS.familia;
    if (FILTRO_PIEZAS.id_maquina) params.id_maquina = FILTRO_PIEZAS.id_maquina;
    if (FILTRO_PIEZAS.stock_bajo) params.stock_below_min = 'true';

    const r = await apiGet(cfg.ENDPOINTS.PIEZAS_LIST, params);
    if (!r.ok) {
      $('piezas-meta').textContent = 'Error: ' + (r.data?.error || r.status);
      return;
    }
    CACHE_PIEZAS_LISTA = r.data.items || [];
    $('piezas-meta').textContent = `${r.data.returned} de ${r.data.total} piezas`;

    if (CACHE_PIEZAS_LISTA.length === 0) {
      show('piezas-vacia');
      return;
    }

    const cont = $('lista-piezas');
    cont.innerHTML = '';
    CACHE_PIEZAS_LISTA.forEach((p) => cont.appendChild(renderTarjetaPieza(p)));
  }

  function renderTarjetaPieza(p) {
    const el = document.createElement('div');
    const fam = familiaCss(p.familia);
    const stockBajo = (p.stock_actual ?? 0) < (p.stock_minimo ?? 0);
    el.className = 'tarjeta-pieza familia-' + fam + (stockBajo ? ' stock-bajo' : '');
    el.dataset.id = p.id_pieza;

    const stockClase = stockBajo ? 'bajo' : 'ok';
    const variante = p.variante ? `<span class="tarjeta-pieza-variante">${escapeHtml(p.variante)}</span>` : '';

    el.innerHTML = `
      <div class="tarjeta-pieza-row1">
        <span class="tarjeta-pieza-ref">${escapeHtml(p.referencia_fabricante || '—')}</span>
        ${variante}
      </div>
      <p class="tarjeta-pieza-titulo">${escapeHtml(p.descripcion || '(sin descripción)')}</p>
      <div class="tarjeta-pieza-row2">
        <span class="badge familia ${fam}">${escapeHtml(p.familia || '—')}</span>
        <span>${escapeHtml(p.tipo_pieza || '—')}</span>
        ${p.marca ? '<span>' + escapeHtml(p.marca) + '</span>' : ''}
        ${p.num_usos > 0 ? '<span>· en ' + p.num_usos + ' máquina' + (p.num_usos > 1 ? 's' : '') + '</span>' : ''}
        <span style="margin-left:auto;" class="stock-indicador ${stockClase}">
          ${p.stock_actual ?? 0} / ${p.stock_minimo ?? 0}
        </span>
      </div>
    `;
    el.addEventListener('click', () => navigate('/pieza/' + encodeURIComponent(p.id_pieza)));
    return el;
  }

  async function renderPieza(id) {
    showScreen('screen-loading');
    const r = await apiGet(cfg.ENDPOINTS.PIEZA_GET, { id });
    if (!r.ok) {
      if (r.status === 404) {
        toast('Pieza no encontrada', 'error');
      } else {
        toast(r.data?.error || 'No se pudo cargar la pieza', 'error');
      }
      navigate('/piezas');
      return;
    }
    CACHE_PIEZA = r.data;
    rellenarFichaPieza(r.data);
    showScreen('screen-pieza');
  }

  function rellenarFichaPieza(d) {
    const p = d.pieza || {};
    const stockActual = d.stock_actual ?? 0;
    const stockMin = p.stock_minimo ?? 0;
    const stockBajo = stockActual < stockMin;
    const fam = familiaCss(p.familia);

    // Cabecera
    $('pieza-id').textContent = p.id_pieza || '—';
    $('pieza-ref').textContent = p.referencia_fabricante || '';
    $('pieza-variante').textContent = p.variante || '';
    $('pieza-variante-sep').classList.toggle('hidden', !p.variante);

    const tipoBadge = $('pieza-tipo-badge');
    tipoBadge.textContent = p.tipo_pieza || '—';
    tipoBadge.className = 'badge';

    const famBadge = $('pieza-familia-badge');
    famBadge.textContent = p.familia || '—';
    famBadge.className = 'badge familia ' + fam;

    // Stock
    const stockEl = $('pieza-stock-actual');
    stockEl.textContent = stockActual;
    stockEl.className = 'v stock-valor ' + (stockBajo ? 'stock-indicador bajo' : 'stock-indicador ok');
    $('pieza-stock-minimo').textContent = stockMin;
    $('pieza-ubicacion').textContent = p.ubicacion_almacen || '—';
    $('pieza-alerta-stock').classList.toggle('hidden', !stockBajo);

    // Datos
    $('pieza-marca').textContent = p.marca || '—';
    $('pieza-tipo').textContent = p.tipo_pieza || '—';
    $('pieza-familia').textContent = p.familia || '—';
    $('pieza-activa').textContent = p.activa || '—';
    $('pieza-fecha-alta').textContent = p.fecha_alta || '—';
    $('pieza-fecha-mov').textContent = fmtFecha(p.fecha_ultimo_movimiento) || '—';
    $('pieza-notas').textContent = p.notas || '—';

    // Usos por máquina
    rellenarUsosPieza(d.usos || []);

    // Proveedor
    rellenarProveedorPieza(d.proveedor);

    // Movimientos
    rellenarMovimientosPieza(d.movimientos_recientes || []);
  }

  function rellenarUsosPieza(usos) {
    const ul = $('lista-usos');
    ul.innerHTML = '';
    if (!usos || usos.length === 0) {
      ul.innerHTML = '<li style="color:var(--color-text-soft);font-size:0.9rem;">Sin usos registrados todavía. Edwin podrá añadirlos cuando llegue F6-B.</li>';
      return;
    }
    usos.forEach((u) => {
      const li = document.createElement('li');
      const nombreMaq = u.nombre_maquina || u.id_maquina || '—';
      const dept = u.departamento ? `<span class="uso-departamento">${escapeHtml(u.departamento)}</span>` : '';
      li.innerHTML = `
        <div>
          <span class="uso-maquina">${escapeHtml(nombreMaq)}</span>
          ${dept}
        </div>
        <div class="uso-detalle">
          ${u.posicion ? escapeHtml(u.posicion) : '(sin posición)'}
          · <span class="uso-cantidad">${u.cantidad_por_maquina ?? 0}</span> ud${(u.cantidad_por_maquina === 1) ? '' : 's'}
          ${u.criticidad ? ' · ' + escapeHtml(u.criticidad) : ''}
        </div>
      `;
      ul.appendChild(li);
    });
  }

  function rellenarProveedorPieza(prov) {
    const vacio = $('proveedor-vacio');
    const detalle = $('proveedor-detalle');
    if (!prov) {
      vacio.classList.remove('hidden');
      detalle.classList.add('hidden');
      return;
    }
    vacio.classList.add('hidden');
    detalle.classList.remove('hidden');

    $('prov-nombre').textContent = prov.nombre || '—';
    $('prov-categoria').textContent = prov.categoria_principal || '—';
    $('prov-contacto').textContent = prov.persona_contacto || '—';

    const emailEl = $('prov-email');
    if (prov.email) {
      emailEl.innerHTML = `<a href="mailto:${escapeHtml(prov.email)}">${escapeHtml(prov.email)}</a>`;
    } else {
      emailEl.textContent = '—';
    }

    const telEl = $('prov-telefono');
    const tels = [prov.tel1, prov.tel2].filter(Boolean);
    if (tels.length === 0) {
      telEl.textContent = '—';
    } else {
      telEl.innerHTML = tels.map((t) =>
        `<a href="tel:${escapeHtml(String(t).replace(/\s/g, ''))}">${escapeHtml(t)}</a>`
      ).join(' · ');
    }
  }

  function rellenarMovimientosPieza(movs) {
    const ul = $('lista-movimientos');
    ul.innerHTML = '';
    if (!movs || movs.length === 0) {
      ul.innerHTML = '<li class="t">Sin movimientos registrados.</li>';
      return;
    }
    movs.forEach((m) => {
      const li = document.createElement('li');
      const signo = (m.tipo === 'Salida' || m.tipo === 'Devolución') ? '−' : '+';
      const motivo = m.motivo ? ' · ' + escapeHtml(m.motivo) : '';
      const inc = m.id_incidencia ? ' · ' + escapeHtml(m.id_incidencia) : '';
      li.innerHTML = `
        <div class="t">${fmtFecha(m.fecha)} · ${escapeHtml(m.actor || '—')}</div>
        <span class="e">${escapeHtml(m.tipo)} ${signo}${m.cantidad ?? 0}</span>
        <span>${motivo}${inc}</span>
      `;
      ul.appendChild(li);
    });
  }

  // ---------- Movimientos de stock (F6-B) ----------

  function poblarMotivos(tipo, current) {
    const sel = $('mov-motivo');
    const motivos = MOTIVOS_POR_TIPO[tipo] || [];
    sel.innerHTML = '';
    motivos.forEach((m) => {
      const o = document.createElement('option');
      o.value = m; o.textContent = m;
      if (m === current) o.selected = true;
      sel.appendChild(o);
    });
    if (!motivos.includes(current)) sel.selectedIndex = 0;
    actualizarVisibilidadCamposMov();
  }

  function actualizarVisibilidadCamposMov() {
    const tipo = $('mov-tipo').value;
    const motivo = $('mov-motivo').value;
    // Incidencia visible si motivo=Consumo (Salida).
    const showInc = (tipo === 'Salida' && motivo === 'Consumo');
    $('campo-mov-incidencia').style.display = showInc ? '' : 'none';
    $('mov-incidencia-hint').textContent = showInc ? 'Obligatorio.' : '';
    // Proveedor visible si Compra o Devolución_proveedor.
    const showProv = (motivo === 'Compra' || motivo === 'Devolución_proveedor');
    $('campo-mov-proveedor').style.display = showProv ? '' : 'none';
    // Precio visible si Compra.
    $('campo-mov-precio').style.display = (motivo === 'Compra') ? '' : 'none';
    // Notas hint.
    $('mov-notas-hint').textContent = (motivo === 'Otro') ? 'Obligatorio (motivo Otro).' : 'Opcional.';
  }

  async function abrirModalMovimiento(ctx) {
    // ctx: { id_pieza, nombre_pieza, source: 'pieza'|'incidencia', id_incidencia?, preset_tipo?, preset_motivo?, preset_cantidad? }
    if (!ctx.id_pieza) { toast('Falta id_pieza', 'error'); return; }
    MODAL_MOV_CTX = ctx;

    // Header
    $('modal-mov-pieza-nombre').textContent = ctx.nombre_pieza || ctx.id_pieza;

    // Tipo + cantidad
    $('mov-tipo').value = ctx.preset_tipo || 'Salida';
    $('mov-cantidad').value = ctx.preset_cantidad || 1;

    // Motivos según tipo
    poblarMotivos($('mov-tipo').value, ctx.preset_motivo || (MOTIVOS_POR_TIPO[$('mov-tipo').value] || ['Otro'])[0]);

    // Poblar selector incidencias activas
    const selInc = $('mov-id_incidencia');
    selInc.innerHTML = '<option value="">— sin asignar —</option>';
    if (CACHE_LISTA && CACHE_LISTA.length) {
      CACHE_LISTA
        .filter((it) => !['Cancelada','Finalizada'].includes(it.estado))
        .forEach((it) => {
          const o = document.createElement('option');
          o.value = it.id_incidencia;
          const maq = (lookupMaquina(it.id_maquina) || {}).nombre || it.id_maquina;
          o.textContent = `${it.id_incidencia} · ${maq}`;
          if (ctx.id_incidencia && it.id_incidencia === ctx.id_incidencia) o.selected = true;
          selInc.appendChild(o);
        });
    }
    // Si la incidencia preset no está en la lista (ej. cargada solo en ficha), añádela manualmente.
    if (ctx.id_incidencia && !Array.from(selInc.options).find((o) => o.value === ctx.id_incidencia)) {
      const o = document.createElement('option');
      o.value = ctx.id_incidencia; o.textContent = ctx.id_incidencia + ' (actual)';
      o.selected = true;
      selInc.appendChild(o);
    }

    // Poblar selector proveedores
    const selProv = $('mov-id_proveedor');
    selProv.innerHTML = '<option value="">— sin asignar —</option>';
    (CATALOGOS.proveedores || []).forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id_proveedor;
      o.textContent = p.nombre + (p.especialidad ? ' — ' + p.especialidad : '');
      selProv.appendChild(o);
    });

    // Reset campos
    $('mov-precio_total').value = '';
    $('mov-notas').value = '';
    $('modal-mov-error').classList.add('hidden');

    actualizarVisibilidadCamposMov();
    show('modal-movimiento');
  }

  function cerrarModalMovimiento() { hide('modal-movimiento'); MODAL_MOV_CTX = null; }

  async function confirmarMovimiento(forceNegative) {
    const errBox = $('modal-mov-error');
    errBox.classList.add('hidden');

    const tipo = $('mov-tipo').value;
    const cantidad = parseInt($('mov-cantidad').value, 10);
    const motivo = $('mov-motivo').value;
    const id_incidencia = $('mov-id_incidencia').value;
    const id_proveedor = $('mov-id_proveedor').value;
    const precio_total = $('mov-precio_total').value;
    const notas = $('mov-notas').value.trim();

    // Validación cliente (refleja backend)
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      errBox.textContent = 'Cantidad debe ser un número entero positivo.';
      errBox.classList.remove('hidden'); return;
    }
    if (motivo === 'Otro' && notas.length < 3) {
      errBox.textContent = 'Motivo "Otro" exige notas (mínimo 3 caracteres).';
      errBox.classList.remove('hidden'); return;
    }
    if (tipo === 'Salida' && motivo === 'Consumo' && !id_incidencia) {
      errBox.textContent = 'Selecciona una incidencia (obligatoria para Salida + Consumo).';
      errBox.classList.remove('hidden'); return;
    }

    const body = {
      id_pieza: MODAL_MOV_CTX.id_pieza,
      tipo, cantidad, motivo,
    };
    if (id_incidencia) body.id_incidencia = id_incidencia;
    if (id_proveedor)  body.id_proveedor  = id_proveedor;
    if (precio_total)  body.precio_total  = parseFloat(precio_total);
    if (notas)         body.notas         = notas;
    if (forceNegative) body.force_negative = true;

    const btn = $('btn-mov-confirmar');
    btn.disabled = true;
    const prev = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>Registrando…';

    const r = await apiPost(cfg.ENDPOINTS.PIEZA_MOVIMIENTO, body);

    btn.disabled = false;
    btn.textContent = prev;

    if (r.ok && r.data && r.data.success) {
      cerrarModalMovimiento();
      toast(`Movimiento registrado · stock ${r.data.stock_actual_antes} → ${r.data.stock_actual_nuevo}`, 'success');
      // Refrescar pantalla activa para reflejar el cambio
      const route = parseHash();
      if (route.route === 'pieza')      await renderPieza(MODAL_MOV_CTX.id_pieza);
      else if (route.route === 'ficha') await renderFicha(route.id);
      else if (route.route === 'piezas' || route.route === 'pedidos') await renderPiezas();
    } else if (r.status === 409 && r.data && r.data.error === 'stock_insuficiente') {
      // D-MOV-1: confirmación de stock negativo
      const ok = window.confirm(`⚠ Esto va a dejar el stock en negativo: actual ${r.data.stock_actual}, sales ${r.data.cantidad}, queda ${r.data.stock_actual - r.data.cantidad}.\n\n¿Confirmar igualmente?`);
      if (ok) return confirmarMovimiento(true);
    } else if (r.status === 400) {
      errBox.textContent = (r.data && r.data.detalle) || 'Datos inválidos';
      errBox.classList.remove('hidden');
    } else if (r.status === 404) {
      errBox.textContent = (r.data && r.data.detalle) || 'No encontrado';
      errBox.classList.remove('hidden');
    } else {
      errBox.textContent = 'Error: HTTP ' + r.status;
      errBox.classList.remove('hidden');
    }
  }

  // ---------- Piezas consumidas en ficha de incidencia (F6-B) ----------

  async function rellenarPiezasConsumidas() {
    if (!CACHE_INC) return;
    const ul = $('lista-piezas-consumidas');
    ul.innerHTML = '<li class="t">Cargando…</li>';

    // Estrategia simple: pedimos /piezas para tener el catálogo + filtramos
    // localmente movimientos con id_incidencia===CACHE_INC.id_incidencia.
    // Como no tenemos endpoint específico de movimientos por incidencia, re-leo
    // cada pieza con uso conocido — pero sería N requests. Mejor: pedir todas las
    // piezas con stock_movimientos y filtrar. Aprovecho que /piezas no devuelve
    // movimientos pero sí num_usos. Para movimientos exactos por incidencia
    // necesitaremos un endpoint dedicado en F6-B+ — por ahora: dejamos
    // PLACEHOLDER que se rellena al añadir y al refrescar la ficha tras crear.
    // Lo que sí podemos mostrar: pieza_bloqueante_id si existe (caso bloqueada).

    if (CACHE_INC.pieza_bloqueante_id) {
      ul.innerHTML = '';
      const li = document.createElement('li');
      li.style.background = '#fff8e1';
      li.innerHTML = `
        <div><span class="uso-maquina">⏸ Bloqueada por pieza:</span></div>
        <div class="uso-detalle">
          <a href="#/pieza/${escapeHtml(CACHE_INC.pieza_bloqueante_id)}">${escapeHtml(CACHE_INC.pieza_bloqueante_id)}</a>
          (esperando recepción · stock no se ha movido)
        </div>
      `;
      ul.appendChild(li);
    } else {
      ul.innerHTML = '';
    }

    // Append: lista de movimientos consumidos. Sin endpoint dedicado, hacemos
    // request al panel/pieza?id=X para cada pieza única vinculada — pero como
    // no sabemos cuáles son sin un endpoint, mostramos sólo lo que tengamos.
    // Por ahora dejamos la lista vacía y dependemos de que el usuario refresque
    // tras añadir un movimiento. F6-B+ podría añadir un endpoint
    // /panel/incidencia/movimientos?id= que devuelva los movimientos enlazados.
    if (ul.children.length === 0) {
      ul.innerHTML = '<li class="t">Sin piezas consumidas registradas todavía. Pulsa "Añadir pieza consumida" para anotar una.</li>';
    }

    // Info banner si está bloqueada
    const info = $('ficha-pieza-bloqueante-info');
    if (CACHE_INC.pieza_bloqueante_id) {
      info.classList.remove('hidden');
      info.textContent = 'Esta incidencia está bloqueada esperando la pieza ' + CACHE_INC.pieza_bloqueante_id + '.';
    } else {
      info.classList.add('hidden');
    }
  }

  async function abrirModalAddPiezaConsumida() {
    if (!CACHE_INC) return;
    // Selector de pieza — pedimos /piezas (cache si existe, si no carga).
    // Para simplicidad, pedimos siempre.
    const r = await apiGet(cfg.ENDPOINTS.PIEZAS_LIST);
    if (!r.ok) { toast('No se pudo cargar piezas', 'error'); return; }
    const piezas = r.data.items || [];
    if (piezas.length === 0) { toast('Sin catálogo de piezas', 'error'); return; }

    // Promp simplificado: pedimos id_pieza por prompt() y delegamos al modal completo
    const ref = window.prompt('Escribe la referencia de la pieza (ej. 6205-2RS) o el id_pieza (PZ-2026-NNNN):');
    if (!ref) return;
    const refUp = ref.trim().toUpperCase();
    const match = piezas.find((p) =>
      (p.id_pieza || '').toUpperCase() === refUp ||
      (p.referencia_fabricante || '').toUpperCase() === refUp
    );
    if (!match) { toast('Pieza no encontrada: ' + ref, 'error'); return; }

    abrirModalMovimiento({
      id_pieza: match.id_pieza,
      nombre_pieza: `${match.referencia_fabricante} · ${match.descripcion || ''}`,
      source: 'incidencia',
      id_incidencia: CACHE_INC.id_incidencia,
      preset_tipo: 'Salida',
      preset_motivo: 'Consumo',
      preset_cantidad: 1,
    });
  }

  function abrirModalBloquearPieza() {
    if (!CACHE_INC) return;
    // Cargar selector de piezas
    apiGet(cfg.ENDPOINTS.PIEZAS_LIST).then((r) => {
      if (!r.ok) { toast('No se pudo cargar piezas', 'error'); return; }
      const sel = $('blq-id_pieza');
      sel.innerHTML = '<option value="">— elige pieza —</option>';
      (r.data.items || []).forEach((p) => {
        const o = document.createElement('option');
        o.value = p.id_pieza;
        o.textContent = `${p.referencia_fabricante} · ${p.descripcion || ''} (stock ${p.stock_actual})`;
        sel.appendChild(o);
      });
      $('blq-nota').value = '';
      $('modal-blq-error').classList.add('hidden');
      show('modal-bloquear-pieza');
    });
  }

  function cerrarModalBloquearPieza() { hide('modal-bloquear-pieza'); }

  async function confirmarBloquearPieza() {
    const errBox = $('modal-blq-error');
    errBox.classList.add('hidden');

    const id_pieza = $('blq-id_pieza').value;
    const nota = $('blq-nota').value.trim();
    if (!id_pieza) {
      errBox.textContent = 'Elige una pieza.';
      errBox.classList.remove('hidden'); return;
    }
    const cambios = {
      pieza_bloqueante_id: id_pieza,
      motivo_pausa: 'pieza' + (nota ? ': ' + nota : ''),
      estado: 'Pausada',
    };

    const btn = $('btn-blq-confirmar');
    btn.disabled = true;
    const prev = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>Marcando…';

    const r = await apiPatch(cfg.ENDPOINTS.UPDATE, cambios, { id: CACHE_INC.id_incidencia });
    btn.disabled = false;
    btn.textContent = prev;

    if (r.ok && r.data && r.data.success) {
      cerrarModalBloquearPieza();
      toast('Incidencia marcada como bloqueada por pieza ' + id_pieza, 'success');
      await renderFicha(CACHE_INC.id_incidencia);
    } else {
      errBox.textContent = (r.data && r.data.detalle) || ('HTTP ' + r.status);
      errBox.classList.remove('hidden');
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

    // Toggles (origen + solvendo en ficha; maquina_parada + origen en nueva)
    qsa('.toggle button[data-name][data-value]').forEach((b) => {
      b.addEventListener('click', () => {
        const name = b.dataset.name;
        qsa('.toggle button[data-name="' + name + '"]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        // input hidden puede tener id = name (toggles "nueva-*") o id = 'ed-' + name (toggles ficha)
        const target = $(name) || $('ed-' + name);
        if (target) target.value = b.dataset.value;

        if (name === 'origen_intervencion') actualizarVisibilidadProveedor();
        if (name === 'nueva-origen_intervencion') {
          $('campo-nueva-proveedor').style.display = b.dataset.value === 'Externo' ? '' : 'none';
        }
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

    // Nueva incidencia
    $('fab-nueva').addEventListener('click', () => navigate('/nueva'));
    $('btn-volver-lista-nueva').addEventListener('click', () => navigate('/lista'));
    $('btn-cancelar-nueva').addEventListener('click', () => navigate('/lista'));
    $('form-nueva').addEventListener('submit', crearNueva);

    // Nav principal (incidencias / piezas)
    qsa('#nav-principal button[data-nav]').forEach((b) => {
      b.addEventListener('click', () => {
        const target = b.dataset.nav;
        navigate(target === 'piezas' ? '/piezas' : '/lista');
      });
    });

    // Piezas — listado
    $('piezas-busqueda').addEventListener('input', debounce(() => {
      FILTRO_PIEZAS.q = $('piezas-busqueda').value.trim();
      renderPiezas();
    }, 350));
    $('piezas-familia').addEventListener('change', () => {
      FILTRO_PIEZAS.familia = $('piezas-familia').value;
      renderPiezas();
    });
    $('piezas-id_maquina').addEventListener('change', () => {
      FILTRO_PIEZAS.id_maquina = $('piezas-id_maquina').value;
      renderPiezas();
    });
    $('piezas-stock-bajo').addEventListener('change', () => {
      FILTRO_PIEZAS.stock_bajo = $('piezas-stock-bajo').checked;
      renderPiezas();
    });
    $('btn-piezas-refresh').addEventListener('click', () => renderPiezas());

    // Pieza — volver
    $('btn-volver-piezas').addEventListener('click', () => navigate('/piezas'));

    // Pieza — movimientos (F6-B)
    $('btn-mov-rapido-menos').addEventListener('click', () => {
      if (!CACHE_PIEZA || !CACHE_PIEZA.pieza) { toast('Carga una pieza primero', 'error'); return; }
      const p = CACHE_PIEZA.pieza;
      abrirModalMovimiento({
        id_pieza: p.id_pieza,
        nombre_pieza: `${p.referencia_fabricante}${p.variante ? ' ' + p.variante : ''} · ${p.descripcion || ''}`,
        source: 'pieza',
        preset_tipo: 'Salida',
        preset_motivo: 'Consumo',
        preset_cantidad: 1,
      });
    });
    $('btn-mov-completo').addEventListener('click', () => {
      if (!CACHE_PIEZA || !CACHE_PIEZA.pieza) { toast('Carga una pieza primero', 'error'); return; }
      const p = CACHE_PIEZA.pieza;
      abrirModalMovimiento({
        id_pieza: p.id_pieza,
        nombre_pieza: `${p.referencia_fabricante}${p.variante ? ' ' + p.variante : ''} · ${p.descripcion || ''}`,
        source: 'pieza',
      });
    });

    // Modal movimiento — interacciones
    $('mov-tipo').addEventListener('change', () => {
      poblarMotivos($('mov-tipo').value, '');
    });
    $('mov-motivo').addEventListener('change', actualizarVisibilidadCamposMov);
    $('btn-mov-volver').addEventListener('click', cerrarModalMovimiento);
    $('btn-mov-confirmar').addEventListener('click', () => confirmarMovimiento(false));

    // Ficha incidencia — piezas consumidas (F6-B)
    $('btn-add-pieza-consumida').addEventListener('click', abrirModalAddPiezaConsumida);
    $('btn-marcar-bloqueada-pieza').addEventListener('click', abrirModalBloquearPieza);

    // Modal bloquear por pieza
    $('btn-blq-volver').addEventListener('click', cerrarModalBloquearPieza);
    $('btn-blq-confirmar').addEventListener('click', confirmarBloquearPieza);

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
