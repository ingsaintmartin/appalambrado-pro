/* Store global Zustand — única fuente de verdad de la UI.
   Persistencia local (offline-first); la nube (Turso) es opcional.
   En el primer arranque se siembra la obra DEMO de "La Rinconada"
   para que la app abra como el diseño; "Nuevo Lote/Obra" arranca
   en limpio. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  'tranquera': 387000,            // Tranquera tablas madera 3,5 m
  'estacon': 8000,                // Estacón itín 1,60 m
  'aislador': 550,                // Aislador ovalado
  'tensor': 4800,                 // Tensor terminal
  'alambre-boyero-rollo': 195000, // Alambre boyero 1,8 mm ×1000 m
  'tirante': 14000
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
    suelo: 'tierra'
  },
  precios: { ...PRECIOS_DEMO },
  costos: {
    precioM: 600, metrosDesarme: 500, precioDesarme: 350,
    precioTranquera: 105000,
    fleteKm: 120, precioKm: 3500, viaticos: 240000,
    contingencia: 5, margen: 22
  },
  ejec: { ...ejecVacia(), avanceM: 2620, dias: 10 },
  resumen: null,       // snapshot del último presupuesto aprobado (base M4)
  numeroPresupuesto: 'AL-2025-084',

  /* --- acciones --- */
  setModulo: (modulo) => set({ modulo }),
  setObra: (patch) => set((s) => ({ obra: { ...s.obra, ...patch } })),
  nuevaObra: () => set({ obra: obraVacia(), trazado: trazadoVacio(), ejec: ejecVacia(), resumen: null, modulo: 1 }),

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
    numeroPresupuesto: s.numeroPresupuesto, modulo: s.modulo
  })
}));
