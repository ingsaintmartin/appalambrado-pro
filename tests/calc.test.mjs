/* ============================================================
   Harness de verificación — lógica pura (ESM, sin DOM)
   node tests/calc.test.mjs
   Puerto del harness vanilla (37/37 OK) a src/lib/calc.js.
   ============================================================ */
import {
  haversineM, distanciaTotalM, perimetroM, areaEsfericaM2, areaPlanarM2,
  hectareasDe, calcularMateriales, calcularCotizacion, calcularKPIs,
  precioKmDesdeConsumo, pesoTotalTn, camionSugerido, refuerzoEfectivoM,
  TIPOS_ALAMBRADO, PARAMS_DEFAULT, contarTorniquetes, atadoresConTorniquete,
  TIPOS_ALAMBRE, tipoAlambre, ESPECIES_MADERA, especieMadera
} from '../src/lib/calc.js';
import { generarPresupuestoPDF } from '../src/lib/pdf.js';
import {
  replanteoExacto, replanteoLinea, puntoEnDistancia,
  validarVarillas, materialesTranqueras, agregarTranquera, normalizarTranquera,
  anchoValidoTranquera, anchoDefaultTranquera, itemTranquera,
  precioDefaultTranquera, textoAnchoTranquera,
  ANCHOS_TRANQUERA, ANCHOS_TRANQUERON
} from '../src/lib/calc.js';
import {
  distribuirAlturas, calcularEsquema, hilosEfectivos,
  ALTURAS_TRADICIONAL, ALTURAS_ELECTRICO
} from '../src/lib/esquema.js';

let ok = 0, mal = 0;
function assert(cond, nombre, detalle) {
  if (cond) { ok++; console.log('  ✓ ' + nombre); }
  else { mal++; console.log('  ✗ ' + nombre + (detalle ? ' → ' + detalle : '')); }
}
const cerca = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('\n== Geometría ==');
const d1 = haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
assert(cerca(d1, 111194.93, 1), 'Haversine 1° latitud ≈ 111195 m', d1);
const d2 = haversineM({ lat: -35.0, lng: -63.0 }, { lat: -35.0, lng: -63.001 });
assert(d2 > 85 && d2 < 95, 'Haversine ~91 m a lat -35', d2);
const linea = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 }, { lat: 0, lng: 0.002 }];
assert(cerca(distanciaTotalM(linea), 2 * 111.19493, 0.5), 'distanciaTotalM suma tramos');
const tri = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 }, { lat: 0.001, lng: 0 }];
assert(perimetroM(tri) > distanciaTotalM(tri), 'perimetroM cierra el polígono');
const lado = 0.01;
const cuad = [{ lat: 0, lng: 0 }, { lat: 0, lng: lado }, { lat: lado, lng: lado }, { lat: lado, lng: 0 }];
const aEsp = areaEsfericaM2(cuad);
assert(cerca(aEsp, Math.pow(111194.93 * lado, 2), aEsp * 0.005), 'área esférica 0.01° ≈ 123.64 ha', (aEsp / 10000).toFixed(2));
assert(cerca(areaPlanarM2(cuad), aEsp, aEsp * 0.001), 'área planar ≈ esférica en lote chico');
assert(hectareasDe(500000) === 50, 'hectareasDe');
const dLat = 1000 / 111194.93, dLng = 500 / (111194.93 * Math.cos(-35.6 * Math.PI / 180));
const pot = [{ lat: -35.6, lng: -59.8 }, { lat: -35.6, lng: -59.8 + dLng }, { lat: -35.6 + dLat, lng: -59.8 + dLng }, { lat: -35.6 + dLat, lng: -59.8 }];
assert(cerca(areaEsfericaM2(pot) / 10000, 50, 0.5), 'potrero 1000×500 m ≈ 50 ha');
assert(cerca(perimetroM(pot), 3000, 15), 'perímetro potrero ≈ 3000 m');

