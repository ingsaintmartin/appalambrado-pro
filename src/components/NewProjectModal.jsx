/* NewProjectModal — alta de obra en el flujo cliente → obra → trazado.
   Adaptado del export AIStudio a nuestro diseño (lucide, agro-industrial).
   Tipos de trabajo: nuevo-completo | tramo-lineal | reparacion | desarme-armado. */
import React, { useState, useMemo } from 'react';
import { X, Search, Check, MapPin, Hammer, Scissors, Wrench, RefreshCcw } from 'lucide-react';
import { useStore } from '../store.js';
import { TIPOS_ALAMBRADO } from '../lib/calc.js';
import { Card, Btn, Badge, Chip, Field } from './ui.jsx';

const TIPOS_TRABAJO = [
  { id: 'nuevo-completo', n: 'Línea nueva', d: 'Alambrado completo de cero', icon: Hammer },
  { id: 'tramo-lineal', n: 'Tramo lineal', d: 'Un tramo / una línea suelta', icon: MapPin },
  { id: 'reparacion', n: 'Reparación', d: 'Arreglo parcial de línea existente', icon: Wrench },
  { id: 'desarme-armado', n: 'Desarme + armado', d: 'Saca línea vieja y arma nueva', icon: RefreshCcw }
];

const SUELOS = [
  { v: 'tierra', n: 'Tierra negra' },
  { v: 'canada', n: 'Bajo / cañada' },
  { v: 'tosca', n: 'Tosca dura' }
];

