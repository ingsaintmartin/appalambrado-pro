/* ============================================================
   AppAlambrado Pro — núcleo de cálculo (ESM, puro, testeable)
   ------------------------------------------------------------
   Puerto de la lógica verificada de la versión vanilla
   (js/mapa.js, js/materiales.js, js/cotizador.js,
   js/ejecucion.js — harness 37/37 OK) adaptado al SPEC:
   - refuerzoCadaM default 80 (SPEC) con Math.floor → 48 u.
     cada 3850 m, igual que el diseño Stitch (el SPEC dice
     ceil pero su propio ejemplo da 48 = floor(48.125)).
   - Suelo 'canada': refuerzo efectivo cada 8 m (diseño).
   - Agregados del diseño: tirantes, varillas de tensión,
     alambre dulce, tranqueras, peso (Tn) y camión sugerido.
   ============================================================ */

const RADIO_TIERRA_M = 6371000;
const aRadianes = (g) => g * Math.PI / 180;

/* ---------- Geometría (Haversine WGS84) ---------- */
export function haversineM(a, b) {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) *
    Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(s));
}
export function distanciaTotalM(vertices) {
  let t = 0;
  for (let i = 1; i < vertices.length; i++) t += haversineM(vertices[i - 1], vertices[i]);
  return t;
}
/* Perímetro: suma los tramos + cierre al primer vértice */
export function perimetroM(vertices) {
  if (vertices.length < 3) return distanciaTotalM(vertices);
  return distanciaTotalM(vertices) + haversineM(vertices[vertices.length - 1], vertices[0]);
}
/* Área esférica por exceso esférico (l'Huilier) */
export function areaEsfericaM2(vertices) {
  const n = vertices.length;
  if (n < 3) return 0;
  const R = RADIO_TIERRA_M;
  let total = 0;
  const p0 = vertices[0];
  for (let i = 1; i < n - 1; i++) {
    const a = vertices[i], b = vertices[i + 1];
    const A = haversineM(p0, a) / R, B = haversineM(a, b) / R, C = haversineM(b, p0) / R;
    const s = (A + B + C) / 2;
    const tanE4 = Math.sqrt(Math.max(0,
      Math.tan(s / 2) * Math.tan((s - A) / 2) * Math.tan((s - B) / 2) * Math.tan((s - C) / 2)));
    total += 4 * Math.atan(tanE4);
  }
  return Math.abs(total) * R * R;
}
export const hectareasDe = (m2) => m2 / 10000;

/* Área planar (proyección local, solo referencia/test) */
export function areaPlanarM2(vertices) {
  const n = vertices.length;
  if (n < 3) return 0;
  const lat0 = aRadianes(vertices[0].lat);
  const kx = RADIO_TIERRA_M * Math.cos(lat0);
  const ky = RADIO_TIERRA_M;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = vertices[i], b = vertices[(i + 1) % n];
    s += (aRadianes(a.lng) * kx) * (aRadianes(b.lat) * ky) - (aRadianes(b.lng) * kx) * (aRadianes(a.lat) * ky);
  }
  return Math.abs(s) / 2;
}

/* ---------- Tipos y parámetros ---------- */
export const TIPOS_ALAMBRADO = {
  suspendido7:  { nombre: 'Tradicional Suspendido', descripcion: '7 hilos (5 lisos + 2 púas)', hilos: 7, lisos: 5, puas: 2 },
  convencional: { nombre: 'Convencional Firme', descripcion: 'Viga a viga, postes cada 12-15 m', hilos: 7 },
  electrico:    { nombre: 'Eléctrico Boyero', descripcion: '1 a 3 hilos electroplásticos', hilos: 2 }
};

export const PARAMS_DEFAULT = {
  refuerzoCadaM: 80,   // slider 60–100
  sepVarillas: 2.0,    // slider 1.8–2.5
  desperdicio: 0.05,   // 5% merma técnica
  rolloLisoM: 1000,
  rolloPuaM: 500,
  grampasPorHilo: 1,
  conTirantes: true,
  tranqueras: 2,
  hilosElec: 2,
  posteConvencionalCadaM: 12,
  posteElectricoCadaM: 30
};

