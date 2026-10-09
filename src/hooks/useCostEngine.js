/* useCostEngine — presupuestador / motor de costos (Módulo 3).
   Vinculado al Módulo 2: cualquier cambio de parámetros
   recalcula materiales y costos automáticamente. */
import { useMemo } from 'react';
import { useStore } from '../store.js';
import { calcularCotizacion, precioKmDesdeConsumo, TIPOS_ALAMBRADO } from '../lib/calc.js';
import { distanciaTotalM, perimetroM } from '../lib/calc.js';

export function useCostEngine() {
  const trazado = useStore((s) => s.trazado);
  const mat = useStore((s) => s.mat);
  const precios = useStore((s) => s.precios);
  const costos = useStore((s) => s.costos);
  const obra = useStore((s) => s.obra);
  const numeroPresupuesto = useStore((s) => s.numeroPresupuesto);
  const setCostos = useStore((s) => s.setCostos);
  const aprobarObra = useStore((s) => s.aprobarObra);

  const cot = useMemo(() => {
    const v = trazado.vertices;
    const cerrado = trazado.cerrado && v.length >= 3;
    const metros = mat.usarManual && mat.metrosManual !== ''
      ? parseFloat(mat.metrosManual) || 0
      : (v.length >= 2 ? (cerrado ? perimetroM(v) : distanciaTotalM(v)) : 0);
    const preciosLista = Object.entries(precios).map(([codigo, precio]) => ({ codigo, precio }));
    const proyecto = {
      tipo: mat.patron,
      params: {
        suelo: mat.suelo, conTirantes: mat.conTirantes, tranqueras: mat.tranqueras,
        hilosElec: mat.hilosElec, refuerzoCadaM: mat.distRefuerzo, sepVarillas: mat.sepVarillas
      },
      medicion: { metros, poligono: cerrado, vertices: v },
      mo: { precioM: costos.precioM, metrosDesarme: costos.metrosDesarme, precioDesarme: costos.precioDesarme,
        tranqueras: mat.tranqueras, precioTranquera: costos.precioTranquera },
      log: { km: costos.fleteKm, precioKm: costos.precioKm, viaticos: costos.viaticos },
      porc: { contingencia: costos.contingencia, margen: costos.margen }
    };
    const r = calcularCotizacion(proyecto, preciosLista);
    return {
      ...r,
      costoDirecto: r.subtotal + r.contingencia.monto,
      porMetro: metros > 0 ? r.total / metros : 0,
      rentabilidad: r.total > 0 ? (r.margen.monto / r.total) * 100 : 0,
      puntoEquilibrio: metros > 0 ? (r.subtotal + r.contingencia.monto) / metros : 0,
      tipoNombre: (TIPOS_ALAMBRADO[mat.patron] || {}).nombre || mat.patron,
      metros,
      proyecto
    };
  }, [trazado, mat, precios, costos]);

  return {
    ...cot,
    obra, numeroPresupuesto,
    margenPct: costos.margen,
    setMargen: (margen) => setCostos({ margen }),
    setCostos,
    precioKmDesdeConsumo,
    aprobar: () => aprobarObra({
      totalMateriales: cot.totalMateriales,
      manoObra: cot.manoObra, logistica: cot.logistica,
      subtotal: cot.subtotal, contingencia: cot.contingencia,
      margen: cot.margen, total: cot.total,
      materiales: cot.materiales.map((m) => ({ ...m })),
      metros: cot.metros, tipo: mat.patron
    })
  };
}