console.log('\n== Materiales suspendido 7 hilos ==');
// default refuerzoCadaM=80 (SPEC): 1000/80 → floor = 12
const { items, resumen } = calcularMateriales('suspendido7', 1000, { poligono: false, nVertices: 0 });
const porCod = {};
for (const it of items) porCod[it.codigo] = it.cantidad;
const esperado = {
  'poste-esquinero': 2, 'poste-refuerzo': 12, 'varilla': 500,
  'alambre-liso-rollo': 6, 'alambre-pua-rollo': 5, 'torniquete': 21,
  'grampa': 98, 'tirante': 2, 'varilla-tension': 42
  // torniquete 21 = 7 hilos × (2 esq + 1 atador cada 10 refuerzos): regla de campo 2026-10-09
  // tirante 2 = 2 esquineros × 1 dirección (regla de campo 2026-10-09)
};
for (const cod of Object.keys(esperado))
  assert(porCod[cod] === esperado[cod], cod + ' = ' + esperado[cod], 'dio ' + porCod[cod]);
assert(resumen.mLiso === 5250 && resumen.mPua === 2100, 'mLiso/mPua con 5% merma');
// Diseño: 3850 m / 80 → 48 refuerzos (floor)
const r3850 = calcularMateriales('suspendido7', 3850, { poligono: true, nVertices: 4 });
const c3850 = {};
for (const it of r3850.items) c3850[it.codigo] = it.cantidad;
assert(c3850['poste-refuerzo'] === 48, '3850m/80m → 48 refuerzos (diseño)', c3850['poste-refuerzo']);
assert(c3850['poste-esquinero'] === 4, 'polígono: 4 esquineros');
assert(c3850['torniquete'] === 56, 'polígono: 56 torniquetes (7×(4 esq+4 atad))', c3850['torniquete']);
assert(c3850['varilla'] === 1925, '3850/2 → 1925 varillas');
// Suelo cañada: refuerzo cada 8 m
assert(refuerzoEfectivoM(80, 'canada') === 8, "cañada → refuerzo 8 m");
const rc = calcularMateriales('suspendido7', 1000, { suelo: 'canada' });
const rcc = {}; for (const it of rc.items) rcc[it.codigo] = it.cantidad;
assert(rcc['poste-refuerzo'] === 125, 'cañada: 1000/8 = 125 refuerzos', rcc['poste-refuerzo']);
// Convencional y eléctrico
assert(calcularMateriales('convencional', 1000, {}).items.length >= 4, 'convencional no revienta');
const elec = calcularMateriales('electrico', 900, { hilosElec: 2 });
const eCod = {}; for (const it of elec.items) eCod[it.codigo] = it.cantidad;
assert(eCod['aislador'] === 2 * (Math.floor(900 / 30) + 1), 'aisladores = hilos × postes');
// Peso y camión
const tn = pesoTotalTn(r3850.items);
assert(tn > 5 && tn < 9, 'peso 3850m ≈ 6-7 Tn (diseño: 6.92)', tn);
assert(camionSugerido(tn).includes('mediano'), 'camión mediano para ~7 Tn', camionSugerido(tn));
// L=0 → vacío
assert(calcularMateriales('suspendido7', 0, {}).items.length === 0, 'L=0 → sin items');

console.log('\n== Cotizador ==');
const preciosTest = [
  { codigo: 'alambre-liso-rollo', precio: 210000 },
  { codigo: 'alambre-pua-rollo', precio: 100000 },
  { codigo: 'poste-esquinero', precio: 90000 },
  { codigo: 'poste-refuerzo', precio: 28000 },
  { codigo: 'varilla', precio: 1700 },
  { codigo: 'torniquete', precio: 22000 },
  { codigo: 'varilla-tension', precio: 3800 },
  { codigo: 'grampa', precio: 80 },
  { codigo: 'alambre-dulce', precio: 950 },
  { codigo: 'tirante', precio: 14000 },
  { codigo: 'tranquera', precio: 185000 }
];
const proyectoTest = {
  tipo: 'suspendido7', params: { tranqueras: 0 },
  medicion: { metros: 1000, poligono: false, vertices: [] },
  mo: { precioM: 1500, metrosDesarme: 0, precioDesarme: 0, tranqueras: 0, precioTranquera: 0 },
  log: { km: 60, precioKm: 2500, viaticos: 50000 },
  porc: { contingencia: 5, margen: 20 }
};
const cot = calcularCotizacion(proyectoTest, preciosTest);
const matEsp = 6 * 210000 + 5 * 100000 + 2 * 90000 + 12 * 28000 + 500 * 1700 + 21 * 22000 + 42 * 3800 + 98 * 80 + Math.round(7350 * 0.014) * 950 + 2 * 14000;
// 21 torniquetes (7×(2 esq+1 atad)) y 42 varillas de tensión, regla de campo 2026-10-09
// 2 tirantes (1 por dirección en línea)
assert(cot.totalMateriales === matEsp, 'total materiales', cot.totalMateriales + ' vs ' + matEsp);
assert(cot.manoObra.total === 1500000, 'MO 1000m × $1500');
assert(cot.logistica.total === 200000, 'logística 60×2500+50000');
const subEsp = matEsp + 1500000 + 200000;
assert(cot.subtotal === subEsp, 'subtotal');
assert(cerca(cot.contingencia.monto, subEsp * 0.05, 0.01), 'contingencia 5%');
assert(cerca(cot.total, subEsp * 1.05 * 1.20, 0.01), 'TOTAL con margen 20%');
assert(cot.faltantes.length === 0, 'sin faltantes con lista completa');
assert(precioKmDesdeConsumo(1, 2500) === 2500, 'flete = l/km × $/l');
const cotSP = calcularCotizacion(proyectoTest, []);
assert(cotSP.faltantes.length > 0 && cotSP.totalMateriales === 0, 'sin precios → faltantes, no $0 silencioso');