export default function NewProjectModal({ clienteFijo, onClose, onCreada }) {
  const clientes = useStore((s) => s.clientes);
  const setClienteId = useStore((s) => s.setClienteId);
  const setObra = useStore((s) => s.setObra);
  const setMat = useStore((s) => s.setMat);
  const setCostos = useStore((s) => s.setCostos);
  const setTrazado = useStore((s) => s.setTrazado);
  const setModulo = useStore((s) => s.setModulo);
  const guardarCliente = useStore((s) => s.guardarCliente);

  const [q, setQ] = useState('');
  const [clienteId, setClienteIdSel] = useState(clienteFijo?.id || null);
  const [establecimiento, setEstablecimiento] = useState(
    clienteFijo?.establecimientos?.[0] || ''
  );
  const [tipoTrabajo, setTipoTrabajo] = useState('nuevo-completo');
  const [metros, setMetros] = useState('');
  const [patron, setPatronSel] = useState('suspendido7');
  const [suelo, setSuelo] = useState('tierra');
  const [nuevoEst, setNuevoEst] = useState('');

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter((c) =>
      (c.razonSocial || '').toLowerCase().includes(t) ||
      (c.cuit || '').includes(t));
  }, [clientes, q]);

  const cliente = clientes.find((c) => c.id === clienteId) || clienteFijo || null;
  const establecimientos = cliente?.establecimientos?.length
    ? cliente.establecimientos
    : (establecimiento ? [establecimiento] : []);

  const agregarEstablecimiento = async () => {
    const nom = nuevoEst.trim();
    if (!nom || !cliente) return;
    const reg = await guardarCliente({
      ...cliente,
      establecimientos: [...(cliente.establecimientos || []), nom]
    });
    setEstablecimiento(nom);
    setNuevoEst('');
    return reg;
  };

  const crear = () => {
    if (!cliente) return;
    const m = Math.max(0, parseFloat(metros) || 0);
    const tipoT = TIPOS_TRABAJO.find((t) => t.id === tipoTrabajo);
    const nombre = cliente.razonSocial + ' · ' + (establecimiento || 'Sin establecimiento') + ' · ' + tipoT.n;
    // obra nueva: resetea trazado y arranca en el módulo 1
    setObra({
      id: 'obra-' + Date.now().toString(36),
      nombre, lote: '', localidad: '', responsable: '',
      establecimiento: cliente.razonSocial + (establecimiento ? ' — ' + establecimiento : ''),
      tipoTrabajo, demo: false, creada: new Date().toISOString()
    });
    setClienteId(cliente.id);
    setTrazado({ vertices: [], modo: 'lineal', cerrado: false, capa: 'satelite' });
    setMat({
      patron, suelo,
      usarManual: m > 0, metrosManual: m > 0 ? String(m) : ''
    });
    if (tipoTrabajo === 'desarme-armado') {
      // el desarme se cobra aparte: se precarga en mano de obra
      setCostos({ metrosDesarme: m });
    } else {
      setCostos({ metrosDesarme: 0 });
    }
    onCreada && onCreada();
    setModulo(1);
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-2 sm:p-4 bg-black/60">
      <div className="bg-white rounded-md border-[1.5px] border-line w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-line bg-canvas flex items-center justify-between sticky top-0">
          <div>
            <div className="display font-bold text-[17px]">Nueva obra</div>
            <div className="mono text-[11px] text-muted">Cliente → obra → trazado → infraestructura → costos → ejecución</div>
          </div>
          <button onClick={onClose} className="w-11 h-11 rounded-md border-[1.5px] border-line bg-white flex items-center justify-center" aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* cliente */}
          <div>
            <div className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-2">1 · Cliente</div>
            {clienteFijo || cliente ? (
              <Card className="bg-canvas/70! p-3 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="font-bold text-[15px]">{cliente.razonSocial}</div>
                  <div className="mono text-[12px] text-muted">{cliente.cuit}</div>
                </div>
                {!clienteFijo && (
                  <Btn variant="ghost" className="min-h-[44px]! text-[13px]!" onClick={() => { setClienteIdSel(null); }}>
                    Cambiar
                  </Btn>
                )}
              </Card>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-2.5 top-3.5 text-muted" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente…"
                    className="field w-full pl-8 mono text-[13px]" />
                </div>
                <div className="max-h-[160px] overflow-y-auto divide-y divide-line rounded-md border border-line">
                  {filtrados.map((c) => (
                    <button key={c.id} onClick={() => { setClienteIdSel(c.id); setEstablecimiento(c.establecimientos?.[0] || ''); }}
                      className={'w-full text-left p-2.5 ' + (clienteId === c.id ? 'bg-okbg/60' : 'hover:bg-canvas')}>
                      <span className="font-bold text-[14px]">{c.razonSocial}</span>
                      <span className="mono text-[12px] text-muted ml-2">{c.cuit}</span>
                    </button>
                  ))}
                  {filtrados.length === 0 && <div className="p-3 mono text-[13px] text-muted">Sin clientes. Creá uno en el Directorio.</div>}
                </div>
              </div>
            )}
          </div>

          {/* establecimiento */}
          {cliente && (
            <div>
              <div className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-2">2 · Establecimiento / potrero</div>
              <div className="flex gap-2 flex-wrap mb-2">
                {establecimientos.map((e) => (
                  <button key={e} onClick={() => setEstablecimiento(e)}
                    className={'px-3 rounded-md border-[1.5px] min-h-[44px] text-[13px] font-semibold inline-flex items-center gap-1.5 ' +
                      (establecimiento === e ? 'bg-agro text-white border-agro-deep' : 'bg-white border-line')}
                    aria-pressed={establecimiento === e}>
                    {establecimiento === e && <Check size={15} />} {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={nuevoEst} onChange={(e) => setNuevoEst(e.target.value)} placeholder="Agregar establecimiento…"
                  className="field flex-1 mono text-[13px]" />
                <Btn variant="ghost" className="min-h-[44px]! text-[13px]!" onClick={agregarEstablecimiento} disabled={!nuevoEst.trim()}>Agregar</Btn>
              </div>
            </div>
          )}

          {/* tipo de trabajo */}
          <div>
            <div className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-2">3 · Tipo de trabajo</div>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_TRABAJO.map((t) => {
                const act = tipoTrabajo === t.id;
                return (
                  <button key={t.id} onClick={() => setTipoTrabajo(t.id)}
                    className={'rounded-md border-[1.5px] p-3 min-h-[64px] text-left flex gap-2.5 items-start ' +
                      (act ? 'border-agro! border-[2.5px]! bg-okbg/40' : 'border-line bg-white')}
                    aria-pressed={act}>
                    <t.icon size={20} className={'shrink-0 mt-0.5 ' + (act ? 'text-agro' : 'text-muted')} />
                    <span>
                      <span className="block font-bold text-[14px]">{t.n}</span>
                      <span className="block text-[12px] text-muted">{t.d}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* datos base */}
          <div>
            <div className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-2">4 · Datos base</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Metros estimados (opcional)">
                <input type="number" min="0" value={metros} onChange={(e) => setMetros(e.target.value)}
                  placeholder="Del trazado GPS" className="field w-full mono text-[14px]" />
              </Field>
              <Field label="Patrón">
                <select value={patron} onChange={(e) => setPatronSel(e.target.value)} className="field w-full mono text-[13px]">
                  {Object.entries(TIPOS_ALAMBRADO).map(([id, t]) => (
                    <option key={id} value={id}>{t.nombre}</option>
                  ))}
                </select>
              </Field>
              <Field label="Suelo">
                <select value={suelo} onChange={(e) => setSuelo(e.target.value)} className="field w-full mono text-[13px]">
                  {SUELOS.map((s) => <option key={s.v} value={s.v}>{s.n}</option>)}
                </select>
              </Field>
            </div>
            {tipoTrabajo === 'desarme-armado' && (
              <div className="mono text-[12px] text-warn bg-warnbg/40 border border-warn/40 rounded p-2 mt-2">
                Se precargan los {metros || '—'} m en "desarme de línea vieja" (Módulo 3 · mano de obra).
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-2 pb-1">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn onClick={crear} disabled={!cliente}><Check size={17} /> Crear obra e ir al trazado</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
