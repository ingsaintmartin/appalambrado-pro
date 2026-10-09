/* Shell: header persistente + sidebar (desktop) / bottom nav (mobile) */
import React, { useEffect, useState } from 'react';
import { Users, Plus, Building2 } from 'lucide-react';
import { useStore } from './store.js';
import { contarPendientes } from './lib/db.js';
import { iniciarSyncAutomatica, tursoConfigurado } from './lib/turso.js';
import { fmtNum } from './lib/format.js';
import Module1 from './components/Module1.jsx';
import Module2 from './components/Module2.jsx';
import Module3 from './components/Module3.jsx';
import Module4 from './components/Module4.jsx';
import ClientManager from './components/ClientManager.jsx';
import NewProjectModal from './components/NewProjectModal.jsx';
import EmpresaModal from './components/EmpresaModal.jsx';

const MODULOS = [
  { n: 1, titulo: 'Mapeo Topográfico & GIS', sub: 'Haversine, perímetro y ha' },
  { n: 2, titulo: 'Infraestructura & Hilos', sub: 'Corte reactivo, replanteo y BOM' },
  { n: 3, titulo: 'Motor de Costos & Cotización', sub: 'Insumos, mano de obra, WhatsApp' },
  { n: 4, titulo: 'Ejecución & Control', sub: 'Desvíos, auditoría y variance KPIs' }
];

