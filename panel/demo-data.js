// demo-data.js — Dataset sintético para el modo demo del panel.
//
// Sector ficticio: PYME metalmecánica catalana, 80 trabajadores. Coherente con
// el caso publicado en intralogik.com/casos/fabrica-metalmecanica-cataluna.
//
// Uso: cargado desde demo-mode.js cuando window.IMAR_DEMO === true.
// NO se carga ni se ejecuta en modo producción real.

(function () {
  'use strict';

  // Fechas relativas a "hoy" para que las screenshots no envejezcan.
  const HOY = new Date();
  function diasAtras(n, h, m) {
    const d = new Date(HOY);
    d.setDate(d.getDate() - n);
    if (h !== undefined) d.setHours(h, m || 0, 0, 0);
    return d.toISOString();
  }

  const MAQUINAS = [
    { id_maquina: 'M-CNC-01', nombre: 'CNC Haas VF-2',           linea: 'Mecanizado',   marca: 'Haas',         activa: 'Sí' },
    { id_maquina: 'M-CNC-02', nombre: 'Torno CNC Mazak QT-200',  linea: 'Mecanizado',   marca: 'Mazak',        activa: 'Sí' },
    { id_maquina: 'M-PRE-01', nombre: 'Prensa hidráulica 100T',  linea: 'Conformado',   marca: 'Loire Safe',   activa: 'Sí' },
    { id_maquina: 'M-SOL-01', nombre: 'Soldadora MIG/MAG',       linea: 'Soldadura',    marca: 'Lincoln',      activa: 'Sí' },
    { id_maquina: 'M-COM-01', nombre: 'Compresor Atlas GA-22',   linea: 'Servicios',    marca: 'Atlas Copco',  activa: 'Sí' },
    { id_maquina: 'M-PUL-01', nombre: 'Pulidora industrial',     linea: 'Acabados',     marca: 'Reliable',     activa: 'Sí' },
  ];

  const OPERARIOS = [
    { id_operario: 'OP-01', nombre: 'Carlos Martín',  rol: 'Operario',   turno: 'Mañana',  activo: 'Sí' },
    { id_operario: 'OP-02', nombre: 'Antonio Pérez',  rol: 'Operario',   turno: 'Tarde',   activo: 'Sí' },
    { id_operario: 'OP-03', nombre: 'Miguel Sánchez', rol: 'Operario',   turno: 'Noche',   activo: 'Sí' },
    { id_operario: 'OP-04', nombre: 'David Ruiz',     rol: 'Operario',   turno: 'Mañana',  activo: 'Sí' },
    { id_operario: 'TEC-01', nombre: 'Luis Romero',   rol: 'Técnico',    turno: 'Mañana',  activo: 'Sí', especialidad: 'Mecánica' },
    { id_operario: 'TEC-02', nombre: 'Javier Gómez',  rol: 'Técnico',    turno: 'Tarde',   activo: 'Sí', especialidad: 'Eléctrica' },
    { id_operario: 'TEC-03', nombre: 'Pedro Navarro', rol: 'Técnico',    turno: 'Mañana',  activo: 'Sí', especialidad: 'Hidráulica' },
    { id_operario: 'RM-01',  nombre: 'Roberto Hernández', rol: 'Responsable mantenimiento', turno: 'Mañana', activo: 'Sí' },
  ];

  const PROVEEDORES = [
    { id_proveedor: 'PV-01', nombre: 'Suministros Industriales García', categoria: 'Genérico',     contacto: 'Juan García', telefono: '+34 93 123 45 67', email: 'pedidos@sumigarcia.es', activo: 'Sí' },
    { id_proveedor: 'PV-02', nombre: 'Repuestos del Vallès',            categoria: 'Mecánica',     contacto: 'Marta Vidal', telefono: '+34 93 234 56 78', email: 'comercial@repvalles.es', activo: 'Sí' },
    { id_proveedor: 'PV-03', nombre: 'ServiCNC Catalunya',              categoria: 'CNC',          contacto: 'Albert Pons', telefono: '+34 93 345 67 89', email: 'servicio@servicnc.cat', activo: 'Sí' },
    { id_proveedor: 'PV-04', nombre: 'SKF España',                      categoria: 'Rodamientos',  contacto: 'Cliente B2B', telefono: '+34 91 456 78 90', email: 'b2b.es@skf.com',          activo: 'Sí' },
    { id_proveedor: 'PV-05', nombre: 'Eléctrica Industrial Barcelona',  categoria: 'Eléctrica',    contacto: 'Pere Llorens', telefono: '+34 93 567 89 01', email: 'ventas@electricabcn.es',  activo: 'Sí' },
    { id_proveedor: 'PV-06', nombre: 'Aceros y Metales del Norte',      categoria: 'Materiales',   contacto: 'Iván Garmendia', telefono: '+34 94 678 90 12', email: 'comercial@amnorte.es', activo: 'Sí' },
  ];

  const CONFIG = {
    success: true,
    enums: {
      estados:        ['Nueva', 'Asignada', 'En curso', 'Pausada', 'Finalizada', 'Cerrada', 'Cancelada'],
      prioridades:    ['Parada de línea', 'Riesgo de parada', 'Programado', 'Mejora'],
      categorias:     ['Mecánica', 'Eléctrica', 'Hidráulica', 'Neumática', 'Software/CNC', 'Limpieza', 'Otra'],
      tipos_fallo:    ['Avería', 'Desgaste', 'Mal uso', 'Falta de mantenimiento', 'Fallo eléctrico', 'Fallo hidráulico', 'Fallo software', 'Otro'],
      motivos_fallo:  ['Pieza desgastada', 'Sobrecarga', 'Suciedad', 'Fallo eléctrico', 'Falta de aceite', 'Fuga', 'Configuración', 'Otro'],
      origen_intervencion: ['Interno', 'Externo'],
      familias_pieza: ['Mecánica', 'Eléctrica', 'Neumática', 'Hidráulica', 'Consumible', 'Fijación', 'Otros'],
      tipos_pieza:    ['Rodamiento', 'Junta', 'Filtro', 'Correa', 'Contactor', 'Relé', 'Aceite', 'Tubería', 'Cable', 'Otro'],
      tipos_movimiento: ['Entrada', 'Salida', 'Ajuste', 'Devolución', 'Inicial'],
      motivos_movimiento: ['Consumo', 'Recepción', 'Roto', 'Devolución', 'Inicial', 'Ajuste inventario', 'Otro'],
    },
    enums_duros: {},
    mapas: {
      prioridad_sugerida: {
        'Parada de línea': 'Parada de línea',
        'Riesgo':          'Riesgo de parada',
      },
    },
    parametros: { stock_minimo_default: 4 },
    defaults: { categoria: 'Mecánica', estado_inicial: 'Nueva' },
    reglas_auto: [],
  };

  const INCIDENCIAS = [
    {
      id_incidencia: 'INC-DEM-001',
      estado: 'Asignada',
      prioridad: 'Riesgo de parada',
      categoria: 'Mecánica',
      tipo_fallo: 'Desgaste',
      motivo_fallo: '',
      descripcion: 'Vibración anormal en husillo principal al pasar de 3.000 rpm.',
      observaciones_op: 'Se nota más al arrancar en frío. Suena tipo rodamiento.',
      id_maquina: 'M-CNC-01',
      id_operario: 'OP-01',
      tecnico_asignado: 'TEC-01',
      maquina_parada: 'No',
      fecha_reporte: diasAtras(0, 7, 42),
      fecha_inicio_intervencion: '',
      fecha_fin_intervencion: '',
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-002',
      estado: 'En curso',
      prioridad: 'Parada de línea',
      categoria: 'Hidráulica',
      tipo_fallo: 'Fuga',
      motivo_fallo: '',
      descripcion: 'Fuga de aceite en pistón principal de la prensa.',
      observaciones_op: 'Charco visible debajo. Se ha parado por seguridad.',
      id_maquina: 'M-PRE-01',
      id_operario: 'OP-02',
      tecnico_asignado: 'TEC-03',
      maquina_parada: 'Sí',
      fecha_reporte: diasAtras(0, 9, 15),
      fecha_inicio_intervencion: diasAtras(0, 9, 45),
      fecha_fin_intervencion: '',
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-003',
      estado: 'Nueva',
      prioridad: 'Riesgo de parada',
      categoria: 'Neumática',
      tipo_fallo: '',
      motivo_fallo: '',
      descripcion: 'Compresor no llega a 8 bar. Se queda en 6,5 bar tras 20 min.',
      observaciones_op: '',
      id_maquina: 'M-COM-01',
      id_operario: 'OP-04',
      tecnico_asignado: '',
      maquina_parada: 'No',
      fecha_reporte: diasAtras(0, 10, 30),
      fecha_inicio_intervencion: '',
      fecha_fin_intervencion: '',
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-004',
      estado: 'Pausada',
      prioridad: 'Riesgo de parada',
      categoria: 'Software/CNC',
      tipo_fallo: 'Fallo software',
      motivo_fallo: '',
      descripcion: 'Error E-202 en pantalla del torno. No deja arrancar el ciclo.',
      observaciones_op: 'Aparece tras parada de turno. Reinicio ya intentado.',
      id_maquina: 'M-CNC-02',
      id_operario: 'OP-03',
      tecnico_asignado: 'TEC-02',
      maquina_parada: 'Sí',
      fecha_reporte: diasAtras(1, 22, 10),
      fecha_inicio_intervencion: diasAtras(1, 22, 30),
      fecha_fin_intervencion: '',
      origen_intervencion: 'Interno',
      proveedor_id: 'PV-03',
      pieza_bloqueante_id: 'PZ-DEM-005',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-005',
      estado: 'Asignada',
      prioridad: 'Programado',
      categoria: 'Mecánica',
      tipo_fallo: '',
      motivo_fallo: '',
      descripcion: 'Cambiar correa trapezoidal — vence preventivo a 500h.',
      observaciones_op: '',
      id_maquina: 'M-PUL-01',
      id_operario: 'RM-01',
      tecnico_asignado: 'TEC-01',
      maquina_parada: 'No',
      fecha_reporte: diasAtras(2, 8, 0),
      fecha_inicio_intervencion: '',
      fecha_fin_intervencion: '',
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-006',
      estado: 'Finalizada',
      prioridad: 'Riesgo de parada',
      categoria: 'Eléctrica',
      tipo_fallo: 'Fallo eléctrico',
      motivo_fallo: 'Pieza desgastada',
      descripcion: 'Cable de masa de la soldadora quemado.',
      observaciones_op: '',
      descripcion_trabajo_realizado: 'Sustitución del cable de masa por uno nuevo. Verificación de continuidad. Probado con cordón de prueba.',
      id_maquina: 'M-SOL-01',
      id_operario: 'OP-01',
      tecnico_asignado: 'TEC-02',
      maquina_parada: 'No',
      fecha_reporte: diasAtras(3, 11, 20),
      fecha_inicio_intervencion: diasAtras(3, 14, 0),
      fecha_fin_intervencion: diasAtras(3, 15, 30),
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      solvendo: 'Sí',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-007',
      estado: 'Cerrada',
      prioridad: 'Programado',
      categoria: 'Limpieza',
      tipo_fallo: 'Falta de mantenimiento',
      motivo_fallo: 'Suciedad',
      descripcion: 'Limpieza de filtros del compresor. Programada mensual.',
      descripcion_trabajo_realizado: 'Filtros desmontados y soplados. Cambio de filtro de aire. Reinicio del contador de horas.',
      id_maquina: 'M-COM-01',
      id_operario: 'RM-01',
      tecnico_asignado: 'TEC-04',
      maquina_parada: 'No',
      fecha_reporte: diasAtras(5, 9, 0),
      fecha_inicio_intervencion: diasAtras(5, 14, 0),
      fecha_fin_intervencion: diasAtras(5, 15, 0),
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      solvendo: 'Sí',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-008',
      estado: 'Nueva',
      prioridad: 'Mejora',
      categoria: 'Otra',
      tipo_fallo: '',
      motivo_fallo: '',
      descripcion: 'Sugerencia: añadir luz LED al panel de control de la prensa para ver mejor en turno noche.',
      observaciones_op: 'Lo comentó David. No urgente.',
      id_maquina: 'M-PRE-01',
      id_operario: 'OP-04',
      tecnico_asignado: '',
      maquina_parada: 'No',
      fecha_reporte: diasAtras(6, 10, 0),
      fecha_inicio_intervencion: '',
      fecha_fin_intervencion: '',
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-009',
      estado: 'Asignada',
      prioridad: 'Programado',
      categoria: 'Mecánica',
      tipo_fallo: '',
      motivo_fallo: '',
      descripcion: 'Engrase semestral de guías del torno Mazak.',
      observaciones_op: '',
      id_maquina: 'M-CNC-02',
      id_operario: 'RM-01',
      tecnico_asignado: 'TEC-01',
      maquina_parada: 'No',
      fecha_reporte: diasAtras(7, 8, 30),
      fecha_inicio_intervencion: '',
      fecha_fin_intervencion: '',
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-010',
      estado: 'Cerrada',
      prioridad: 'Parada de línea',
      categoria: 'Mecánica',
      tipo_fallo: 'Avería',
      motivo_fallo: 'Pieza desgastada',
      descripcion: 'Rotura del rodamiento del eje X en CNC Haas.',
      descripcion_trabajo_realizado: 'Sustitución del rodamiento 6308 (FAG). Reajuste de la precarga. Pruebas con pieza patrón. OK.',
      id_maquina: 'M-CNC-01',
      id_operario: 'OP-01',
      tecnico_asignado: 'TEC-01',
      maquina_parada: 'Sí',
      fecha_reporte: diasAtras(12, 8, 15),
      fecha_inicio_intervencion: diasAtras(12, 9, 0),
      fecha_fin_intervencion: diasAtras(12, 13, 30),
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      solvendo: 'Sí',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-011',
      estado: 'Cerrada',
      prioridad: 'Riesgo de parada',
      categoria: 'Eléctrica',
      tipo_fallo: 'Fallo eléctrico',
      motivo_fallo: 'Pieza desgastada',
      descripcion: 'Contactor del motor del compresor disparándose intermitente.',
      descripcion_trabajo_realizado: 'Sustitución del contactor 25A 230V. Comprobación de aislamiento del motor (>20 MΩ).',
      id_maquina: 'M-COM-01',
      id_operario: 'OP-04',
      tecnico_asignado: 'TEC-02',
      maquina_parada: 'No',
      fecha_reporte: diasAtras(15, 14, 0),
      fecha_inicio_intervencion: diasAtras(15, 16, 0),
      fecha_fin_intervencion: diasAtras(15, 17, 30),
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      solvendo: 'Sí',
      foto_url: '',
    },
    {
      id_incidencia: 'INC-DEM-012',
      estado: 'Cerrada',
      prioridad: 'Programado',
      categoria: 'Hidráulica',
      tipo_fallo: 'Falta de mantenimiento',
      motivo_fallo: 'Falta de aceite',
      descripcion: 'Reposición de aceite hidráulico de la prensa.',
      descripcion_trabajo_realizado: 'Añadidos 12 L de ISO-46. Verificación de fugas: ninguna.',
      id_maquina: 'M-PRE-01',
      id_operario: 'RM-01',
      tecnico_asignado: 'TEC-03',
      maquina_parada: 'No',
      fecha_reporte: diasAtras(20, 10, 0),
      fecha_inicio_intervencion: diasAtras(20, 11, 0),
      fecha_fin_intervencion: diasAtras(20, 11, 30),
      origen_intervencion: 'Interno',
      proveedor_id: '',
      pieza_bloqueante_id: '',
      solvendo: 'Sí',
      foto_url: '',
    },
  ];

  const COMENTARIOS = {
    'INC-DEM-001': [
      { id_comentario: 'COM-DEM-001', autor: 'RM-01', autor_nombre: 'Roberto Hernández', texto: 'Asignado a Luis. Que revise rodamiento y pre-carga del husillo.', fecha: diasAtras(0, 8, 5) },
      { id_comentario: 'COM-DEM-002', autor: 'TEC-01', autor_nombre: 'Luis Romero', texto: 'Voy esta tarde con vibrómetro. Si es rodamiento, pediré 6205 a SKF.', fecha: diasAtras(0, 8, 30) },
    ],
    'INC-DEM-002': [
      { id_comentario: 'COM-DEM-003', autor: 'RM-01', autor_nombre: 'Roberto Hernández', texto: 'Pedro va para allá. Línea 2 parada hasta nuevo aviso.', fecha: diasAtras(0, 9, 25) },
      { id_comentario: 'COM-DEM-004', autor: 'TEC-03', autor_nombre: 'Pedro Navarro', texto: 'Identificada fuga en junta del pistón. Tengo junta nueva en almacén. ETA cierre 2h.', fecha: diasAtras(0, 9, 50) },
    ],
    'INC-DEM-004': [
      { id_comentario: 'COM-DEM-005', autor: 'RM-01', autor_nombre: 'Roberto Hernández', texto: 'Llamado a ServiCNC. Necesitan pieza desde Italia. ETA recepción 3 días. Bloqueamos.', fecha: diasAtras(1, 23, 0) },
    ],
    'INC-DEM-006': [
      { id_comentario: 'COM-DEM-006', autor: 'TEC-02', autor_nombre: 'Javier Gómez', texto: 'Cable nuevo instalado y probado. Cerrada.', fecha: diasAtras(3, 15, 35) },
    ],
    'INC-DEM-010': [
      { id_comentario: 'COM-DEM-007', autor: 'TEC-01', autor_nombre: 'Luis Romero', texto: 'Rodamiento sustituido. CNC operativa. Recordar revisar cada 1.500h.', fecha: diasAtras(12, 13, 35) },
    ],
  };

  const HISTORIAL = {
    'INC-DEM-001': [
      { id_historial: 'HE-DEM-001', estado_de: '',          estado_a: 'Nueva',     fecha: diasAtras(0, 7, 42),  autor: 'OP-01',  autor_nombre: 'Carlos Martín' },
      { id_historial: 'HE-DEM-002', estado_de: 'Nueva',     estado_a: 'Asignada',  fecha: diasAtras(0, 8, 5),   autor: 'RM-01',  autor_nombre: 'Roberto Hernández' },
    ],
    'INC-DEM-002': [
      { id_historial: 'HE-DEM-003', estado_de: '',          estado_a: 'Nueva',     fecha: diasAtras(0, 9, 15),  autor: 'OP-02',  autor_nombre: 'Antonio Pérez' },
      { id_historial: 'HE-DEM-004', estado_de: 'Nueva',     estado_a: 'Asignada',  fecha: diasAtras(0, 9, 25),  autor: 'RM-01',  autor_nombre: 'Roberto Hernández' },
      { id_historial: 'HE-DEM-005', estado_de: 'Asignada',  estado_a: 'En curso',  fecha: diasAtras(0, 9, 45),  autor: 'TEC-03', autor_nombre: 'Pedro Navarro' },
    ],
    'INC-DEM-004': [
      { id_historial: 'HE-DEM-006', estado_de: '',           estado_a: 'Nueva',     fecha: diasAtras(1, 22, 10), autor: 'OP-03',  autor_nombre: 'Miguel Sánchez' },
      { id_historial: 'HE-DEM-007', estado_de: 'Nueva',      estado_a: 'Asignada',  fecha: diasAtras(1, 22, 25), autor: 'RM-01',  autor_nombre: 'Roberto Hernández' },
      { id_historial: 'HE-DEM-008', estado_de: 'Asignada',   estado_a: 'En curso',  fecha: diasAtras(1, 22, 30), autor: 'TEC-02', autor_nombre: 'Javier Gómez' },
      { id_historial: 'HE-DEM-009', estado_de: 'En curso',   estado_a: 'Pausada',   fecha: diasAtras(1, 23, 0),  autor: 'RM-01',  autor_nombre: 'Roberto Hernández', comentario: 'Bloqueada por pieza · pendiente recepción ServiCNC, ETA 3 días.' },
    ],
  };

  const PIEZAS = [
    { id_pieza: 'PZ-DEM-001', referencia_fabricante: '6205-2RS',     descripcion: 'Rodamiento rígido 25x52x15',          variante: '',         tipo_pieza: 'Rodamiento', familia: 'Mecánica',    marca: 'SKF',           proveedor_id: 'PV-04', stock_actual: 12, stock_minimo: 4,  ubicacion: 'A1', precio: 18.50, activa: 'Sí', fecha_alta: diasAtras(120), fecha_ultimo_movimiento: diasAtras(8),  notas: 'Eje X CNC Haas y eje Z Mazak.' },
    { id_pieza: 'PZ-DEM-002', referencia_fabricante: 'HF-30',        descripcion: 'Filtro hidráulico 30 µm',             variante: '',         tipo_pieza: 'Filtro',     familia: 'Hidráulica',  marca: 'MAHLE',         proveedor_id: 'PV-02', stock_actual: 1,  stock_minimo: 4,  ubicacion: 'B2', precio: 45.00, activa: 'Sí', fecha_alta: diasAtras(180), fecha_ultimo_movimiento: diasAtras(20), notas: 'Cambio cada 1.000 h.' },
    { id_pieza: 'PZ-DEM-003', referencia_fabricante: 'OR-25x3',      descripcion: 'Junta tórica 25x3 mm Viton',          variante: 'Viton',    tipo_pieza: 'Junta',      familia: 'Mecánica',    marca: 'CFW',           proveedor_id: 'PV-01', stock_actual: 0,  stock_minimo: 6,  ubicacion: 'C3', precio: 1.80,  activa: 'Sí', fecha_alta: diasAtras(90),  fecha_ultimo_movimiento: diasAtras(0),  notas: 'Pistón prensa principal.' },
    { id_pieza: 'PZ-DEM-004', referencia_fabricante: 'A-58',         descripcion: 'Correa trapezoidal A-58',             variante: '',         tipo_pieza: 'Correa',     familia: 'Mecánica',    marca: 'Continental',   proveedor_id: 'PV-01', stock_actual: 8,  stock_minimo: 4,  ubicacion: 'A2', precio: 12.00, activa: 'Sí', fecha_alta: diasAtras(150), fecha_ultimo_movimiento: diasAtras(2),  notas: '' },
    { id_pieza: 'PZ-DEM-005', referencia_fabricante: 'LC1D25',       descripcion: 'Contactor 25A 230V AC',               variante: '',         tipo_pieza: 'Contactor',  familia: 'Eléctrica',   marca: 'Schneider',     proveedor_id: 'PV-05', stock_actual: 2,  stock_minimo: 4,  ubicacion: 'D1', precio: 38.00, activa: 'Sí', fecha_alta: diasAtras(60),  fecha_ultimo_movimiento: diasAtras(15), notas: 'Compatibles M-COM-01 y M-PRE-01.' },
    { id_pieza: 'PZ-DEM-006', referencia_fabricante: 'AC-FILTER',    descripcion: 'Filtro de aire compresor GA-22',      variante: '',         tipo_pieza: 'Filtro',     familia: 'Consumible',  marca: 'Atlas Copco',   proveedor_id: 'PV-01', stock_actual: 5,  stock_minimo: 2,  ubicacion: 'B3', precio: 56.00, activa: 'Sí', fecha_alta: diasAtras(120), fecha_ultimo_movimiento: diasAtras(5),  notas: 'Servicio mensual programado.' },
    { id_pieza: 'PZ-DEM-007', referencia_fabricante: 'ISO46',        descripcion: 'Aceite hidráulico ISO-46 (20 L)',     variante: '20 L',     tipo_pieza: 'Aceite',     familia: 'Consumible',  marca: 'Repsol',        proveedor_id: 'PV-01', stock_actual: 3,  stock_minimo: 4,  ubicacion: 'E1', precio: 78.00, activa: 'Sí', fecha_alta: diasAtras(90),  fecha_ultimo_movimiento: diasAtras(20), notas: '' },
    { id_pieza: 'PZ-DEM-008', referencia_fabricante: 'LR2D25',       descripcion: 'Relé térmico LR2D25 (17-25 A)',       variante: '',         tipo_pieza: 'Relé',       familia: 'Eléctrica',   marca: 'Schneider',     proveedor_id: 'PV-05', stock_actual: 6,  stock_minimo: 3,  ubicacion: 'D2', precio: 42.00, activa: 'Sí', fecha_alta: diasAtras(60),  fecha_ultimo_movimiento: diasAtras(40), notas: '' },
    { id_pieza: 'PZ-DEM-009', referencia_fabricante: '6308',         descripcion: 'Rodamiento rígido 40x90x23',          variante: '',         tipo_pieza: 'Rodamiento', familia: 'Mecánica',    marca: 'FAG',           proveedor_id: 'PV-04', stock_actual: 4,  stock_minimo: 4,  ubicacion: 'A1', precio: 32.00, activa: 'Sí', fecha_alta: diasAtras(120), fecha_ultimo_movimiento: diasAtras(12), notas: 'Eje principal CNC Haas. Stock justo en mínimo.' },
    { id_pieza: 'PZ-DEM-010', referencia_fabricante: 'PUN-8',        descripcion: 'Tubo neumático 8 mm poliuretano (rollo 50 m)', variante: '50 m', tipo_pieza: 'Tubería', familia: 'Neumática',   marca: 'Festo',         proveedor_id: 'PV-01', stock_actual: 15, stock_minimo: 5,  ubicacion: 'F1', precio: 95.00, activa: 'Sí', fecha_alta: diasAtras(180), fecha_ultimo_movimiento: diasAtras(60), notas: '' },
  ];

  const USOS_POR_MAQUINA = {
    'PZ-DEM-001': [
      { id_maquina: 'M-CNC-01', nombre_maquina: 'CNC Haas VF-2',          uso_tipico: 'Eje X, cambio cada 2.000 h' },
      { id_maquina: 'M-CNC-02', nombre_maquina: 'Torno CNC Mazak QT-200', uso_tipico: 'Eje Z' },
    ],
    'PZ-DEM-002': [{ id_maquina: 'M-PRE-01', nombre_maquina: 'Prensa hidráulica 100T', uso_tipico: 'Cambio cada 1.000 h' }],
    'PZ-DEM-003': [{ id_maquina: 'M-PRE-01', nombre_maquina: 'Prensa hidráulica 100T', uso_tipico: 'Pistón principal — alta rotación' }],
    'PZ-DEM-005': [
      { id_maquina: 'M-COM-01', nombre_maquina: 'Compresor Atlas GA-22', uso_tipico: 'Motor compresor' },
      { id_maquina: 'M-PRE-01', nombre_maquina: 'Prensa hidráulica 100T', uso_tipico: 'Motor bomba hidráulica' },
    ],
    'PZ-DEM-009': [{ id_maquina: 'M-CNC-01', nombre_maquina: 'CNC Haas VF-2', uso_tipico: 'Eje principal' }],
  };

  const MOVIMIENTOS_POR_PIEZA = {
    'PZ-DEM-001': [
      { id_movimiento: 'MOV-DEM-001', tipo: 'Salida',  cantidad: 1, motivo: 'Consumo',     fecha: diasAtras(8),   id_incidencia: 'INC-DEM-010', autor_nombre: 'Luis Romero',     stock_resultante: 12 },
      { id_movimiento: 'MOV-DEM-002', tipo: 'Entrada', cantidad: 6, motivo: 'Recepción',   fecha: diasAtras(30),  id_proveedor: 'PV-04',        autor_nombre: 'Roberto Hernández', stock_resultante: 13, precio_total: 111.00 },
    ],
    'PZ-DEM-003': [
      { id_movimiento: 'MOV-DEM-003', tipo: 'Salida',  cantidad: 1, motivo: 'Consumo',     fecha: diasAtras(0),   id_incidencia: 'INC-DEM-002', autor_nombre: 'Pedro Navarro',     stock_resultante: 0 },
      { id_movimiento: 'MOV-DEM-004', tipo: 'Salida',  cantidad: 2, motivo: 'Consumo',     fecha: diasAtras(15),  id_incidencia: 'INC-DEM-012', autor_nombre: 'Pedro Navarro',     stock_resultante: 1 },
    ],
    'PZ-DEM-009': [
      { id_movimiento: 'MOV-DEM-005', tipo: 'Salida',  cantidad: 1, motivo: 'Consumo',     fecha: diasAtras(12),  id_incidencia: 'INC-DEM-010', autor_nombre: 'Luis Romero',     stock_resultante: 4 },
    ],
  };

  // ---------- API público ----------
  window.IMAR_DEMO_DATA = {
    auth: () => ({ success: true, panel: 'demo', user: 'Demo' }),
    catalogos: () => ({
      success: true,
      maquinas:    [...MAQUINAS],
      operarios:   [...OPERARIOS],
      proveedores: [...PROVEEDORES],
    }),
    config: () => CONFIG,
    listIncidencias: ({ kind, q } = {}) => {
      let items = [...INCIDENCIAS];
      if (kind === 'activas')  items = items.filter((i) => !['Cerrada', 'Cancelada'].includes(i.estado));
      if (kind === 'cerradas') items = items.filter((i) =>  ['Cerrada', 'Cancelada'].includes(i.estado));
      if (q) {
        const qq = q.toLowerCase();
        items = items.filter((i) => (i.id_incidencia + ' ' + (i.descripcion || '')).toLowerCase().includes(qq));
      }
      // Ordenar por fecha_reporte desc
      items.sort((a, b) => (b.fecha_reporte || '').localeCompare(a.fecha_reporte || ''));
      return { success: true, items, returned: items.length, total: items.length };
    },
    getIncidencia: (id) => {
      const inc = INCIDENCIAS.find((i) => i.id_incidencia === id);
      if (!inc) return { success: false, detalle: 'No encontrada' };
      return {
        success: true,
        incidencia: inc,
        historial: HISTORIAL[id] || [],
        comentarios: COMENTARIOS[id] || [],
      };
    },
    listPiezas: ({ q, familia, id_maquina, stock_below_min } = {}) => {
      let items = [...PIEZAS];
      if (familia)   items = items.filter((p) => p.familia === familia);
      if (stock_below_min === 'true' || stock_below_min === true) {
        items = items.filter((p) => (p.stock_actual ?? 0) < (p.stock_minimo ?? 0));
      }
      if (q) {
        const qq = q.toLowerCase();
        items = items.filter((p) => ((p.referencia_fabricante || '') + ' ' + (p.descripcion || '')).toLowerCase().includes(qq));
      }
      return { items, returned: items.length, total: items.length };
    },
    getPieza: (id) => {
      const p = PIEZAS.find((x) => x.id_pieza === id);
      if (!p) return { error: 'No encontrada' };
      const proveedor = PROVEEDORES.find((pv) => pv.id_proveedor === p.proveedor_id) || null;
      return {
        pieza: p,
        proveedor,
        usos: USOS_POR_MAQUINA[id] || [],
        movimientos: MOVIMIENTOS_POR_PIEZA[id] || [],
      };
    },
  };

})();