/* Códigos de display para el BOM (estilo POST-QBR, VAR-CUR) */
const DISPLAY = {
  'poste-esquinero':   ['POST-QBR-300', 'Poste Esquinero 3.00m + Tirantes', 'u'],
  'poste-refuerzo':    ['POST-REF-220', 'Poste Intermedio Quebracho 2.20m', 'u'],
  'poste-quebracho':   ['POST-QBR-220', 'Poste Quebracho 2.20m', 'u'],
  'varilla':           ['VAR-CUR-140', 'Varillas Curupay 7 orificios', 'u'],
  'alambre-liso-rollo':['ALM-1715-1K', 'Rollo Liso 17/15 x 1000m', 'rollo'],
  'alambre-pua-rollo': ['ALM-PUA-500', 'Púas Super Bagual x 500m', 'rollo'],
  'alambre-boyero-rollo': ['ALM-BOY-1K', 'Alambre Boyero x 1000m', 'rollo'],
  'torniquete':        ['TRN-D7', 'Torniquetes Dobles N°7 Galvanizados', 'u'],
  'varilla-tension':   ['VTS-PL14', 'Varillas de Tensión Planchuela 1 1/4"', 'u'],
  'grampa':            ['GRP-GLV-12', 'Grampas Galv. 1 1/2" Reforzadas', 'u'],
  'grampa-kg':         ['GRP-GLV-KG', 'Grampas Galv. 1 1/2" Reforzadas', 'kg'],
  'alambre-dulce':     ['ALD-14', 'Alambre Dulce N°14 (ataduras)', 'm'],
  'tranquera':         ['TRQ-QBR-350', 'Tranquera Quebracho 3.50m c/herrajes', 'u'],
  'estacon':           ['EST-ITN-160', 'Estacón Itín 1.60m', 'u'],
  'aislador':          ['AIS-OVL', 'Aisladores Rígidos Ovoides', 'u'],
  'tensor':            ['TNS-TRM', 'Tensores Terminales', 'u']
};

/* Peso estimado por unidad (kg) para cubicaje/logística */
const PESO_KG = {
  'poste-esquinero': 85, 'poste-refuerzo': 40, 'poste-quebracho': 40,
  'varilla': 0.9, 'alambre-liso-rollo': 82, 'alambre-pua-rollo': 45,
  'alambre-boyero-rollo': 40, 'torniquete': 0.4, 'varilla-tension': 1.2,
  'grampa': 0.02, 'alambre-dulce': 0.05, 'tranquera': 120,
  'estacon': 12, 'aislador': 0.05, 'tensor': 0.3
};

function item(codigo, cantidad, detalle) {
  const [display, descripcion, unidad] = DISPLAY[codigo] || [codigo, codigo, 'u'];
  return {
    codigo, display, descripcion, unidad, cantidad,
    detalle: detalle || '',
    pesoKg: Math.round((PESO_KG[codigo] || 0) * cantidad * 10) / 10
  };
}

/* Suelo: 'canada' refuerza a 8 m (diseño M1); 'tosca' exige barreno (aviso) */
export function refuerzoEfectivoM(baseM, suelo) {
  if (suelo === 'canada') return 8;
  return baseM;
}

/* Calcula materiales para `metros` lineales.
   opts: { poligono, nVertices, suelo, conTirantes, tranqueras, hilosElec, refuerzoCadaM, sepVarillas }
   Devuelve { items, resumen }. Función pura. */
