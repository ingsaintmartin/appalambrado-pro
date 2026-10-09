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
  'poste-refuerzo':    ['POST-REF-260', 'Atador / Refuerzo 2.60m', 'u'],
  'poste-intermedio':  ['POST-INT-220', 'Palo Intermedio 2.20m (replanteo exacto)', 'u'],
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
  'tranqueron':        ['TRQ-QBR-450', 'Tranquerón Quebracho 4.50m c/herrajes', 'u'],
  'estacon':           ['EST-ITN-160', 'Estacón Itín 1.60m', 'u'],
  'aislador':          ['AIS-OVL', 'Aisladores Rígidos Ovoides', 'u'],
  'tensor':            ['TNS-TRM', 'Tensores Terminales', 'u']
};

/* Peso estimado por unidad (kg) para cubicaje/logística */
const PESO_KG = {
  'poste-esquinero': 85, 'poste-refuerzo': 55, 'poste-intermedio': 32, 'poste-quebracho': 40,
  'varilla': 0.9, 'alambre-liso-rollo': 82, 'alambre-pua-rollo': 45,
  'alambre-boyero-rollo': 40, 'torniquete': 0.4, 'varilla-tension': 1.2,
  'grampa': 0.02, 'alambre-dulce': 0.05, 'tranquera': 120, 'tranqueron': 180,
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
    // Hilos efectivos: lo que muestra el corte reactivo es lo que se computa.
    // Default tradicional: 7 hilos (1 púa abajo + 6 lisos).
    const nHilos = Math.min(10, Math.max(1, Math.round(o.hilos) || 7));
    const nPuas = Math.min(nHilos, Math.max(0, o.puas != null ? Math.round(o.puas) : 2));
    const T = { ...TIPOS_ALAMBRADO.suspendido7, hilos: nHilos };
    // Alambre: púas + lisos, con desperdicio.
    const mLiso = L * (nHilos - nPuas) * (1 + o.desperdicio);
    const mPua = L * nPuas * (1 + o.desperdicio);
    const rollosLiso = Math.ceil(mLiso / o.rolloLisoM);
    const rollosPua = Math.ceil(mPua / o.rolloPuaM);
    // Tranqueras ubicadas: 2 postes tipo esquinero por cada una (+ puntales).
    const trq = materialesTranqueras(o.tranquerasDetalle, o.conTirantes);
    // Esquineros: 2 en línea (extremos); 1 por vértice en polígono; + los de tranqueras.
    const esquineros = (poligono ? nV : 2) + trq.esquineros;
    const detEsq = (poligono ? nV + ' vértices GPS' : '2 extremos de línea') +
      (trq.esquineros > 0 ? ' + ' + trq.esquineros + ' por tranqueras' : '');
    items.push(item('poste-esquinero', esquineros, detEsq));
    const tirantes = o.conTirantes ? esquineros * 2 : 0;
    // Replanteo exacto (solo lineal): atadores 2.60m + intermedios, todo parejo.
    const rp = (!poligono && o.replanteo) ? replanteoLinea(L, o.replanteo.atadoresM, o.replanteo.intermediosM) : null;
    let refuerzos, notaRef;
    if (rp) {
      refuerzos = rp.atadores.cantidad;
      notaRef = 'atadores 2.60m cada ' + rp.atadores.real.toFixed(1).replace('.', ',') + ' m exactos';
    } else {
      // Refuerzos: floor(L / cada) — 3850/80 → 48 u. (diseño)
      refuerzos = Math.floor(L / refCada);
      notaRef = 'cada ' + refCada + ' m' + (notaSuelo ? ' · ' + notaSuelo : '');
    }
    items.push(item('poste-refuerzo', refuerzos, notaRef));
    if (rp && rp.intermedios.cantidad > 0) {
      items.push(item('poste-intermedio', rp.intermedios.cantidad,
        'cada ' + rp.intermedios.real.toFixed(2).replace('.', ',') + ' m exactos (' + rp.atadores.n + ' tramos)'));
    }
    // Varillas: con replanteo, N por claro × claros totales; si no, redondeo clásico.
    let varillas;
    if (rp && o.varillasPorClaro != null) {
      const totalClaros = rp.atadores.n * rp.intermedios.n;
      varillas = Math.max(0, Math.round(o.varillasPorClaro)) * totalClaros;
    } else {
      varillas = Math.round(L / o.sepVarillas);
    }
    items.push(item('varilla', varillas,
      rp ? o.varillasPorClaro + ' por claro × ' + (rp.atadores.n * rp.intermedios.n) + ' claros'
         : 'cada ' + o.sepVarillas.toFixed(1) + ' m'));
    // Alambre: L × hilos × (1+merma) → rollos SIEMPRE hacia arriba.
    // (mLiso/mPua/rollos ya calculados arriba con hilos efectivos)
    items.push(item('alambre-liso-rollo', rollosLiso, Math.round(mLiso) + ' m ÷ ' + o.rolloLisoM));
    items.push(item('alambre-pua-rollo', rollosPua, Math.round(mPua) + ' m ÷ ' + o.rolloPuaM));
    // Torniquetes: 1 por hilo en cada extremo (polígono: por vértice).
    const torniquetes = poligono ? T.hilos * nV : T.hilos * 2;
    items.push(item('torniquete', torniquetes, poligono ? T.hilos + ' × ' + nV + ' vértices' : T.hilos + ' × 2 extremos'));
    // Varillas de tensión: 2 por torniquete.
    items.push(item('varilla-tension', torniquetes * 2, 'planchuela 1 1/4"'));
    // Grampas (estimación): 1 por hilo en cada poste (incluye intermedios del replanteo).
    const postesConGrampa = esquineros + refuerzos + (rp ? rp.intermedios.cantidad : 0);
    const grampas = postesConGrampa * T.hilos * o.grampasPorHilo;
    const g = item('grampa', grampas, 'estimación');
    g.pesoKgDetalle = Math.round(grampas * (PESO_KG.grampa || 0.02) * 10) / 10;
    items.push(g);
    // Alambre dulce para ataduras: ~1.4% del alambre total.
    items.push(item('alambre-dulce', Math.round((mLiso + mPua) * 0.014), 'ataduras de varilla'));
    // Tirantes dobles de contención por esquinero (si aplica).
    if (tirantes > 0) {
      // reutilizamos código de tirante como ítem separado
      items.push({ ...item('poste-refuerzo', 0, ''), codigo: 'tirante', display: 'TIR-QBR-240',
        descripcion: 'Tirantes dobles de contención (Quebracho 2.40m)', unidad: 'u',
        cantidad: tirantes, detalle: '2 por esquinero', pesoKg: Math.round(tirantes * 38 * 10) / 10 });
    }
    // Tranqueras ubicadas (con posición) o conteo simple.
    if (trq.cantidad > 0) {
      for (const tipo of Object.keys(trq.porTipo)) {
        const posiciones = trq.detalle.filter((t) => (t.tipo === 'tranqueron' ? 'tranqueron' : 'tranquera') === tipo)
          .map((t) => Math.round(parseFloat(t.pos) || 0) + 'm').join(', ');
        items.push(item(tipo, trq.porTipo[tipo], (tipo === 'tranqueron' ? '4.50 m' : '3.50 m') + ' en ' + posiciones));
      }
    } else if (o.tranqueras > 0) {
      items.push(item('tranquera', o.tranqueras, '3.50 m con bisagras reforzadas'));
    }

    const resumen = { esquineros, tirantes, refuerzos, varillas, mLiso: Math.round(mLiso),
      mPua: Math.round(mPua), rollosLiso, rollosPua, torniquetes, grampas,
      alambreDulceM: Math.round((mLiso + mPua) * 0.014),
      esqTranquera: trq.esquineros, tranquerasDetalle: trq.detalle, replanteo: rp,
      hilos: nHilos, puas: nPuas };
    return { items, resumen };
  }

  if (tipo === 'convencional') {
    const hilos = 7;
    const trq = materialesTranqueras(o.tranquerasDetalle, o.conTirantes);
    const postes = poligono ? Math.max(3, Math.round(L / o.posteConvencionalCadaM))
      : Math.floor(L / o.posteConvencionalCadaM) + 1;
    items.push(item('poste-quebracho', postes, 'cada ' + o.posteConvencionalCadaM + ' m'));
    if (trq.esquineros > 0) {
      items.push(item('poste-esquinero', trq.esquineros, trq.esquineros + ' por tranqueras ubicadas'));
      if (trq.tirantes > 0) items.push({ ...item('poste-refuerzo', 0, ''), codigo: 'tirante', display: 'TIR-QBR-240',
        descripcion: 'Tirantes dobles de contención (Quebracho 2.40m)', unidad: 'u',
        cantidad: trq.tirantes, detalle: '2 por esquinero', pesoKg: Math.round(trq.tirantes * 38 * 10) / 10 });
    }
    const mAl = L * hilos * (1 + o.desperdicio);
    items.push(item('alambre-liso-rollo', Math.ceil(mAl / o.rolloLisoM), Math.round(mAl) + ' m ÷ ' + o.rolloLisoM));
    items.push(item('torniquete', hilos * 2, hilos + ' × 2 extremos'));
    items.push(item('grampa', postes * hilos * o.grampasPorHilo, 'estimación'));
    items.push(item('alambre-dulce', Math.round(mAl * 0.014), 'ataduras'));
    items.push(...itemsTranquerasUbicadas(trq, o.tranqueras));
    return { items, resumen: { postes, rollosLiso: Math.ceil(mAl / o.rolloLisoM),
      esqTranquera: trq.esquineros, tranquerasDetalle: trq.detalle } };
  }

  // electrico
  const hilos = Math.min(3, Math.max(1, o.hilosElec || 2));
  const trqE = materialesTranqueras(o.tranquerasDetalle, o.conTirantes);
  const postes = poligono ? Math.max(3, Math.round(L / o.posteElectricoCadaM))
    : Math.floor(L / o.posteElectricoCadaM) + 1;
  items.push(item('estacon', postes, 'cada ' + o.posteElectricoCadaM + ' m'));
  if (trqE.esquineros > 0) {
    items.push(item('poste-esquinero', trqE.esquineros, trqE.esquineros + ' por tranqueras ubicadas'));
    if (trqE.tirantes > 0) items.push({ ...item('poste-refuerzo', 0, ''), codigo: 'tirante', display: 'TIR-QBR-240',
      descripcion: 'Tirantes dobles de contención (Quebracho 2.40m)', unidad: 'u',
      cantidad: trqE.tirantes, detalle: '2 por esquinero', pesoKg: Math.round(trqE.tirantes * 38 * 10) / 10 });
  }
  const mAl = L * hilos * (1 + o.desperdicio);
  items.push(item('alambre-boyero-rollo', Math.ceil(mAl / o.rolloLisoM), Math.round(mAl) + ' m ÷ ' + o.rolloLisoM));
  items.push(item('aislador', hilos * postes, hilos + ' hilos × ' + postes + ' postes'));
  items.push(item('tensor', poligono ? hilos * nV : hilos * 2, 'terminales'));
  items.push(...itemsTranquerasUbicadas(trqE, o.tranqueras));
  return { items, resumen: { postes, hilos, esqTranquera: trqE.esquineros, tranquerasDetalle: trqE.detalle } };
}

