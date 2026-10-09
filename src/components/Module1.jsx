/* Módulo 1 — GIS y trazado topográfico del alambrado.
   Toolbar (establecimiento editable, chip de coordenadas, capas),
   modos de trazado, mapa con tarjeta de geometría flotante y
   columna "Ficha de Trazado" con tramos, suelos, estimación
   estructural, transferencia a infraestructura y exportaciones. */
import React, { useRef, useState } from 'react';
import {
  MapPin, Satellite, Map as MapIcon, Mountain, Undo2, Trash2,
  Spline, Hexagon, MapPinPlus, Footprints, Lock, Download,
  FileDown, Camera
} from 'lucide-react';
import { useStore } from '../store.js';
import { useGisCalc } from '../hooks/useGisCalc.js';
import { useFenceMaterials } from '../hooks/useFenceMaterials.js';
import { fmtM, fmtHa, fmtNum, fmtCoord } from '../lib/format.js';
import { Card, Badge, Btn, Chip, SectionTitle, EmptyState } from './ui.jsx';
import MapView from './MapView.jsx';

const SUELOS = [
  { v: 'tierra', n: 'Tierra Negra' },
  { v: 'canada', n: 'Bajo / Cañada' },
  { v: 'tosca', n: 'Tosca Dura' }
];
const COLOR_SUELO = { tierra: 'text-ok', canada: 'text-warn', tosca: 'text-satblue' };

const MODOS = [
  { id: 'lineal', label: 'Alambrado Lineal', icon: Spline },
  { id: 'poligono', label: 'Potrero Cerrado (Polígono)', icon: Hexagon },
  { id: 'vertice', label: 'Marcar Vértice / Esquinero (+)', icon: MapPinPlus },
  { id: 'gps', label: 'Trazar Caminando (GPS Vivo)', icon: Footprints }
];