console.log('\n== KPIs ==');
const proyectoEje = { resumen: cot };
const ejeBase = { reales: {}, diasReales: 5, costoManoObraReal: 1500000, kmReales: 60, precioKmReal: 2500, viaticosReales: 50000, otrosCostos: [] };
for (const m of cot.materiales) ejeBase.reales[m.codigo] = { cantidad: m.cantidad, precioUnit: m.precioUnit };
const kpi0 = calcularKPIs(proyectoEje, ejeBase, preciosTest);
assert(kpi0.total.ok && kpi0.total.desvio < 0, 'todo igual → verde (contingencia no gastada)');
ejeBase.reales['alambre-liso-rollo'] = { cantidad: 12, precioUnit: 210000 };
const kpi2 = calcularKPIs(proyectoEje, ejeBase, preciosTest);
assert(kpi2.total.desvio > 0 && !kpi2.total.ok, 'sobrecosto grande → total en rojo');
assert(kpi2.total.pres === cot.subtotal + cot.contingencia.monto, 'KPI total excluye el margen');
assert(kpi2.margenProy < 0.2, 'margen proyectado cae con sobrecosto');

console.log('\n== Replanteo exacto ==');
const re1 = replanteoExacto(1000, 80);
assert(re1.n === 13 && cerca(re1.real, 76.923, 0.001), '1000/80 → 13 tramos de 76,923 m (todos iguales)');
assert(replanteoExacto(1000, 80).n * replanteoExacto(1000, 80).real === 1000, 'n × real = L exacto');
const re0 = replanteoExacto(0, 80);
assert(re0.n === 0, 'largo 0 → n 0');
const rl = replanteoLinea(1000, 80, 15);
assert(rl.atadores.cantidad === 12, '1000m/80 → 12 atadores (sin contar extremos)');
assert(rl.tramos.length === 13 && rl.tramos.every((t) => cerca(t.largo, 76.923, 0.01)), '13 tramos parejos');
assert(rl.intermedios.cantidad === 52, '52 intermedios (4 por tramo × 13)');
assert(rl.tramos.every((t) => cerca(t.claroReal, 15.385, 0.01)), 'claros intermedios parejos 15,385 m');
assert(rl.posAtadores[0] === 0 && cerca(rl.posAtadores[13], 1000, 0.01), 'posiciones 0..1000');

console.log('\n== puntoEnDistancia ==');
const vv = [{ lat: -35, lng: -62 }, { lat: -35, lng: -61.99 }];
const pto = puntoEnDistancia(vv, 500);
assert(pto && pto.lng > -62 && pto.lng < -61.99, 'punto a 500 m interpolado sobre el tramo');
assert(puntoEnDistancia(vv, 99999).lng === -61.99, 'más allá del final → último vértice');
assert(puntoEnDistancia([{ lat: 0, lng: 0 }], 10) === null, 'menos de 2 vértices → null');

console.log('\n== Regla de varillas ==');
const vv1 = validarVarillas(15, 9, 'comun');
assert(vv1.ok && cerca(vv1.espaciamientoCm, 150, 0.1), '15 m / 9 varillas → 150 cm OK (100-180)');
assert(!validarVarillas(15, 2, 'comun').ok, '15 m / 2 varillas → 500 cm fuera de rango');
const vv2 = validarVarillas(2.5, 3, 'manga');
assert(vv2.ok && cerca(vv2.espaciamientoCm, 62.5, 0.1), 'manga 2,5 m / 3 → 62,5 cm OK (60-100)');
assert(!validarVarillas(2.5, 1, 'manga').ok, 'manga 2,5 m / 1 → 125 cm fuera de rango');
assert(validarVarillas(15, 0, 'comun').ok, '0 varillas → ok');

