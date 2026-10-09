/* Mapa Leaflet imperativo (React-Leaflet agrega fricción con capas
   dinámicas; esto replica el patrón probado de MolineroApp):
   - Default: Esri World Imagery (satelital) + World Transportation
     (rutas/caminos) + etiquetas.
   - Calles: OSM con fallback AUTOMÁTICO a CARTO ante tileerror
     (la red del usuario bloquea OSM: lección 2026-10-01).
   - Click agrega vértice según modo; GPS vivo por watchPosition.
   Lee/escribe el store directamente (sin prop drilling). */
import React, { useEffect, useRef } from 'react';
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
    const map = L.map(ref.current, { zoomControl: true, attributionControl: true, maxZoom: 19 }).setView([-35.97, -62.73], 13);
    map.attributionControl.setPrefix(false);
    mapRef.current = map;

    // Esri satelital: zoom máximo 19 (nativo 19) para trazar con detalle en el campo.
    const sat = L.tileLayer(ESRI_SAT, { maxZoom: 19, maxNativeZoom: 19 });
    const trans = L.tileLayer(ESRI_TRANS, { maxZoom: 19 });
    const labels = L.tileLayer(ESRI_LABELS, { maxZoom: 19 });
    const grupoSat = L.layerGroup([sat, trans, labels]);

    let osmActiva = true;
    const carto = L.tileLayer(CARTO, { maxZoom: 19, subdomains: 'abcd' });
    const osm = L.tileLayer(OSM, { maxZoom: 19 });
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

  /* --- encuadre inicial a los vértices si hay --- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || vertices.length === 0) return;
    const b = L.latLngBounds(vertices.map((v) => [v.lat, v.lng]));
    map.fitBounds(b.pad(0.25));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const miUbicacion = () => {
    const map = mapRef.current;
    if (!map || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => {}, { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-full h-full min-h-[320px]">
      <div ref={ref} className="absolute inset-0 z-0" />
      <button
        onClick={miUbicacion}
        className="absolute right-3 top-3 z-[500] w-12 h-12 rounded-md bg-white border-2 border-ink flex items-center justify-center text-xl"
        title="Mi ubicación"
        aria-label="Mi ubicación"
      >◎</button>
    </div>
  );
}
