/* Pantalla Empresa — perfil del contratista / marca configurable.
   Marca por defecto: "EL ATADOR · Alambrados Rurales".
   El logo se guarda como dataURL JPEG (máx 512 px) en Dexie. */
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.js';
import { imagenAJpegDataUrl } from '../lib/empresa.js';
import { Btn, Field } from './ui.jsx';
import { Building2, X, Upload, RotateCcw, Check } from 'lucide-react';

const inputCls = 'border-[1.5px] border-line rounded-md px-3 py-2 min-h-[48px] bg-white w-full text-[15px]';

const formDe = (empresa) => ({
  nombreFantasia: empresa?.nombreFantasia || 'EL ATADOR',
  tagline: empresa?.tagline || 'Alambrados Rurales',
  razonSocial: empresa?.razonSocial || '',
  cuit: empresa?.cuit || '',
  telefono: empresa?.telefono || '',
  email: empresa?.email || '',
  domicilio: empresa?.domicilio || ''
});

export default function EmpresaModal({ onClose }) {
  const empresa = useStore((s) => s.empresa);
  const guardarEmpresa = useStore((s) => s.guardarEmpresa);
  const restablecerEmpresa = useStore((s) => s.restablecerEmpresa);
  const fileRef = useRef(null);
  const [form, setForm] = useState(() => formDe(empresa));
  const [logo, setLogo] = useState(empresa?.logoDataUrl || '');
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  // Si la empresa termina de cargar con el modal abierto, sincronizar.
  useEffect(() => {
    if (empresa) {
      setForm(formDe(empresa));
      setLogo(empresa.logoDataUrl || '');
    }
  }, [empresa]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      setMsg('Procesando imagen…');
      const dataUrl = await imagenAJpegDataUrl(f, 512);
      setLogo(dataUrl);
      setMsg('');
    } catch (err) {
      setMsg('No se pudo leer la imagen.');
    }
    e.target.value = '';
  };

  const onGuardar = async () => {
    setGuardando(true);
    try {
      await guardarEmpresa({ ...form, logoDataUrl: logo });
      setMsg('Datos guardados.');
      setTimeout(() => { onClose(); }, 600);
    } catch (e) {
      setMsg('No se pudo guardar.');
    }
    setGuardando(false);
  };

  const onRestablecer = async () => {
    if (!window.confirm('¿Volver a la marca original "EL ATADOR · Alambrados Rurales"?')) return;
    setGuardando(true);
    const reg = await restablecerEmpresa();
    setForm(formDe(reg));
    setLogo(reg.logoDataUrl || '');
    setMsg('Marca original restablecida.');
    setGuardando(false);
  };

  return (
    <div className="fixed inset-0 z-[700] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg border-[1.5px] border-line w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-agro text-white px-4 py-3 flex items-center justify-between rounded-t-md">
          <div className="flex items-center gap-2 font-bold display text-[16px]">
            <Building2 size={18} /> Mi empresa
          </div>
          <button onClick={onClose} className="p-2 -m-1" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <p className="text-[13px] text-muted">
            Estos datos y tu logo encabezan los presupuestos en PDF. La marca inicial es
            <strong className="text-ink"> EL ATADOR · Alambrados Rurales</strong>; cambiala por la tuya cuando quieras.
          </p>

          {/* Logo */}
          <div className="flex items-center gap-3 rounded-md border border-line bg-canvas/60 p-3">
            <div className="w-20 h-20 rounded-md border border-line bg-white flex items-center justify-center overflow-hidden shrink-0">
              {logo
                ? <img src={logo} alt="Logo de la empresa" className="w-full h-full object-contain" />
                : <span className="text-[11px] text-muted text-center px-1">Sin logo</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Btn variant="secondary" onClick={() => fileRef.current && fileRef.current.click()}>
                <Upload size={16} /> Subir logo
              </Btn>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <button onClick={onRestablecer} className="inline-flex items-center gap-1.5 text-[13px] text-satblue underline underline-offset-2 min-h-[44px]">
                <RotateCcw size={14} /> Restablecer marca original
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre fantasía *">
              <input className={inputCls} value={form.nombreFantasia} onChange={set('nombreFantasia')} placeholder="EL ATADOR" />
            </Field>
            <Field label="Rubro / bajada">
              <input className={inputCls} value={form.tagline} onChange={set('tagline')} placeholder="Alambrados Rurales" />
            </Field>
          </div>
          <Field label="Razón social">
            <input className={inputCls} value={form.razonSocial} onChange={set('razonSocial')} placeholder="Pérez Juan Carlos" />
          </Field>
          <Field label="CUIT">
            <input className={inputCls} value={form.cuit} onChange={set('cuit')} placeholder="20-12345678-9" inputMode="numeric" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Teléfono / WhatsApp">
              <input className={inputCls} value={form.telefono} onChange={set('telefono')} placeholder="02392 15-..." inputMode="tel" />
            </Field>
            <Field label="Email">
              <input className={inputCls} value={form.email} onChange={set('email')} placeholder="contacto@..." inputMode="email" />
            </Field>
          </div>
          <Field label="Domicilio / localidad">
            <input className={inputCls} value={form.domicilio} onChange={set('domicilio')} placeholder="Ruta 5 km 320, Trenque Lauquen" />
          </Field>

          {msg && <div className="text-[13px] text-agro font-semibold">{msg}</div>}

          <div className="flex gap-2 pt-1">
            <Btn variant="primary" onClick={onGuardar} disabled={guardando} className="flex-1">
              <Check size={18} /> {guardando ? 'Guardando…' : 'Guardar'}
            </Btn>
            <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
