/* useGisCalc — geometría del trazado (Módulo 1) */
import { useMemo } from 'react';
import { useStore } from '../store.js';
import { haversineM, distanciaTotalM, perimetroM, areaEsfericaM2, hectareasDe } from '../lib/calc.js';

const NOMBRES_SUELO = { tierra: 'Tierra Negra', canada: 'Bajo / Cañada', tosca: 'Tosca Dura' };

export function useGisCalc() {
  const trazado = useStore((s) => s.trazado);
  const setTrazado = useStore((s) => s.setTrazado);
  const addVertice = useStore((s) => s.addVertice);
  const quitarUltimoVertice = useStore((s) => s.quitarUltimoVertice);
  const limpiarTrazado = useStore((s) => s.limpiarTrazado);
  const setSueloTramo = useStore((s) => s.setSueloTramo);
  const setModulo = useStore((s) => s.setModulo);

  const calc = useMemo(() => {
    const v = trazado.vertices;
    const cerrado = trazado.cerrado && v.length >= 3;
    const tramos = [];
    const nTramos = cerrado ? v.length : Math.max(0, v.length - 1);
    for (let i = 0; i < nTramos; i++) {
      const de = v[i];
      const a = v[(i + 1) % v.length];
      const metros = haversineM(de, a);
      const suelo = trazado.suelos[i] || 'tierra';
      tramos.push({ idx: i, tag: 'T' + (i + 1), de, a, metros, suelo, sueloNombre: NOMBRES_SUELO[suelo] });
    }
    const totalM = cerrado ? perimetroM(v) : distanciaTotalM(v);
    const areaM2 = cerrado ? areaEsfericaM2(v) : 0;
    return {
      tramos,
      totalM,
      totalKm: totalM / 1000,
      perimetroM: totalM,
      areaM2,
      hectareas: hectareasDe(areaM2),
      nEsquineros: cerrado ? v.length : (v.length >= 2 ? 2 : v.length),
      nVertices: v.length,
      cerrado
    };
  }, [trazado]);

  return {
    ...calc,
    modo: trazado.modo,
    capa: trazado.capa,
    vertices: trazado.vertices,
    setModo: (modo) => setTrazado({ modo }),
    setCapa: (capa) => setTrazado({ capa }),
    addVertice, quitarUltimoVertice, limpiarTrazado,
    cerrarPoligono: () => setTrazado({ cerrado: true }),
    abrirLinea: () => setTrazado({ cerrado: false }),
    setSueloTramo,
    irAInfraestructura: () => setModulo(2)
  };
}
