/* Módulo 4 — Ejecución & Control de Desvíos.
   Default export Module4. Layout fiel al diseño Stitch:
   header de avance + tiempo cuadrilla, 4 KPI cards, tabla de
   auditoría presupuestado vs real, dictamen, carga de
   gastos/remitos, evidencia, acciones de cierre. */
import React, { useState } from 'react';
import { useAuditVariance } from '../hooks/useAuditVariance.js';
import { useStore } from '../store.js';
import { Card, Badge, Btn, Stepper, Field, EmptyState } from './ui.jsx';
import { fmtARS, fmtM, fmtNum, fmtPct, fmtFecha } from '../lib/format.js';
import { PlayCircle, Flag, FileText, Camera, Upload, Save } from 'lucide-react';

const ESTANDAR_M_DIA = 275;
const inputCls = 'mono border-[1.5px] border-line rounded-md px-2 py-1 min-h-[48px] bg-white w-full';

/* Barra de avance físico */
function BarraAvance({ pct }) {
  return (
    <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
      <div className="h-full bg-agro rounded-full transition-all" style={{ width: Math.min(100, Math.max(0, pct)) + '%' }} />
    </div>
  );
}

function tonoDesvio(k) {
  if (!k) return 'muted';
  if (k.sinPres) return 'muted';
  return k.ok ? 'ok' : 'bad';
}

