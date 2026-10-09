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
  sepVarillas: 2.0,    // slider 1.0–2.5 (mínimo 1,0 m = 100 cm, regla de campo)
  desperdicio: 0.05,   // 5% merma técnica
  rolloLisoM: 1000,
  rolloPuaM: 500,
  grampasPorHilo: 1,
  conTirantes: true,
  tranqueras: 2,
  hilosElec: 2,
  posteConvencionalCadaM: 12,
  posteElectricoCadaM: 30,
  /* Atadores y torniquetes (lógica de campo):
     - cadaNAtadores: un atador (2,60 m) cada N palos intermedios. Ajustable.
     - torniqEsquineros: poner torniquetes también en esquineros (muchos lo hacen).
     - torniqCadaAtadores: torniquetes cada K atadores (1 = en todos). */
  cadaNAtadores: 10,
  torniqEsquineros: true,
  torniqCadaAtadores: 1,
  /* Tipos de alambre y maderas (selectores en Módulo 2) */
  alambreLiso: '17-15',
  alambrePua: '4p',
  alambreElectro: 'ep6',
  maderaEsquinero: 'qcolorado',
  maderaIntermedio: 'qblanco'
};

/* ---------- Tipos de alambre ----------
   El código del BOM se mantiene estable (precios), cambian
   display/descripción y metros por rollo según el tipo elegido. */
export const TIPOS_ALAMBRE = {
  liso: [
    { id: '17-15', nombre: 'Liso 17/15 Alta Resistencia', rolloM: 1000, display: 'ALM-1715-1K' },
    { id: '15-13', nombre: 'Liso 15/13 Pesado', rolloM: 1000, display: 'ALM-1513-1K' },
    { id: '16-14', nombre: 'Liso 16/14', rolloM: 1000, display: 'ALM-1614-1K' }
  ],
  pua: [
    { id: '4p', nombre: 'Púas 4 puntas', rolloM: 500, display: 'ALM-PUA4-500' },
    { id: '2p', nombre: 'Púas 2 puntas', rolloM: 500, display: 'ALM-PUA2-500' }
  ],
  electro: [
    { id: 'ep6', nombre: 'Electrónplastico 6 mm', rolloM: 500, display: 'ALM-EP6-500' },
    { id: 'boy25', nombre: 'Boyero galvanizado 2,5 mm', rolloM: 1000, display: 'ALM-BOY25-1K' }
  ]
};
export function tipoAlambre(categoria, id) {
  const lista = TIPOS_ALAMBRE[categoria] || [];
  return lista.find((t) => t.id === id) || lista[0];
}

/* ---------- Especies de madera ----------
   factorPeso: densidad relativa vs. quebracho colorado (para el cubicaje). */
export const ESPECIES_MADERA = [
  { id: 'qcolorado', nombre: 'Quebracho Colorado', factorPeso: 1.0 },
  { id: 'qblanco', nombre: 'Quebracho Blanco', factorPeso: 0.92 },
  { id: 'itin', nombre: 'Itín', factorPeso: 0.88 },
  { id: 'curupay', nombre: 'Curupay', factorPeso: 0.82 },
  { id: 'nandubay', nombre: 'Ñandubay', factorPeso: 0.95 },
  { id: 'algarrobo', nombre: 'Algarrobo', factorPeso: 0.87 },
  { id: 'eucalipto', nombre: 'Eucalipto CCA', factorPeso: 0.72 }
];
export function especieMadera(id) {
  return ESPECIES_MADERA.find((e) => e.id === id) || ESPECIES_MADERA[0];
}

/* Torniquetes: 1 por hilo en cada punto de tensión.
   Puntos = esquineros (si el toggle torniqEsquineros está activo)
          + atadores con torniquete (ver atadoresConTorniquete).
   Lógica de campo: el atador es el poste de 2,60 m donde se retensiona
   la línea; muchos alambradores también ponen torniqueta en esquineros. */
export function contarTorniquetes(hilos, esquineros, atadoresT, o) {
  const esq = o && o.torniqEsquineros ? Math.max(0, Math.round(esquineros) || 0) : 0;
  return Math.max(0, Math.round(hilos) || 0) * (esq + Math.max(0, Math.round(atadoresT) || 0));
}

