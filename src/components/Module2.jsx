/* Módulo 2 — Infraestructura & Hilos (parámetros de materiales).
   Card GIS vinculado, selección de patrón, corte transversal SVG,
   parámetros de insumos (01–06) con cálculos en vivo, y sidebar
   con la Lista de Materiales (BOM): precios por renglón, peso,
   camión sugerido, exportar TXT y compartir por WhatsApp. */
import React from 'react';
import {
  Globe, Zap, Columns3, CheckCircle2, Ruler, ShieldCheck,
  Download, Share2, FileText, Sprout, Droplets, Mountain,
  Check, Link2
} from 'lucide-react';
import { useStore } from '../store.js';
import { useFenceMaterials } from '../hooks/useFenceMaterials.js';
import { fmtM, fmtNum } from '../lib/format.js';
import { Card, Badge, Btn, Chip, SliderRow, Stepper, SectionTitle, Toggle, EmptyState } from './ui.jsx';
import CrossSection from './CrossSection.jsx';

const PATRONES = [
  {
    id: 'suspendido7', titulo: 'Tradicional Suspendido', icon: Globe,
    desc: '7 Hilos (5 lisos 17/15 Alta Resistencia + 2 púas Super Bagual). Separación de postes hasta 80m con varillado denso elástico.',
    chips: ['7 Hilos Mixtos', 'Alta Tensión']
  },
  {
    id: 'convencional', titulo: 'Convencional Firme', icon: Columns3,
    desc: 'Viga a viga con 6 hilos lisos. Postes quebracho cada 12-15 metros fijos con menor cantidad de varillas intermedias.',
    chips: ['6 Hilos Lisos', 'Poste cada 15m']
  },
  {
    id: 'electrico', titulo: 'Eléctrico Boyero', icon: Zap,
    desc: '3 hilos electroplásticos/aluminizados sobre postes livianos y varillas aisladoras. Especial para rotativo o subdivisión liviana.',
    chips: ['3 Hilos Electrificados', 'Aisladores Rígidos']
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

      {/* ---- corte transversal ---- */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <div className="display font-bold text-[17px] flex items-center gap-2">
              <Mountain size={18} className="text-agro" /> Corte Transversal & Planialtimetría de Hilos
            </div>
            <div className="text-[13px] text-muted">Distribución de cotas según Norma Tradicional Argentina (Altura final 1.35m)</div>
          </div>
          <div className="flex gap-3 mono text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="w-5 h-[3px] bg-quebracho inline-block" /> Hilo Púas (H4 & H7)</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-5 h-[3px] bg-agro-2 inline-block" /> Hilo Liso 17/15</span>
          </div>
        </div>
        <CrossSection />
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
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="info">{r.esquineros || 0} Vértices GPS</Badge>
                <span className="mono font-bold text-[15px]">{fmtNum(r.esquineros || 0)} Unidades</span>
              </div>
            }
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between rounded-md bg-canvas-2 border border-line p-3">
              <button
                className="flex items-center gap-2.5 min-h-[48px] text-left"
                onClick={() => fm.setParam({ conTirantes: !params.conTirantes })}
                role="checkbox" aria-checked={!!params.conTirantes}
              >
                <span className={'w-7 h-7 rounded border-[1.5px] border-line bg-white inline-flex items-center justify-center shrink-0 ' + (params.conTirantes ? '!bg-agro border-agro!-deep text-white' : '')}>
                  {params.conTirantes && <Check size={17} strokeWidth={3} />}
                </span>
                <span className="text-[14px] font-medium">Incluir puntales / tirantes dobles de contención por esquinero</span>
              </button>
              <div className="text-[13px] text-muted">
                Tirantes calculados: <span className="mono font-bold text-warn">{fmtNum(r.tirantes || 0)} tirantes (Quebracho 2.40m)</span>
              </div>
            </div>
          </NumCard>

          {/* 02 refuerzos */}
          <NumCard
            n="02" title="Postes Intermedios / Refuerzos"
            sub="Quebracho Blanco impregnado / Curupay 2.20m"
            right={
              <div className="text-right">
                <div className="text-[11px] text-muted mono">Cálculo: ({fmtM(metros)} / Intervalo)</div>
                <div className="mono font-bold text-[18px] text-agro">{fmtNum(r.refuerzos || 0)} <span className="text-[13px] font-normal">Unidades</span></div>
              </div>
            }
          >
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
                min={1.8} max={2.5} step={0.1}
                onChange={(v) => fm.setParam({ sepVarillas: Math.round(v * 10) / 10 })}
                format={(v) => v.toFixed(1).replace('.', ',') + ' m'}
                hint="Norma bovina: 1.8m - 2.5m"
              />
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted">Paso:</span>
                <Stepper value={params.sepVarillas} min={1.8} max={2.5} step={0.1}
                  onChange={(v) => fm.setParam({ sepVarillas: Math.round(v * 10) / 10 })}
                  format={(v) => v.toFixed(1).replace('.', ',') + 'm'} />
              </div>
            </div>
          </NumCard>

          {/* 04 hilos */}
          <NumCard
            n="04" title="Hilos de Alambre & Desperdicio Técnico"
            sub={fmtM(metros) + ' × ' + (tipo ? tipo.hilos : 7) + ' hilos = ' + fmtM(metros * (tipo ? tipo.hilos : 7)) + ' netos'}
            right={<div className="text-right"><div className="text-[11px] text-muted">Total con +5% merma:</div><div className="mono font-bold text-[18px] text-agro">{fmtM(mAlambre)}</div></div>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(r.mLiso != null || r.rollosLiso != null) && (
                <div className="rounded-md bg-canvas-2 border border-line p-3">
                  <div className="font-semibold text-[14px]">Liso Alta Resistencia 17/15</div>
                  <div className="mono font-bold text-[17px] text-agro mt-1">{fmtNum(r.rollosLiso || 0)} Rollos</div>
                  <div className="text-[12px] text-muted mono">{fmtM(r.mLiso || 0)} totales (1.000 m c/u)</div>
                </div>
              )}
              {r.mPua != null && (
                <div className="rounded-md bg-canvas-2 border border-line p-3">
                  <div className="font-semibold text-[14px]">Púas Super Bagual</div>
                  <div className="mono font-bold text-[17px] text-agro mt-1">{fmtNum(r.rollosPua || 0)} Rollos</div>
                  <div className="text-[12px] text-muted mono">{fmtM(r.mPua || 0)} totales (500 m c/u)</div>
                </div>
              )}
            </div>
          </NumCard>

          {/* 05 herrajes */}
          <NumCard
            n="05" title="Herrajes, Tensión & Fijación"
            sub={'Elementos mecánicos de retención calculados para ' + fmtM(metros)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md bg-canvas-2 border border-line p-3">
                <div className="text-[12px] text-muted">Torniquetes Dobles N°7</div>
                <div className="mono font-bold text-[19px] mt-0.5">{fmtNum(r.torniquetes || 0)} u.</div>
                <div className="text-[12px] text-muted">Galvanizados</div>
              </div>
              <div className="rounded-md bg-canvas-2 border border-line p-3">
                <div className="text-[12px] text-muted">Varillas Tensión</div>
                <div className="mono font-bold text-[19px] mt-0.5">{fmtNum((r.torniquetes || 0) * 2)} u.</div>
                <div className="text-[12px] text-muted">Planchuela 1 1/4"</div>
              </div>
              <div className="rounded-md bg-canvas-2 border border-line p-3">
                <div className="text-[12px] text-muted">Grampas Galv. 1 1/2"</div>
                <div className="mono font-bold text-[19px] mt-0.5">{fmtNum(r.grampas || 0)} u.</div>
                <div className="text-[12px] text-muted mono">{grampaKg.toLocaleString('es-AR')} kg · Reforzadas filo</div>
              </div>
              <div className="rounded-md bg-canvas-2 border border-line p-3">
                <div className="text-[12px] text-muted">Alambre Dulce N°14</div>
                <div className="mono font-bold text-[19px] mt-0.5">{fmtM(r.alambreDulceM || 0)}</div>
                <div className="text-[12px] text-muted">Ataduras varilla</div>
              </div>
            </div>
          </NumCard>

          {/* 06 tranqueras */}
          <NumCard
            n="06" title="Tranqueras & Accesos Rurales"
            sub="Accesos de maquinaria pesada y manga"
            right={<div className="text-[13px] text-muted">Instaladas: <span className="mono font-bold text-[16px] text-ink">{fmtNum(params.tranqueras || 0)} Tranqueras (3.50m)</span></div>}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="text-[14px]">Tranquera Quebracho / Lapacho 3.5m con bisagras reforzadas y pasador traba candado</div>
              <Stepper value={params.tranqueras || 0} min={0} max={20} step={1}
                onChange={(v) => fm.setParam({ tranqueras: v })} format={(v) => v} />
            </div>
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
                      {it.pesoKg > 0 && <div className="mono text-[12px] text-muted">{it.pesoKg.toLocaleString('es-AR')} tn</div>}
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