function descargarTxt(texto, nombre) {
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function linea(label, valor) {
  return (label + ':').padEnd(26, ' ') + valor;
}

export default function Module4() {
  const { aprobada, data, fmtDesvio, setEjec, setReal, agregarGasto } = useAuditVariance();
  const setModulo = useStore((s) => s.setModulo);
  const obra = useStore((s) => s.obra);
  const ejec = useStore((s) => s.ejec);

  const [gasto, setGasto] = useState({ tipo: 'Remito materiales', insumo: '', cantidad: 1, importe: '', nota: '' });
  const [evidencia, setEvidencia] = useState([null, null, null]);

  if (!aprobada || !data) {
    return (
      <EmptyState
        title="Todavía no hay obra aprobada"
        sub="Aprobá el presupuesto en el Módulo 3 para empezar a controlar costos reales de obra."
        action={<Btn variant="primary" onClick={() => setModulo(3)}><Flag size={18} /> Ir al Módulo 3</Btn>}
      />
    );
  }

  const { kpis, filas, avance, margenContrato, margenProyPct, difPts, balance, dictamen } = data;
  const kTot = kpis.total || { pres: 0, real: 0, desvio: 0, ok: true, sinPres: false };

  // Eficiencia alambre: merma sobre filas cuyo código incluya 'alambre'
  const alambre = filas.filter((f) => (f.codigo || '').includes('alambre'));
  const albPres = alambre.reduce((s, f) => s + (parseFloat(f.presupuestado) || 0), 0);
  const albReal = alambre.reduce((s, f) => s + (parseFloat(f.real) || 0), 0);
  const mermaPct = albPres > 0 ? ((albReal - albPres) / albPres) * 100 : 0;
  const mermaTone = mermaPct <= 5 ? 'ok' : 'bad';

  // Rendimiento cuadrilla
  const diasUsados = Math.max(1, avance.dia || 1);
  const mPorDia = (avance.mHechos || 0) / diasUsados;
  const ritmoPct = ((mPorDia - ESTANDAR_M_DIA) / ESTANDAR_M_DIA) * 100;

  const imputar = () => {
    if (!gasto.insumo.trim() && !gasto.importe) return;
    agregarGasto({
      tipo: gasto.tipo,
      insumo: gasto.insumo.trim() || '—',
      cantidad: parseFloat(gasto.cantidad) || 0,
      importe: parseFloat(gasto.importe) || 0,
      nota: gasto.nota.trim(),
      fecha: new Date().toISOString()
    });
    setGasto({ tipo: 'Remito materiales', insumo: '', cantidad: 1, importe: '', nota: '' });
  };

  const filaTxt = (f) =>
    linea('  ' + f.display, 'pres ' + fmtNum(f.presupuestado) + ' ' + f.unidad + ' | real ' + fmtNum(f.real) + ' ' + f.unidad + ' | dif ' + (f.difCant >= 0 ? '+' : '') + fmtNum(f.difCant) + ' | desvío ' + fmtARS(f.desvioARS));

  const reporte = [
    'REPORTE DE DESVÍOS PARA PRODUCTOR — AppAlambrado Pro',
    linea('Obra', obra.nombre + ' · Lote ' + obra.lote),
    linea('Fecha', new Date().toLocaleDateString('es-AR')),
    linea('Avance físico', fmtPct(avance.pct) + ' (' + fmtM(avance.mHechos) + ' de ' + fmtM(avance.mTotal) + ')'),
    linea('Día de cuadrilla', avance.dia + ' / ' + avance.diasTotales),
    '',
    'KPI PRINCIPALES',
    linea('Costo acumulado real', fmtARS(kTot.real)),
    linea('Costo previsto (acumulado)', fmtARS(kTot.pres)),
    linea('Desvío total', fmtDesvio(kTot)),
    linea('Margen contrato', fmtPct(margenContrato)),
    linea('Margen final proyectado', fmtPct(margenProyPct)),
    '',
    'AUDITORÍA PRESUPUESTADO vs REAL',
    ...filas.map(filaTxt),
    '',
    linea('BALANCE NETO al ' + fmtPct(avance.pct, 0) + ' de avance', fmtARS(balance)),
    '',
    'DICTAMEN TÉCNICO',
    dictamen || '(sin dictamen cargado)'
  ].join('\n');

  const cierre = [
    'CIERRE Y LIQUIDACIÓN FINAL — AppAlambrado Pro',
    linea('Obra', obra.nombre + ' · Lote ' + obra.lote),
    linea('Fecha de cierre', new Date().toLocaleDateString('es-AR')),
    '',
    linea('Avance físico final', fmtPct(avance.pct)),
    linea('Días de cuadrilla', avance.dia + ' / ' + avance.diasTotales),
    linea('Costo total real', fmtARS(kTot.real)),
    linea('Costo previsto total', fmtARS(kTot.pres)),
    linea('Desvío económico', fmtARS(balance) + ' (' + fmtDesvio(kTot) + ')'),
    linea('Margen final proyectado', fmtPct(margenProyPct)),
    linea('Merma de alambre', fmtPct(mermaPct)),
    linea('Remitos imputados', fmtNum((ejec.otros || []).length)),
    '',
    'DICTAMEN TÉCNICO',
    dictamen || '(sin dictamen cargado)'
  ].join('\n');

  return (
    <div className="flex flex-col gap-4">
      {/* Header: obra en ejecución + avance + tiempo cuadrilla */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge tone="ok"><PlayCircle size={13} /> EN EJECUCIÓN</Badge>
            <span className="mono text-[12px] text-muted">Obra: {obra.nombre || '—'} · Lote {obra.lote || '—'}</span>
          </div>
          <h2 className="display font-bold text-[22px] leading-8">Ejecución &amp; Control de Desvíos</h2>
        </div>
        <Card className="md:w-[340px] shrink-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-muted">Avance físico</span>
            <span className="mono font-bold text-[16px]">{fmtPct(avance.pct)}</span>
          </div>
          <BarraAvance pct={avance.pct} />
          <div className="mono text-[12px] text-muted mt-1">{fmtM(avance.mHechos)} de {fmtM(avance.mTotal)} instalados</div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Field label="Metros hechos (m)">
              <Stepper value={ejec.avanceM || 0} onChange={(v) => setEjec({ avanceM: v })} min={0} max={avance.mTotal || 999999} step={50} format={fmtNum} />
            </Field>
            <Field label="Días de cuadrilla">
              <Stepper value={ejec.dias || 0} onChange={(v) => setEjec({ dias: v })} min={0} max={avance.diasTotales || 99} step={1} format={fmtNum} />
            </Field>
          </div>
          <div className="text-[12px] text-muted mt-2 mono">
            Tiempo de cuadrilla: Día <strong className="text-ink">{fmtNum(avance.dia)}</strong> de {fmtNum(avance.diasTotales)}
          </div>
        </Card>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Card>
          <div className="text-[12px] text-muted mb-0.5">Costo Acumulado vs Previsto</div>
          <div className="display font-bold text-[22px] leading-7 mono">{fmtARS(kTot.real)}</div>
          <div className="text-[12px] text-muted mono">Previsto: {fmtARS(kTot.pres)}</div>
          <div className="mt-1.5"><Badge tone={tonoDesvio(kTot)}>Desvío {fmtDesvio(kTot)}</Badge></div>
        </Card>
        <Card>
          <div className="text-[12px] text-muted mb-0.5">Margen Final Proyectado</div>
          <div className="display font-bold text-[22px] leading-7 mono">{fmtPct(margenProyPct)}</div>
          <div className="text-[12px] text-muted mono">Contrato: {fmtPct(margenContrato)}</div>
          <div className="mt-1.5">
            <Badge tone={difPts >= 0 ? 'ok' : 'bad'}>
              {difPts >= 0 ? '+' : ''}{difPts.toFixed(1).replace('.', ',')} pts
            </Badge>
          </div>
        </Card>
        <Card>
          <div className="text-[12px] text-muted mb-0.5">Rendimiento Cuadrilla</div>
          <div className="display font-bold text-[22px] leading-7 mono">{fmtNum(mPorDia)} <span className="text-[14px] text-muted">m/día</span></div>
          <div className="text-[12px] text-muted mono">Estándar: {fmtNum(ESTANDAR_M_DIA)} m/día</div>
          <div className="mt-1.5">
            <Badge tone={ritmoPct >= -5 ? 'ok' : 'warn'}>
              {ritmoPct >= 0 ? '+' : ''}{ritmoPct.toFixed(1).replace('.', ',')} % ritmo
            </Badge>
          </div>
        </Card>
        <Card>
          <div className="text-[12px] text-muted mb-0.5">Eficiencia Alambre</div>
          <div className="display font-bold text-[22px] leading-7 mono">{fmtPct(mermaPct)}</div>
          <div className="text-[12px] text-muted mono">Tolerado: 5 %</div>
          <div className="mt-1.5"><Badge tone={mermaTone}>{mermaTone === 'ok' ? 'Óptimo' : 'Merma alta'}</Badge></div>
        </Card>
      </div>

      {/* Tabla de auditoría */}
      <Card className="!p-0 overflow-hidden">
        <div className="p-4 pb-2">
          <h3 className="display font-bold text-[16px]">Auditoría Presupuestado vs. Real Consumido</h3>
          <p className="text-[13px] text-muted">Control físico de unidades desembarcadas en obra y desvíos financieros asociados al avance del {fmtPct(avance.pct, 0)}.</p>
        </div>
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-line">
                <th className="py-1.5 pr-2 font-semibold">Insumo / Rubro</th>
                <th className="py-1.5 pr-2 font-semibold text-right w-[90px]">Presupuestado</th>
                <th className="py-1.5 pr-2 font-semibold text-center w-[170px]">Real usado</th>
                <th className="py-1.5 pr-2 font-semibold text-right w-[90px]">Dif. Cant</th>
                <th className="py-1.5 pr-2 font-semibold text-right w-[110px]">Desvío Económico</th>
                <th className="py-1.5 font-semibold text-right w-[110px]">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.codigo} className="border-b border-line/60 align-top">
                  <td className="py-2 pr-2">
                    <div className="font-medium leading-4">{f.descripcion}</div>
                    <div className="mono text-[11px] text-muted">{f.display}</div>
                  </td>
                  <td className="py-2 pr-2 text-right mono whitespace-nowrap">{fmtNum(f.presupuestado)} {f.unidad}</td>
                  <td className="py-2 pr-2 text-center">
                    <Stepper
                      value={f.real} min={0} step={1} format={(v) => fmtNum(v) + ' ' + f.unidad}
                      onChange={(v) => setReal(f.codigo, v, '')}
                    />
                  </td>
                  <td className={'py-2 pr-2 text-right mono whitespace-nowrap font-semibold ' + (f.difCant > 0 ? 'text-bad' : f.difCant < 0 ? 'text-ok' : 'text-muted')}>
                    {(f.difCant > 0 ? '+' : '') + fmtNum(f.difCant)}
                  </td>
                  <td className={'py-2 pr-2 text-right mono whitespace-nowrap font-semibold ' + (f.desvioARS > 0 ? 'text-bad' : f.desvioARS < 0 ? 'text-ok' : 'text-muted')}>
                    {(f.desvioARS > 0 ? '+' : '') + fmtARS(f.desvioARS)}
                  </td>
                  <td className="py-2 text-right">
                    <Badge tone={f.estadoMeta.tone}>{f.estadoMeta.label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px] mono border-t border-line pt-3 mt-1">
            <span className="text-muted">Balance neto al {fmtPct(avance.pct, 0)} de avance</span>
            <span className={'font-bold ' + (balance > 0 ? 'text-bad' : 'text-ok')}>
              {(balance > 0 ? '+' : '') + fmtARS(balance)}
              <Badge tone={balance > 0 ? 'warn' : 'ok'} className="ml-2">{balance > 0 ? 'Desvío contenido' : 'Dentro de norma'}</Badge>
            </span>
          </div>
        </div>
      </Card>

      {/* Dictamen técnico */}
      <Card>
        <h3 className="display font-bold text-[16px] mb-1">Dictamen Técnico</h3>
        <textarea
          value={dictamen || ''}
          onChange={(e) => setDictamen(e.target.value)}
          rows={3}
          placeholder="Ej.: El incremento de 4 postes intermedios se debió a una pendiente no topografiada en la cañada del bajo…"
          className="w-full mono text-[13px] border-[1.5px] border-line rounded-md p-2 min-h-[96px] bg-white"
        />
      </Card>

      {/* Cargar gasto / remito + últimos remitos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="display font-bold text-[16px] mb-3">Cargar Gasto / Remito</h3>
          <div className="flex flex-col gap-3">
            <Field label="Tipo de comprobante / evento">
              <select value={gasto.tipo} onChange={(e) => setGasto({ ...gasto, tipo: e.target.value })} className={inputCls + ' min-h-[48px]'}>
                <option>Remito materiales</option>
                <option>Flete extra</option>
                <option>Otro</option>
              </select>
            </Field>
            <Field label="Insumo">
              <input type="text" value={gasto.insumo} onChange={(e) => setGasto({ ...gasto, insumo: e.target.value })}
                placeholder="Ej.: Postes quebracho" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cantidad">
                <Stepper value={gasto.cantidad} min={0} step={1} format={fmtNum}
                  onChange={(v) => setGasto({ ...gasto, cantidad: v })} />
              </Field>
              <Field label="Importe efectivo / remito ($ ARS)">
                <input type="number" inputMode="decimal" value={gasto.importe}
                  onChange={(e) => setGasto({ ...gasto, importe: e.target.value })}
                  placeholder="80.000" className={inputCls} />
              </Field>
            </div>
            <Field label="Nota técnica de campo">
              <input type="text" value={gasto.nota} onChange={(e) => setGasto({ ...gasto, nota: e.target.value })}
                placeholder="Ej.: Se descargaron 4 postes" className={inputCls} />
            </Field>
            <Btn variant="primary" onClick={imputar}>
              <Save size={18} /> Imputar a Partida de Obra
            </Btn>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="display font-bold text-[16px]">Últimos remitos imputados</h3>
              <span className="mono text-[12px] text-muted">{fmtNum((ejec.otros || []).length)} cargados</span>
            </div>
            {(ejec.otros || []).length === 0 ? (
              <p className="text-[13px] text-muted">Todavía no hay remitos. Cargá el primero en el formulario de al lado.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {[...(ejec.otros || [])].reverse().slice(0, 8).map((g) => (
                  <li key={g.id} className="rounded-md border border-line p-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px] leading-4">{g.tipo} — {g.insumo}</div>
                      <div className="mono text-[11px] text-muted">
                        {fmtFecha(g.fecha)} {g.cantidad ? '· ' + fmtNum(g.cantidad) + ' u' : ''}{g.nota ? ' · ' + g.nota : ''}
                      </div>
                    </div>
                    <div className="mono font-bold text-[14px] shrink-0">{fmtARS(g.importe)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Evidencia */}
      <Card>
        <h3 className="display font-bold text-[16px] mb-1">Evidencia de Obra &amp; Georreferenciación</h3>
        <p className="text-[13px] text-muted mb-3">Registro visual geoposicionado que fundamenta los desvíos presupuestarios aprobados en tranquera.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {evidencia.map((ev, i) => (
            <label key={i} className="block rounded-md border-[1.5px] border-dashed border-line bg-canvas/60 p-4 text-center cursor-pointer min-h-[120px] flex flex-col items-center justify-center gap-2">
              <input
                type="file" accept="image/*,video/*" capture="environment" className="hidden"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  const next = [...evidencia];
                  next[i] = f ? f.name : null;
                  setEvidencia(next);
                }}
              />
              <Camera size={24} className="text-muted" />
              {ev ? (
                <>
                  <span className="mono text-[12px] break-all">{ev}</span>
                  <Badge tone="info">GPS WGS84</Badge>
                </>
              ) : (
                <span className="text-[13px] text-muted">Tocá para capturar<br />o subir evidencia</span>
              )}
            </label>
          ))}
        </div>
      </Card>

      {/* Acciones de cierre */}
      <Card>
        <h3 className="display font-bold text-[16px] mb-1">Acciones de Auditoría y Control Final</h3>
        <p className="text-[13px] text-muted mb-3">Emití reportes de discrepancia para justificar ampliaciones presupuestarias ante el productor.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Btn variant="ghost"><Upload size={18} /> Ajustar Parámetros Futuros</Btn>
          <Btn variant="dark" onClick={() => descargarTxt(reporte, 'reporte_desvios_' + (obra.lote || 'obra') + '.txt')}>
            <FileText size={18} /> Reporte de Desvíos para Productor
          </Btn>
          <Btn variant="primary" onClick={() => {
            if (window.confirm('¿Cerrar la obra y emitir la liquidación final?')) descargarTxt(cierre, 'cierre_liquidacion_' + (obra.lote || 'obra') + '.txt');
          }}>
            <Flag size={18} /> Cierre y Liquidación Final
          </Btn>
        </div>
      </Card>
    </div>
  );
}
