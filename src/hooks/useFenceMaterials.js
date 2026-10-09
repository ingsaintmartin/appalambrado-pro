/* useFenceMaterials — motor paramétrico de insumos (Módulo 2).
   Vinculado al Módulo 1: usa los metros del trazado salvo
   override manual. Todo cambio recalcula en vivo.
   El corte reactivo y el cómputo comparten hilos/púas efectivos:
   lo que se dibuja es lo que se computa. */
import { useMemo } from 'react';
import { useStore } from '../store.js';
import { calcularMateriales, pesoTotalTn, camionSugerido, TIPOS_ALAMBRADO, PARAMS_DEFAULT } from '../lib/calc.js';
import { distanciaTotalM, perimetroM } from '../lib/calc.js';
import { calcularEsquema, hilosEfectivos } from '../lib/esquema.js';

const ESQUEMA_DEFAULT = {
  preset: 'tradicional', hilos: 7, puas: 2,
  altoPaloCm: 220, tipoPalo: 'Poste intermedio 2.20 m', varillaModo: 'n'
};

export function useFenceMaterials() {
  const trazado = useStore((s) => s.trazado);
  const mat = useStore((s) => s.mat);
  const precios = useStore((s) => s.precios);
  const setMat = useStore((s) => s.setMat);
  const setPrecio = useStore((s) => s.setPrecio);
  const setModulo = useStore((s) => s.setModulo);

  const calc = useMemo(() => {
    // Merge defensivo: el estado persistido viejo puede no traer los campos nuevos.
    const m = {
      ...mat,
      tranquerasDetalle: mat.tranquerasDetalle || [],
      replanteo: mat.replanteo || { activo: false, atadoresM: 80, intermediosM: 15 },
      esquema: { ...ESQUEMA_DEFAULT, ...(mat.esquema || {}) },
      varillasPorClaro: mat.varillasPorClaro ?? 9,
      modoVarillas: mat.modoVarillas || 'comun'
    };
    const v = trazado.vertices;
    const cerrado = trazado.cerrado && v.length >= 3;
    const metrosTrazado = v.length >= 2 ? (cerrado ? perimetroM(v) : distanciaTotalM(v)) : 0;
    const metros = m.usarManual && m.metrosManual !== '' ? parseFloat(m.metrosManual) || 0 : metrosTrazado;
    // Hilos/púas efectivos según preset del corte (dibujo = cómputo).
    const he = hilosEfectivos(m.patron, m.esquema, m.hilosElec);
    const { items, resumen } = calcularMateriales(m.patron, metros, {
      poligono: cerrado,
      nVertices: v.length,
      suelo: m.suelo,
      conTirantes: m.conTirantes,
      tranquerasDetalle: m.tranquerasDetalle,
      hilosElec: m.hilosElec,
      refuerzoCadaM: m.distRefuerzo,
      sepVarillas: m.sepVarillas,
      replanteo: m.replanteo && m.replanteo.activo
        ? { atadoresM: m.replanteo.atadoresM, intermediosM: m.replanteo.intermediosM }
        : null,
      varillasPorClaro: m.replanteo && m.replanteo.activo ? m.varillasPorClaro : null,
      hilos: he.hilos,
      puas: he.puas,
      // Atadores y torniquetes (lógica de campo, ajustable en tarjetas 02 y 05)
      cadaNAtadores: m.cadaNAtadores,
      torniqEsquineros: m.torniqEsquineros,
      torniqCadaAtadores: m.torniqCadaAtadores,
      grampasIntermedios: m.grampasIntermedios,
      margenExtremo: m.margenExtremo,
      // Tipos de alambre y especies de madera (tarjetas 01, 02 y 04)
      alambreLiso: m.alambreLiso,
      alambrePua: m.alambrePua,
      alambreElectro: m.alambreElectro,
      maderaEsquinero: m.maderaEsquinero,
      maderaIntermedio: m.maderaIntermedio
    });
    const pesoTn = pesoTotalTn(items);
    // Distancia entre palos para el dibujo: del replanteo si está activo.
    const rp = resumen && resumen.replanteo ? resumen.replanteo : null;
    const distPalosM = rp ? rp.intermedios.real : (m.replanteo ? m.replanteo.intermediosM : 15);
    const esquemaDibujo = calcularEsquema({
      patron: m.patron,
      esquema: m.esquema,
      hilosElec: m.hilosElec,
      modoVarillas: m.modoVarillas,
      varillasPorClaro: m.varillasPorClaro,
      distPalosM
    });
    return {
      metros, metrosTrazado, items, resumen,
      pesoTn, camion: camionSugerido(pesoTn),
      tipo: TIPOS_ALAMBRADO[m.patron],
      hilosEfectivos: he, esquemaDibujo,
      esquemaParams: m.esquema,
      paramsM: m,
      cerrado
    };
  }, [trazado, mat]);

  return {
    ...calc,
    patron: mat.patron,
    params: calc.paramsM || mat,
    precios,
    setPatron: (patron) => setMat({ patron }),
    setParam: (patch) => setMat(patch),
    setEsquema: (patch) => setMat({ esquema: { ...ESQUEMA_DEFAULT, ...(mat.esquema || {}), ...patch } }),
    setPrecio,
    irACotizador: () => setModulo(3),
    PARAMS_DEFAULT
  };
}