export function calcularMateriales(tipo, metros, opts = {}) {
  const L = Math.max(0, parseFloat(metros) || 0);
  const o = Object.assign({}, PARAMS_DEFAULT, opts);
  const poligono = !!o.poligono;
  const nV = Math.max(o.nVertices || 0, poligono ? 3 : 0);
  const items = [];
  if (L <= 0) return { items, resumen: null };

  const refCada = refuerzoEfectivoM(o.refuerzoCadaM, o.suelo);
  const notaSuelo = o.suelo === 'canada' ? 'suelo cañada: refuerzo cada 8 m'
    : o.suelo === 'tosca' ? 'tosca dura: requiere barreno' : '';

  if (tipo === 'suspendido7') {
    const T = TIPOS_ALAMBRADO.suspendido7;
    // Esquineros: 2 en línea (extremos); 1 por vértice en polígono.
    const esquineros = poligono ? nV : 2;
    items.push(item('poste-esquinero', esquineros, poligono ? nV + ' vértices GPS' : '2 extremos de línea'));
    if (o.conTirantes) items.push(item('varilla-tension', 0, '')); // placeholder, se reemplaza abajo
    const tirantes = o.conTirantes ? esquineros * 2 : 0;
    // Refuerzos: floor(L / cada) — 3850/80 → 48 u. (diseño)
    const refuerzos = Math.floor(L / refCada);
    items.push(item('poste-refuerzo', refuerzos, 'cada ' + refCada + ' m' + (notaSuelo ? ' · ' + notaSuelo : '')));
    // Varillas: redondeo al entero más cercano.
    const varillas = Math.round(L / o.sepVarillas);
    items.push(item('varilla', varillas, 'cada ' + o.sepVarillas.toFixed(1) + ' m'));
    // Alambre: L × hilos × (1+merma) → rollos SIEMPRE hacia arriba.
    const mLiso = L * T.lisos * (1 + o.desperdicio);
    const rollosLiso = Math.ceil(mLiso / o.rolloLisoM);
    items.push(item('alambre-liso-rollo', rollosLiso, Math.round(mLiso) + ' m ÷ ' + o.rolloLisoM));
    const mPua = L * T.puas * (1 + o.desperdicio);
    const rollosPua = Math.ceil(mPua / o.rolloPuaM);
    items.push(item('alambre-pua-rollo', rollosPua, Math.round(mPua) + ' m ÷ ' + o.rolloPuaM));
    // Torniquetes: 1 por hilo en cada extremo (polígono: por vértice).
    const torniquetes = poligono ? T.hilos * nV : T.hilos * 2;
    items.push(item('torniquete', torniquetes, poligono ? T.hilos + ' × ' + nV + ' vértices' : T.hilos + ' × 2 extremos'));
    // Varillas de tensión: 2 por torniquete.
    items.push(item('varilla-tension', torniquetes * 2, 'planchuela 1 1/4"'));
    // Grampas (estimación): 1 por hilo en cada poste.
    const grampas = (esquineros + refuerzos) * T.hilos * o.grampasPorHilo;
    const g = item('grampa', grampas, 'estimación');
    g.pesoKgDetalle = Math.round(grampas * (PESO_KG.grampa || 0.02) * 10) / 10;
    items.push(g);
    // Alambre dulce para ataduras: ~1.4% del alambre total.
    items.push(item('alambre-dulce', Math.round((mLiso + mPua) * 0.014), 'ataduras de varilla'));
    // Tirantes dobles de contención por esquinero (si aplica).
    if (tirantes > 0) {
      const t = item('varilla-tension', 0, '');
      // reutilizamos código de tirante como ítem separado
      items.push({ ...item('poste-refuerzo', 0, ''), codigo: 'tirante', display: 'TIR-QBR-240',
        descripcion: 'Tirantes dobles de contención (Quebracho 2.40m)', unidad: 'u',
        cantidad: tirantes, detalle: '2 por esquinero', pesoKg: Math.round(tirantes * 38 * 10) / 10 });
    }
    // Quitar el placeholder de varilla-tension en cero
    const idx = items.findIndex(i => i.codigo === 'varilla-tension' && i.cantidad === 0 && !i.detalle);
    if (idx >= 0) items.splice(idx, 1);
    if (o.tranqueras > 0) items.push(item('tranquera', o.tranqueras, '3.50 m con bisagras reforzadas'));

    const resumen = { esquineros, tirantes, refuerzos, varillas, mLiso: Math.round(mLiso),
      mPua: Math.round(mPua), rollosLiso, rollosPua, torniquetes, grampas,
      alambreDulceM: Math.round((mLiso + mPua) * 0.014) };
    return { items, resumen };
  }

  if (tipo === 'convencional') {
    const hilos = 7;
    const postes = poligono ? Math.max(3, Math.round(L / o.posteConvencionalCadaM))
      : Math.floor(L / o.posteConvencionalCadaM) + 1;
    items.push(item('poste-quebracho', postes, 'cada ' + o.posteConvencionalCadaM + ' m'));
    const mAl = L * hilos * (1 + o.desperdicio);
    items.push(item('alambre-liso-rollo', Math.ceil(mAl / o.rolloLisoM), Math.round(mAl) + ' m ÷ ' + o.rolloLisoM));
    items.push(item('torniquete', hilos * 2, hilos + ' × 2 extremos'));
    items.push(item('grampa', postes * hilos * o.grampasPorHilo, 'estimación'));
    items.push(item('alambre-dulce', Math.round(mAl * 0.014), 'ataduras'));
    if (o.tranqueras > 0) items.push(item('tranquera', o.tranqueras, '3.50 m con bisagras reforzadas'));
    return { items, resumen: { postes, rollosLiso: Math.ceil(mAl / o.rolloLisoM) } };
  }

  // electrico
  const hilos = Math.min(3, Math.max(1, o.hilosElec || 2));
  const postes = poligono ? Math.max(3, Math.round(L / o.posteElectricoCadaM))
    : Math.floor(L / o.posteElectricoCadaM) + 1;
  items.push(item('estacon', postes, 'cada ' + o.posteElectricoCadaM + ' m'));
  const mAl = L * hilos * (1 + o.desperdicio);
  items.push(item('alambre-boyero-rollo', Math.ceil(mAl / o.rolloLisoM), Math.round(mAl) + ' m ÷ ' + o.rolloLisoM));
  items.push(item('aislador', hilos * postes, hilos + ' hilos × ' + postes + ' postes'));
  items.push(item('tensor', poligono ? hilos * nV : hilos * 2, 'terminales'));
  if (o.tranqueras > 0) items.push(item('tranquera', o.tranqueras, '3.50 m con bisagras reforzadas'));
  return { items, resumen: { postes, hilos } };
}

