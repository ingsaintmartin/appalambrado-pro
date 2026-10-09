/* useFenceMaterials — motor paramétrico de insumos (Módulo 2).
   Vinculado al Módulo 1: usa los metros del trazado salvo
   override manual. Todo cambio recalcula en vivo. */
import { useMemo } from 'react';
import { useStore } from '../store.js';
import { calcularMateriales, pesoTotalTn, camionSugerido, TIPOS_ALAMBRADO, PARAMS_DEFAULT } from '../lib/calc.js';
import { distanciaTotalM, perimetroM } from '../lib/calc.js';

export function useFenceMaterials() {
  const trazado = useStore((s) => s.trazado);
  const mat = useStore((s) => s.mat);
  const precios = useStore((s) => s.precios);
  const setMat = useStore((s) => s.setMat);
  const setPrecio = useStore((s) => s.setPrecio);
  const setModulo = useStore((s) => s.setModulo);

  const calc = useMemo(() => {
    const v = trazado.vertices;
    const cerrado = trazado.cerrado && v.length >= 3;
    const metrosTrazado = v.length >= 2 ? (cerrado ? perimetroM(v) : distanciaTotalM(v)) : 0;
    const metros = mat.usarManual && mat.metrosManual !== '' ? parseFloat(mat.metrosManual) || 0 : metrosTrazado;
    const { items, resumen } = calcularMateriales(mat.patron, metros, {
      poligono: cerrado,
      nVertices: v.length,
      suelo: mat.suelo,
      conTirantes: mat.conTirantes,
      tranqueras: mat.tranqueras,
      hilosElec: mat.hilosElec,
      refuerzoCadaM: mat.distRefuerzo,
      sepVarillas: mat.sepVarillas
    });
    const pesoTn = pesoTotalTn(items);
    return {
      metros, metrosTrazado, items, resumen,
      pesoTn, camion: camionSugerido(pesoTn),
      tipo: TIPOS_ALAMBRADO[mat.patron]
    };
  }, [trazado, mat]);

  return {
    ...calc,
    patron: mat.patron,
    params: mat,
    precios,
    setPatron: (patron) => setMat({ patron }),
    setParam: (patch) => setMat(patch),
    setPrecio,
    irACotizador: () => setModulo(3),
    PARAMS_DEFAULT
  };
}