/* Ítems de tranquera/tranquerón: ubicadas con posición, o conteo simple. */
function itemsTranquerasUbicadas(trq, conteoSimple) {
  const out = [];
  if (trq.cantidad > 0) {
    for (const tipo of Object.keys(trq.porTipo)) {
      const posiciones = trq.detalle.filter((t) => (t.tipo === 'tranqueron' ? 'tranqueron' : 'tranquera') === tipo)
        .map((t) => Math.round(parseFloat(t.pos) || 0) + 'm').join(', ');
      out.push(item(tipo, trq.porTipo[tipo], (tipo === 'tranqueron' ? '4.50 m' : '3.50 m') + ' en ' + posiciones));
    }
  } else if (conteoSimple > 0) {
    out.push(item('tranquera', conteoSimple, '3.50 m con bisagras reforzadas'));
  }
  return out;
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

/* ============================================================
   Replanteo exacto de postes (lógica de campo)
   ------------------------------------------------------------
   El alambrador define la distancia OBJETIVO entre atadores
   (postes de 2.60 m) y entre palos intermedios. El motor divide
   en cantidad ENTERA de tramos para que TODOS los claros queden
   iguales: n = max(1, round(L / objetivo)), real = L / n.
   Así no quedan claros más cortos ni más largos.
   ============================================================ */
export function replanteoExacto(largoM, objetivoM) {
  const L = Math.max(0, parseFloat(largoM) || 0);
  const obj = parseFloat(objetivoM) || 0;
  if (L <= 0 || obj <= 0) return { n: 0, real: 0, largo: L };
  const n = Math.max(1, Math.round(L / obj));
  return { n, real: L / n, largo: L };
}

/* Replanteo de línea completa:
   - La línea se divide en n tramos iguales (≈ objetivo atadores).
   - En cada división interior va 1 atador de 2.60 m
     (en los 2 extremos van los esquineros, ya contados aparte).
   - Cada tramo se subdivide en m claros iguales (≈ objetivo
     intermedios); en cada división interior va 1 palo intermedio.
   Devuelve también el detalle tramo por tramo para mostrar. */
export function replanteoLinea(largoM, objAtadoresM, objIntermediosM) {
  const at = replanteoExacto(largoM, objAtadoresM);
  const inter = replanteoExacto(at.real, objIntermediosM);
  const posAtadores = [];
  for (let i = 0; i <= at.n; i++) posAtadores.push(Math.round(i * at.real * 100) / 100);
  const intermediosPorTramo = Math.max(0, inter.n - 1);
  const intermediosTotales = at.n * intermediosPorTramo;
  const atadores = Math.max(0, at.n - 1); // sin contar los 2 extremos (esquineros)
  const tramos = posAtadores.slice(0, -1).map((desde, i) => ({
    tramo: i + 1,
    desde,
    hasta: posAtadores[i + 1],
    largo: Math.round((posAtadores[i + 1] - desde) * 100) / 100,
    intermedios: intermediosPorTramo,
    claroReal: Math.round(inter.real * 100) / 100
  }));
  return {
    largo: largoM, atadores: { ...at, cantidad: atadores },
    intermedios: { ...inter, cantidad: intermediosTotales },
    posAtadores, tramos
  };
}

/* Punto sobre la polilínea a `distM` metros del inicio (para
   ubicar tranqueras en el mapa). Interpolación lineal entre
   vértices. Devuelve {lat, lng} o null. */
export function puntoEnDistancia(vertices, distM) {
  if (!Array.isArray(vertices) || vertices.length < 2) return null;
  const d = Math.max(0, parseFloat(distM) || 0);
  let acc = 0;
  for (let i = 1; i < vertices.length; i++) {
    const a = vertices[i - 1], b = vertices[i];
    const seg = haversineM(a, b);
    if (acc + seg >= d) {
      const f = seg === 0 ? 0 : (d - acc) / seg;
      return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
    }
    acc += seg;
  }
  const ultimo = vertices[vertices.length - 1];
  return { lat: ultimo.lat, lng: ultimo.lng };
}

/* ============================================================
   Regla de varillas (lógica de campo)
   ------------------------------------------------------------
   Dado un claro de `claroM` metros y N varillas por claro, el
   espaciamiento real es claro/(N+1) (las varillas dividen el
   claro en N+1 segmentos iguales).
   - Alambrado común: válido entre 100 y 180 cm.
   - Manga/corral: válido entre 60 y 100 cm (más juntas).
   ============================================================ */
export const RANGO_VARILLAS_CM = { comun: [100, 180], manga: [60, 100] };

export function validarVarillas(claroM, varillasPorClaro, modo) {
  const n = Math.max(0, Math.round(varillasPorClaro || 0));
  const m = modo === 'manga' ? 'manga' : 'comun';
  const [min, max] = RANGO_VARILLAS_CM[m];
  if (n === 0) return { espaciamientoCm: null, ok: true, enRango: true, mensaje: 'Sin varillas en el claro.' };
  const esp = (parseFloat(claroM) || 0) / (n + 1) * 100;
  const espR = Math.round(esp * 10) / 10;
  const ok = esp >= min && esp <= max;
  return {
    espaciamientoCm: espR, ok, enRango: ok,
    mensaje: ok
      ? `${n} varillas → ${espR} cm entre varillas (rango ${min}–${max} cm ✓)`
      : `${n} varillas → ${espR} cm: FUERA de rango ${min}–${max} cm — ` +
        (esp < min ? 'quedan muy juntas, sacá varillas.' : 'quedan muy separadas, agregá varillas.')
  };
}

/* Materiales aportados por tranqueras/tranquerones ubicados:
   cada uno genera 2 postes tipo esquinero en ese punto
   (+ 4 puntales si van con tirantes) + sus herrajes. */
export function materialesTranqueras(tranquerasDetalle, conTirantes) {
  const det = Array.isArray(tranquerasDetalle) ? tranquerasDetalle : [];
  const esquineros = det.length * 2;
  const tirantes = conTirantes ? esquineros * 2 : 0;
  const porTipo = {};
  det.forEach((t) => {
    const tipo = t && t.tipo === 'tranqueron' ? 'tranqueron' : 'tranquera';
    porTipo[tipo] = (porTipo[tipo] || 0) + 1;
  });
  return { cantidad: det.length, esquineros, tirantes, porTipo, detalle: det };
}
