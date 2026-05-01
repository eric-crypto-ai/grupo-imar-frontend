// app.js — Lógica del formulario operario (Grupo Imar, F1).
// Sin frameworks. Vanilla JS, ES2020.
//
// Flujo:
//   1. Al cargar: GET /imar/catalogos → puebla selects.
//   2. Operario rellena formulario.
//   3. Al enviar: POST /imar/nueva-incidencia.
//   4. Pantalla de éxito o error.

(function () {
  'use strict';

  const cfg = window.IMAR_CONFIG;
  if (!cfg) {
    console.error('IMAR_CONFIG no cargado. Falta config.js.');
    return;
  }

  // BKL-032 B1: parámetros y defaults vienen de /imar/config (Sheet config),
  // no hardcoded. Se carga en paralelo a /imar/catalogos.
  let CFG = null;

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const show = (id) => { $(id).classList.remove('hidden'); };
  const hide = (id) => { $(id).classList.add('hidden'); };
  const allScreens = ['screen-loading', 'screen-form', 'screen-sending', 'screen-success', 'screen-error'];
  function showOnly(id) {
    allScreens.forEach((s) => (s === id ? show(s) : hide(s)));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function authHeader() {
    return { 'Authorization': 'Bearer ' + cfg.WEBHOOK_TOKEN };
  }

  function showFormError(msg) {
    const el = $('form-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function clearFormError() { $('form-error').classList.add('hidden'); }

  // ---------- Carga de catálogos + config ----------
  async function fetchJson(endpoint) {
    const r = await fetch(cfg.API_BASE + endpoint, {
      method: 'GET',
      headers: { ...authHeader() },
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error('HTTP ' + r.status + ' ' + txt.slice(0, 100));
    }
    const data = await r.json();
    if (!data.success) throw new Error(data.detalle || 'Respuesta inválida del servidor');
    return data;
  }

  async function cargarDatosIniciales() {
    try {
      const [catalogos, configData] = await Promise.all([
        fetchJson(cfg.ENDPOINTS.CATALOGOS),
        fetchJson(cfg.ENDPOINTS.CONFIG),
      ]);
      CFG = configData;
      poblarSelectOperarios(catalogos.operarios || []);
      poblarSelectMaquinas(catalogos.maquinas || []);
      showOnly('screen-form');
    } catch (e) {
      console.error('Error cargando datos iniciales:', e);
      $('error-detalle').textContent = 'No se han podido cargar los datos de planta. Comprueba conexión y reintenta.';
      showOnly('screen-error');
    }
  }

  function poblarSelectOperarios(list) {
    const sel = $('id_operario');
    // Mantener el primer option (placeholder)
    list.forEach((op) => {
      const o = document.createElement('option');
      o.value = op.id_operario;
      o.textContent = op.nombre + ' — ' + op.departamento_habitual;
      sel.appendChild(o);
    });
  }

  function poblarSelectMaquinas(list) {
    const sel = $('id_maquina');
    // Agrupar por departamento (más navegable visualmente).
    const porDepto = {};
    list.forEach((m) => {
      (porDepto[m.departamento] = porDepto[m.departamento] || []).push(m);
    });
    Object.keys(porDepto).sort().forEach((depto) => {
      const og = document.createElement('optgroup');
      og.label = depto;
      porDepto[depto].forEach((m) => {
        const o = document.createElement('option');
        o.value = m.id_maquina;
        o.textContent = m.nombre;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  }

  // ---------- Toggle Sí/No ----------
  function bindToggle() {
    const buttons = document.querySelectorAll('.toggle button[data-value]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        $('maquina_parada').value = btn.dataset.value;
        clearFormError();
      });
    });
  }

  // ---------- Validación cliente ----------
  function validarCliente() {
    clearFormError();
    const f = $('screen-form');
    const id_operario = f.id_operario.value;
    const id_maquina = f.id_maquina.value;
    const maquina_parada = f.maquina_parada.value;
    const descripcion = f.descripcion.value.trim();
    if (!id_operario)        { showFormError('Selecciona tu nombre.'); return null; }
    if (!id_maquina)         { showFormError('Selecciona la máquina.'); return null; }
    if (!maquina_parada)     { showFormError('Indica si la máquina está parada o no.'); return null; }
    const minChars = (CFG && CFG.parametros && CFG.parametros.descripcion_form_min_chars) || 5;
    if (descripcion.length < minChars) {
      showFormError('Describe el problema con un mínimo de ' + minChars + ' caracteres.');
      return null;
    }
    const observaciones = f.observaciones.value.trim();
    return { id_operario, id_maquina, maquina_parada, descripcion, observaciones };
  }

  // ---------- Submit ----------
  async function enviarIncidencia(payload) {
    showOnly('screen-sending');
    try {
      const r = await fetch(cfg.API_BASE + cfg.ENDPOINTS.INCIDENCIA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        $('success-codigo').textContent = data.id_incidencia;
        $('success-mensaje').textContent = data.mensaje || '';
        showOnly('screen-success');
      } else {
        const detalle = data.detalle || data.error || ('HTTP ' + r.status);
        $('error-detalle').textContent = detalle;
        showOnly('screen-error');
      }
    } catch (e) {
      console.error('Error enviando incidencia:', e);
      $('error-detalle').textContent = 'Error de red. Reintenta cuando tengas conexión.';
      showOnly('screen-error');
    }
  }

  // ---------- Init ----------
  function init() {
    $('ver').textContent = cfg.VERSION;
    bindToggle();

    $('screen-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = validarCliente();
      if (payload) enviarIncidencia(payload);
    });

    $('btn-otra').addEventListener('click', () => {
      // reset y volver al form
      const f = $('screen-form');
      f.reset();
      $('maquina_parada').value = '';
      document.querySelectorAll('.toggle button[data-value]').forEach((b) =>
        b.setAttribute('aria-pressed', 'false')
      );
      clearFormError();
      showOnly('screen-form');
    });

    $('btn-reintentar').addEventListener('click', () => {
      const payload = validarCliente();
      if (payload) enviarIncidencia(payload);
      else showOnly('screen-form');
    });

    $('btn-volver').addEventListener('click', () => {
      clearFormError();
      showOnly('screen-form');
    });

    // Arranque
    showOnly('screen-loading');
    cargarDatosIniciales();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
