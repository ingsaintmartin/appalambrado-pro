/* Store global Zustand — única fuente de verdad de la UI.
   Persistencia local (offline-first); la nube (Turso) es opcional.
   En el primer arranque se siembra la obra DEMO de "La Rinconada"
   para que la app abra como el diseño; "Nuevo Lote/Obra" arranca
   en limpio. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PRECIOS_TRANQUERAS_DEFAULT } from './lib/calc.js';

export const PRECIOS_DEMO = {
  // Precios de referencia ARS oct-2026 (ver ~/workspace/precios-alambrado-ref-2026-10-09.md).
  // Son un arranque: ajustar con la lista del proveedor habitual antes de cotizar.
  'alambre-liso-rollo': 210000,   // Alambre 17/15 alta resistencia ×1000 m
  'alambre-pua-rollo': 100000,    // Alambre de púas ×500 m
  'poste-esquinero': 90000,       // Viga quebracho 3 m (esquinero)
  'poste-refuerzo': 28000,        // Poste quebracho ½ reforzado 2,20 m
  'poste-quebracho': 32000,       // Poste quebracho colorado entero 2,20 m
  'varilla': 1700,                // Varilla lapachín/curupay 1,20 m
  'torniquete': 22000,            // Torniquete doble zincado
  'varilla-tension': 3800,
  'grampa': 80,
  'alambre-dulce': 950,
  'tranquera': 387000,            // (compat) Tranquera tablas madera 3,5 m
  'tranqueron': 520000,            // (compat) código viejo
  'poste-intermedio': 24000,      // Palo intermedio 2,20 m (replanteo exacto)
  'estacon': 8000,                // Estacón itín 1,60 m
  'aislador': 550,                // Aislador ovalado
  'tensor': 4800,                 // Tensor terminal
  'alambre-boyero-rollo': 195000, // Alambre boyero 1,8 mm ×1000 m
  'tirante': 14000,
  ...PRECIOS_TRANQUERAS_DEFAULT   // tranquera-300/350/400, tranqueron-800…1500
};

/* Polígono demo ~3,9 km cerca de Trenque Lauquen (los metros
   exactos los calcula Haversine en vivo) */
const DEMO_VERTICES = [
  { lat: -35.97000, lng: -62.73000 },
  { lat: -35.96236, lng: -62.73000 },
  { lat: -35.96236, lng: -62.71666 },
  { lat: -35.96847, lng: -62.71666 }
];

const obraDemo = () => ({
  id: 'obra-demo',
  nombre: 'Estancia La Rinconada (DEMO)',
  lote: '4B',
  localidad: 'Buenos Aires, AR',
  responsable: 'Ing. Agr. M. Rosales',
  establecimiento: 'Estancia Santa María - Potrero Los Caldenes',
  tipoTrabajo: 'nuevo-completo',
  demo: true,
  creada: new Date().toISOString()
});

const obraVacia = () => ({
  id: 'obra-' + Date.now().toString(36),
  nombre: 'Nueva obra',
  lote: '',
  localidad: '',
  responsable: '',
  establecimiento: '',
  tipoTrabajo: 'nuevo-completo',
  demo: false,
  creada: new Date().toISOString()
});

const trazadoDemo = () => ({
  modo: 'poligono',
  vertices: DEMO_VERTICES,
  suelos: ['tierra', 'canada', 'tosca', 'tierra'],
  cerrado: true,
  capa: 'satelite'
});

const trazadoVacio = () => ({ modo: 'lineal', vertices: [], suelos: [], cerrado: false, capa: 'satelite' });

const ejecVacia = (diasTotales = 14) => ({
  aprobada: false,
  avanceM: 0, dias: 0, diasTotales,
  reales: {}, costoMOReal: 0, kmReales: 0, precioKmReal: 0, viaticosReales: 0,
  otros: [], dictamen: ''
});