console.log('\n== Tranqueras → esquineros ==');
const trq = materialesTranqueras([{ pos: 120, tipo: 'tranquera' }, { pos: 400, tipo: 'tranqueron' }], true);
assert(trq.cantidad === 2 && trq.esquineros === 4 && trq.tirantes === 4, '2 ubicadas → 4 esquineros + 4 puntales (1 por poste)');
assert(trq.porTipo['tranquera|3.5'].cantidad === 1 && trq.porTipo['tranqueron|10'].cantidad === 1, 'conteo por tipo+ancho (default 3,5 / 10 m)');
const mTrq = calcularMateriales('suspendido7', 1000, { tranquerasDetalle: [{ pos: 120, tipo: 'tranquera' }] });
const cTrq = {}; mTrq.items.forEach((i) => cTrq[i.codigo] = i.cantidad);
assert(cTrq['poste-esquinero'] === 4, 'BOM: 2 extremos + 2 por tranquera = 4 esquineros');
assert(cTrq['tirante'] === 4, 'BOM: 4 puntales (2 línea + 2 tranquera, 1 por dirección)');
assert(cTrq['tranquera-350'] === 1, 'BOM: 1 tranquera 3,50 m ubicada (código por ancho)');
assert(mTrq.resumen.esqTranquera === 2, 'resumen.esqTranquera = 2');

console.log('\n== Tranqueras: anchos variables e inserción ==');
// Anchos válidos / inválidos por tipo
assert(ANCHOS_TRANQUERA.join() === '3,3.5,4', 'tranquera: 3 / 3,5 / 4 m');
assert(ANCHOS_TRANQUERON.length === 8 && ANCHOS_TRANQUERON[0] === 8 && ANCHOS_TRANQUERON[7] === 15, 'tranquerón: 8 a 15 m paso 1');
assert(anchoValidoTranquera('tranquera', 3) && anchoValidoTranquera('tranquera', 4), '3 y 4 m válidos en tranquera');
assert(!anchoValidoTranquera('tranquera', 4.5), '4,5 m NO válido en tranquera');
assert(anchoValidoTranquera('tranqueron', 12) && !anchoValidoTranquera('tranqueron', 7) && !anchoValidoTranquera('tranqueron', 16), 'tranquerón 8–15');
// Inserción pura: el caso del usuario (botón "Ubicar en la línea")
let ins = agregarTranquera([], '300', 'tranquera', 3.5, 719);
assert(ins.ok && ins.detalle.length === 1 && ins.detalle[0].pos === 300 && ins.detalle[0].anchoM === 3.5, 'inserta tranquera 3,5 m en 300 m');
ins = agregarTranquera(ins.detalle, '120,5', 'tranqueron', 12, 719);
assert(ins.ok && ins.detalle.length === 2 && ins.detalle[0].pos === 120.5, 'coma decimal argentina + orden por posición');
assert(ins.detalle[1].tipo === 'tranquera', 'orden: 120,5 antes que 300');
ins = agregarTranquera([], '800', 'tranquera', 3.5, 719);
assert(!ins.ok && /0 y 719/.test(ins.error), 'posición fuera de rango → error visible, no silencio');
ins = agregarTranquera([], '', 'tranquera', 3.5, 719);
assert(!ins.ok, 'posición vacía → error');
ins = agregarTranquera([], '100', 'tranquera', 4.5, 719);
assert(!ins.ok && /Ancho no válido/.test(ins.error), 'ancho 4,5 en tranquera → error');
// Normalización de entradas viejas (sin anchoM)
const norm = normalizarTranquera({ pos: 50, tipo: 'tranqueron' });
assert(norm.anchoM === 10 && norm.pos === 50, 'entrada vieja → ancho default 10 m');
// BOM refleja el ancho: descripción, peso y código por medida
const it4 = itemTranquera('tranquera', 4, 1, 'en 200m');
assert(it4.codigo === 'tranquera-400' && /4 m/.test(it4.descripcion), 'código y descripción con ancho 4 m');
assert(it4.pesoKg === 140, 'peso 4 m × 35 kg/m = 140 kg');
const itQ = itemTranquera('tranqueron', 12, 1, 'en 500m');
assert(itQ.codigo === 'tranqueron-1200' && itQ.pesoKg === 540, 'tranquerón 12 m × 45 kg/m = 540 kg');
assert(textoAnchoTranquera(3.5) === '3,50 m' && textoAnchoTranquera(12) === '12 m', 'texto de ancho');
assert(precioDefaultTranquera('tranquera', 3.5) === 387000, 'precio base tranquera 3,5 m');
assert(precioDefaultTranquera('tranqueron', 10) > precioDefaultTranquera('tranqueron', 8), 'precio tranquerón crece con el ancho');
// BOM agrupa por (tipo, ancho)
const mAn = calcularMateriales('suspendido7', 1000, {
  tranquerasDetalle: [
    { pos: 100, tipo: 'tranquera', anchoM: 3.5 },
    { pos: 500, tipo: 'tranquera', anchoM: 4 },
    { pos: 800, tipo: 'tranqueron', anchoM: 12 }
  ]
});
const cAn = {}; mAn.items.forEach((i) => cAn[i.codigo] = i);
assert(cAn['tranquera-350'].cantidad === 1 && cAn['tranquera-400'].cantidad === 1, 'BOM: un renglón por ancho de tranquera');
assert(cAn['tranqueron-1200'].cantidad === 1 && /12 m/.test(cAn['tranqueron-1200'].descripcion), 'BOM: tranquerón 12 m');
assert(mAn.resumen.esqTranquera === 6, '3 ubicadas → 6 esquineros');

