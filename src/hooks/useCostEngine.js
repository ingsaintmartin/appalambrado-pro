/* useCostEngine — presupuestador / motor de costos (Módulo 3).
   Vinculado al Módulo 2: cualquier cambio de parámetros
   recalcula materiales y costos automáticamente. */
import { useMemo } from 'react';
import { useStore } from '../store.js';
import { PRECIOS_DEMO } from '../store.js';
import { calcularCotizacion, precioKmDesdeConsumo, TIPOS_ALAMBRADO, letraComprobante } from '../lib/calc.js';
import { distanciaTotalM, perimetroM } from '../lib/calc.js';

export function useCostEngine() {
  const trazado = useStore((s) => s.trazado);
  const mat = useStore((s) => s.mat);
  const precios = useStore((s) => s.precios);
  const costos = useStore((s) => s.costos);
  const obra = useStore((s) => s.obra);
  const numeroPresupuesto = useStore((s) => s.numeroPresupuesto);
  const empresa = useStore((s) => s.empresa);
  const setCostos = useStore((s) => s.setCostos);
  const aprobarObra = useStore((s) => s.aprobarObra);

  // Condición fiscal: monotributista → Factura C, el IVA no se discrimina
  // (el selector de IVA solo aplica a Responsable Inscripto: B sin IVA, A con IVA).
  const condicionFiscal = empresa?.condicionFiscal === 'ri' ? 'ri' : 'monotributo';
  const ivaElegido = costos.ivaModo || 'sin';
  const ivaModo = condicionFiscal === 'ri' ? ivaElegido : 'sin';
  const letra = letraComprobante(condicionFiscal, ivaModo);

  const cot = useMemo(() => {
    const v = trazado.vertices;
    const cerrado = trazado.cerrado && v.length >= 3;
    const metros = mat.usarManual && mat.metrosManual !== ''
      ? parseFloat(mat.metrosManual) || 0
      : (v.length >= 2 ? (cerrado ? perimetroM(v) : distanciaTotalM(v)) : 0);
    const preciosLista = Object.entries({ ...PRECIOS_DEMO, ...precios }).map(([codigo, precio]) => ({ codigo, precio }));
    const proyecto = {
      tipo: mat.patron,
      params: {
        suelo: mat.suelo, conTirantes: mat.conTirantes,
        tranquerasDetalle: mat.tranquerasDetalle || [],
        hilosElec: mat.hilosElec, refuerzoCadaM: mat.distRefuerzo, sepVarillas: mat.sepVarillas
      },
      medicion: { metros, poligono: cerrado, vertices: v },
      mo: { precioM: costos.precioM, metrosDesarme: costos.metrosDesarme, precioDesarme: costos.precioDesarme,
        tranqueras: (mat.tranquerasDetalle || []).length, precioTranquera: costos.precioTranquera },
      log: { km: costos.fleteKm, precioKm: costos.precioKm, viaticos: costos.viaticos },
      porc: { contingencia: costos.contingencia, margen: costos.margen },
      // Regla de dominio: materiales los pone el dueño (no se cotizan) + IVA configurable.
      // El IVA solo aplica a Responsable Inscripto; monotributista → 'sin' (Factura C).
      materialesDueno: costos.materialesDueno === true,
      ivaModo
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
      proyecto,
      letra,
      condicionFiscal
    };
  }, [trazado, mat, precios, costos, ivaModo, letra, condicionFiscal]);

  return {
    ...cot,
    obra, numeroPresupuesto,
    ivaElegido,
    margenPct: costos.margen,
    setMargen: (margen) => setCostos({ margen }),
    setCostos,
    precioKmDesdeConsumo,
    aprobar: () => aprobarObra({
      totalMateriales: cot.totalMateriales,
      totalMaterialesBruto: cot.totalMaterialesBruto,
      materialesDueno: cot.materialesDueno,
      iva: cot.iva,
      letra, condicionFiscal,
      manoObra: cot.manoObra, logistica: cot.logistica,
      subtotal: cot.subtotal, contingencia: cot.contingencia,
      margen: cot.margen, total: cot.total,
      materiales: cot.materiales.map((m) => ({ ...m })),
      metros: cot.metros, tipo: mat.patron
    })
  };
}