/* Peso total y camión sugerido */
export function pesoTotalTn(items) {
  const kg = items.reduce((s, it) => s + (it.pesoKg || 0), 0);
  return Math.round(kg / 1000 * 100) / 100;
}
export function camionSugerido(tn) {
  if (tn <= 4) return 'Chasis chico (hasta 4 Tn)';
  if (tn <= 10) return 'Chasis mediano (hasta 10 Tn)';
  return 'Semi / acoplado (+10 Tn)';
}

/* ---------- Cotizador ---------- */
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

/* $/km = litros de gasoil por km × $ por litro (solo ida) */
export function precioKmDesdeConsumo(litrosKm, precioLitro) {
  return num(litrosKm) * num(precioLitro);
}

/* proyecto: { tipo, params, medicion:{metros,poligono,vertices}, mo:{precioM,metrosDesarme,precioDesarme,tranqueras,precioTranquera}, log:{km,precioKm,viaticos}, porc:{contingencia,margen} }
   preciosLista: [{codigo, precio}] — precio 0/ausente → 'faltantes' (aviso, no $0 silencioso) */
export function calcularCotizacion(proyecto, preciosLista) {
  const mapa = {};
  for (const p of (preciosLista || [])) mapa[p.codigo] = num(p.precio);

  const med = proyecto.medicion || {};
  const metros = num(med.metros);
  const vertices = Array.isArray(med.vertices) ? med.vertices : [];
  const { items } = calcularMateriales(proyecto.tipo, metros, Object.assign({}, proyecto.params, {
    poligono: !!med.poligono, nVertices: vertices.length
  }));

  const materiales = [];
  let totalMateriales = 0;
  const faltantes = [];
  for (const it of items) {
    const pu = mapa[it.codigo];
    const tienePrecio = pu !== undefined && pu > 0;
    const costo = tienePrecio ? it.cantidad * pu : 0;
    if (!tienePrecio) faltantes.push(it.codigo);
    totalMateriales += costo;
    materiales.push({ ...it, precioUnit: tienePrecio ? pu : null, costo, sinPrecio: !tienePrecio });
  }

  const mo = proyecto.mo || {};
  const moNuevo = metros * num(mo.precioM);
  const moDesarme = num(mo.metrosDesarme) * num(mo.precioDesarme);
  const moTranqueras = num(mo.tranqueras) * num(mo.precioTranquera);
  const totalMO = moNuevo + moDesarme + moTranqueras;

  const lg = proyecto.log || {};
  const flete = num(lg.km) * num(lg.precioKm);
  const viaticos = num(lg.viaticos);
  const totalLog = flete + viaticos;

  const subtotal = totalMateriales + totalMO + totalLog;
  const porc = proyecto.porc || {};
  const pCont = num(porc.contingencia), pMargen = num(porc.margen);
  const contingenciaMonto = subtotal * pCont / 100;
  const baseMargen = subtotal + contingenciaMonto;
  const margenMonto = baseMargen * pMargen / 100;
  const total = baseMargen + margenMonto;

  return {
    materiales, totalMateriales,
    manoObra: { nuevo: moNuevo, desarme: moDesarme, tranqueras: moTranqueras, total: totalMO,
      detalle: { metros, precioM: num(mo.precioM), metrosDesarme: num(mo.metrosDesarme),
        precioDesarme: num(mo.precioDesarme), tranqueras: num(mo.tranqueras), precioTranquera: num(mo.precioTranquera) } },
    logistica: { flete, viaticos, total: totalLog, detalle: { km: num(lg.km), precioKm: num(lg.precioKm) } },
    subtotal,
    contingencia: { porc: pCont, monto: contingenciaMonto },
    margen: { porc: pMargen, monto: margenMonto },
    total, faltantes, tipo: proyecto.tipo, metros,
    pesoTn: pesoTotalTn(items), camion: camionSugerido(pesoTotalTn(items))
  };
}