console.log('\n== Hilos configurables (dibujo = cómputo) ==');
const d3 = distribuirAlturas(3, 220, 1);
assert(d3.length === 3 && d3[0].alturaCm === 12 && d3[2].alturaCm === 210, '3 hilos en 220: 12/111/210');
assert(d3[0].tipo === 'pua' && d3[1].tipo === 'liso', 'púas abajo');
assert(distribuirAlturas(1, 220, 0)[0].tipo === 'liso' && distribuirAlturas(1, 220, 1)[0].tipo === 'pua', '1 hilo respeta púa');
const mH3 = calcularMateriales('suspendido7', 1000, { hilos: 3, puas: 1 });
const cH3 = {}; mH3.items.forEach((i) => cH3[i.codigo] = i.cantidad);
assert(cH3['torniquete'] === 9, '3 hilos → 9 torniquetes (3×(2 esq+1 atad))');
assert(mH3.resumen.hilos === 3 && mH3.resumen.puas === 1, 'resumen hilos/puas');
assert(cH3['alambre-pua-rollo'] === Math.ceil(1000 * 1 * 1.05 / 500), 'púa: 1000×1×1.05 en rollos de 500');
const mH7 = calcularMateriales('suspendido7', 1000, {});
assert(mH7.resumen.hilos === 7 && mH7.resumen.puas === 2, 'default tradicional 7/2 (regresión)');

console.log('\n== Esquema reactivo ==');
const esqT = calcularEsquema({ patron: 'suspendido7', esquema: { preset: 'tradicional' }, distPalosM: 15, varillasPorClaro: 9, modoVarillas: 'comun' });
assert(esqT.hilos.length === 7 && esqT.hilos[0].alturaCm === 15 && esqT.hilos[6].tipo === 'pua', 'tradicional: 7 hilos fijos');
const esqC = calcularEsquema({ patron: 'suspendido7', esquema: { preset: 'configurable', hilos: 3, puas: 0, altoPaloCm: 220, tipoPalo: 'x', varillaModo: 'central' }, distPalosM: 45, modoVarillas: 'comun' });
assert(esqC.hilos.length === 3 && esqC.varillas.modo === 'central' && esqC.varillas.n === 1, 'suspendido 3 hilos + varillón central (ejemplo del usuario)');
assert(cerca(esqC.varillas.espaciamientoCm, 2250, 1) && !esqC.varillas.ok, 'varillón a 45 m → 2250 cm fuera de rango (avisa)');
const esqE = calcularEsquema({ patron: 'electrico', hilosElec: 1, distPalosM: 15, modoVarillas: 'comun' });
assert(esqE.hilos.length === 1 && esqE.hilos[0].tipo === 'electro' && esqE.hilos[0].alturaCm === 80, 'eléctrico 1 hilo a 80 cm');
const esqE2 = calcularEsquema({ patron: 'electrico', hilosElec: 2, distPalosM: 15, modoVarillas: 'comun' });
assert(esqE2.hilos.length === 2 && esqE2.hilos[1].alturaCm === 100, 'eléctrico 2 hilos 60/100');
assert(hilosEfectivos('suspendido7', { preset: 'tradicional' }).hilos === 7, 'hilosEfectivos tradicional');
assert(hilosEfectivos('suspendido7', { preset: 'configurable', hilos: 5, puas: 2 }).puas === 2, 'hilosEfectivos configurable');
assert(hilosEfectivos('electrico', null, 2).hilos === 2, 'hilosEfectivos eléctrico');
assert(ALTURAS_TRADICIONAL.length === 7 && ALTURAS_ELECTRICO[3].length === 3, 'presets completos');