/* Atadores que llevan torniquete.
   - Suspendido clásico: los postes estructurales son los refuerzos 2,60 m;
     el torniquete va cada N de ellos (cadaNAtadores) y cada K de esos (torniqCadaAtadores).
   - Replanteo / convencional: los atadores físicos ya van cada N palos;
     el torniquete va cada K atadores (default K=1 → en todos). */
export function atadoresConTorniquete(atadoresFisicos, o, esClasico) {
  const cadaK = Math.max(1, Math.round((o && o.torniqCadaAtadores) || 1));
  if (esClasico) {
    const cadaN = Math.max(1, Math.round((o && o.cadaNAtadores) || 10));
    return Math.floor(Math.max(0, atadoresFisicos) / (cadaN * cadaK));
  }
  return Math.ceil(Math.max(0, atadoresFisicos) / cadaK);
}

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
/* Pesos típicos de fabricante (valores medios; el camión se dimensiona con holgura).
   Decisiones de alambrador (2026-10-09):
   - Rollo liso 17/15 x 1000 m ≈ 48 kg (no 82: un rollo de 1000 m de 2,5 mm
     pesa ~40-50 kg; 82 era casi el doble y deformaba el cubicaje).
   - Rollo púas x 500 m ≈ 25 kg; rollo boyero x 1000 m ≈ 35 kg.
   - alambre-dulce se computa en kg → peso 1 kg por kg (antes 0,05, subestimaba). */
