/* Gestor de clientes — portado del export AIStudio y adaptado al
   sistema "Agro-Industrial Precision" (lucide, sin material-symbols).
   Modelo Client: razonSocial, titular, cuit, telefono, email,
   domicilioFiscal, establecimientos[], obrasRealizadas[], saldo. */
import React, { useState, useMemo } from 'react';
import {
  X, Search, UserPlus, Pencil, Trash2, MapPin,
  History, Plus, Download, Upload, Building2, Check
} from 'lucide-react';
import { useStore } from '../store.js';
import { Card, Btn, Badge, Field } from './ui.jsx';

const VACIO = {
  razonSocial: '', titular: '', cuit: '', telefono: '',
  email: '', domicilioFiscal: '', establecimientos: ''
};

export default function ClientManager({ onClose, onNuevaObra }) {
  const clientes = useStore((s) => s.clientes);
  const guardarCliente = useStore((s) => s.guardarCliente);
  const eliminarCliente = useStore((s) => s.eliminarCliente);
  const setClienteId = useStore((s) => s.setClienteId);

  const [selId, setSelId] = useState(clientes[0]?.id || null);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(VACIO);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      (c.razonSocial || '').toLowerCase().includes(q) ||
      (c.titular || '').toLowerCase().includes(q) ||
      (c.cuit || '').includes(q) ||
      (c.establecimientos || []).join(' ').toLowerCase().includes(q));
  }, [clientes, busqueda]);

  const sel = clientes.find((c) => c.id === selId) || null;

  const empezarCrear = () => { setEditId(null); setForm(VACIO); setEditando(true); };
  const empezarEditar = (c) => {
    setEditId(c.id);
    setForm({
      razonSocial: c.razonSocial || '', titular: c.titular || '', cuit: c.cuit || '',
      telefono: c.telefono || '', email: c.email || '', domicilioFiscal: c.domicilioFiscal || '',
      establecimientos: (c.establecimientos || []).join(', ')
    });
    setEditando(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const est = form.establecimientos.split(',').map((s) => s.trim()).filter(Boolean);
    const reg = await guardarCliente({
      ...(editId ? clientes.find((c) => c.id === editId) : {}),
      razonSocial: form.razonSocial.trim(), titular: form.titular.trim(), cuit: form.cuit.trim(),
      telefono: form.telefono.trim(), email: form.email.trim(), domicilioFiscal: form.domicilioFiscal.trim(),
      establecimientos: est.length ? est : ['Establecimiento Principal']
    });
    setSelId(reg.id);
    setEditando(false);
  };

  const borrar = async (c) => {
    if (!window.confirm(`¿Eliminar "${c.razonSocial}" y su historial?`)) return;
    await eliminarCliente(c.id);
    if (selId === c.id) setSelId(null);
  };

  const exportar = () => {
    const blob = new Blob([JSON.stringify(clientes, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'clientes-appalambrado.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const importar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const arr = JSON.parse(r.result);
        if (!Array.isArray(arr)) throw new Error('formato');
        for (const c of arr) { if (c.razonSocial) await guardarCliente({ ...c, id: undefined }); }
      } catch { alert('Archivo inválido'); }
    };
    r.readAsText(f);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-2 sm:p-4 bg-black/60">
      <div className="bg-white rounded-md border-[1.5px] border-line w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-line bg-canvas flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded bg-agro text-white flex items-center justify-center"><Building2 size={22} /></span>
            <div>
              <div className="display font-bold text-[17px]">Directorio de Clientes <Badge tone="info">{clientes.length}</Badge></div>
              <div className="mono text-[11px] text-muted">Fichas fiscales, establecimientos e historial de obras</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" className="min-h-[44px]! text-[13px]!" onClick={exportar}><Download size={16} /><span className="hidden md:inline">Respaldo</span></Btn>
            <label className="inline-flex items-center gap-1.5 px-3 rounded-md border-[1.5px] border-line bg-white text-[13px] font-semibold min-h-[44px] cursor-pointer">
              <Upload size={16} /><span className="hidden md:inline">Importar</span>
              <input type="file" accept=".json" className="hidden" onChange={importar} />
            </label>
            <button onClick={onClose} className="w-11 h-11 rounded-md border-[1.5px] border-line bg-white flex items-center justify-center" aria-label="Cerrar"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 grid md:grid-cols-12 min-h-0">
          {/* lista */}
          <div className="md:col-span-5 border-r border-line flex flex-col min-h-0 bg-canvas/60">
            <div className="p-3 border-b border-line flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-2.5 top-3.5 text-muted" />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar productor, CUIT o campo…"
                  className="field w-full pl-8 mono text-[13px]" />
              </div>
              <Btn className="min-h-[44px]! text-[13px]! shrink-0" onClick={empezarCrear}><UserPlus size={16} /> Nuevo</Btn>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-line">
              {filtrados.map((c) => (
                <button key={c.id} onClick={() => { setSelId(c.id); setEditando(false); }}
                  className={'w-full text-left p-3 ' + (sel?.id === c.id ? 'bg-white border-l-4 border-l-agro' : 'hover:bg-white/70')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[14px] truncate">{c.razonSocial}</span>
                    <Badge tone="muted">{(c.obrasRealizadas || []).length} obras</Badge>
                  </div>
                  <div className="mono text-[12px] text-muted mt-0.5">{c.titular} · <span className="text-agro font-semibold">{c.cuit}</span></div>
                  <div className="mono text-[11px] text-muted truncate mt-0.5 flex items-center gap-1"><MapPin size={12} />{(c.establecimientos || []).join(', ')}</div>
                </button>
              ))}
              {filtrados.length === 0 && (
                <div className="p-8 text-center mono text-[13px] text-muted">Sin resultados. <button className="text-agro font-bold underline" onClick={empezarCrear}>Crear cliente</button></div>
              )}
            </div>
          </div>

          {/* detalle */}
          <div className="md:col-span-7 overflow-y-auto p-4 min-h-0">
            {editando ? (
              <form onSubmit={guardar} className="flex flex-col gap-3">
                <div className="display font-bold text-[16px]">{editId ? 'Editar ficha' : 'Nuevo cliente'}</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Razón social *"><input required className="field w-full mono text-[13px]" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} /></Field>
                  <Field label="Titular / contacto *"><input required className="field w-full mono text-[13px]" value={form.titular} onChange={(e) => setForm({ ...form, titular: e.target.value })} /></Field>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label="CUIT *"><input required className="field w-full mono text-[13px]" value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} placeholder="20-33445566-9" /></Field>
                  <Field label="Teléfono / WhatsApp"><input className="field w-full mono text-[13px]" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
                  <Field label="Email"><input type="email" className="field w-full mono text-[13px]" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                </div>
                <Field label="Establecimientos (separados por coma) *">
                  <input required className="field w-full mono text-[13px]" value={form.establecimientos} onChange={(e) => setForm({ ...form, establecimientos: e.target.value })} placeholder="El Fortín, La Rinconada" />
                </Field>
                <Field label="Domicilio fiscal"><input className="field w-full mono text-[13px]" value={form.domicilioFiscal} onChange={(e) => setForm({ ...form, domicilioFiscal: e.target.value })} /></Field>
                <div className="flex justify-end gap-2">
                  <Btn variant="ghost" type="button" onClick={() => setEditando(false)}>Cancelar</Btn>
                  <Btn type="submit"><Check size={17} /> Guardar ficha</Btn>
                </div>
              </form>
            ) : sel ? (
              <div className="flex flex-col gap-3">
                <Card className="bg-canvas/70!">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="mono text-[10px] text-agro font-bold tracking-widest">FICHA DE CLIENTE</div>
                      <div className="display font-bold text-[20px]">{sel.razonSocial}</div>
                      <div className="mono text-[12px] text-muted mt-1">{sel.titular} · <b className="text-ink">{sel.cuit}</b></div>
                    </div>
                    <div className="flex gap-2">
                      <Btn variant="ghost" className="min-h-[44px]! text-[13px]!" onClick={() => empezarEditar(sel)}><Pencil size={15} /> Editar</Btn>
                      <button onClick={() => borrar(sel)} className="w-11 h-11 rounded-md border-[1.5px] border-bad/50 text-bad flex items-center justify-center" aria-label="Eliminar"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 mt-3 mono text-[12px]">
                    <div className="rounded border border-line bg-white p-2"><div className="text-[10px] text-muted">TELÉFONO</div><b>{sel.telefono || '—'}</b></div>
                    <div className="rounded border border-line bg-white p-2"><div className="text-[10px] text-muted">EMAIL</div><b className="break-all">{sel.email || '—'}</b></div>
                    <div className="rounded border border-line bg-white p-2"><div className="text-[10px] text-muted">CAMPOS</div><b className="text-agro">{(sel.establecimientos || []).join(', ')}</b></div>
                  </div>
                  {sel.domicilioFiscal && <div className="mono text-[12px] text-muted mt-2">Domicilio fiscal: {sel.domicilioFiscal}</div>}
                  <div className="mt-3 pt-3 border-t border-line flex gap-2 flex-wrap">
                    <Btn onClick={() => { setClienteId(sel.id); onNuevaObra(sel); }}><Plus size={17} /> Nueva obra para este cliente</Btn>
                  </div>
                </Card>
                <div>
                  <div className="display font-bold text-[15px] flex items-center gap-2 mb-2"><History size={17} className="text-quebracho" /> Historial de obras ({(sel.obrasRealizadas || []).length})</div>
                  {(sel.obrasRealizadas || []).length === 0
                    ? <div className="mono text-[13px] text-muted">Sin obras registradas.</div>
                    : (sel.obrasRealizadas || []).map((o) => (
                      <div key={o.id} className="rounded-md border-[1.5px] border-line bg-white p-3 mb-2 flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <div className="font-bold text-[14px]">{o.potrero}</div>
                          <div className="mono text-[12px] text-muted">{o.fecha} · {o.metrosLineales?.toLocaleString('es-AR')} m · {o.esquema}</div>
                        </div>
                        <div className="text-right">
                          <div className="mono font-bold text-[14px]">${(o.montoARS || 0).toLocaleString('es-AR')}</div>
                          <Badge tone={o.estado === 'en-ejecucion' ? 'ok' : 'muted'}>{o.estado}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center mono text-[13px] text-muted py-16">Seleccioná un cliente o creá uno nuevo.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
