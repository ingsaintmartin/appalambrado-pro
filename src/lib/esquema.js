/* Lógica pura del esquema de cerramiento (dibuja el corte reactivo).
   Todo lo que renderiza CorteReactivo/EsquemaPlanta sale de acá:
   sin estado interno, sin ilustración fija. */

import { validarVarillas } from './calc.js';

/* Preset tradicional: 7 hilos Norma Tradicional Argentina (de abajo hacia arriba).
   Púas en 68 y 135 cm (H4 y H7 del dibujo original). */
export const ALTURAS_TRADICIONAL = [
  { alturaCm: 15,  tipo: 'liso' },
  { alturaCm: 30,  tipo: 'liso' },
  { alturaCm: 48,  tipo: 'liso' },
  { alturaCm: 68,  tipo: 'pua'  },
  { alturaCm: 90,  tipo: 'liso' },
  { alturaCm: 112, tipo: 'liso' },
  { alturaCm: 135, tipo: 'pua'  }
];

/* Eléctrico: alturas típicas según cantidad de hilos. */
export const ALTURAS_ELECTRICO = {
  1: [{ alturaCm: 80, tipo: 'electro' }],
  2: [{ alturaCm: 60, tipo: 'electro' }, { alturaCm: 100, tipo: 'electro' }],
  3: [{ alturaCm: 40, tipo: 'electro' }, { alturaCm: 80, tipo: 'electro' }, { alturaCm: 110, tipo: 'electro' }]
};

export const TIPOS_PALO = [
  { cm: 220, etiqueta: 'Poste intermedio 2.20 m' },
  { cm: 240, etiqueta: 'Palo alto 2.40 m (manga)' },
  { cm: 260, etiqueta: 'Atador 2.60 m' }
];

/* Distribuye n hilos parejos en el palo: primer hilo a 12 cm del suelo,
   último a 10 cm de la punta. Las púas van abajo (las primeras k). */
export function distribuirAlturas(nHilos, altoPaloCm, nPuas) {
  const nn = Math.min(10, Math.max(1, Math.round(nHilos) || 1));
  const k = Math.min(nn, Math.max(0, Math.round(nPuas) || 0));
  const alto = Math.max(60, parseFloat(altoPaloCm) || 220);
  const base = 12, tope = alto - 10;
  if (nn === 1) return [{ alturaCm: Math.round((base + tope) / 2), tipo: k > 0 ? 'pua' : 'liso' }];
  const paso = (tope - base) / (nn - 1);
  return Array.from({ length: nn }, (_, i) => ({
    alturaCm: Math.round(base + paso * i),
    tipo: i < k ? 'pua' : 'liso'
  }));
}

const ETIQ_HILO = { liso: 'Liso 17/15', pua: 'Púa', electro: 'Electroplástico' };

/* Esquema completo para el dibujo reactivo.
   Entrada: { patron, esquema:{preset,hilos,puas,altoPaloCm,tipoPalo,varillaModo},
              hilosElec, modoVarillas, varillasPorClaro, distPalosM }
   Salida: { palo:{altoCm,etiqueta}, hilos:[{alturaCm,tipo,etiqueta}], distPalosM,
             varillas:{modo,n,espaciamientoCm,ok,mensaje} } */
export function calcularEsquema(o) {
  const patron = o.patron || 'suspendido7';
  const esq = o.esquema || {};
  let hilos, paloAltoCm, paloEtiqueta;

  if (patron === 'electrico') {
    const n = Math.min(3, Math.max(1, Math.round(o.hilosElec) || 2));
    hilos = ALTURAS_ELECTRICO[n].map((h) => ({ ...h }));
    paloAltoCm = 220; paloEtiqueta = 'Estacón 2.20 m';
  } else if (patron === 'convencional') {
    hilos = distribuirAlturas(7, 220, 0);
    paloAltoCm = 220; paloEtiqueta = 'Poste Quebracho 2.20 m';
  } else if (esq.preset === 'manga-corral') {
    const n = Math.min(10, Math.max(6, Math.round(esq.hilos) || 9));
    hilos = distribuirAlturas(n, 240, Math.min(2, Math.max(0, Math.round(esq.puas ?? 2))));
    paloAltoCm = 240; paloEtiqueta = 'Palo alto 2.40 m (manga)';
  } else if (esq.preset === 'configurable') {
    const n = Math.min(10, Math.max(1, Math.round(esq.hilos) || 7));
    const alto = Math.max(120, parseFloat(esq.altoPaloCm) || 220);
    hilos = distribuirAlturas(n, alto, esq.puas);
    paloAltoCm = alto; paloEtiqueta = esq.tipoPalo || ('Palo ' + (alto / 100).toFixed(2).replace('.', ',') + ' m');
  } else {
    hilos = ALTURAS_TRADICIONAL.map((h) => ({ ...h }));
    paloAltoCm = 220; paloEtiqueta = 'Poste intermedio 2.20 m';
  }

  hilos = hilos.map((h) => ({ ...h, etiqueta: ETIQ_HILO[h.tipo] || h.tipo }));
  const distPalosM = Math.max(0.5, parseFloat(o.distPalosM) || 15);
  const modoV = esq.varillaModo || 'n';
  const nVar = modoV === 'n' ? Math.max(0, Math.round(o.varillasPorClaro) || 0)
    : modoV === 'central' ? 1 : 0;
  const val = validarVarillas(distPalosM, nVar, o.modoVarillas);

  return {
    palo: { altoCm: paloAltoCm, etiqueta: paloEtiqueta },
    hilos, distPalosM,
    varillas: { modo: modoV, n: nVar, espaciamientoCm: val.espaciamientoCm, ok: val.ok, mensaje: val.mensaje }
  };
}

/* Hilos/púas efectivos para el cómputo de materiales (mismo criterio
   que el dibujo: lo que se ve es lo que se computa). */
export function hilosEfectivos(patron, esquema, hilosElec) {
  if (patron === 'electrico') return { hilos: Math.min(3, Math.max(1, Math.round(hilosElec) || 2)), puas: 0 };
  if (patron === 'convencional') return { hilos: 7, puas: 0 };
  const esq = esquema || {};
  if (esq.preset === 'tradicional' || !esq.preset) return { hilos: 7, puas: 2 };
  if (esq.preset === 'manga-corral')
    return { hilos: Math.min(10, Math.max(6, Math.round(esq.hilos) || 9)), puas: Math.min(2, Math.max(0, Math.round(esq.puas ?? 2))) };
  const h = Math.min(10, Math.max(1, Math.round(esq.hilos) || 7));
  return { hilos: h, puas: Math.min(h, Math.max(0, Math.round(esq.puas) || 0)) };
}