const PESO_KG = {
  'poste-esquinero': 85, 'poste-refuerzo': 55, 'poste-intermedio': 32, 'poste-quebracho': 40,
  'varilla': 0.9, 'alambre-liso-rollo': 48, 'alambre-pua-rollo': 25,
  'alambre-boyero-rollo': 35, 'torniquete': 0.4, 'varilla-tension': 1.2,
  'grampa': 0.02, 'alambre-dulce': 1, 'tranquera': 120, 'tranqueron': 180,
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
/* Ítem de alambre con tipo seleccionado (display/descripción/rollo según tipo). */
function itemAlambre(codigo, categoria, tipoId, cantidadRollos, metrosTotales) {
  const t = tipoAlambre(categoria, tipoId);
  const base = DISPLAY[codigo] || [codigo, codigo, 'rollo'];
  return {
    codigo, display: t.display,
    descripcion: 'Rollo ' + t.nombre + ' x ' + t.rolloM + 'm',
    unidad: base[2], cantidad: cantidadRollos,
    detalle: Math.round(metrosTotales) + ' m ÷ ' + t.rolloM,
    pesoKg: Math.round((PESO_KG[codigo] || 0) * cantidadRollos * 10) / 10
  };
}

/* Ítem de poste con especie de madera (descripción + factor de peso). */
function itemPoste(codigo, especieId, cantidad, detalle) {
  const it = item(codigo, cantidad, detalle);
  const esp = especieMadera(especieId);
  if (esp && esp.id !== 'qcolorado') it.descripcion += ' · ' + esp.nombre;
  it.pesoKg = Math.round((PESO_KG[codigo] || 0) * (esp ? esp.factorPeso : 1) * cantidad * 10) / 10;
  return it;
}

/* Puntales (tirantes de contención): UN puntal por cada DIRECCIÓN de alambrado
   que sale del esquinero — no 2 fijos por esquinero.
   - Línea: 2 extremos × 1 dirección = 2 puntales.
   - Polígono: nV esquinas × 2 direcciones = 2×nV puntales.
   - Tranquera: 2 postes × 1 dirección (el hilo tensa de un solo lado) = 2 por tranquera.
   Regla de campo (2026-10-09). */
export function puntalesPorEsquineros({ poligono, nVertices, trqEsquineros, conTirantes }) {
  if (!conTirantes) return 0;
  const deLinea = poligono ? 0 : 2 * 1;
  const dePoligono = poligono ? Math.max(0, Math.round(nVertices) || 0) * 2 : 0;
  const deTranqueras = Math.max(0, Math.round(trqEsquineros) || 0) * 1;
  return deLinea + dePoligono + deTranqueras;
}

/* Ítem tirante de contención (puntal). */
function itemTirante(cantidad, detalle) {
  return { ...item('poste-refuerzo', 0, ''), codigo: 'tirante', display: 'TIR-QBR-240',
    descripcion: 'Puntales / tirantes de contención (Quebracho 2.40m)', unidad: 'u',
    cantidad, detalle: detalle || '1 por dirección de alambrado',
    pesoKg: Math.round(cantidad * 38 * 10) / 10 };
}


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
    // Alambre: púas + lisos, con desperdicio. Tipo seleccionable en Módulo 2.
    const tLiso = tipoAlambre('liso', o.alambreLiso);
    const tPua = tipoAlambre('pua', o.alambrePua);
    const mLiso = L * (nHilos - nPuas) * (1 + o.desperdicio);
    const mPua = L * nPuas * (1 + o.desperdicio);
    const rollosLiso = Math.ceil(mLiso / tLiso.rolloM);
    const rollosPua = Math.ceil(mPua / tPua.rolloM);
    // Tranqueras ubicadas: 2 postes tipo esquinero por cada una (+ puntales).
    const trq = materialesTranqueras(o.tranquerasDetalle, o.conTirantes);
    // Esquineros: 2 en línea (extremos); 1 por vértice en polígono; + los de tranqueras.
    const esquineros = (poligono ? nV : 2) + trq.esquineros;
    const detEsq = (poligono ? nV + ' vértices GPS' : '2 extremos de línea') +
      (trq.esquineros > 0 ? ' + ' + trq.esquineros + ' por tranqueras' : '');
    items.push(itemPoste('poste-esquinero', o.maderaEsquinero, esquineros, detEsq));
    // Puntales: 1 por dirección de alambrado (línea: 2×1; polígono: nV×2; tranqueras: 2×1 c/u).
    const tirantes = puntalesPorEsquineros({ poligono, nVertices: nV, trqEsquineros: trq.esquineros, conTirantes: o.conTirantes });
    // Replanteo exacto (solo lineal): atadores 2.60m + intermedios, todo parejo.
    const rp = (!poligono && o.replanteo) ? replanteoLinea(L, o.replanteo.atadoresM, o.replanteo.intermediosM) : null;
    let atadores, intermedios, notaRef;
    if (rp) {
      atadores = rp.atadores.cantidad;
      intermedios = rp.intermedios.cantidad;
      notaRef = 'atadores 2.60m cada ' + rp.atadores.real.toFixed(1).replace('.', ',') + ' m exactos';
    } else {
      // Clásico: refuerzos 2.60m cada X m — floor(L / cada).
      // Son los postes estructurales; los "atadores" para torniquetes son cada N de ellos.
      atadores = Math.floor(L / refCada);
      intermedios = 0;
      notaRef = 'cada ' + refCada + ' m' + (notaSuelo ? ' · ' + notaSuelo : '');
    }
    items.push(itemPoste('poste-refuerzo', o.maderaIntermedio, atadores, notaRef));
    if (rp && intermedios > 0) {
      items.push(itemPoste('poste-intermedio', o.maderaIntermedio, intermedios,
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
    items.push(itemAlambre('alambre-liso-rollo', 'liso', o.alambreLiso, rollosLiso, mLiso));
    if (nPuas > 0) items.push(itemAlambre('alambre-pua-rollo', 'pua', o.alambrePua, rollosPua, mPua));
    // Torniquetes: 1 por hilo en cada punto de tensión.
    // Clásico: cada N refuerzos (default 10 → ~1 cada 800 m, para retensionar).
    // Replanteo: los atadores ya van cada N → torniquete cada K atadores.
    const atadoresT = atadoresConTorniquete(atadores, o, !rp);
    const torniquetes = contarTorniquetes(nHilos, esquineros, atadoresT, o);
    const detT = nHilos + ' hilos × (' + (o.torniqEsquineros ? esquineros + ' esq' : '0 esq') +
      ' + ' + atadoresT + ' atad)';
    items.push(item('torniquete', torniquetes, detT));
    // Varillas de tensión: 2 por torniquete.
    items.push(item('varilla-tension', torniquetes * 2, 'planchuela 1 1/4"'));
    // Grampas (estimación): 1 por hilo en cada poste que sostiene hilo.
    const postesConGrampa = esquineros + atadores + intermedios;
    const grampas = postesConGrampa * T.hilos * o.grampasPorHilo;
    const g = item('grampa', grampas, 'estimación');
    g.pesoKgDetalle = Math.round(grampas * (PESO_KG.grampa || 0.02) * 10) / 10;
    items.push(g);
    // Alambre dulce para ataduras: ~1.4% del alambre total.
    items.push(item('alambre-dulce', Math.round((mLiso + mPua) * 0.014), 'ataduras de varilla'));
    // Tirantes dobles de contención por esquinero (si aplica).
    if (tirantes > 0) items.push(itemTirante(tirantes));
    // Tranqueras ubicadas (con posición) o conteo simple.
    items.push(...itemsTranquerasUbicadas(trq, o.tranqueras));

    /* Resumen unificado: ÚNICA fuente de verdad para tarjetas, BOM y dibujo.
       Las tres ramas devuelven los mismos campos (0 donde no aplica). */
    const resumen = { esquineros, tirantes, atadores, intermedios, refuerzos: atadores,
      varillas, mLiso: Math.round(mLiso), mPua: Math.round(mPua),
      rollosLiso, rollosPua, torniquetes, atadoresT, grampas,
      alambreDulceM: Math.round((mLiso + mPua) * 0.014),
      esqTranquera: trq.esquineros, tranquerasDetalle: trq.detalle, replanteo: rp,
      hilos: nHilos, puas: nPuas, postes: esquineros + atadores + intermedios };
    return { items, resumen };
  }

  if (tipo === 'convencional') {
    const hilos = 7;
    const trq = materialesTranqueras(o.tranquerasDetalle, o.conTirantes);
    /* Esquineros: 2 extremos en línea (1 por vértice en polígono) + tranqueras.
       Puntales: 1 por dirección de alambrado (ver puntalesPorEsquineros). */
    const esquinerosBase = poligono ? nV : 2;
    const esquineros = esquinerosBase + trq.esquineros;
    // Puntales: 1 por dirección (línea 2×1, polígono nV×2, tranqueras 1 por poste).
    const tirantes = puntalesPorEsquineros({ poligono, nVertices: nV, trqEsquineros: trq.esquineros, conTirantes: o.conTirantes });
    // Posiciones de poste cada 12 m (floor + 1, como el diseño original).
    const nPos = poligono ? Math.max(3, Math.round(L / o.posteConvencionalCadaM))
      : Math.floor(L / o.posteConvencionalCadaM) + 1;
    const intermediosPos = Math.max(0, nPos - esquinerosBase);
    /* Atadores: cada N palos intermedios se "asciende" a atador 2,60 m
       (ahí van las torniquetas). El resto queda como intermedio 2,20 m.
       Total de posiciones conservado: atadores + intermedios + esquineros = nPos. */
    const cadaN = Math.max(1, Math.round(o.cadaNAtadores) || 10);
    let atadores = Math.floor(intermediosPos / cadaN);
    let intermedios = intermediosPos - atadores;
    let notaAt = '1 cada ' + cadaN + ' palos';
    // Replanteo exacto (solo lineal): pisa la división pareja con la exacta.
    const rpC = (!poligono && o.replanteo) ? replanteoLinea(L, o.replanteo.atadoresM, o.replanteo.intermediosM) : null;
    if (rpC) {
      atadores = rpC.atadores.cantidad;
      intermedios = rpC.intermedios.cantidad;
      notaAt = 'atadores 2.60m cada ' + rpC.atadores.real.toFixed(1).replace('.', ',') + ' m exactos';
    }
    const detEsqC = (poligono ? nV + ' vértices GPS' : '2 extremos de línea') +
      (trq.esquineros > 0 ? ' + ' + trq.esquineros + ' por tranqueras' : '');
    items.push(itemPoste('poste-esquinero', o.maderaEsquinero, esquineros, detEsqC));
    if (tirantes > 0) items.push(itemTirante(tirantes));
    items.push(itemPoste('poste-refuerzo', o.maderaIntermedio, atadores, notaAt));
    items.push(itemPoste('poste-quebracho', o.maderaIntermedio, intermedios,
      'cada ' + o.posteConvencionalCadaM + ' m' + (rpC ? ' (replanteo exacto)' : '')));
    // Varillas: varillado liviano con el separador de la tarjeta 03.
    const varillas = Math.round(L / o.sepVarillas);
    items.push(item('varilla', varillas, 'cada ' + o.sepVarillas.toFixed(1) + ' m'));
    // Alambre: L × 7 hilos × (1+merma) → rollos hacia arriba. Tipo seleccionable.
    const tLisoC = tipoAlambre('liso', o.alambreLiso);
    const mAl = L * hilos * (1 + o.desperdicio);
    const rollosLiso = Math.ceil(mAl / tLisoC.rolloM);
    items.push(itemAlambre('alambre-liso-rollo', 'liso', o.alambreLiso, rollosLiso, mAl));
    // Torniquetes: 1 por hilo en cada punto de tensión (esquineros + atadores).
    const atadoresT = atadoresConTorniquete(atadores, o, false);
    const torniquetes = contarTorniquetes(hilos, esquineros, atadoresT, o);
    items.push(item('torniquete', torniquetes,
      hilos + ' hilos × (' + (o.torniqEsquineros ? esquineros + ' esq' : '0 esq') + ' + ' + atadoresT + ' atad)'));
    items.push(item('varilla-tension', torniquetes * 2, 'planchuela 1 1/4"'));
    // Grampas: 1 por hilo en cada poste que sostiene hilo (esquineros + atadores + intermedios).
    const grampas = (esquineros + atadores + intermedios) * hilos * o.grampasPorHilo;
    const gC = item('grampa', grampas, 'estimación');
    gC.pesoKgDetalle = Math.round(grampas * (PESO_KG.grampa || 0.02) * 10) / 10;
    items.push(gC);
    items.push(item('alambre-dulce', Math.round(mAl * 0.014), 'ataduras'));
    items.push(...itemsTranquerasUbicadas(trq, o.tranqueras));
    // Resumen unificado (misma forma que suspendido7): única fuente de verdad.
    return { items, resumen: { esquineros, tirantes, atadores, intermedios, refuerzos: atadores,
      varillas, mLiso: Math.round(mAl), mPua: 0, rollosLiso, rollosPua: 0,
      torniquetes, atadoresT, grampas, alambreDulceM: Math.round(mAl * 0.014),
      esqTranquera: trq.esquineros, tranquerasDetalle: trq.detalle, replanteo: rpC,
      hilos, puas: 0, postes: nPos } };
  }

  // electrico
  const hilos = Math.min(3, Math.max(1, o.hilosElec || 2));
  const trqE = materialesTranqueras(o.tranquerasDetalle, o.conTirantes);
  /* Esquineros: 2 extremos en línea (1 por vértice en polígono) + tranqueras.
     Antes no se contaban salvo por tranquera → la tarjeta 01 mostraba 0. */
  const esquinerosBaseE = poligono ? nV : 2;
  const esquinerosE = esquinerosBaseE + trqE.esquineros;
  // Puntales: 1 por dirección (línea 2×1, polígono nV×2, tranqueras 1 por poste).
  const tirantesE = puntalesPorEsquineros({ poligono, nVertices: nV, trqEsquineros: trqE.esquineros, conTirantes: o.conTirantes });
  const estacones = Math.max(0, (poligono ? Math.max(3, Math.round(L / o.posteElectricoCadaM))
    : Math.floor(L / o.posteElectricoCadaM) + 1) - esquinerosBaseE);
  items.push(itemPoste('poste-esquinero', o.maderaEsquinero, esquinerosE,
    (poligono ? nV + ' vértices GPS' : '2 extremos de línea') +
    (trqE.esquineros > 0 ? ' + ' + trqE.esquineros + ' por tranqueras' : '')));
  if (tirantesE > 0) items.push(itemTirante(tirantesE));
  items.push(item('estacon', estacones, 'cada ' + o.posteElectricoCadaM + ' m'));
  // Alambre: tipo seleccionable (electroplástico 6 mm / boyero galvanizado 2,5 mm).
  const tElec = tipoAlambre('electro', o.alambreElectro);
  const mAl = L * hilos * (1 + o.desperdicio);
  const rollosElec = Math.ceil(mAl / tElec.rolloM);
  items.push(itemAlambre('alambre-boyero-rollo', 'electro', o.alambreElectro, rollosElec, mAl));
  items.push(item('aislador', hilos * (esquinerosE + estacones), hilos + ' hilos × ' + (esquinerosE + estacones) + ' postes'));
  // Tensores: 1 por hilo en cada punto de tensión (misma lógica que torniquetes).
  const tensores = contarTorniquetes(hilos, esquinerosE, 0, o);
  items.push(item('tensor', tensores, 'terminales'));
  items.push(...itemsTranquerasUbicadas(trqE, o.tranqueras));
  // Resumen unificado (misma forma que las otras ramas): única fuente de verdad.
  return { items, resumen: { esquineros: esquinerosE, tirantes: tirantesE, atadores: 0,
    intermedios: estacones, refuerzos: 0, varillas: 0,
    mLiso: 0, mPua: 0, rollosLiso: 0, rollosPua: 0,
    mElectro: Math.round(mAl), rollosElectro: rollosElec,
    torniquetes: tensores, atadoresT: 0, grampas: 0,
    alambreDulceM: 0, esqTranquera: trqE.esquineros, tranquerasDetalle: trqE.detalle,
    replanteo: null, hilos, puas: 0, postes: esquinerosE + estacones } };
}

/* Ítems de tranquera/tranquerón: ubicadas con posición, o conteo simple.
   Un renglón de BOM por combinación (tipo, ancho) con su ancho real. */
function itemsTranquerasUbicadas(trq, conteoSimple) {
  const out = [];
  if (trq.cantidad > 0) {
    for (const k of Object.keys(trq.porTipo)) {
      const g = trq.porTipo[k];
      const posiciones = g.posiciones.map((p) => Math.round(p) + 'm').join(', ');
      out.push(itemTranquera(g.tipo, g.anchoM, g.cantidad, 'en ' + posiciones));
    }
  } else if (conteoSimple > 0) {
    out.push(itemTranquera('tranquera', 3.5, conteoSimple, 'sin ubicar en línea'));
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

/* Anchos de tranquera/tranquerón (regla de campo 2026-10-09):
   - Tranquera: 3,00 / 3,50 / 4,00 m.
   - Tranquerón: 8 a 15 m en pasos de 1 m.
   (Antes el selector ofrecía "Tranquerón 4,50 m", que es medida de
   tranquera, no de tranquerón.) */
export const ANCHOS_TRANQUERA = [3.0, 3.5, 4.0];
export const ANCHOS_TRANQUERON = [8, 9, 10, 11, 12, 13, 14, 15];
export function anchoDefaultTranquera(tipo) {
  return tipo === 'tranqueron' ? 10 : 3.5;
}
export function anchoValidoTranquera(tipo, anchoM) {
  const a = parseFloat(anchoM);
  if (isNaN(a)) return false;
  const lista = tipo === 'tranqueron' ? ANCHOS_TRANQUERON : ANCHOS_TRANQUERA;
  return lista.some((x) => Math.abs(x - a) < 0.001);
}
/* Normaliza una entrada de tranquera (las viejas no traían anchoM). */
export function normalizarTranquera(t) {
  const tipo = t && t.tipo === 'tranqueron' ? 'tranqueron' : 'tranquera';
  let a = parseFloat(t && t.anchoM);
  if (!anchoValidoTranquera(tipo, a)) a = anchoDefaultTranquera(tipo);
  return { pos: Math.round((parseFloat(t && t.pos) || 0) * 10) / 10, tipo, anchoM: a };
}
/* Inserta una tranquera/tranquerón validada en el detalle. Función pura.
   - posTexto acepta coma decimal (hábito argentino: "120,5").
   - Devuelve { ok:true, detalle } o { ok:false, error } (nunca falla en silencio). */
export function agregarTranquera(detalle, posTexto, tipo, anchoM, L) {
  const det = (Array.isArray(detalle) ? detalle : []).map(normalizarTranquera);
  const t = tipo === 'tranqueron' ? 'tranqueron' : 'tranquera';
  const norma = String(posTexto == null ? '' : posTexto).trim().replace(',', '.');
  const p = parseFloat(norma);
  const Lm = Math.max(0, parseFloat(L) || 0);
  if (norma === '' || isNaN(p)) return { ok: false, error: 'Ingresá la posición en metros desde el inicio.' };
  if (p < 0 || p > Lm) return { ok: false, error: 'La posición debe estar entre 0 y ' + Math.round(Lm) + ' m.' };
  const a = parseFloat(String(anchoM == null ? '' : anchoM).replace(',', '.'));
  if (!anchoValidoTranquera(t, a)) {
    const lista = (t === 'tranqueron' ? ANCHOS_TRANQUERON : ANCHOS_TRANQUERA).join(' · ').replace(/\./g, ',');
    return { ok: false, error: 'Ancho no válido. Opciones: ' + lista + ' m.' };
  }
  det.push({ pos: Math.round(p * 10) / 10, tipo: t, anchoM: a });
  det.sort((x, y) => x.pos - y.pos);
  return { ok: true, detalle: det };
}
/* Texto de ancho para BOM/etiquetas: "3,50 m" / "12 m". */
export function textoAnchoTranquera(anchoM) {
  const a = parseFloat(anchoM) || 0;
  return (Number.isInteger(a) ? String(a) : a.toFixed(2).replace('.', ',')) + ' m';
}
/* Peso estimado: tranquera de madera dura ≈ 35 kg/m; tranquerón ≈ 45 kg/m
   (estructura más pesada, doble hoja/herrajes reforzados). Valores medios. */
export function pesoTranqueraKg(tipo, anchoM) {
  const a = parseFloat(anchoM) || 0;
  return Math.round(a * (tipo === 'tranqueron' ? 45 : 35) * 10) / 10;
}
/* Precio de referencia ARS (oct-2026): escala lineal desde la base 3,50 m = $387.000
   (tranquera) y tranquerón ≈ $115.000/m. Ajustar con el proveedor habitual. */
export function precioDefaultTranquera(tipo, anchoM) {
  const a = parseFloat(anchoM) || 0;
  const base = tipo === 'tranqueron' ? 115000 * a : 387000 * (a / 3.5);
  return Math.round(base / 1000) * 1000;
}
/* Ítem de BOM para tranquera/tranquerón con ancho real. Código único por ancho
   (ej. 'tranquera-350') para que el precio unitario sea configurable por medida. */
export function itemTranquera(tipo, anchoM, cantidad, detalle) {
  const t = tipo === 'tranqueron' ? 'tranqueron' : 'tranquera';
  const a = parseFloat(anchoM) || anchoDefaultTranquera(t);
  const codigo = (t === 'tranqueron' ? 'tranqueron-' : 'tranquera-') + String(Math.round(a * 100));
  return {
    codigo,
    display: (t === 'tranqueron' ? 'TRQN-' : 'TRQ-') + String(Math.round(a * 100)),
    descripcion: (t === 'tranqueron' ? 'Tranquerón' : 'Tranquera') + ' ' + textoAnchoTranquera(a) + ' c/herrajes',
    unidad: 'u',
    cantidad,
    detalle: detalle || '',
    pesoKg: Math.round(pesoTranqueraKg(t, a) * cantidad * 10) / 10
  };
}
/* Precios por defecto para cada código de tranquera (para el store). */
export const PRECIOS_TRANQUERAS_DEFAULT = (() => {
  const o = {};
  ANCHOS_TRANQUERA.forEach((a) => {
    o['tranquera-' + Math.round(a * 100)] = precioDefaultTranquera('tranquera', a);
  });
  ANCHOS_TRANQUERON.forEach((a) => {
    o['tranqueron-' + Math.round(a * 100)] = precioDefaultTranquera('tranqueron', a);
  });
  return o;
})();

/* Materiales aportados por tranqueras/tranquerones ubicados:
   cada uno genera 2 postes tipo esquinero en ese punto
   (+ 1 puntal por poste si van con tirantes) + sus herrajes.
   porTipo: { 'tranquera|3.5': { tipo, anchoM, cantidad, posiciones[] } } */
export function materialesTranqueras(tranquerasDetalle, conTirantes) {
  const det = (Array.isArray(tranquerasDetalle) ? tranquerasDetalle : []).map(normalizarTranquera);
  const esquineros = det.length * 2;
  // 1 puntal por poste de tranquera (el hilo tensa de un solo lado).
  const tirantes = conTirantes ? esquineros : 0;
  const porTipo = {};
  det.forEach((t) => {
    const k = t.tipo + '|' + t.anchoM;
    if (!porTipo[k]) porTipo[k] = { tipo: t.tipo, anchoM: t.anchoM, cantidad: 0, posiciones: [] };
    porTipo[k].cantidad += 1;
    porTipo[k].posiciones.push(t.pos);
  });
  return { cantidad: det.length, esquineros, tirantes, porTipo, detalle: det };
}
