/* ============================================================
   AppAlambrado Pro — generador de PDF sin dependencias
   ------------------------------------------------------------
   Arma un PDF válido a mano: objetos numerados, tabla xref y
   trailer. Fuentes base Helvetica (normal + bold) con
   WinAnsiEncoding para que salgan bien ñ, tildes y º.
   Contenido del presupuesto: encabezado, datos del alambrado,
   tabla de materiales, mano de obra y logística, resumen
   discriminado y observaciones.
   ============================================================ */

// Texto JS -> bytes WinAnsi con escapes de PDF \\ ( )
function pdfTextoBytes(s) {
  const mapa = {
    '–': 0x96, '—': 0x97, '‘': 0x91, '’': 0x92,
    '“': 0x93, '”': 0x94, '•': 0x95, '…': 0x85, '€': 0x80
  };
  const out = [];
  const t = String(s === null || s === undefined ? '' : s);
  for (const ch of t) {
    const c = ch.codePointAt(0);
    if (c === 0x28 || c === 0x29 || c === 0x5C) { out.push(0x5C, c); continue; }
    if (c < 128) { out.push(c); continue; }
    if (mapa[ch] !== undefined) { out.push(mapa[ch]); continue; }
    // Latin-1 coincide con WinAnsi salvo 5 códigos sin uso en español
    if (c >= 0xA0 && c <= 0xFF && c !== 0x81 && c !== 0x8D &&
        c !== 0x8F && c !== 0x90 && c !== 0x9D) { out.push(c); continue; }
    out.push(0x3F); // '?'
  }
  return out;
}
function pdfAscii(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0x7F);
  return out;
}
// Corta un texto en líneas de hasta `maxChars` caracteres
function pdfEnvolver(texto, maxChars) {
  const palabras = String(texto || '').split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    if ((actual + ' ' + p).trim().length > maxChars && actual) {
      lineas.push(actual); actual = p;
    } else actual = (actual ? actual + ' ' : '') + p;
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [''];
}
function formatoPesoPDF(n) {
  const v = Math.round((parseFloat(n) || 0) * 100) / 100;
  return '$ ' + v.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/* doc = {
     numero, fecha, estado,
     cliente: { nombre, campo, telefono, localidad },
     tipoNombre, metros, hectareas, poligono,
     materiales: [{ cantidad, unidad, descripcion, precioUnit, costo }],
     manoObra: { nuevo, desarme, tranqueras, total },
     logistica: { flete, viaticos, total },
     subtotal, contingencia: { porc, monto }, margen: { porc, monto },
     total, faltantes: [codigos], observaciones, pie
   }
   Devuelve Blob application/pdf. */
function generarPresupuestoPDF(doc) {
  const ANCHO = 595, ALTO = 842, MARGEN = 48;
  const bytes = [];
  const offsets = [0];
  const push = (arr) => { offsets.push(bytes.length); for (const b of arr) bytes.push(b); };

  const paginas = [];
  let cmds = [];
  let y = 0;
  const nuevaPagina = () => {
    if (cmds.length) paginas.push(cmds);
    cmds = [];
    y = ALTO - MARGEN;
  };
  // texto en posición absoluta (no mueve y): para tablas
  const txy = (texto, x, yy, tam, negrita) => {
    const tb = pdfTextoBytes(texto);
    cmds.push(pdfAscii('BT /' + (negrita ? 'F2' : 'F1') + ' ' + tam + ' Tf ' +
      x.toFixed(1) + ' ' + yy.toFixed(1) + ' Td ('));
    cmds.push(tb);
    cmds.push(pdfAscii(') Tj ET\n'));
  };
  // línea de texto con flujo (mueve y)
  const linea = (texto, x, tam, negrita) => {
    if (y < MARGEN + 20) nuevaPagina();
    txy(texto, x, y, tam, negrita);
    y -= tam * 1.35;
  };
  const espacio = (n) => { y -= (n || 8); if (y < MARGEN + 20) nuevaPagina(); };
  const regla = () => {
    if (y < MARGEN + 20) nuevaPagina();
    cmds.push(pdfAscii('0.75 G 0.75 w ' + MARGEN + ' ' + y.toFixed(1) +
      ' m ' + (ANCHO - MARGEN) + ' ' + y.toFixed(1) + ' l S 0 G\n'));
    y -= 10;
  };

  // ---- Contenido ----
  nuevaPagina();
  linea('APPALAMBRADO PRO', MARGEN, 16, true);
  linea('Presupuesto de alambrado rural', MARGEN, 11, false);
  espacio(4); regla(); espacio(4);

  linea('PRESUPUESTO Nº ' + (doc.numero || '—'), MARGEN, 15, true);
  linea('Fecha: ' + (doc.fecha || '—'), MARGEN, 11, false);
  if (doc.estado) linea('Estado: ' + doc.estado, MARGEN, 11, false);
  espacio(4); regla(); espacio(4);

  const cli = doc.cliente || {};
  linea('Cliente: ' + (cli.nombre || '—'), MARGEN, 12, true);
  if (cli.campo) linea('Campo: ' + cli.campo, MARGEN, 10, false);
  const loc = [cli.localidad, cli.telefono].filter(Boolean).join(' · ');
  if (loc) linea(loc, MARGEN, 10, false);
  espacio(4); regla(); espacio(4);

  linea('Alambrado: ' + (doc.tipoNombre || '—'), MARGEN, 11, true);
  let medTxt = (doc.metros || 0) + ' m lineales';
  if (doc.poligono && doc.hectareas) medTxt += '  ·  ' + doc.hectareas + ' ha (potrero cerrado)';
  linea(medTxt, MARGEN, 10, false);
  espacio(6); regla(); espacio(2);

  // Tabla de materiales
  const xCant = MARGEN, xUni = MARGEN + 52, xDesc = MARGEN + 96,
        xPU = ANCHO - MARGEN - 165, xImp = ANCHO - MARGEN - 80;
  txy('Cant.', xCant, y, 10, true);
  txy('Un.', xUni, y, 10, true);
  txy('Descripción', xDesc, y, 10, true);
  txy('P. unit.', xPU, y, 10, true);
  txy('Importe', xImp, y, 10, true);
  y -= 10 * 1.35;
  regla();
  for (const it of (doc.materiales || [])) {
    const lineasDesc = pdfEnvolver(it.descripcion || 'Ítem', 40);
    if (y - lineasDesc.length * 13 < MARGEN + 20) nuevaPagina();
    const cant = it.cantidad;
    const cantTxt = (Math.round(cant) === cant) ? String(cant) : String(Math.round(cant * 100) / 100);
    txy(cantTxt, xCant, y, 10, false);
    txy(it.unidad || '', xUni, y, 10, false);
    txy(it.precioUnit != null ? formatoPesoPDF(it.precioUnit) : 's/p', xPU, y, 10, false);
    txy(formatoPesoPDF(it.costo || 0), xImp, y, 10, true);
    for (const ld of lineasDesc) { txy(ld, xDesc, y, 10, false); y -= 13; }
    y -= 3;
  }
  espacio(4); regla(); espacio(2);

  // Mano de obra y logística
  const mo = doc.manoObra || {}, lg = doc.logistica || {};
  if (mo.total > 0) {
    linea('Mano de obra', MARGEN, 11, true);
    if (mo.nuevo > 0) linea('  Alambrado nuevo: ' + formatoPesoPDF(mo.nuevo), MARGEN, 10, false);
    if (mo.desarme > 0) linea('  Desarme: ' + formatoPesoPDF(mo.desarme), MARGEN, 10, false);
    if (mo.tranqueras > 0) linea('  Tranqueras: ' + formatoPesoPDF(mo.tranqueras), MARGEN, 10, false);
    linea('  Subtotal mano de obra: ' + formatoPesoPDF(mo.total), MARGEN, 10, true);
    espacio(4);
  }
  if (lg.total > 0) {
    linea('Logística', MARGEN, 11, true);
    if (lg.flete > 0) linea('  Flete: ' + formatoPesoPDF(lg.flete), MARGEN, 10, false);
    if (lg.viaticos > 0) linea('  Viáticos: ' + formatoPesoPDF(lg.viaticos), MARGEN, 10, false);
    linea('  Subtotal logística: ' + formatoPesoPDF(lg.total), MARGEN, 10, true);
    espacio(4);
  }
  regla(); espacio(2);

  // Resumen discriminado
  const xTot = ANCHO - MARGEN - 220;
  txy('Materiales: ' + formatoPesoPDF(doc.totalMateriales || 0), xTot, y, 11, false); y -= 15;
  txy('Mano de obra: ' + formatoPesoPDF(mo.total || 0), xTot, y, 11, false); y -= 15;
  txy('Logística: ' + formatoPesoPDF(lg.total || 0), xTot, y, 11, false); y -= 15;
  txy('Subtotal: ' + formatoPesoPDF(doc.subtotal || 0), xTot, y, 11, false); y -= 15;
  if (doc.contingencia && doc.contingencia.monto > 0)
    { txy('Contingencia (' + doc.contingencia.porc + '%): ' + formatoPesoPDF(doc.contingencia.monto), xTot, y, 11, false); y -= 15; }
  if (doc.margen && doc.margen.monto > 0)
    { txy('Margen (' + doc.margen.porc + '%): ' + formatoPesoPDF(doc.margen.monto), xTot, y, 11, false); y -= 15; }
  txy('TOTAL: ' + formatoPesoPDF(doc.total || 0), xTot, y, 14, true); y -= 20;
  espacio(8);

  if (doc.faltantes && doc.faltantes.length) {
    linea('Atención: hay materiales sin precio cargado (' + doc.faltantes.join(', ') + ').', MARGEN, 10, true);
    linea('El total puede estar incompleto: cargá los precios en la pantalla Precios.', MARGEN, 10, false);
    espacio(6);
  }
  if (doc.observaciones) {
    linea('Observaciones:', MARGEN, 11, true);
    for (const ld of pdfEnvolver(doc.observaciones, 90)) linea(ld, MARGEN, 10, false);
    espacio(6);
  }
  espacio(10);
  linea(doc.pie || 'Presupuesto generado con AppAlambrado Pro — válido 15 días.', MARGEN, 9, false);
  if (cmds.length) paginas.push(cmds);

  // ---- Estructura PDF ----
  const nPag = paginas.length;
  const idCatalogo = 1, idPaginas = 2;
  const idFuente1 = 3 + nPag, idFuente2 = 4 + nPag;
  const baseContenido = 5 + nPag;
  const idsContenido = [];
  for (let k = 0; k < nPag; k++) idsContenido.push(baseContenido + k);

  for (const b of pdfAscii('%PDF-1.4\n')) bytes.push(b);
  push(pdfAscii(idCatalogo + ' 0 obj\n<< /Type /Catalog /Pages ' + idPaginas + ' 0 R >>\nendobj\n'));
  const kids = [];
  for (let k = 0; k < nPag; k++) kids.push((3 + k) + ' 0 R');
  push(pdfAscii(idPaginas + ' 0 obj\n<< /Type /Pages /Kids [' + kids.join(' ') +
    '] /Count ' + nPag + ' >>\nendobj\n'));
  for (let k = 0; k < nPag; k++) {
    push(pdfAscii((3 + k) + ' 0 obj\n<< /Type /Page /Parent ' + idPaginas + ' 0 R ' +
      '/MediaBox [0 0 ' + ANCHO + ' ' + ALTO + '] ' +
      '/Resources << /Font << /F1 ' + idFuente1 + ' 0 R /F2 ' + idFuente2 + ' 0 R >> >> ' +
      '/Contents ' + idsContenido[k] + ' 0 R >>\nendobj\n'));
  }
  push(pdfAscii(idFuente1 + ' 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'));
  push(pdfAscii(idFuente2 + ' 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n'));
  for (let k = 0; k < nPag; k++) {
    const contenido = [];
    for (const c of paginas[k]) for (const b of c) contenido.push(b);
    push(pdfAscii(idsContenido[k] + ' 0 obj\n<< /Length ' + contenido.length + ' >>\nstream\n'));
    for (const b of contenido) bytes.push(b);
    const fin = pdfAscii('\nendstream\nendobj\n');
    for (const b of fin) bytes.push(b);
  }

  const xrefPos = bytes.length;
  const total = idsContenido[nPag - 1] + 1;
  let xref = 'xref\n0 ' + total + '\n';
  xref += '0000000000 65535 f \n';
  for (let k = 1; k < total; k++) {
    xref += String(offsets[k]).padStart(10, '0') + ' 00000 n \n';
  }
  xref += 'trailer\n<< /Size ' + total + ' /Root ' + idCatalogo + ' 0 R >>\n' +
    'startxref\n' + xrefPos + '\n%%EOF';
  const xa = pdfAscii(xref);
  for (const b of xa) bytes.push(b);

  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
}

const PDF = { generarPresupuestoPDF: generarPresupuestoPDF, formatoPeso: formatoPesoPDF };

export { generarPresupuestoPDF };