/* ---------- Ejecución / KPIs ---------- */
/* El TOTAL compara costos contra costos: subtotal + contingencia.
   El margen es ganancia, no costo — incluirlo daría verde siempre. */
export function calcularKPIs(proyecto, ejecucion, preciosLista) {
  const mapa = {};
  for (const p of (preciosLista || [])) mapa[p.codigo] = num(p.precio);
  const eje = ejecucion || {};
  const reales = eje.reales || {};

  const r = proyecto.resumen || {};
  const presMat = num(r.totalMateriales);
  const presMO = num(r.manoObra && r.manoObra.total);
  const presLog = num(r.logistica && r.logistica.total);
  const presTotal = num(r.subtotal) + num(r.contingencia && r.contingencia.monto);
  const totalCotizado = num(r.total);

  let realMat = 0;
  const detMat = [];
  for (const codigo of Object.keys(reales)) {
    const it = reales[codigo] || {};
    const cant = num(it.cantidad);
    const pu = (it.precioUnit !== undefined && it.precioUnit !== null && it.precioUnit !== '')
      ? num(it.precioUnit) : (mapa[codigo] || 0);
    const costo = cant * pu;
    realMat += costo;
    detMat.push({ codigo, cantidad: cant, precioUnit: pu, costo });
  }
  const otros = Array.isArray(eje.otrosCostos) ? eje.otrosCostos : [];
  const totalOtros = otros.reduce((s, o) => s + num(o.monto), 0);

  const realMO = num(eje.costoManoObraReal);
  const realLog = num(eje.kmReales) * num(eje.precioKmReal) + num(eje.viaticosReales);
  const realTotal = realMat + realMO + realLog + totalOtros;

  const kpi = (pres, real) => {
    if (pres === 0 && real === 0) return { pres: 0, real: 0, desvio: 0, ok: true, sinPres: false };
    if (pres === 0) return { pres: 0, real, desvio: null, ok: false, sinPres: true };
    const d = (real - pres) / pres;
    return { pres, real, desvio: d, ok: d <= 0, sinPres: false };
  };

  // Margen proyectado: (totalCotizado − realTotal) / totalCotizado
  const margenProy = totalCotizado > 0 ? (totalCotizado - realTotal) / totalCotizado : 0;

  return {
    materiales: { ...kpi(presMat, realMat), detalle: detMat },
    manoObra: kpi(presMO, realMO),
    logistica: kpi(presLog, realLog),
    otros: { pres: 0, real: totalOtros, desvio: null, ok: totalOtros === 0, sinPres: totalOtros > 0, detalle: otros },
    total: kpi(presTotal, realTotal),
    totalCotizado, margenProy,
    diasReales: eje.diasReales
  };
}

export function fmtDesvio(k) {
  if (!k || k.sinPres) return 's/p';
  const pct = Math.round((k.desvio || 0) * 100);
  return (pct > 0 ? '+' : '') + pct + '%';
}
