/* Módulo 2 — Infraestructura & Hilos (parámetros de materiales).
   Card GIS vinculado, selección de patrón, corte transversal SVG,
   parámetros de insumos (01–06) con cálculos en vivo, y sidebar
   con la Lista de Materiales (BOM): precios por renglón, peso,
   camión sugerido, exportar TXT y compartir por WhatsApp. */
import React, { useState } from 'react';
import {
  Globe, Zap, Columns3, CheckCircle2, Ruler, ShieldCheck,
  Download, Share2, FileText, Sprout, Droplets, Mountain,
  Check, Link2, DoorOpen, DraftingCompass, Trash2, Plus, TriangleAlert
} from 'lucide-react';
import { useStore } from '../store.js';
import { useFenceMaterials } from '../hooks/useFenceMaterials.js';
import { fmtM, fmtNum } from '../lib/format.js';
import { TIPOS_PALO } from '../lib/esquema.js';
import { TIPOS_ALAMBRE, tipoAlambre, ESPECIES_MADERA, especieMadera } from '../lib/calc.js';
import {
  agregarTranquera, normalizarTranquera, textoAnchoTranquera, aporteTranquera,
  ANCHOS_TRANQUERA, ANCHOS_TRANQUERON, anchoDefaultTranquera
} from '../lib/calc.js';
import { Card, Badge, Btn, Chip, SliderRow, Stepper, SectionTitle, Toggle, EmptyState, Field } from './ui.jsx';
import CorteReactivo from './CorteReactivo.jsx';
import EsquemaPlanta from './EsquemaPlanta.jsx';

const PATRONES = [
  {
    id: 'suspendido7', titulo: 'Tradicional Suspendido', icon: Globe,
    desc: '7 Hilos (5 lisos 17/15 Alta Resistencia + 2 púas Super Bagual). Separación de postes hasta 80m con varillado denso elástico. Versión configurable: 1-10 hilos.',
    chips: ['Mixto configurable', 'Alta Tensión']
  },
  {
    id: 'convencional', titulo: 'Convencional Firme', icon: Columns3,
    desc: 'Viga a viga con 6 hilos lisos. Postes quebracho cada 12-15 metros fijos con menor cantidad de varillas intermedias.',
    chips: ['6 Hilos Lisos', 'Poste cada 15m']
  },
  {
    id: 'electrico', titulo: 'Eléctrico Boyero', icon: Zap,
    desc: '1 a 3 hilos electroplásticos/aluminizados sobre postes livianos y varillas aisladoras. Especial para rotativo o subdivisión liviana.',
    chips: ['1-3 Hilos Electrificados', 'Aisladores Rígidos']
  }
];

const SUELOS = [
  { v: 'tierra', n: 'Tierra Negra', icon: Sprout, nota: 'Normal 12m' },
  { v: 'canada', n: 'Bajo / Cañada', icon: Droplets, nota: 'Reforzado 8m' },
  { v: 'tosca', n: 'Tosca Dura', icon: Mountain, nota: 'Barreno req.' }
];