console.log('\n== PDF ==');
const blob = generarPresupuestoPDF({
  numero: 'TEST', fecha: '09/10/26', estado: 'Cotizado',
  cliente: { nombre: 'Estancia Demo', campo: 'Lote 1', telefono: '', localidad: '' },
  tipoNombre: 'Suspendido 7 hilos', metros: 1000, hectareas: 0, poligono: false,
  materiales: cot.materiales.slice(0, 3).map((m) => ({ cantidad: m.cantidad, unidad: m.unidad, descripcion: m.descripcion, precioUnit: m.precioUnit, costo: m.costo })),
  totalMateriales: cot.totalMateriales, manoObra: cot.manoObra, logistica: cot.logistica,
  subtotal: cot.subtotal, contingencia: cot.contingencia, margen: cot.margen,
  total: cot.total, faltantes: [], observaciones: 'Prueba ñandú'
});
assert(blob instanceof Blob && blob.type === 'application/pdf', 'devuelve Blob PDF');
const buf = Buffer.from(await blob.arrayBuffer());
assert(buf.length > 2000, 'PDF no vacío (' + buf.length + ' bytes)');
assert(buf.slice(0, 8).toString('ascii') === '%PDF-1.4', 'cabecera %PDF-1.4');
assert(buf.includes('WinAnsiEncoding'), 'WinAnsiEncoding (ñ/tildes)');
assert(buf.includes('startxref'), 'xref válida');

console.log('\n== Módulo 2: defectos 2026-10-09 ==');
// Defecto 2: esquineros/puntales en tramo lineal (los 3 patrones)
// Puntales: 1 por dirección → línea: 2 esquineros × 1 = 2 puntales
for (const pat of ['suspendido7', 'convencional', 'electrico']) {
  const rr = calcularMateriales(pat, 719, { poligono: false, nVertices: 0 }).resumen;
  assert(rr.esquineros === 2, pat + ': 2 esquineros en tramo lineal', rr.esquineros);
  assert(rr.tirantes === 2, pat + ': 2 puntales (1 por dirección)', rr.tirantes);
}
// Polígono: cada esquina tiene 2 direcciones → 2 puntales por esquinero
const rPoly = calcularMateriales('suspendido7', 1000, { poligono: true, nVertices: 4 }).resumen;
assert(rPoly.esquineros === 4, 'polígono: 4 esquineros', rPoly.esquineros);
assert(rPoly.tirantes === 8, 'polígono: 8 puntales (4×2 direcciones)', rPoly.tirantes);
// Tranquera: 1 puntal por poste (el hilo tensa de un solo lado)
const rTrq = calcularMateriales('convencional', 719, {
  tranquerasDetalle: [{ pos: 300, tipo: 'tranquera' }]
}).resumen;
assert(rTrq.esquineros === 4, 'tranquera: +2 esquineros', rTrq.esquineros);
assert(rTrq.tirantes === 4, 'tranquera: 2 (línea) + 2 (1 por poste)', rTrq.tirantes);
// Defecto 1: resumen unificado — las tarjetas leen los mismos campos en los 3 patrones
const CAMPOS = ['esquineros', 'tirantes', 'atadores', 'intermedios', 'varillas',
  'mLiso', 'mPua', 'rollosLiso', 'rollosPua', 'torniquetes', 'grampas', 'alambreDulceM'];
