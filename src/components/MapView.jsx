/* Mapa Leaflet imperativo (React-Leaflet agrega fricción con capas
   dinámicas; esto replica el patrón probado de MolineroApp):
   - Default: Esri World Imagery (satelital) + World Transportation
     (rutas/caminos) + etiquetas.
   - Calles: OSM con fallback AUTOMÁTICO a CARTO ante tileerror
     (la red del usuario bloquea OSM: lección 2026-10-01).
   - Click agrega vértice según modo; GPS vivo por watchPosition.
   Lee/escribe el store directamente (sin prop drilling). */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useStore } from '../store.js';
import { puntoEnDistancia, normalizarTranquera, textoAnchoTranquera } from '../lib/calc.js';

const ESRI_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_TRANS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CARTO = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

export default function MapView() {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const capasRef = useRef({});
  const dibujoRef = useRef(null);
  const watchRef = useRef(null);
  const gpsMarkRef = useRef(null);
  const encuadreRef = useRef(null);
  const [zoom, setZoom] = useState(13);

  const obraId = useStore((s) => s.obra.id);

  const modo = useStore((s) => s.trazado.modo);
  const vertices = useStore((s) => s.trazado.vertices);
  const cerrado = useStore((s) => s.trazado.cerrado);
  const capa = useStore((s) => s.trazado.capa);
  const tranquerasDetalle = useStore((s) => s.mat.tranquerasDetalle);
  const addVertice = useStore((s) => s.addVertice);

  const modoRef = useRef(modo);
  modoRef.current = modo;
  const addRef = useRef(addVertice);
  addRef.current = addVertice;

  /* --- init única --- */
  useEffect(() => {
    if (mapRef.current || !ref.current) return;
    // Zoom de campo: profundo (21, reescalado sobre nativo 19 en satelital),
    // pasos finos 0.25/0.5 para encuadrar postes y tranqueras con guantes y a pleno sol.
    // Controles +/- propios y grandes (el de Leaflet se desactiva).
    const map = L.map(ref.current, {
      zoomControl: false, attributionControl: true,
      maxZoom: 21, minZoom: 3,
      zoomSnap: 0.25, zoomDelta: 0.5,
      doubleClickZoom: true, touchZoom: true, scrollWheelZoom: true,
    }).setView([-35.97, -62.73], 13);
    map.attributionControl.setPrefix(false);
    mapRef.current = map;
    map.on('zoomend', () => setZoom(map.getZoom()));

    // Esri satelital: más allá del nativo 19 se reescala (sirve para trazar fino).
    const sat = L.tileLayer(ESRI_SAT, { maxZoom: 21, maxNativeZoom: 19 });
    const trans = L.tileLayer(ESRI_TRANS, { maxZoom: 21, maxNativeZoom: 19 });
    const labels = L.tileLayer(ESRI_LABELS, { maxZoom: 21, maxNativeZoom: 19 });
    const grupoSat = L.layerGroup([sat, trans, labels]);

    let osmActiva = true;
    const carto = L.tileLayer(CARTO, { maxZoom: 21, maxNativeZoom: 20, subdomains: 'abcd' });
    const osm = L.tileLayer(OSM, { maxZoom: 21, maxNativeZoom: 19 });
    osm.on('tileerror', () => {
      if (osmActiva && map.hasLayer(osm)) {
        // Fallback automático OSM → CARTO (red bloquea OSM)
        map.removeLayer(osm);
        carto.addTo(map);
        osmActiva = false;
      }
    });

    capasRef.current = { grupoSat, osm, carto };
    grupoSat.addTo(map);

    map.on('click', (e) => {
      const m = modoRef.current;
      if (m === 'lineal' || m === 'poligono' || m === 'vertice') {
        addRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    const dibujo = L.layerGroup().addTo(map);
    dibujoRef.current = dibujo;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* --- cambio de capa --- */
  useEffect(() => {
    const map = mapRef.current, c = capasRef.current;
    if (!map || !c.grupoSat) return;
    map.removeLayer(c.grupoSat); map.removeLayer(c.osm); map.removeLayer(c.carto);
    if (capa === 'satelite') c.grupoSat.addTo(map);
    else { c.osm.addTo(map); }
    setTimeout(() => map.invalidateSize(), 100);
  }, [capa]);

  /* --- redibujo del trazado --- */
  useEffect(() => {
    const map = mapRef.current, dibujo = dibujoRef.current;
    if (!map || !dibujo) return;
    dibujo.clearLayers();
    const latlngs = vertices.map((v) => [v.lat, v.lng]);
    if (latlngs.length === 0) return;
    const esPoligono = cerrado && latlngs.length >= 3;
    if (esPoligono) {
      L.polygon(latlngs, { color: '#d97706', weight: 4, fillColor: '#d97706', fillOpacity: 0.12 }).addTo(dibujo);
    } else if (latlngs.length >= 2) {
      L.polyline(latlngs, { color: '#40916c', weight: 5 }).addTo(dibujo);
    }
    latlngs.forEach((ll, i) => {
      L.circleMarker(ll, {
        radius: 8, color: '#0f172a', weight: 2, fillColor: '#d97706', fillOpacity: 1
      }).bindTooltip('V' + (i + 1), { permanent: false }).addTo(dibujo);
    });
    // Tranqueras ubicadas: marcadores sobre la línea a su distancia.
    (tranquerasDetalle || []).forEach((t, i) => {
      const tn = normalizarTranquera(t);
      const p = puntoEnDistancia(vertices, tn.pos);
      if (!p) return;
      const esTron = tn.tipo === 'tranqueron';
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:26px;height:26px;border-radius:6px;border:2px solid #582f0e;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;background:' + (esTron ? '#b45309' : '#d97706') + '">' + (esTron ? 'Q' : 'T') + '</div>',
          iconSize: [26, 26], iconAnchor: [13, 13]
        })
      }).bindTooltip((esTron ? 'Tranquerón' : 'Tranquera') + ' ' + textoAnchoTranquera(tn.anchoM) + ' · ' + Math.round(tn.pos) + ' m', { permanent: false }).addTo(dibujo);
    });
  }, [vertices, cerrado, tranquerasDetalle]);

  /* --- GPS vivo: agrega posición cada ~5 m --- */
  useEffect(() => {
    if (modo !== 'gps' || !('geolocation' in navigator)) return;
    let ultimo = null;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!ultimo || Math.hypot(p.lat - ultimo.lat, p.lng - ultimo.lng) * 111195 > 5) {
          ultimo = p;
          addRef.current(p);
        }
        const map = mapRef.current;
        if (map) map.panTo([p.lat, p.lng]);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
    watchRef.current = id;
    return () => { navigator.geolocation.clearWatch(id); watchRef.current = null; };
  }, [modo]);

  /* --- encuadre inicial: una vez por obra, cuando haya vértices ---
     (cubre carga diferida desde Dexie: no solo el primer mount) */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (encuadreRef.current !== obraId) encuadreRef.current = null; // obra nueva → reencuadrar
    if (vertices.length === 0 || encuadreRef.current) return;
    map.fitBounds(L.latLngBounds(vertices.map((v) => [v.lat, v.lng])).pad(0.3), { maxZoom: 18 });
    encuadreRef.current = obraId;
  }, [vertices, obraId]);

  const miUbicacion = () => {
    const map = mapRef.current;
    if (!map || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        map.setView(ll, 18); // zoom de campo: bien cerca para trazar
        if (gpsMarkRef.current) gpsMarkRef.current.remove();
        const acc = pos.coords.accuracy || 0;
        gpsMarkRef.current = L.layerGroup([
          L.circle(ll, { radius: Math.max(acc, 8), color: '#2563eb', weight: 1, fillOpacity: 0.15 }),
          L.circleMarker(ll, { radius: 9, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }),
        ]).addTo(map);
      },
      () => {}, { enableHighAccuracy: true }
    );
  };

  const zoomTxt = Number(zoom.toFixed(2)).toString().replace('.', ',');

  return (
    <div className="relative w-full h-full min-h-[320px]">
      <div ref={ref} className="absolute inset-0 z-0" />
      {/* Zoom táctil grande para campo (guantes / sol fuerte).
          Pasos de 0.5 por toque; pellizco, doble tap y doble clic siguen activos. */}
      <div className="absolute right-3 bottom-6 z-[500] flex flex-col items-center gap-2">
        <button onClick={() => mapRef.current && mapRef.current.zoomIn()} aria-label="Acercar"
          className="w-14 h-14 rounded-lg bg-[#1b4332] text-white text-3xl font-black border-2 border-[#08130d] shadow-lg active:bg-[#2d6a4f] select-none touch-manipulation leading-none">+</button>
        <div className="px-2 py-1 rounded bg-black/75 text-white text-xs font-mono font-bold select-none" aria-hidden="true">{zoomTxt}</div>
        <button onClick={() => mapRef.current && mapRef.current.zoomOut()} aria-label="Alejar"
          className="w-14 h-14 rounded-lg bg-[#1b4332] text-white text-3xl font-black border-2 border-[#08130d] shadow-lg active:bg-[#2d6a4f] select-none touch-manipulation leading-none">−</button>
      </div>
      <button
        onClick={miUbicacion}
        className="absolute right-3 top-3 z-[500] w-14 h-14 rounded-lg bg-white border-2 border-[#1b4332] flex items-center justify-center text-2xl text-[#1b4332] font-black shadow-lg active:bg-[#d8f3dc] select-none touch-manipulation"
        title="Mi ubicación"
        aria-label="Mi ubicación"
      >◎</button>
    </div>
  );
}