function descargar(nombre, contenido, mime) {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function Module1() {
  const g = useGisCalc();
  const obra = useStore((s) => s.obra);
  const setObra = useStore((s) => s.setObra);
  const { resumen } = useFenceMaterials();
  const [fotos, setFotos] = useState([]);
  const fotoInput = useRef(null);

  const ultimo = g.vertices.length > 0 ? g.vertices[g.vertices.length - 1] : null;
  const coordTxt = ultimo
    ? fmtCoord(ultimo.lat) + ', ' + fmtCoord(ultimo.lng)
    : '-35.84210°, -61.43980°';

  const capaBtn = (activa) =>
    'flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 min-h-[48px] rounded-md border-[1.5px] text-[13px] font-semibold ' +
    (activa ? 'bg-agro text-white border-agro-deep' : 'bg-white text-ink border-line');

  const modoBtn = (activo) =>
    'inline-flex items-center justify-center gap-2 px-3 min-h-[48px] rounded-md border-[1.5px] text-[13px] font-semibold ' +
    (activo ? 'bg-agro text-white border-agro-deep' : 'bg-white text-ink border-line');

  const iconBtn = 'w-12 h-12 min-w-[48px] rounded-md border-[1.5px] border-line bg-white inline-flex items-center justify-center active:bg-canvas-2';

  const exportarGeoJSON = () => {
    const feats = g.vertices.map((v, i) => ({
      type: 'Feature',
      properties: { nombre: 'V' + (i + 1) },
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] }
    }));
    if (g.vertices.length >= 2) {
      const coords = g.vertices.map((v) => [v.lng, v.lat]);
      if (g.cerrado) coords.push(coords[0]);
      feats.push({
        type: 'Feature',
        properties: { nombre: 'Trazado ' + (g.cerrado ? 'cerrado' : 'lineal'), metros: Math.round(g.totalM) },
        geometry: g.cerrado
          ? { type: 'Polygon', coordinates: [coords] }
          : { type: 'LineString', coordinates: coords }
      });
    }
    descargar('trazado.geojson', JSON.stringify({ type: 'FeatureCollection', features: feats }, null, 2), 'application/geo+json');
  };

  const exportarKML = () => {
    const coords = g.vertices.map((v) => v.lng + ',' + v.lat + ',0').join(' ');
    const cierre = g.cerrado && g.vertices.length > 0 ? ' ' + g.vertices[0].lng + ',' + g.vertices[0].lat + ',0' : '';
    const kml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n<name>' +
      (obra.nombre || 'Obra') + ' - Trazado</name>\n<Placemark>\n<name>Trazado ' + (g.cerrado ? 'cerrado' : 'lineal') +
      ' (' + fmtM(g.totalM) + ')</name>\n<LineString>\n<coordinates>' + coords + cierre +
      '</coordinates>\n</LineString>\n</Placemark>\n' +
      g.vertices.map((v, i) => '<Placemark><name>V' + (i + 1) + '</name><Point><coordinates>' + v.lng + ',' + v.lat + ',0</coordinates></Point></Placemark>').join('\n') +
      '\n</Document>\n</kml>';
    descargar('trazado.kml', kml, 'application/vnd.google-earth.kml+xml');
  };

  const agregarFotos = (e) => {
    const archivos = Array.from(e.target.files || []).map((f) => f.name);
    if (archivos.length) setFotos((prev) => [...prev, ...archivos]);
    e.target.value = '';
  };

  const postesBase = resumen ? (resumen.esquineros || 0) + (resumen.refuerzos || 0) + (resumen.tirantes || 0) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* ---- toolbar superior ---- */}
      <Card className="p-3!">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin size={20} className="text-quebracho shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] tracking-widest text-muted font-semibold">ESTABLECIMIENTO & PARCELA</div>
              <input
                value={obra.establecimiento || ''}
                onChange={(e) => setObra({ establecimiento: e.target.value })}
                placeholder="Establecimiento · potrero"
                className="field w-full font-semibold text-[15px] mt-0.5"
                aria-label="Establecimiento"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Chip className="text-[12px]!"><span className="text-ok font-bold">●</span> {coordTxt}</Chip>
            <Badge tone="ok">RTK PRECISO</Badge>
          </div>
          <div className="flex gap-2">
            <button className={capaBtn(g.capa === 'satelite')} onClick={() => g.setCapa('satelite')}>
              <Satellite size={17} /> Satélite Híbrido HD
            </button>
            <button className={capaBtn(g.capa === 'calles')} onClick={() => g.setCapa('calles')}>
              <MapIcon size={17} /> Catastral OpenStreetMap
            </button>
            <button className={capaBtn(false) + ' opacity-60'} disabled title="Disponible próximamente">
              <Mountain size={17} /> Curvas de Nivel (SRTM) <Badge tone="muted">Pronto</Badge>
            </button>
          </div>
        </div>
      </Card>

      {/* ---- modos de trazado ---- */}
      <Card className="p-3!">
        <div className="flex flex-wrap items-center gap-2">
          {MODOS.map((m) => (
            <button key={m.id} className={modoBtn(g.modo === m.id)} onClick={() => g.setModo(m.id)}>
              <m.icon size={17} /> {m.label}
            </button>
          ))}
          <div className="flex-1" />
          <button className={iconBtn} onClick={g.quitarUltimoVertice} disabled={g.vertices.length === 0} title="Deshacer último vértice" aria-label="Deshacer">
            <Undo2 size={18} />
          </button>
          <button className={iconBtn} onClick={g.limpiarTrazado} disabled={g.vertices.length === 0} title="Limpiar trazado" aria-label="Limpiar">
            <Trash2 size={18} />
          </button>
          {g.modo === 'poligono' && !g.cerrado && g.vertices.length >= 3 && (
            <Btn onClick={g.cerrarPoligono}><Lock size={17} /> Cerrar polígono</Btn>
          )}
        </div>
        {g.modo === 'gps' && (
          <div className="mt-2">
            <Badge tone="warn"><span className="inline-block w-2 h-2 rounded-full bg-warn animate-pulse" /> GPS vivo registrando posición…</Badge>
          </div>
        )}
      </Card>

      {/* ---- mapa + ficha ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3">
        <div className="relative rounded-md border-[1.5px] border-line overflow-hidden min-h-[420px] lg:min-h-[560px]">
          <MapView />
          {/* tarjeta flotante de geometría */}
          <div className="absolute top-3 left-3 z-[400] max-w-[min(92%,430px)]">
            <Card className="p-3!">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] tracking-widest text-muted font-semibold">GEOMETRÍA HAVERSINE WGS84</span>
                {g.cerrado && <Badge tone="ok">CERRADO OK</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[11px] text-muted">Perímetro Total</div>
                  <div className="display font-bold text-[20px] mono">{fmtM(g.totalM)}</div>
                  <div className="text-[11px] text-muted mono">{(g.totalM / 1000).toFixed(2).replace('.', ',')} km lineales</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">Superficie</div>
                  <div className="display font-bold text-[20px] mono">{fmtHa(g.hectareas)}</div>
                  <div className="text-[11px] text-muted mono">{fmtNum(g.areaM2)} m²</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">Esquineros</div>
                  <div className="display font-bold text-[20px] mono">{g.nEsquineros} <span className="text-[13px] font-normal">u.</span></div>
                  <div className="text-[11px] text-muted mono">{g.nVertices} vértices</div>
                </div>
              </div>
            </Card>
          </div>
          {g.vertices.length === 0 && (
            <div className="absolute inset-x-3 bottom-3 z-[400]">
              <EmptyState
                title="Sin trazado"
                sub="Tocá el mapa para agregar vértices según el modo activo, o caminá el lote con GPS vivo."
                action={<Btn onClick={() => g.setModo('poligono')}><Hexagon size={17} /> Empezar potrero</Btn>}
              />
            </div>
          )}
        </div>

        {/* ---- ficha de trazado ---- */}
        <div className="flex flex-col gap-3">
          <Card className="p-3!">
            <div className="flex items-center justify-between mb-2">
              <SectionTitle n="" title="Ficha de Trazado" sub={g.tramos.length + ' Tramos Topográficos Activos'} />
              <Badge tone="info">IRAM 7H</Badge>
            </div>
            {g.tramos.length === 0 ? (
              <EmptyState title="Sin tramos" sub="Agregá vértices en el mapa para ver el detalle por tramo." />
            ) : (
              <div className="flex flex-col gap-2">
                {g.tramos.map((t) => (
                  <div key={t.idx} className="rounded-md border-[1.5px] border-line p-2.5 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-canvas-2 border border-line shrink-0">{t.tag}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-[14px] truncate">
                            V{t.idx + 1} → V{((t.idx + 1) % Math.max(g.nVertices, 1)) + 1}
                          </div>
                          <div className={'text-[12px] font-medium ' + (COLOR_SUELO[t.suelo] || 'text-muted')}>{t.sueloNombre}</div>
                        </div>
                      </div>
                      <div className="mono font-bold text-[15px] shrink-0">{fmtM(t.metros)}</div>
                    </div>
                    <select
                      value={t.suelo}
                      onChange={(e) => g.setSueloTramo(t.idx, e.target.value)}
                      className="field w-full mt-2 text-[13px]"
                      aria-label={'Suelo del tramo ' + t.tag}
                    >
                      {SUELOS.map((s) => <option key={s.v} value={s.v}>{s.n}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-3!">
            <SectionTitle n="" title="Estimación Estructural Base" />
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              <div>
                <div className="text-muted">Postes Quebracho</div>
                <div className="mono font-bold text-[16px]">{fmtNum(postesBase)} unidades</div>
              </div>
              <div>
                <div className="text-muted">Varillas Curupay</div>
                <div className="mono font-bold text-[16px]">{fmtNum(resumen ? resumen.varillas || 0 : 0)} unidades</div>
              </div>
            </div>
          </Card>

          <Btn className="w-full text-[16px]! py-3!" onClick={g.irAInfraestructura}>
            <Download size={18} /> Transferir {fmtM(g.totalM)} a Infraestructura
          </Btn>

          <div className="grid grid-cols-2 gap-2">
            <Btn variant="ghost" onClick={exportarGeoJSON} disabled={g.vertices.length === 0}>
              <FileDown size={17} /> Exportar GeoJSON
            </Btn>
            <Btn variant="ghost" onClick={exportarKML} disabled={g.vertices.length === 0}>
              <Download size={17} /> Generar KML
            </Btn>
          </div>

          <Card className="p-3!">
            <div className="flex items-center gap-2 mb-2">
              <Camera size={18} className="text-quebracho" />
              <div className="font-semibold text-[14px]">Relevamiento fotográfico</div>
            </div>
            <input
              ref={fotoInput}
              type="file" accept="image/*" multiple className="hidden"
              onChange={agregarFotos}
            />
            <Btn variant="ghost" className="w-full" onClick={() => fotoInput.current && fotoInput.current.click()}>
              <Camera size={17} /> Agregar fotos del lote
            </Btn>
            {fotos.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {fotos.map((f, i) => (
                  <li key={i} className="mono text-[12px] text-muted truncate border-b border-line pb-1">{f}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* pie técnico */}
      <div className="mono text-[11px] text-muted flex flex-col sm:flex-row gap-1 sm:gap-6">
        <span>● Polígono {g.cerrado ? 'cerrado verificado (Tolerancia angular OK)' : 'abierto — línea de alambrado'}</span>
        <span>Elipsoide de referencia: GRS80 / POSGAR 07 Faja 4</span>
      </div>
    </div>
  );
}
