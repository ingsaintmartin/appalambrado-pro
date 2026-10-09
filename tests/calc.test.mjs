/* ============================================================
   Harness de verificación — lógica pura (ESM, sin DOM)
   node tests/calc.test.mjs
   Puerto del harness vanilla (37/37 OK) a src/lib/calc.js.
   ============================================================ */
import {
  haversineM, distanciaTotalM, perimetroM, areaEsfericaM2, areaPlanarM2,
  hectareasDe, calcularMateriales, calcularCotizacion, calcularKPIs,
  precioKmDesdeConsumo, pesoTotalTn, camionSugerido, refuerzoEfectivoM,
  TIPOS_ALAMBRADO, PARAMS_DEFAULT
} from '../src/lib/calc.js';
import { generarPresupuestoPDF } from '../src/lib/pdf.js';

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
  'alambre-liso-rollo': 6, 'alambre-pua-rollo': 5, 'torniquete': 14,
  'grampa': 98, 'tirante': 4, 'varilla-tension': 28
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
assert(c3850['torniquete'] === 28, 'polígono: 28 torniquetes (7×4)');
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
const matEsp = 6 * 210000 + 5 * 100000 + 2 * 90000 + 12 * 28000 + 500 * 1700 + 14 * 22000 + 28 * 3800 + 98 * 80 + Math.round(7350 * 0.014) * 950 + 4 * 14000;
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

console.log('\n----------------------------------------');
console.log('Resultado: ' + ok + ' OK, ' + mal + ' FALLIDAS');
process.exit(mal ? 1 : 0);
