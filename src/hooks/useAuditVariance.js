/* useAuditVariance — control de costos reales y desvíos (Módulo 4).
   Base: el resumen aprobado del Módulo 3. KPIs verde/rojo. */
import { useMemo } from 'react';
import { useStore } from '../store.js';
import { calcularKPIs, fmtDesvio } from '../lib/calc.js';

const ESTADO_META = {
  ok:    { label: 'En Norma', tone: 'ok' },
  alerta:{ label: 'Tolerable', tone: 'warn' },
  sobre: { label: 'Sobrecosto', tone: 'bad' },
  sp:    { label: 'S/P', tone: 'muted' }
};

export function useAuditVariance() {
  const ejec = useStore((s) => s.ejec);
  const resumen = useStore((s) => s.resumen);
  const precios = useStore((s) => s.precios);
  const setEjec = useStore((s) => s.setEjec);
  const setReal = useStore((s) => s.setReal);
  const agregarGasto = useStore((s) => s.agregarGasto);

  const data = useMemo(() => {
    if (!resumen) return null;
    const preciosLista = Object.entries(precios).map(([codigo, precio]) => ({ codigo, precio }));
    const kpis = calcularKPIs({ resumen }, ejec, preciosLista);

    // Filas de auditoría: presupuestado vs real por material
    const porCodigo = {};
    for (const m of (resumen.materiales || [])) porCodigo[m.codigo] = m;
    const filas = [];
    const vistos = new Set();
    for (const m of (resumen.materiales || [])) {
      vistos.add(m.codigo);
      const real = (ejec.reales || {})[m.codigo];
      const cantReal = real ? parseFloat(real.cantidad) || 0 : 0;
      const puReal = real && real.precioUnit !== '' && real.precioUnit != null
        ? parseFloat(real.precioUnit) : (m.precioUnit || 0);
      const costoReal = cantReal * puReal;
      const difCant = cantReal - m.cantidad;
      const desvioARS = costoReal - m.costo;
      let estado = 'ok';
      if (m.costo === 0 && costoReal > 0) estado = 'sp';
      else if (desvioARS > m.costo * 0.05) estado = 'sobre';
      else if (desvioARS > 0) estado = 'alerta';
      filas.push({
        codigo: m.codigo, display: m.display, descripcion: m.descripcion, unidad: m.unidad,
        presupuestado: m.cantidad, real: cantReal, difCant, desvioARS,
        costoPres: m.costo, costoReal, estado, estadoMeta: ESTADO_META[estado]
      });
    }
    // Reales sin presupuesto (compras no previstas)
    for (const codigo of Object.keys(ejec.reales || {})) {
      if (vistos.has(codigo)) continue;
      const real = ejec.reales[codigo];
      const cantReal = parseFloat(real.cantidad) || 0;
      const puReal = parseFloat(real.precioUnit) || 0;
      filas.push({
        codigo, display: codigo, descripcion: 'Compra no presupuestada', unidad: 'u',
        presupuestado: 0, real: cantReal, difCant: cantReal, desvioARS: cantReal * puReal,
        costoPres: 0, costoReal: cantReal * puReal, estado: 'sp', estadoMeta: ESTADO_META.sp
      });
    }

    const avancePct = resumen.metros > 0 ? Math.min(100, (ejec.avanceM / resumen.metros) * 100) : 0;
    const margenContrato = resumen.margen ? resumen.margen.porc : 0;
    const margenProyPct = kpis.margenProy * 100;

    return {
      kpis,
      filas,
      avance: { pct: avancePct, mHechos: ejec.avanceM, mTotal: resumen.metros, dia: ejec.dias, diasTotales: ejec.diasTotales },
      margenContrato, margenProyPct, difPts: margenProyPct - margenContrato,
      balance: kpis.total.real - kpis.total.pres,
      dictamen: ejec.dictamen
    };
  }, [resumen, ejec, precios]);

  return {
    aprobada: ejec.aprobada,
    data, fmtDesvio,
    setEjec, setReal, agregarGasto,
    setDictamen: (dictamen) => setEjec({ dictamen })
  };
}