function descargarTxt(nombre, texto) {
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function PrecioInput({ codigo }) {
  const precios = useStore((s) => s.precios);
  const setPrecio = useStore((s) => s.setPrecio);
  return (
    <div className="flex items-center gap-1">
      <span className="mono text-[12px] text-muted">$</span>
      <input
        type="number" min="0"
        value={precios[codigo] ?? ''}
        onChange={(e) => setPrecio(codigo, parseFloat(e.target.value) || 0)}
        className="field w-[104px] text-right mono text-[13px] py-1.5!"
        aria-label={'Precio ' + codigo}
      />
    </div>
  );
}

/* Editor de tranqueras ubicadas en la línea.
   Robusto: el input de posición es texto con inputMode decimal (evita los
   quirks de type="number" en mobile/desktop y acepta coma decimal argentina);
   la inserción pasa por agregarTranquera() (pura, testeada) que nunca falla
   en silencio: si algo está mal muestra el error en vez de no hacer nada. */
function TranquerasEditor({ detalle, metros, margen, onChange }) {
  const [pos, setPos] = useState('');
  const [tipo, setTipo] = useState('tranquera');
  const [ancho, setAncho] = useState(String(anchoDefaultTranquera('tranquera')));
  const [error, setError] = useState('');
  const L = Math.max(0, parseFloat(metros) || 0);
  const mg = Math.max(0, parseFloat(margen) || 0);
  const det = Array.isArray(detalle) ? detalle : [];
  const anchos = tipo === 'tranqueron' ? ANCHOS_TRANQUERON : ANCHOS_TRANQUERA;

  const elegirTipo = (t) => {
    setTipo(t);
    setAncho(String(anchoDefaultTranquera(t)));
    setError('');
  };
  const agregar = () => {
    const r = agregarTranquera(det, pos, tipo, ancho, L);
    if (!r.ok) { setError(r.error); return; }
    setError('');
    onChange(r.detalle);
    setPos('');
  };
  const quitar = (i) => onChange(det.filter((_, j) => j !== i));
  const cambiar = (i, patch) => {
    const t = normalizarTranquera({ ...det[i], ...patch });
    onChange(det.map((x, j) => (j === i ? t : x)));
  };

  return (
    <div className="flex flex-col gap-2">
      {det.map((t0, i) => {
        const t = normalizarTranquera(t0);
        const anchosFila = t.tipo === 'tranqueron' ? ANCHOS_TRANQUERON : ANCHOS_TRANQUERA;
        return (
          <div key={i} className="flex items-center gap-2 rounded-md border border-line bg-canvas-2 p-2 flex-wrap">
            <DoorOpen size={18} className="text-quebracho shrink-0" />
            <select value={t.tipo} onChange={(e) => cambiar(i, { tipo: e.target.value, anchoM: anchoDefaultTranquera(e.target.value) })}
              className="field mono text-[13px] py-2!" aria-label="Tipo">
              <option value="tranquera">Tranquera</option>
              <option value="tranqueron">Tranquerón</option>
            </select>
            <select value={String(t.anchoM)} onChange={(e) => cambiar(i, { anchoM: parseFloat(e.target.value) })}
              className="field mono text-[13px] py-2!" aria-label="Ancho en metros">
              {anchosFila.map((a) => (
                <option key={a} value={String(a)}>{textoAnchoTranquera(a)}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 mono text-[13px]">
              <input type="text" inputMode="decimal" value={String(t.pos)}
                onChange={(e) => {
                  const v = e.target.value.replace(',', '.');
                  if (v === '' || /^\d*\.?\d*$/.test(v)) {
                    const p = parseFloat(v);
                    if (v === '' || !isNaN(p)) cambiar(i, { pos: v === '' ? 0 : Math.min(L, Math.max(0, p)) });
                  }
                }}
                className="field w-[80px] text-right mono text-[13px] py-2!" aria-label="Posición en metros" />
              m desde inicio
            </label>
            <span className="mono text-[11px] text-muted">→ 2 esq. + puntales</span>
            {(() => { const ap = aporteTranquera(t, L, mg); return (
              <span className="mono text-[11px] font-bold text-agro">
                {ap.ubicacion === 'extremo' ? '· extremo' : '· medio'} → +{ap.esquineros} esq +{ap.puntales} puntal{ap.puntales === 1 ? '' : 'es'}{ap.compartePuntal ? ' (el del esquinero)' : ''}
              </span>
            ); })()}
            <button onClick={() => quitar(i)} className="ml-auto w-10 h-10 rounded-md border-[1.5px] border-bad/50 text-bad flex items-center justify-center" aria-label="Quitar">
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={tipo} onChange={(e) => elegirTipo(e.target.value)} className="field mono text-[13px] py-2.5!" aria-label="Tipo de nueva tranquera">
          <option value="tranquera">Tranquera</option>
          <option value="tranqueron">Tranquerón</option>
        </select>
        <select value={ancho} onChange={(e) => { setAncho(e.target.value); setError(''); }}
          className="field mono text-[13px] py-2.5!" aria-label="Ancho en metros">
          {anchos.map((a) => (
            <option key={a} value={String(a)}>{textoAnchoTranquera(a)}</option>
          ))}
        </select>
        <input type="text" inputMode="decimal" value={pos}
          onChange={(e) => {
            const v = e.target.value.replace(',', '.');
            if (/^\d*\.?\d*$/.test(v)) { setPos(e.target.value); setError(''); }
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }}
          placeholder={'Posición en m (0–' + Math.round(L) + ')'}
          className="field mono text-[13px] w-[190px]" aria-label="Posición" />
        <Btn className="min-h-[44px]! text-[13px]!" onClick={agregar}>
          <Plus size={16} /> Ubicar en la línea
        </Btn>
      </div>
      {error && (
        <div className="mono text-[12px] text-bad font-semibold flex items-center gap-1.5" role="alert">
          <TriangleAlert size={14} className="shrink-0" /> {error}
        </div>
      )}
      <div className="mono text-[12px] text-muted flex items-center gap-1.5">
        <TriangleAlert size={14} className="text-warn shrink-0" />
        Se ven en el mapa (Módulo 1), en la vista en planta y en el BOM con sus postes y herrajes.
      </div>
    </div>
  );
}

function NumCard({ n, title, sub, right, children }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2.5">
          <span className="mono text-[12px] font-bold px-2 py-1 rounded bg-canvas-2 border border-line shrink-0">{n}</span>
          <div>
            <div className="display font-bold text-[17px]">{title}</div>
            {sub && <div className="text-[13px] text-muted">{sub}</div>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </Card>
  );
}

export default function Module2() {
  const fm = useFenceMaterials();
  const obra = useStore((s) => s.obra);
  const setModulo = useStore((s) => s.setModulo);
  const { items, resumen, metros, metrosTrazado, params, patron, precios, pesoTn, camion, tipo } = fm;
  const r = resumen || {};
  const he = fm.hilosEfectivos || { hilos: 7, puas: 1 };

  const metrosFmt = (metros || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const grampaItem = items.find((i) => i.codigo === 'grampa');
  const grampaKg = (grampaItem && grampaItem.pesoKgDetalle) || 0;
  const mAlambre = (r.mLiso || 0) + (r.mPua || 0);

  const bomTexto = () => {
    const lineas = [
      'BOM - ' + (obra.nombre || 'Obra'),
      'Metros: ' + fmtM(metros) + ' | Patrón: ' + (tipo ? tipo.nombre : ''),
      '----------------------------------------'
    ];
    items.forEach((it) => {
      const p = precios[it.codigo];
      lineas.push(
        it.display + ' | ' + it.descripcion + ' | ' + fmtNum(it.cantidad) + ' ' + it.unidad +
        (it.pesoKg ? ' | ' + it.pesoKg.toLocaleString('es-AR') + ' kg' : '') +
        (p ? ' | $' + fmtNum(p) : '')
      );
    });
    lineas.push('----------------------------------------');
    lineas.push('Peso total: ' + pesoTn.toLocaleString('es-AR') + ' Tn');
    lineas.push('Camión sugerido: ' + camion);
    return lineas.join('\n');
  };

  const exportarBOM = () => descargarTxt('bom-' + (obra.lote || 'obra') + '.txt', bomTexto());
  const compartirWA = () => {
    window.open('https://wa.me/?text=' + encodeURIComponent(bomTexto()), '_blank', 'noopener');
  };

  if (!metros || metros <= 0) {
    return (
      <EmptyState
        title="Sin metros vinculados"
        sub="Trazá el lote en el Módulo 1 o activá la sobrescritura manual de metros para calcular materiales."
        action={<Btn onClick={() => setModulo(1)}><Link2 size={17} /> Ir al Módulo 1 · GIS</Btn>}
      />
    );
  }

  const sufijoU = (u) => (u === 'rollo' ? 'rollos' : u === 'kg' ? 'kg' : u === 'm' ? 'm' : 'u.');

  return (
    <div className="flex flex-col gap-4">
      {/* ---- GIS vinculado ---- */}
      <Card className="p-4 bg-okbg/40!">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
          <div className="flex-1">
            <Badge tone="agro" className="mb-2"><Link2 size={13} /> GIS VINCULADO</Badge>
            <div className="text-[13px] text-muted mb-1">
              Vértices cerrados: {obra.establecimiento || obra.nombre}{obra.lote ? ' (Lote ' + obra.lote + ')' : ''}
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="display font-bold text-[38px] leading-none mono">{metrosFmt}</span>
              <span className="text-[13px] font-semibold tracking-widest text-muted">METROS LINEALES</span>
            </div>
            <div className="mt-2">
              <Chip>Perímetro {r.esquineros || 0} esquinas</Chip>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Toggle
              checked={!!params.usarManual}
              onChange={(v) => fm.setParam({ usarManual: v })}
              label="Sobrescribir metros manual"
            />
            {params.usarManual && (
              <input
                type="number" min="0"
                value={params.metrosManual}
                onChange={(e) => fm.setParam({ metrosManual: e.target.value })}
                placeholder={'Trazado: ' + fmtM(metrosTrazado)}
                className="field mono text-[15px] w-full max-w-[240px]"
                aria-label="Metros manuales"
              />
            )}
            <div className="flex gap-2 flex-wrap">
              <Chip><Ruler size={14} /> Norma IRAM 7 Hilos</Chip>
              <Chip>Tolerancia ±5%</Chip>
            </div>
          </div>
        </div>
      </Card>

      {/* ---- 1. selección de patrón ---- */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="text-[11px] font-semibold tracking-widest text-muted uppercase">
            1. Selección de patrón de cerramiento
          </div>
          <div className="text-[12px] text-muted hidden sm:block">Recomendado para cría & engorde bovino</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PATRONES.map((p) => {
            const activo = patron === p.id;
            return (
              <button
                key={p.id}
                onClick={() => fm.setPatron(p.id)}
                className={'card-hd p-4 text-left relative transition-colors min-h-[48px] ' +
                  (activo ? 'border-agro! border-[2.5px]! bg-okbg/30' : 'hover:border-agro-3')}
                aria-pressed={activo}
              >
                {activo && (
                  <span className="absolute top-3 right-3 text-agro"><CheckCircle2 size={22} /></span>
                )}
                <div className="display font-bold text-[17px] flex items-center gap-2 pr-7">
                  <p.icon size={19} className="text-quebracho shrink-0" /> {p.titulo}
                </div>
                <p className="text-[13px] text-muted mt-1.5 leading-snug">{p.desc}</p>
                <div className="flex gap-1.5 mt-2.5 flex-wrap">
                  {p.chips.map((c) => <Chip key={c} className="text-[11px]!">{c}</Chip>)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- corte longitudinal REACTIVO ---- */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <div className="display font-bold text-[17px] flex items-center gap-2">
              <DraftingCompass size={18} className="text-agro" /> Corte Longitudinal Reactivo
            </div>
            <div className="text-[13px] text-muted">Se dibuja desde los parámetros reales: lo que ves es lo que se computa</div>
          </div>
          <div className="flex gap-3 mono text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="w-5 h-[3px] bg-[#2d6a4f] inline-block" /> Liso</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-5 h-[3px] bg-[#b45309] inline-block" /> Púa</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-5 h-[3px] bg-[#2563eb] inline-block" /> Electro</span>
          </div>
        </div>

        {/* preset del esquema (suspendido) */}
        {patron === 'suspendido7' && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { v: 'tradicional', n: 'Tradicional', s: '7 hilos norma' },
              { v: 'configurable', n: 'Configurable', s: '1-10 hilos' },
              { v: 'manga-corral', n: 'Manga / Corral', s: 'más hilos y varillas' }
            ].map((p) => {
              const act = (fm.esquemaParams.preset || 'tradicional') === p.v;
              return (
                <button key={p.v}
                  onClick={() => {
                    fm.setEsquema({ preset: p.v });
                    if (p.v === 'manga-corral') { fm.setEsquema({ hilos: 9, puas: 2 }); fm.setParam({ modoVarillas: 'manga' }); }
                    if (p.v === 'tradicional') fm.setParam({ modoVarillas: 'comun' });
                  }}
                  className={'rounded-md border-[1.5px] p-2.5 min-h-[48px] text-center ' + (act ? 'bg-agro text-white border-agro-deep' : 'bg-white border-line')}
                  aria-pressed={act}>
                  <div className="text-[13px] font-bold">{p.n}</div>
                  <div className={'mono text-[11px] ' + (act ? 'opacity-80' : 'text-muted')}>{p.s}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* controles del esquema */}
        {(patron === 'suspendido7' && fm.esquemaParams.preset === 'configurable') && (
          <div className="rounded-md border border-line bg-canvas-2 p-3 mb-3 grid md:grid-cols-2 gap-x-6">
            <SliderRow label="Cantidad de hilos" value={fm.esquemaParams.hilos} min={1} max={10} step={1}
              onChange={(v) => fm.setEsquema({ hilos: v })} format={(v) => v + ' hilos'} />
            <SliderRow label="Hilos de púas (van abajo)" value={fm.esquemaParams.puas} min={0} max={Math.min(10, fm.esquemaParams.hilos)} step={1}
              onChange={(v) => fm.setEsquema({ puas: v })} format={(v) => v + ' púas'} />
            <div className="md:col-span-2">
              <Field label="Tipo y altura de palo">
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS_PALO.map((t) => {
                    const act = fm.esquemaParams.altoPaloCm === t.cm;
                    return (
                      <button key={t.cm} type="button"
                        onClick={() => fm.setEsquema({ altoPaloCm: t.cm, tipoPalo: t.etiqueta })}
                        className={'rounded-md border-[1.5px] px-2 py-2.5 min-h-[48px] text-[12px] font-semibold ' + (act ? 'bg-quebracho text-white border-quebracho-d' : 'bg-white border-line')}
                        aria-pressed={act}>{t.etiqueta}</button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </div>
        )}
        {patron === 'electrico' && (
          <div className="flex items-center gap-3 mb-3 rounded-md border border-line bg-canvas-2 p-3 flex-wrap">
            <span className="text-[14px] font-medium">Hilos electrificados:</span>
            <Stepper value={params.hilosElec || 2} min={1} max={3} step={1}
              onChange={(v) => fm.setParam({ hilosElec: v })} format={(v) => v + (v === 1 ? ' hilo' : ' hilos')} />
            <span className="mono text-[12px] text-muted">1 hilo: 80 cm · 2 hilos: 60/100 · 3 hilos: 40/80/110</span>
          </div>
        )}

        {/* modo de varillado */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[13px] text-muted">Varillado:</span>
          {[
            { v: 'central', n: 'Varillón central' },
            { v: 'n', n: 'N varillas por claro' },
            { v: 'ninguna', n: 'Sin varillas' }
          ].map((o) => {
            const act = fm.esquemaParams.varillaModo === o.v;
            return (
              <button key={o.v} onClick={() => fm.setEsquema({ varillaModo: o.v })}
                className={'px-3 rounded-md border-[1.5px] min-h-[44px] text-[13px] font-semibold ' + (act ? 'bg-agro text-white border-agro-deep' : 'bg-white border-line')}
                aria-pressed={act}>{o.n}</button>
            );
          })}
          {fm.esquemaParams.varillaModo === 'n' && (
            <span className="inline-flex items-center gap-2">
              <Stepper value={params.varillasPorClaro ?? 9} min={0} max={20} step={1}
                onChange={(v) => fm.setParam({ varillasPorClaro: v })} format={(v) => v + ' u.'} />
              <button onClick={() => fm.setParam({ modoVarillas: params.modoVarillas === 'manga' ? 'comun' : 'manga' })}
                className={'px-3 rounded-md border-[1.5px] min-h-[44px] text-[13px] font-semibold ' + (params.modoVarillas === 'manga' ? 'bg-quebracho text-white border-quebracho-d' : 'bg-white border-line')}>
                {params.modoVarillas === 'manga' ? 'Manga 60-100 cm' : 'Común 100-180 cm'}
              </button>
            </span>
          )}
        </div>
        {/* Distancia calculada entre varillas por claro (claro / (N+1)), validada contra la regla */}
        {fm.esquemaParams.varillaModo === 'n' && fm.esquemaDibujo && fm.esquemaDibujo.varillas && fm.esquemaDibujo.varillas.espaciamientoCm != null && (
          <div className={'rounded-md border-[1.5px] px-3 py-2 mb-3 text-[13px] mono ' + (fm.esquemaDibujo.varillas.ok ? 'border-agro-deep bg-agro/10' : 'border-warn bg-warn/10')}>
            Distancia entre varillas por claro: <b>{String(fm.esquemaDibujo.varillas.espaciamientoCm).replace('.', ',')} cm</b>
            {' · '}{fm.esquemaDibujo.varillas.mensaje}
          </div>
        )}

        <CorteReactivo esquema={fm.esquemaDibujo} />

        <div className="mt-3">
          <EsquemaPlanta metros={metros} replanteo={r.replanteo} tranquerasDetalle={params.tranquerasDetalle} poligono={fm.cerrado}
            resumen={r} distRefuerzoM={params.distRefuerzo} cadaNAtadores={params.cadaNAtadores} sepVarillas={params.sepVarillas} />
        </div>
      </Card>

      {/* ---- 2. parámetros + BOM ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="flex flex-col gap-3">
          <SectionTitle n="2" title="Parámetros de insumos & escuadrías" sub="Cálculos automáticos en tiempo real" />

          {/* suelo global */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="text-[12px] font-semibold tracking-widest text-muted uppercase">
                Condición predominante del suelo
              </div>
              <Badge tone={params.suelo === 'canada' ? 'warn' : 'muted'}>+12% ref. postes</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SUELOS.map((s) => {
                const activo = params.suelo === s.v;
                return (
                  <button
                    key={s.v}
                    onClick={() => fm.setParam({ suelo: s.v })}
                    className={'rounded-md border-[1.5px] p-3 min-h-[48px] flex flex-col items-center gap-1 text-center ' +
                      (activo ? 'bg-agro text-white border-agro-deep' : 'bg-white border-line')}
                    aria-pressed={activo}
                  >
                    <s.icon size={20} />
                    <span className="text-[13px] font-semibold leading-tight">{s.n}</span>
                    <span className={'mono text-[11px] ' + (activo ? 'opacity-80' : 'text-muted')}>{s.nota}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[12px] text-muted mt-2">Cañada: refuerzo cada 8 m.</div>
          </Card>

          {/* 01 esquineros */}
          <NumCard
            n="01" title="Postes Esquineros & Cabeceras"
            sub={'Quebracho Colorado Labrado 3.00m (3x3" o 4x4")'}
            right={
              <div className="text-right">
                <div className="mono font-bold text-[18px] text-agro">{fmtNum(r.esquineros || 0)} esquineros</div>
                <div className="mono font-bold text-[15px] text-warn">+ {fmtNum(r.tirantes || 0)} puntales</div>
                {(r.esqTranquera || 0) > 0 && (
                  <div className="text-[11px] text-muted mono">({r.esqTranquera} esq. por tranqueras)</div>
                )}
              </div>
            }
          >
            <Field label="Especie de madera (esquineros 3,00 m)">
              <select
                className="w-full rounded-md border border-line bg-white px-2 py-2 text-[14px]"
                value={params.maderaEsquinero || 'qcolorado'}
                onChange={(e) => fm.setParam({ maderaEsquinero: e.target.value })}
              >
                {ESPECIES_MADERA.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </Field>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between rounded-md bg-canvas-2 border border-line p-3">
              <button
                className="flex items-center gap-2.5 min-h-[48px] text-left"
                onClick={() => fm.setParam({ conTirantes: !params.conTirantes })}
                role="checkbox" aria-checked={!!params.conTirantes}
              >
                <span className={'w-7 h-7 rounded border-[1.5px] border-line bg-white inline-flex items-center justify-center shrink-0 ' + (params.conTirantes ? '!bg-agro border-agro!-deep text-white' : '')}>
                  {params.conTirantes && <Check size={17} strokeWidth={3} />}
                </span>
                <span className="text-[14px] font-medium">Incluir puntales de contención (1 por dirección de alambrado)</span>
              </button>
              <div className="text-[13px] text-muted">
                Tirantes calculados: <span className="mono font-bold text-warn">{fmtNum(r.tirantes || 0)} puntales (Quebracho 2.40m)</span>
              </div>
            </div>
          </NumCard>

          {/* 02 atadores / intermedios */}
          <NumCard
            n="02" title="Postes Atadores / Intermedios"
            sub="Atador 2,60 m (tensión) · Intermedio 2,20 m"
            right={
              <div className="text-right">
                <div className="text-[11px] text-muted mono">Cálculo: ({fmtM(metros)} / Intervalo)</div>
                <div className="mono font-bold text-[18px] text-agro">{fmtNum((r.atadores || 0) + (r.intermedios || 0))} <span className="text-[13px] font-normal">Unidades</span></div>
                <div className="text-[11px] text-muted mono">{fmtNum(r.atadores || 0)} atad. 2,60 m + {fmtNum(r.intermedios || 0)} interm. 2,20 m</div>
              </div>
            }
          >
            <Field label="Especie de madera (atadores e intermedios)">
              <select
                className="w-full rounded-md border border-line bg-white px-2 py-2 text-[14px]"
                value={params.maderaIntermedio || 'qblanco'}
                onChange={(e) => fm.setParam({ maderaIntermedio: e.target.value })}
              >
                {ESPECIES_MADERA.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </Field>
            {fm.patron === 'suspendido7' ? (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                <SliderRow
                  label="Distancia entre refuerzos" value={params.distRefuerzo}
                  min={60} max={100} step={1}
                  onChange={(v) => fm.setParam({ distRefuerzo: v })}
                  format={(v) => v + ' m'}
                  hint="Recomendado: 60m - 100m · Cañada: refuerzo cada 8 m"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-muted">Frecuencia:</span>
                  <Stepper value={params.distRefuerzo} min={60} max={100} step={1}
                    onChange={(v) => fm.setParam({ distRefuerzo: v })} format={(v) => v + 'm'} />
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-muted rounded-md bg-canvas-2 border border-line p-3">
                {fm.patron === 'convencional'
                  ? 'Convencional: poste cada 12 m. Cada N palos se asciende a atador 2,60 m (ahí van las torniquetas).'
                  : 'Eléctrico: estacones livianos cada 30 m, sin atadores.'}
              </div>
            )}
            {fm.patron !== 'electrico' && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[13px] text-muted">Atador cada N palos:</span>
                <Stepper value={params.cadaNAtadores ?? 10} min={2} max={30} step={1}
                  onChange={(v) => fm.setParam({ cadaNAtadores: v })} format={(v) => 'cada ' + v} />
                <span className="text-[12px] text-muted">(ajustable · default 10)</span>
              </div>
            )}
          </NumCard>

          {/* 02b replanteo exacto */}
          <NumCard
            n="02B" title="Replanteo Exacto de Postes"
            sub="Divide la línea en tramos ENTEROS iguales: sin claros más cortos ni más largos"
            right={
              <Toggle
                checked={!!(params.replanteo && params.replanteo.activo)}
                onChange={(v) => fm.setParam({ replanteo: { ...(params.replanteo || {}), activo: v } })}
                label={params.replanteo && params.replanteo.activo ? 'Activado' : 'Activar'}
              />
            }
          >
            {params.replanteo && params.replanteo.activo ? (
              <div className="flex flex-col gap-3">
                <div className="grid md:grid-cols-2 gap-x-6">
                  <SliderRow label="Distancia objetivo entre atadores (2,60 m)" value={params.replanteo.atadoresM || 80}
                    min={40} max={120} step={1}
                    onChange={(v) => fm.setParam({ replanteo: { ...params.replanteo, atadoresM: v } })}
                    format={(v) => v + ' m'} />
                  <SliderRow label="Distancia objetivo entre palos intermedios" value={params.replanteo.intermediosM || 15}
                    min={8} max={25} step={0.5}
                    onChange={(v) => fm.setParam({ replanteo: { ...params.replanteo, intermediosM: v } })}
                    format={(v) => String(v).replace('.', ',') + ' m'} />
                </div>
                {r.replanteo && (
                  <div className="rounded-md border border-line bg-canvas-2 p-3">
                    <div className="flex gap-4 flex-wrap mono text-[13px] mb-2">
                      <span><b className="text-agro">{r.replanteo.atadores.n}</b> tramos de <b>{r.replanteo.atadores.real.toFixed(2).replace('.', ',')} m</b> exactos</span>
                      <span><b className="text-agro">{r.replanteo.atadores.cantidad}</b> atadores 2,60 m</span>
                      <span><b className="text-agro">{r.replanteo.intermedios.cantidad}</b> intermedios cada <b>{r.replanteo.intermedios.real.toFixed(2).replace('.', ',')} m</b></span>
                    </div>
                    <details>
                      <summary className="text-[13px] font-semibold text-agro cursor-pointer min-h-[32px]">Ver replanteo tramo por tramo ({r.replanteo.tramos.length})</summary>
                      <div className="mt-2 max-h-[220px] overflow-y-auto">
                        <table className="w-full mono text-[12px]">
                          <thead>
                            <tr className="text-left text-muted border-b border-line">
                              <th className="py-1 pr-2">Tramo</th><th className="py-1 pr-2">Desde</th>
                              <th className="py-1 pr-2">Hasta</th><th className="py-1 pr-2">Interm.</th><th className="py-1">Claro real</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.replanteo.tramos.map((t) => (
                              <tr key={t.tramo} className="border-b border-line/60">
                                <td className="py-1 pr-2 font-bold">{t.tramo}</td>
                                <td className="py-1 pr-2">{t.desde.toFixed(1).replace('.', ',')} m</td>
                                <td className="py-1 pr-2">{t.hasta.toFixed(1).replace('.', ',')} m</td>
                                <td className="py-1 pr-2">{t.intermedios}</td>
                                <td className="py-1">{String(t.claroReal).replace('.', ',')} m</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[13px] text-muted">Activá el replanteo para que atadores e intermedios caigan a distancias exactas e iguales en toda la línea.</div>
            )}
          </NumCard>

          {/* 03 varillas */}
          <NumCard
            n="03" title="Varillas Intermedias Elásticas"
            sub="Curupay estacionado / Plástico Reciclado de 7 orificios"
            right={<div className="text-right text-[13px] text-muted">Total: <span className="mono font-bold text-[17px] text-ink">{fmtNum(r.varillas || 0)} Varillas</span></div>}
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
              <SliderRow
                label="Separación entre varillas" value={params.sepVarillas}
                min={1.0} max={2.5} step={0.1}
                onChange={(v) => fm.setParam({ sepVarillas: Math.round(v * 10) / 10 })}
                format={(v) => v.toFixed(1).replace('.', ',') + ' m'}
                hint="Regla de campo: 1,0 m – 2,5 m (común 100–180 cm entre varillas)"
              />
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted">Paso:</span>
                <Stepper value={params.sepVarillas} min={1.0} max={2.5} step={0.1}
                  onChange={(v) => fm.setParam({ sepVarillas: Math.round(v * 10) / 10 })}
                  format={(v) => v.toFixed(1).replace('.', ',') + 'm'} />
              </div>
            </div>
            {fm.esquemaDibujo && fm.esquemaDibujo.varillas && fm.esquemaDibujo.varillas.mensaje && (
              <div className="text-[12px] text-muted mt-1 mono">{fm.esquemaDibujo.varillas.mensaje} (validado contra la regla)</div>
            )}
          </NumCard>

          {/* 04 hilos */}
          <NumCard
            n="04" title="Hilos de Alambre & Desperdicio Técnico"
            sub={fmtM(metros) + ' × ' + he.hilos + ' hilos (' + he.puas + ' púas) = ' + fmtM(metros * he.hilos) + ' netos'}
            right={<div className="text-right"><div className="text-[11px] text-muted">Total con +5% merma:</div><div className="mono font-bold text-[18px] text-agro">{fmtM(mAlambre)}</div></div>}
          >
            {fm.patron === 'electrico' ? (
              <div className="flex flex-col gap-3">
                <Field label="Tipo de alambre (eléctrico)">
                  <select
                    className="w-full rounded-md border border-line bg-white px-2 py-2 text-[14px]"
                    value={params.alambreElectro || 'ep6'}
                    onChange={(e) => fm.setParam({ alambreElectro: e.target.value })}
                  >
                    {TIPOS_ALAMBRE.electro.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre} · rollo {t.rolloM} m</option>
                    ))}
                  </select>
                </Field>
                <div className="rounded-md bg-canvas-2 border border-line p-3">
                  <div className="font-semibold text-[14px]">{tipoAlambre('electro', params.alambreElectro).nombre}</div>
                  <div className="mono font-bold text-[17px] text-agro mt-1">{fmtNum(r.rollosElectro || 0)} Rollos</div>
                  <div className="text-[12px] text-muted mono">{fmtM(r.mElectro || 0)} totales ({tipoAlambre('electro', params.alambreElectro).rolloM} m c/u)</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Tipo de liso">
                    <select
                      className="w-full rounded-md border border-line bg-white px-2 py-2 text-[14px]"
                      value={params.alambreLiso || '17-15'}
                      onChange={(e) => fm.setParam({ alambreLiso: e.target.value })}
                    >
                      {TIPOS_ALAMBRE.liso.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre} · rollo {t.rolloM} m</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tipo de púas">
                    <select
                      className="w-full rounded-md border border-line bg-white px-2 py-2 text-[14px]"
                      value={params.alambrePua || '4p'}
                      onChange={(e) => fm.setParam({ alambrePua: e.target.value })}
                    >
                      {TIPOS_ALAMBRE.pua.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre} · rollo {t.rolloM} m</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-md bg-canvas-2 border border-line p-3">
                    <div className="font-semibold text-[14px]">{tipoAlambre('liso', params.alambreLiso).nombre}</div>
                    <div className="mono font-bold text-[17px] text-agro mt-1">{fmtNum(r.rollosLiso || 0)} Rollos</div>
                    <div className="text-[12px] text-muted mono">{fmtM(r.mLiso || 0)} totales ({tipoAlambre('liso', params.alambreLiso).rolloM} m c/u)</div>
                  </div>
                  <div className="rounded-md bg-canvas-2 border border-line p-3">
                    <div className="font-semibold text-[14px]">{tipoAlambre('pua', params.alambrePua).nombre}</div>
                    <div className="mono font-bold text-[17px] text-agro mt-1">{fmtNum(r.rollosPua || 0)} Rollos</div>
                    <div className="text-[12px] text-muted mono">{fmtM(r.mPua || 0)} totales ({tipoAlambre('pua', params.alambrePua).rolloM} m c/u)</div>
                  </div>
                </div>
              </div>
            )}
          </NumCard>

          {/* 05 herrajes */}
          <NumCard
            n="05" title="Herrajes, Tensión & Fijación"
            sub={'Elementos mecánicos de retención calculados para ' + fmtM(metros)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {fm.patron === 'electrico' ? (
                <div className="rounded-md bg-canvas-2 border border-line p-3">
                  <div className="text-[12px] text-muted">Tensores</div>
                  <div className="mono font-bold text-[19px] mt-0.5">{fmtNum(r.torniquetes || 0)} u.</div>
                  <div className="text-[12px] text-muted mono">terminales</div>
                </div>
              ) : (
                <>
                  <div className="rounded-md bg-canvas-2 border border-line p-3">
                    <div className="text-[12px] text-muted">Torniqueta aérea doble</div>
                    <div className="mono font-bold text-[19px] mt-0.5">{fmtNum(r.torniquetesAereas || 0)} u.</div>
                    <div className="text-[12px] text-muted mono">
                      {he.hilos} hilos × {r.atadoresT || 0} atad
                    </div>
                  </div>
                  <div className="rounded-md bg-canvas-2 border border-line p-3">
                    <div className="text-[12px] text-muted">Torniqueta pajarito</div>
                    <div className="mono font-bold text-[19px] mt-0.5">{fmtNum(r.torniquetesPajarito || 0)} u.</div>
                    <div className="text-[12px] text-muted mono">
                      {(params.torniqEsquineros ?? true) ? he.hilos + ' hilos × ' + (r.esquineros || 0) + ' esq' : 'desactivadas'}
                    </div>
                  </div>
                </>
              )}
              <div className="rounded-md bg-canvas-2 border border-line p-3">
                <div className="text-[12px] text-muted">Grampas Galv. 1 1/2"</div>
                <div className="mono font-bold text-[19px] mt-0.5">{fmtNum(r.grampas || 0)} u.</div>
                <div className="text-[12px] text-muted mono">{grampaKg.toLocaleString('es-AR')} kg · Reforzadas filo</div>
              </div>
              <div className="rounded-md bg-canvas-2 border border-line p-3">
                <div className="text-[12px] text-muted">Alambre dulce Nº14 · maneas</div>
                <div className="mono font-bold text-[19px] mt-0.5">{fmtM(r.alambreDulceM || 0)}</div>
                <div className="text-[12px] text-muted">1 manea por varilla × hilo</div>
              </div>
            </div>
            {fm.patron !== 'electrico' && (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap mt-1">
                <Toggle
                  checked={params.torniqEsquineros ?? true}
                  onChange={(v) => fm.setParam({ torniqEsquineros: v })}
                  label="Pajaritos en esquineros"
                />
                <Toggle
                  checked={params.grampasIntermedios ?? false}
                  onChange={(v) => fm.setParam({ grampasIntermedios: v })}
                  label="Grampas en postes (fijan el alambre al poste)"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-muted">Aérea doble cada N atadores:</span>
                  <Stepper value={params.torniqCadaAtadores ?? 1} min={1} max={10} step={1}
                    onChange={(v) => fm.setParam({ torniqCadaAtadores: v })} format={(v) => 'cada ' + v} />
                </div>
              </div>
            )}
          </NumCard>

          {/* 06 tranqueras ubicadas */}
          <NumCard
            n="06" title="Tranqueras & Tranquerones Ubicados"
            sub="En el medio: +2 postes tipo esquinero + 2 puntales · En extremo (≤ margen): usa el esquinero existente + 1 puntal"
            right={
              <div className="text-right">
                <div className="mono font-bold text-[18px] text-agro">{(params.tranquerasDetalle || []).length} ubicadas</div>
                {(params.tranquerasDetalle || []).length > 0 && (
                  <div className="mono text-[12px] text-warn font-bold">+{r.esqTranquera || 0} esquineros +{r.tirantesTranquera || 0} puntales</div>
                )}
              </div>
            }
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[13px] text-muted">Margen de extremo:</span>
              <Stepper value={params.margenExtremo ?? 10} min={0} max={50} step={1}
                onChange={(v) => fm.setParam({ margenExtremo: v })} format={(v) => v + ' m'} />
              <span className="text-[12px] text-muted mono">a ≤ margen del inicio/fin se cuenta en extremo</span>
            </div>
            <TranquerasEditor
              detalle={params.tranquerasDetalle || []}
              metros={metros}
              margen={params.margenExtremo ?? 10}
              onChange={(d) => fm.setParam({ tranquerasDetalle: d })}
            />
          </NumCard>
        </div>

        {/* ---- sidebar BOM ---- */}
        <div className="flex flex-col gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="display font-bold text-[17px] flex items-center gap-2">
                <FileText size={18} className="text-agro" /> Lista de Materiales (BOM)
              </div>
              <Badge tone="info">{items.length} Renglones</Badge>
            </div>
            <div className="flex flex-col divide-y divide-line">
              {items.map((it) => (
                <div key={it.codigo + it.display} className="py-2.5 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mono font-bold text-[13px]">{it.display}</div>
                      <div className="text-[12px] text-muted leading-snug">{it.descripcion}{it.detalle ? ' · ' + it.detalle : ''}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="mono font-bold text-[15px]">{fmtNum(it.cantidad)} {sufijoU(it.unidad)}</div>
                      {it.pesoKg > 0 && <div className="mono text-[12px] text-muted">{it.pesoKg >= 1000 ? (it.pesoKg / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' tn' : it.pesoKg.toLocaleString('es-AR') + ' kg'}</div>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">Precio unitario</span>
                    <PrecioInput codigo={it.codigo} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-canvas-2!">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] text-muted">Cubicaje Estimado<br />Camión:</span>
              <span className="display font-bold text-[20px] mono text-right">{pesoTn.toLocaleString('es-AR')}<br /><span className="text-[14px]">Toneladas</span></span>
            </div>
            <div className="h-2.5 rounded bg-slate-200 overflow-hidden mt-2">
              <div className="h-full bg-quebracho rounded" style={{ width: Math.min(100, (pesoTn / 10) * 100) + '%' }} />
            </div>
            <div className="text-[12px] text-muted mt-1.5">Capacidad requerida: <span className="font-semibold text-ink">{camion}</span></div>
          </Card>

          <Btn className="w-full text-[16px]!" onClick={fm.irACotizador}>
            <FileText size={18} /> Enviar a Cotizador de Costos
          </Btn>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="ghost" onClick={exportarBOM}><Download size={17} /> Exportar BOM</Btn>
            <Btn variant="whatsapp" onClick={compartirWA}><Share2 size={17} /> Compartir WhatsApp</Btn>
          </div>

          <Card className="p-4 bg-okbg/50!">
            <div className="flex gap-2.5">
              <ShieldCheck size={20} className="text-ok shrink-0 mt-0.5" />
              <p className="text-[13px] leading-snug text-muted">
                <span className="font-semibold text-ink">Cálculo verificado por IRAM:</span> se incluye coeficiente
                de tensado invernal (+5% de reserva en alambre de acero de alta resistencia). La flecha máxima
                esperada en tramos de {params.distRefuerzo}m es menor a 4.5 cm con varillado cada {(parseFloat(params.sepVarillas) || 0).toFixed(1).replace('.', ',')} metros.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