export const useStore = create(persist((set, get) => ({
  modulo: 1,
  obra: obraDemo(),
  trazado: trazadoDemo(),
  mat: {
    patron: 'suspendido7',
    usarManual: false, metrosManual: '',
    distRefuerzo: 80, sepVarillas: 2.0,
    conTirantes: true, tranqueras: 2, hilosElec: 2,
    suelo: 'tierra',
    // Atadores y torniquetes (lógica de campo): atador 2,60 m cada N palos;
    // torniquetes en atadores (1 por hilo) y opcionalmente en esquineros.
    cadaNAtadores: 10, torniqEsquineros: true, torniqCadaAtadores: 1,
    // Tipos de alambre y especies de madera (selectores en Módulo 2)
    alambreLiso: '17-15', alambrePua: '4p', alambreElectro: 'ep6',
    maderaEsquinero: 'qcolorado', maderaIntermedio: 'qblanco',
    // Tranqueras ubicadas: [{pos (m desde inicio), tipo: 'tranquera'|'tranqueron'}]
    tranquerasDetalle: [],
    // Replanteo exacto: divide en tramos enteros iguales (sin claros desparejos)
    replanteo: { activo: false, atadoresM: 80, intermediosM: 15 },
    varillasPorClaro: 9,
    modoVarillas: 'comun', // 'comun' (100-180cm) | 'manga' (60-100cm)
    // Esquema del cerramiento (corte reactivo): lo que se dibuja = lo que se computa.
    esquema: {
      preset: 'tradicional', // 'tradicional' | 'configurable' | 'manga-corral' (suspendido7)
      hilos: 7, puas: 2,
      altoPaloCm: 220, tipoPalo: 'Poste intermedio 2.20 m',
      varillaModo: 'n' // 'central' (varillón) | 'n' (N varillas) | 'ninguna'
    }
  },
  precios: { ...PRECIOS_DEMO },
  costos: {
    precioM: 600, metrosDesarme: 500, precioDesarme: 350,
    precioTranquera: 105000,
    fleteKm: 120, precioKm: 3500, viaticos: 240000,
    contingencia: 5, margen: 22,
    // Regla de dominio: los materiales los pone el dueño (default SÍ).
    materialesDueno: true,
    // IVA: 'sin' (en B) | '10.5' (default, lo más común) | '21' — sobre mano de obra.
    ivaModo: '10.5'
  },
  ejec: { ...ejecVacia(), avanceM: 2620, dias: 10 },
  resumen: null,       // snapshot del último presupuesto aprobado (base M4)
  numeroPresupuesto: 'AL-2025-084',

  /* --- acciones --- */
  setModulo: (modulo) => set({ modulo }),
  setObra: (patch) => set((s) => ({ obra: { ...s.obra, ...patch } })),
  nuevaObra: () => set({ obra: obraVacia(), trazado: trazadoVacio(), ejec: ejecVacia(), resumen: null, modulo: 1 }),

  /* --- clientes (gestor) --- */
  clientes: [],
  clienteId: null,
  setClienteId: (clienteId) => set({ clienteId }),
  cargarClientes: async () => {
    const { listarClientes } = await import('./lib/clientes.js');
    set({ clientes: await listarClientes() });
  },
  guardarCliente: async (c) => {
    const { guardarCliente } = await import('./lib/clientes.js');
    const reg = await guardarCliente(c);
    set((s) => ({ clientes: [reg, ...s.clientes.filter((x) => x.id !== reg.id)] }));
    return reg;
  },
  eliminarCliente: async (id) => {
    const { eliminarCliente } = await import('./lib/clientes.js');
    await eliminarCliente(id);
    set((s) => ({
      clientes: s.clientes.filter((x) => x.id !== id),
      clienteId: s.clienteId === id ? null : s.clienteId
    }));
  },

  setTrazado: (patch) => set((s) => ({ trazado: { ...s.trazado, ...patch } })),
  addVertice: (v) => set((s) => {
    const vertices = [...s.trazado.vertices, v];
    const suelos = [...s.trazado.suelos];
    while (suelos.length < vertices.length) suelos.push('tierra');
    return { trazado: { ...s.trazado, vertices, suelos } };
  }),
  quitarUltimoVertice: () => set((s) => ({
    trazado: { ...s.trazado, vertices: s.trazado.vertices.slice(0, -1) }
  })),
  limpiarTrazado: () => set((s) => ({ trazado: { ...s.trazado, vertices: [], suelos: [], cerrado: false } })),
  setSueloTramo: (i, suelo) => set((s) => {
    const suelos = [...s.trazado.suelos];
    suelos[i] = suelo;
    return { trazado: { ...s.trazado, suelos } };
  }),

  setMat: (patch) => set((s) => ({ mat: { ...s.mat, ...patch } })),
  setPrecio: (codigo, valor) => set((s) => ({ precios: { ...s.precios, [codigo]: valor } })),

  setCostos: (patch) => set((s) => ({ costos: { ...s.costos, ...patch } })),

  /* --- empresa (perfil del contratista, marca configurable) --- */
  empresa: null,
  cargarEmpresa: async () => {
    const { cargarEmpresa } = await import('./lib/empresa.js');
    set({ empresa: await cargarEmpresa() });
  },
  guardarEmpresa: async (patch) => {
    const { guardarEmpresa } = await import('./lib/empresa.js');
    const reg = await guardarEmpresa(patch);
    set({ empresa: reg });
    return reg;
  },
  restablecerEmpresa: async () => {
    const { restablecerEmpresa } = await import('./lib/empresa.js');
    const reg = await restablecerEmpresa();
    set({ empresa: reg });
    return reg;
  },

  setEjec: (patch) => set((s) => ({ ejec: { ...s.ejec, ...patch } })),
  setReal: (codigo, cantidad, precioUnit) => set((s) => ({
    ejec: { ...s.ejec, reales: { ...s.ejec.reales, [codigo]: { cantidad, precioUnit } } }
  })),
  agregarGasto: (g) => set((s) => ({ ejec: { ...s.ejec, otros: [...s.ejec.otros, { id: 'g' + Date.now(), ...g }] } })),
  aprobarObra: (resumen) => set((s) => ({ ejec: { ...s.ejec, aprobada: true }, resumen, modulo: 4 })),
}), {
  name: 'aal-store-v1',
  partialize: (s) => ({
    obra: s.obra, trazado: s.trazado, mat: s.mat, precios: s.precios,
    costos: s.costos, ejec: s.ejec, resumen: s.resumen,
    numeroPresupuesto: s.numeroPresupuesto, modulo: s.modulo,
    clienteId: s.clienteId
  })
}));