function Header({ onClientes, onNuevaObra, onEmpresa }) {
  const obra = useStore((s) => s.obra);
  const clienteId = useStore((s) => s.clienteId);
  const clientes = useStore((s) => s.clientes);
  const cliente = clientes.find((c) => c.id === clienteId);
  const [pendientes, setPendientes] = useState(0);
  useEffect(() => {
    contarPendientes().then(setPendientes).catch(() => {});
    const id = setInterval(() => contarPendientes().then(setPendientes).catch(() => {}), 15000);
    return () => clearInterval(id);
  }, []);
  const syncTxt = !navigator.onLine ? 'OFFLINE' : pendientes > 0 ? `SYNC: ${pendientes} PEND` : tursoConfigurado ? 'SYNC AUTO' : 'SOLO LOCAL';
  return (
    <header className="bg-agro text-white border-b-2 border-agro-deep">
      <div className="flex items-center gap-2 px-3 h-[60px] max-w-[1440px] mx-auto">
        <div className="w-9 h-9 rounded bg-white/10 border border-white/20 flex items-center justify-center font-bold display text-[18px]">A</div>
        <div className="leading-tight mr-2">
          <div className="display font-bold text-[16px]">AppAlambrado <span className="text-[10px] align-top opacity-70">PRO</span></div>
          <div className="text-[10px] opacity-70 hidden sm:block">Ingeniería de Alambrados & Control Rural</div>
        </div>
        <div className="hidden md:flex items-center gap-2 ml-4 text-[11px] mono">
          <span className={'px-2 py-1 rounded border ' + (!navigator.onLine ? 'border-warn text-warn' : 'border-white/25')}>
            ● PWA {navigator.onLine ? 'ONLINE' : 'OFFLINE'}: {syncTxt}
          </span>
          <span className="px-2 py-1 rounded border border-white/25">📡 GPS RTK: ±1.8m</span>
          <span className="px-2 py-1 rounded border border-white/25">☀️ MODO SOLAR: 100%</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={onClientes}
          className="hidden sm:inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/25 rounded-md px-3 min-h-[44px] text-[14px] font-semibold"
        ><Users size={16} /> Clientes</button>
        <button
          onClick={onEmpresa}
          className="hidden sm:inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/25 rounded-md px-3 min-h-[44px] text-[14px] font-semibold ml-2"
        ><Building2 size={16} /> Empresa</button>
        <button
          onClick={onNuevaObra}
          className="hidden sm:inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/25 rounded-md px-3 min-h-[44px] text-[14px] font-semibold ml-2"
        ><Plus size={16} /> Nueva obra</button>
        <div className="hidden lg:flex items-center gap-2 ml-2 text-right">
          <div className="leading-tight">
            <div className="text-[12px] font-semibold">{cliente ? cliente.razonSocial : (obra.responsable || 'Contratista')}</div>
            <div className="text-[10px] opacity-70">{cliente ? 'Cliente activo' : 'Contratista Certificado'}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-quebracho border border-white/30 flex items-center justify-center font-bold">👤</div>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  const modulo = useStore((s) => s.modulo);
  const setModulo = useStore((s) => s.setModulo);
  const obra = useStore((s) => s.obra);
  return (
    <aside className="hidden lg:flex flex-col w-[264px] shrink-0 border-r border-line bg-white">
      <div className="p-3">
        <div className="card-hd p-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] tracking-widest text-muted font-semibold">OBRA ACTIVA</span>
            {obra.lote && <span className="mono text-[11px] px-1.5 py-0.5 rounded bg-okbg text-ok border border-ok/30">{obra.lote}</span>}
          </div>
          <div className="font-semibold text-[15px] leading-snug">{obra.nombre}</div>
          {obra.localidad && <div className="text-[12px] text-muted">{obra.localidad}</div>}
        </div>
        <nav className="flex flex-col gap-1">
          {MODULOS.map((m) => (
            <button
              key={m.n}
              onClick={() => setModulo(m.n)}
              className={'text-left rounded-md border-[1.5px] px-3 py-2.5 min-h-[56px] ' + (modulo === m.n ? 'bg-agro text-white border-agro-deep' : 'bg-white border-transparent hover:border-line')}
            >
              <div className="display font-bold text-[14px]">{m.n}. {m.titulo}</div>
              <div className={'text-[11px] ' + (modulo === m.n ? 'opacity-70' : 'text-muted')}>{m.sub}</div>
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-3">
        <div className="card-hd p-3">
          <div className="flex justify-between text-[11px] mono text-muted mb-1">
            <span>Cache Offline</span><span>14.2 MB</span>
          </div>
          <div className="h-2 rounded bg-slate-200 overflow-hidden">
            <div className="h-full bg-agro-2 rounded" style={{ width: '72%' }} />
          </div>
          <div className="text-[11px] text-muted mt-1">Mapas base descargados</div>
        </div>
      </div>
    </aside>
  );
}

function BottomNav() {
  const modulo = useStore((s) => s.modulo);
  const setModulo = useStore((s) => s.setModulo);
  const iconos = ['🗺️', '🧱', '💰', '📊'];
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[600] bg-agro text-white border-t-2 border-agro-deep" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-4">
        {MODULOS.map((m, i) => (
          <button
            key={m.n}
            onClick={() => setModulo(m.n)}
            className={'flex flex-col items-center py-2 min-h-[60px] ' + (modulo === m.n ? 'bg-white/15' : 'opacity-70')}
          >
            <span className="text-[20px]">{iconos[i]}</span>
            <span className="text-[10px] font-semibold">{m.titulo.split(' ')[0]} {m.n}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function StatusBar() {
  const obra = useStore((s) => s.obra);
  return (
    <div className="hidden md:flex items-center gap-3 px-4 h-9 bg-ink text-white text-[11px] mono overflow-x-auto no-scrollbar whitespace-nowrap">
      <span>⛰ {obra.nombre} {obra.lote ? '| ' + obra.lote : ''}</span>
      <span className="opacity-40">/</span><span>Norma IRAM 7 Hilos Tradicional</span>
      <span className="flex-1" />
      <span className="px-1.5 py-0.5 rounded bg-ok text-white font-bold">RTK FIXED</span>
    </div>
  );
}

export default function App() {
  const modulo = useStore((s) => s.modulo);
  const cargarClientes = useStore((s) => s.cargarClientes);
  const cargarEmpresa = useStore((s) => s.cargarEmpresa);
  const [showClientes, setShowClientes] = useState(false);
  const [showNuevaObra, setShowNuevaObra] = useState(false);
  const [showEmpresa, setShowEmpresa] = useState(false);
  const [clienteFijo, setClienteFijo] = useState(null);
  useEffect(() => { iniciarSyncAutomatica(); cargarClientes().catch(() => {}); cargarEmpresa().catch(() => {}); }, []);
  return (
    <div className="h-full flex flex-col">
      <Header
        onClientes={() => setShowClientes(true)}
        onNuevaObra={() => { setClienteFijo(null); setShowNuevaObra(true); }}
        onEmpresa={() => setShowEmpresa(true)}
      />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto pb-20 lg:pb-0">
          <div className="max-w-[1440px] mx-auto p-3 md:p-4">
            {modulo === 1 && <Module1 />}
            {modulo === 2 && <Module2 />}
            {modulo === 3 && <Module3 />}
            {modulo === 4 && <Module4 />}
          </div>
        </main>
      </div>
      <StatusBar />
      <BottomNav />
      {showClientes && (
        <ClientManager
          onClose={() => setShowClientes(false)}
          onNuevaObra={(c) => { setShowClientes(false); setClienteFijo(c); setShowNuevaObra(true); }}
        />
      )}
      {showNuevaObra && (
        <NewProjectModal
          clienteFijo={clienteFijo}
          onClose={() => setShowNuevaObra(false)}
          onCreada={() => setShowNuevaObra(false)}
        />
      )}
      {showEmpresa && (
        <EmpresaModal onClose={() => setShowEmpresa(false)} />
      )}
    </div>
  );
}

// re-export para tests
export { fmtNum };