for (const pat of ['suspendido7', 'convencional', 'electrico']) {
  const rr = calcularMateriales(pat, 719, {}).resumen;
  const faltan = CAMPOS.filter((k) => rr[k] === undefined);
  assert(faltan.length === 0, pat + ': resumen completo (tarjetas = BOM)', faltan.join(','));
}
// Defecto 8: atadores cada N (default 10) en convencional 719 m
const rConv = calcularMateriales('convencional', 719, {}).resumen;
assert(rConv.atadores === 5, 'convencional 719m: 5 atadores (58/10)', rConv.atadores);
assert(rConv.intermedios === 53, 'convencional 719m: 53 intermedios', rConv.intermedios);
assert(rConv.atadores + rConv.intermedios + rConv.esquineros === 60, 'convencional: total posiciones = 60 (719/12+1)');
const rConvN5 = calcularMateriales('convencional', 719, { cadaNAtadores: 5 }).resumen;
assert(rConvN5.atadores === 11, 'convencional N=5 ajustable: 11 atadores', rConvN5.atadores);
// Defecto 8: torniquetes = hilos × (esquineros_con + atadores_con)
assert(contarTorniquetes(7, 2, 5, { torniqEsquineros: true }) === 49, 'torniquetes 7×(2+5)=49');
assert(contarTorniquetes(7, 2, 5, { torniqEsquineros: false }) === 35, 'sin esq: 7×5=35');
assert(atadoresConTorniquete(5, { torniqCadaAtadores: 2 }, false) === 3, 'cada 2 atadores: ceil(5/2)=3');
assert(atadoresConTorniquete(12, { cadaNAtadores: 10, torniqCadaAtadores: 1 }, true) === 1, 'clásico: floor(12/10)=1');
const rT2 = calcularMateriales('suspendido7', 1000, { torniqEsquineros: false }).resumen;
assert(rT2.torniquetes === 7, 'toggle esq OFF: 7×(0+1)=7', rT2.torniquetes);
// Defecto 7: tipos de alambre y especies de madera
assert(TIPOS_ALAMBRE.liso.some((t) => t.id === '15-13'), 'liso 15/13 pesado');
assert(TIPOS_ALAMBRE.pua.some((t) => t.id === '4p') && TIPOS_ALAMBRE.pua.some((t) => t.id === '2p'), 'púas 4 y 2 puntas');
assert(TIPOS_ALAMBRE.electro.some((t) => t.id === 'ep6') && TIPOS_ALAMBRE.electro.some((t) => t.id === 'boy25'), 'electroplástico 6mm y boyero 2,5mm');
assert(tipoAlambre('liso', '15-13').rolloM === 1000, 'rollo liso 1000 m');
assert(ESPECIES_MADERA.some((e) => e.id === 'nandubay') && ESPECIES_MADERA.some((e) => e.id === 'algarrobo'), 'ñandubay y algarrobo');
const rMad = calcularMateriales('suspendido7', 1000, { maderaEsquinero: 'nandubay' });
const itEsq = rMad.items.find((i) => i.codigo === 'poste-esquinero');
assert(itEsq.descripcion.includes('Ñandubay'), 'especie en descripción del poste', itEsq.descripcion);
assert(itEsq.pesoKg < 85 * 2, 'factor de peso ñandubay < quebracho', itEsq.pesoKg);
// Defecto 5: replanteo incluye atadores en la división de tramos
const rRp = calcularMateriales('suspendido7', 719, {
  replanteo: { atadoresM: 80, intermediosM: 15 }
}).resumen;
assert(rRp.replanteo && rRp.atadores === rRp.replanteo.atadores.cantidad, 'replanteo: atadores en tramos');
assert(rRp.intermedios === rRp.replanteo.intermedios.cantidad, 'replanteo: intermedios en tramos');
// Defecto 3: separador mínimo de varillas 1,0 m (regla 100–180 cm)
assert(PARAMS_DEFAULT.sepVarillas >= 1.0, 'default sepVarillas ≥ 1,0');
const vv120 = validarVarillas(12, 9, 'comun'); // claro 12 m / (9+1) = 120 cm
assert(vv120.ok === true && vv120.espaciamientoCm === 120, 'varillas a 120 cm: dentro de regla', JSON.stringify(vv120));
const vv200 = validarVarillas(12, 5, 'comun'); // claro 12 m / (5+1) = 200 cm
assert(vv200.ok === false, 'varillas a 200 cm: fuera de regla (máx 180)');

console.log('\n----------------------------------------');
console.log('Resultado: ' + ok + ' OK, ' + mal + ' FALLIDAS');
process.exit(mal ? 1 : 0);
