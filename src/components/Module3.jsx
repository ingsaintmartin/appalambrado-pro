/* Módulo 3 — Presupuesto & Motor de Costos.
   Default export Module3. Layout fiel al diseño Stitch:
   banner de alerta, header con total, fila meta, grid 2x2 de
   cuadrantes A/B/C/D, resumen ejecutivo dark y cierre. */
import React from 'react';
import { useCostEngine } from '../hooks/useCostEngine.js';
import { useStore } from '../store.js';
import { Card, Badge, Btn, Chip, SliderRow, Stepper, SectionTitle, Field, Toggle } from './ui.jsx';
import { fmtARS, fmtM, fmtM2, fmtNum, fmtPct, fmtFecha, fechaLocalCorta } from '../lib/format.js';
import { generarPresupuestoPDF } from '../lib/pdf.js';
import { compartirPresupuesto, descargarPDF } from '../lib/share.js';
import { hectareasDe } from '../lib/calc.js';
import { AlertTriangle, MessageCircle, FileDown, CheckCircle2, CalendarDays, Ruler, Shapes, Timer } from 'lucide-react';

const inputNum = 'mono text-right border-[1.5px] border-line rounded-md px-2 py-1 min-h-[44px] bg-white w-full';

/* Input de precio unitario por fila de material (edita precios en vivo) */
function PrecioInput({ codigo, valor, sinPrecio }) {
  const setPrecio = useStore((s) => s.setPrecio);
  return (
    <input
      type="number" min="0" inputMode="decimal"
      value={valor === null || valor === undefined ? '' : valor}
      placeholder={sinPrecio ? 'S/P' : '0'}
      onChange={(e) => setPrecio(codigo, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
      className={inputNum + (sinPrecio ? ' border-warn/60 bg-warnbg/40' : '')}
      aria-label={'Precio de ' + codigo}
    />
  );
}

/* Input numérico compacto para parámetros de costo */
function NumInput({ value, onChange, step = 1, format }) {
  return (
    <input
      type="number" step={step} inputMode="decimal"
      value={value === null || value === undefined ? '' : value}
      onChange={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
      className={inputNum}
    />
  );
}

function MetaItem({ icon, label, value }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
        {icon}{label}
      </div>
      <div className="mono font-semibold text-[14px] mt-0.5 truncate">{value}</div>
    </div>
  );
}

export default function Module3() {
  const eng = useCostEngine();
  const costos = useStore((s) => s.costos);
  const empresa = useStore((s) => s.empresa);

  // Mapeo a cuadrantes (nomenclatura del diseño A/B/C/D)
  const cuadA = { items: eng.materiales || [], subtotal: eng.totalMateriales || 0 };
  const faltantes = eng.faltantes || [];
  const dueno = eng.materialesDueno === true;
  const iva = eng.iva || { modo: 'sin', porc: 0, monto: 0 };
  const condicionFiscal = eng.condicionFiscal || 'monotributo';
  const letra = eng.letra || 'C';
  const esRI = condicionFiscal === 'ri';
  const mo = eng.manoObra || { nuevo: 0, desarme: 0, tranqueras: 0, total: 0, detalle: {} };
  const moD = mo.detalle || {};
  const cuadC = { flete: eng.logistica?.flete || 0, viaticos: eng.logistica?.viaticos || 0, total: eng.logistica?.total || 0, detalle: eng.logistica?.detalle || {} };
  const cuadD = { porc: eng.margen?.porc || 0, monto: eng.margen?.monto || 0 };
  const obra = eng.obra || {};
  const numero = eng.numeroPresupuesto || '';
  const metros = eng.metros || 0;
  const diasTotales = useStore((s) => s.ejec.diasTotales) || 14;

  const hoy = new Date();
  const vto = new Date(hoy.getTime() + 15 * 86400000);
  const fechaHoy = hoy.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const precioKmSug = eng.precioKmDesdeConsumo ? eng.precioKmDesdeConsumo(8, 2800) : 0;

  const docPDF = () => ({
    empresa: empresa || undefined,
    numero,
    letra,
    fecha: fechaLocalCorta(hoy),
    validezDias: 15,
    cliente: { nombre: obra.nombre || '—', campo: obra.lote || '', localidad: obra.localidad || '' },
    tipoNombre: eng.tipoNombre,
    metros,
    poligono: !!eng.proyecto?.medicion?.poligono,
    hectareas: eng.proyecto?.medicion?.poligono
      ? Math.round(hectareasDe(eng.proyecto.medicion.vertices || []) * 10) / 10
      : 0,
    materialesDueno: dueno,
    materiales: cuadA.items.map((it) => ({
      cantidad: it.cantidad, unidad: it.unidad, descripcion: it.display + ' · ' + it.descripcion,
      precioUnit: it.precioUnit || 0, costo: it.costo || 0
    })),
    totalMateriales: cuadA.subtotal,
    manoObra: { nuevo: mo.nuevo, desarme: mo.desarme, tranqueras: mo.tranqueras, total: mo.total },
    logistica: { flete: cuadC.flete, viaticos: cuadC.viaticos, total: cuadC.total },
    subtotal: eng.subtotal || 0,
    contingencia: eng.contingencia || { porc: 0, monto: 0 },
    margen: eng.margen || { porc: 0, monto: 0 },
    iva: { modo: iva.modo, porc: iva.porc, monto: iva.monto },
    total: eng.total || 0,
    faltantes: dueno ? [] : faltantes,
    observaciones: 'Válido 15 días corridos. Precios siderúrgicos Acindar / Quebracho sujetos a revisión quincenal por volatilidad cambiaria.'
      + (dueno ? ' Los materiales los provee el dueño.' : '')
  });

  const proyectoParaShare = () => ({
    cliente: obra.nombre, campo: obra.lote, tipo: eng.proyecto?.tipo,
    medicion: { metros, poligono: !!eng.proyecto?.medicion?.poligono }
  });

  const resumenLike = () => ({
    totalMateriales: cuadA.subtotal,
    totalMaterialesBruto: eng.totalMaterialesBruto || 0,
    materialesDueno: dueno,
    iva: { modo: iva.modo, porc: iva.porc, monto: iva.monto },
    letra, condicionFiscal,
    manoObra: { total: mo.total },
    logistica: { total: cuadC.total },
    subtotal: eng.subtotal || 0,
    contingencia: eng.contingencia || { porc: 0, monto: 0 },
    margen: eng.margen || { porc: 0, monto: 0 },
    total: eng.total || 0,
    faltantes: dueno ? [] : faltantes
  });

  const nombreArchivo = 'presupuesto_' + numero + '.pdf';
  const handleShare = async () => {
    const blob = generarPresupuestoPDF(docPDF());
    await compartirPresupuesto(proyectoParaShare(), resumenLike(), blob, nombreArchivo);
  };
  const handlePdf = () => {
    const blob = generarPresupuestoPDF(docPDF());
    descargarPDF(blob, nombreArchivo);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Banner de alerta: validez + volatilidad siderúrgica */}
      <div className="card-hd p-3 border-warn/50 bg-warnbg/60">
        <div className="flex items-start gap-2 text-[13px]">
          <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
          <p className="text-ink">
            <strong>Alerta de Insumos:</strong> Lista de precios siderúrgicos Acindar / Quebracho sujeta a revisión quincenal por volatilidad cambiaria.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge tone="warn">Validez: 15 días corridos</Badge>
          <Badge tone="warn">Vto: {fmtFecha(vto.toISOString())}</Badge>
        </div>
      </div>

      {/* Header del módulo */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Chip className="bg-agro text-white border-agro-deep font-bold">{numero}</Chip>
            <Chip className="bg-quebracho text-white border-quebracho-d font-bold">Factura {letra}</Chip>
            <Chip>Versión R3</Chip>
            <Chip className="text-satblue border-satblue/40">Norma IRAM 7 Hilos</Chip>
          </div>
          <h2 className="display font-bold text-[24px] leading-8">Presupuesto &amp; Motor de Costos</h2>
          <p className="text-[14px] text-muted mt-0.5">
            Establecimiento: <strong className="text-ink">{obra.nombre || '—'}</strong>
            {obra.lote ? <span> — Lote <strong className="text-ink">{obra.lote}</strong></span> : null}
            {obra.localidad ? <span className="text-muted"> ({obra.localidad})</span> : null}
          </p>
        </div>
        <div className="card-hd p-3 text-right shrink-0 bg-agro/5">
          <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">Total estimado final</div>
          <div className="display font-bold text-[30px] leading-9 mono text-agro">{fmtARS(eng.total)}</div>
          <div className="mono text-[13px] text-muted">{fmtARS(eng.porMetro)} / m lineal</div>
        </div>
      </div>

      {/* Fila meta */}
      <Card className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetaItem icon={<CalendarDays size={13} />} label="Fecha de cómputo" value={fechaHoy} />
        <MetaItem icon={<Ruler size={13} />} label="Longitud trazada" value={fmtM(metros)} />
        <MetaItem icon={<Shapes size={13} />} label="Esquema" value={eng.tipoNombre || '—'} />
        <MetaItem icon={<Timer size={13} />} label="Plazo estimado" value={fmtNum(diasTotales) + ' días operativos'} />
      </Card>

      {/* Grid 2x2 de cuadrantes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* A — Materiales */}
        <Card className="!p-0 overflow-hidden">
          <div className="p-4 pb-2 flex items-start justify-between gap-3">
            <SectionTitle n="A" title="Materiales e Insumos" sub="Sincronizado con Módulo 2 (despiece físico)" />
            <div className="text-right shrink-0">
              <div className="text-[11px] text-muted uppercase font-semibold tracking-wide">Subtotal materiales</div>
              <div className="display font-bold text-[20px] mono">{dueno ? '—' : fmtARS(cuadA.subtotal)}</div>
            </div>
          </div>
          <div className="px-4 pb-2">
            <Toggle
              checked={dueno}
              onChange={(v) => eng.setCostos({ materialesDueno: v })}
              label={<span><strong>Materiales provistos por el dueño</strong> <span className="text-muted">(no se cotizan, solo cantidades)</span></span>}
            />
          </div>
          {!dueno && faltantes.length > 0 && (
            <div className="px-4 pb-2">
              <Badge tone="warn">Faltan precios: {faltantes.length} ({faltantes.slice(0, 3).join(', ')}{faltantes.length > 3 ? '…' : ''})</Badge>
            </div>
          )}
          {dueno && (
            <div className="px-4 pb-2">
              <Badge tone="muted">Cantidades informativas — el dueño provee los materiales</Badge>
            </div>
          )}
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-[13px] min-w-[520px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-line">
                  <th className="py-1.5 pr-2 font-semibold">Insumo / Especificación</th>
                  <th className="py-1.5 pr-2 font-semibold text-right w-[70px]">Cant.</th>
                  {!dueno && <th className="py-1.5 pr-2 font-semibold text-right w-[110px]">Unitario (ARS)</th>}
                  {!dueno && <th className="py-1.5 font-semibold text-right w-[100px]">Total (ARS)</th>}
                </tr>
              </thead>
              <tbody>
                {cuadA.items.map((it) => (
                  <tr key={it.codigo} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-2">
                      <div className="font-medium leading-4">{it.descripcion}</div>
                      <div className="mono text-[11px] text-muted">{it.display}{it.detalle ? ' · ' + it.detalle : ''}</div>
                    </td>
                    <td className="py-2 pr-2 text-right mono whitespace-nowrap">{fmtNum(it.cantidad)} {it.unidad}</td>
                    {!dueno && (
                      <td className="py-2 pr-2">
                        <PrecioInput codigo={it.codigo} valor={it.precioUnit} sinPrecio={it.sinPrecio} />
                      </td>
                    )}
                    {!dueno && (
                      <td className="py-2 text-right mono font-semibold whitespace-nowrap">
                        {it.sinPrecio ? <span className="text-warn">S/P</span> : fmtARS(it.costo)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* B — Mano de Obra */}
        <Card className="!p-0 overflow-hidden">
          <div className="p-4 pb-2 flex items-start justify-between gap-3">
            <SectionTitle n="B" title="Mano de Obra Especializada" sub="Cuadrilla de 4 alambradores oficiales" />
            <div className="text-right shrink-0">
              <div className="text-[11px] text-muted uppercase font-semibold tracking-wide">Subtotal cuadrilla</div>
              <div className="display font-bold text-[20px] mono text-quebracho">{fmtARS(mo.total)}</div>
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">IVA sobre mano de obra</div>
            {!esRI ? (
              <div className="rounded-md border border-line bg-canvas/60 px-3 py-2.5 text-[13px] text-muted">
                Monotributista → <strong className="text-ink">Factura C</strong> (precio final, sin IVA discriminado).
                <span className="block mt-0.5">Para discriminar IVA, cambiá a Responsable Inscripto en <strong className="text-ink">Empresa</strong>.</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="IVA sobre mano de obra">
                  {[
                    { v: 'sin', t: 'Sin IVA (B)' },
                    { v: '10.5', t: 'IVA 10,5 % (A)' },
                    { v: '21', t: 'IVA 21 % (A)' }
                  ].map((op) => (
                    <button
                      key={op.v}
                      role="radio"
                      aria-checked={iva.modo === op.v}
                      onClick={() => eng.setCostos({ ivaModo: op.v })}
                      className={'rounded-md border-[1.5px] px-2 py-2 min-h-[48px] text-[13px] font-semibold ' +
                        (iva.modo === op.v ? 'bg-agro text-white border-agro-deep' : 'bg-white border-line text-ink')}
                    >
                      {op.t}
                    </button>
                  ))}
                </div>
                {iva.modo !== 'sin' && (
                  <div className="mono text-[13px] text-muted mt-1.5">
                    IVA {String(iva.porc).replace('.', ',')} % s/ mano de obra: <strong className="text-ink">{fmtARS(iva.monto)}</strong>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="px-4 pb-4 flex flex-col gap-3">
            <div className="rounded-md border border-line bg-canvas/60 p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="font-semibold text-[14px]">Tendido de Alambrado Nuevo</div>
                <div className="mono font-bold">{fmtARS(mo.nuevo)}</div>
              </div>
              <div className="text-[12px] text-muted mono mb-2">
                {fmtM(moD.metros || metros)} lineales × {fmtARS(moD.precioM)} / m
              </div>
              <Field label="Precio por metro ($/m)">
                <Stepper value={costos.precioM} onChange={(v) => eng.setCostos({ precioM: v })} min={0} step={25} format={fmtARS} />
              </Field>
            </div>
            <div className="rounded-md border border-line bg-canvas/60 p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="font-semibold text-[14px]">Desarme &amp; Retiro de Viejo</div>
                <div className="mono font-bold">{fmtARS(mo.desarme)}</div>
              </div>
              <div className="text-[12px] text-muted mono mb-2">
                {fmtM(moD.metrosDesarme)} lineales × {fmtARS(moD.precioDesarme)} / m
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Metros desarme">
                  <NumInput value={costos.metrosDesarme} onChange={(v) => eng.setCostos({ metrosDesarme: v })} step={50} />
                </Field>
                <Field label="Precio $/m">
                  <NumInput value={costos.precioDesarme} onChange={(v) => eng.setCostos({ precioDesarme: v })} step={25} />
                </Field>
              </div>
            </div>
            <div className="rounded-md border border-line bg-canvas/60 p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="font-semibold text-[14px]">Alineación e Inst. Tranqueras</div>
                <div className="mono font-bold">{fmtARS(mo.tranqueras)}</div>
              </div>
              <div className="text-[12px] text-muted mono mb-2">
                {fmtNum(moD.tranqueras)} unidades × {fmtARS(moD.precioTranquera)} / un
              </div>
              <Field label="Precio por tranquera ($/un)">
                <Stepper value={costos.precioTranquera} onChange={(v) => eng.setCostos({ precioTranquera: v })} min={0} step={5000} format={fmtARS} />
              </Field>
            </div>
          </div>
        </Card>

        {/* C — Logística */}
        <Card className="!p-0 overflow-hidden">
          <div className="p-4 pb-2 flex items-start justify-between gap-3">
            <SectionTitle n="C" title="Logística, Viáticos & Imprevistos" sub="Soporte territorial de cuadrilla" />
            <div className="text-right shrink-0">
              <div className="text-[11px] text-muted uppercase font-semibold tracking-wide">Subtotal logística</div>
              <div className="display font-bold text-[20px] mono">{fmtARS(cuadC.total)}</div>
            </div>
          </div>
          <div className="px-4 pb-4 flex flex-col gap-3">
            <div className="rounded-md border border-line bg-canvas/60 p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="font-semibold text-[14px]">Flete Rural</div>
                <div className="mono font-bold">{fmtARS(cuadC.flete)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Km (ida)">
                  <NumInput value={costos.fleteKm} onChange={(v) => eng.setCostos({ fleteKm: v })} step={10} />
                </Field>
                <Field label="$/km">
                  <NumInput value={costos.precioKm} onChange={(v) => eng.setCostos({ precioKm: v })} step={100} />
                </Field>
              </div>
              <div className="text-[12px] text-muted mt-1">
                km × l/km × $/l — ej.: consumo 8 l/km × $2.800/l = <span className="mono">{fmtARS(precioKmSug)}/km</span>
              </div>
            </div>
            <div className="rounded-md border border-line bg-canvas/60 p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="font-semibold text-[14px]">Víveres &amp; Viáticos</div>
                <div className="mono font-bold">{fmtARS(cuadC.viaticos)}</div>
              </div>
              <Field label="Puesto rural, gas y racionamiento (ARS)">
                <Stepper value={costos.viaticos} onChange={(v) => eng.setCostos({ viaticos: v })} min={0} step={20000} format={fmtARS} />
              </Field>
            </div>
            <div className="rounded-md border border-line bg-canvas/60 p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="font-semibold text-[14px]">Contingencias</div>
                <div className="mono font-bold">{fmtARS(eng.contingencia?.monto || 0)}</div>
              </div>
              <SliderRow
                label="Fondo amortiguador rotura de mechas y zanjas"
                value={costos.contingencia} min={0} max={15} step={0.5}
                onChange={(v) => eng.setCostos({ contingencia: v })}
                format={(v) => fmtPct(v)} hint="0% a 15% sobre la base de costos directos"
              />
            </div>
            <div className="flex items-baseline justify-between text-[13px] mono border-t border-line pt-2">
              <span className="text-muted">Base Costos Directos (A + B + C)</span>
              <strong>{fmtARS(eng.subtotal)}</strong>
            </div>
          </div>
        </Card>

        {/* D — Margen */}
        <Card className="!p-0 overflow-hidden">
          <div className="p-4 pb-2 flex items-start justify-between gap-3">
            <SectionTitle n="D" title="Margen de Beneficio & Utilidad" sub="Retorno neto sobre operación técnica" />
            <div className="text-right shrink-0">
              <div className="text-[11px] text-muted uppercase font-semibold tracking-wide">Ganancia proyectada</div>
              <div className="display font-bold text-[20px] mono text-ok">{fmtARS(cuadD.monto)}</div>
            </div>
          </div>
          <div className="px-4 pb-4 flex flex-col gap-3">
            <div className="rounded-md border border-line bg-canvas/60 p-3">
              <SliderRow
                label="Margen de Utilidad Bruta Deseado"
                value={eng.margenPct} min={10} max={40} step={0.5}
                onChange={(v) => eng.setMargen(v)}
                format={(v) => fmtPct(v)}
                hint="Conservador (10%) · Estándar rural (20–25%) · Alto riesgo / Terreno difícil (40%)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-line bg-okbg/60 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted font-semibold">Rentabilidad s/ venta</div>
                <div className="display font-bold text-[20px] mono text-ok">{fmtPct(eng.rentabilidad || 0)}</div>
              </div>
              <div className="rounded-md border border-line bg-canvas/60 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted font-semibold">Punto de equilibrio</div>
                <div className="display font-bold text-[20px] mono">{fmtARS(eng.puntoEquilibrio)}</div>
                <div className="text-[12px] text-muted mono">/ metro</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Resumen Ejecutivo dark */}
      <div className="card-hd-dark p-4 md:p-6">
        <div className="text-[11px] font-semibold tracking-widest uppercase text-white/70 mb-1">Resumen ejecutivo de liquidación</div>
        <h3 className="display font-bold text-[22px] leading-7 md:text-[26px] md:leading-8 mb-1">Total Presupuestado Llave en Mano</h3>
        <p className="text-[13px] text-white/70 max-w-2xl mb-4">
          {dueno
            ? 'No incluye materiales (los provee el dueño). Incluye replanteo, mano de obra de cuadrilla y logística integral.'
            : 'Incluye provisión completa de materiales, replanteo láser/RTK, desmontaje parcial, mano de obra de cuadrilla y logística integral a tranquera abierta.'}
          {iva.modo !== 'sin' && ' Más IVA ' + String(iva.porc).replace('.', ',') + ' % sobre mano de obra.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-md border border-white/20 bg-white/5 p-3">
            <div className="text-[11px] uppercase tracking-wide text-white/60 font-semibold">Costo directo puro <span className="mono">A + B + C</span></div>
            <div className="display font-bold text-[22px] mono">{fmtARS(eng.costoDirecto)}</div>
          </div>
          <div className="rounded-md border border-white/20 bg-white/5 p-3">
            <div className="text-[11px] uppercase tracking-wide text-white/60 font-semibold">Utilidad <span className="mono">Margen: {fmtPct(cuadD.porc)}</span></div>
            <div className="display font-bold text-[22px] mono text-[#ffd166]">{fmtARS(cuadD.monto)}</div>
          </div>
          <div className="rounded-md border border-[#128c7e]/60 bg-whatsapp/15 p-3">
            <div className="text-[11px] uppercase tracking-wide text-white/60 font-semibold">Valor final liquidación</div>
            <div className="display font-bold text-[28px] mono text-white">{fmtARS(eng.total)}</div>
            <div className="mono text-[13px] text-white/70">{fmtARS(eng.porMetro)} / m lineal</div>
            {iva.modo !== 'sin' && (
              <div className="mono text-[12px] text-white/70 mt-1">
                Incluye IVA {String(iva.porc).replace('.', ',')} % s/ MO: {fmtARS(iva.monto)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Condiciones de contratación + acciones */}
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h4 className="display font-bold text-[16px] mb-1">Condiciones de Contratación &amp; Cierre</h4>
          <p className="text-[13px] text-muted">
            50% Anticipo para acopio de postes/alambre — 50% al certificar fin de obra. Presupuesto válido 15 días corridos ({fmtFecha(vto.toISOString())}).
          </p>
        </div>
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2 w-full md:w-auto">
          <Btn variant="whatsapp" onClick={handleShare}>
            <MessageCircle size={18} /> Compartir WhatsApp
          </Btn>
          <Btn variant="dark" onClick={handlePdf}>
            <FileDown size={18} /> Exportar PDF Formal
          </Btn>
          <Btn variant="primary" onClick={() => eng.aprobar()}>
            <CheckCircle2 size={18} /> Aprobar &amp; Controlar Obra
          </Btn>
        </div>
      </Card>
    </div>
  );
}
