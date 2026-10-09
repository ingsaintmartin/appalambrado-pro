/* ============================================================
   AppAlambrado Pro — generador de PDF sin dependencias
   ------------------------------------------------------------
   Arma un PDF válido a mano: objetos numerados, tabla xref y
   trailer. Fuentes base Helvetica (normal + bold) con
   WinAnsiEncoding para que salgan bien ñ, tildes y º.
   Diseño profesional: encabezado con logo JPEG incrustado
   (XObject/DCTDecode) + datos de la empresa, banda de título,
   cliente/obra, materiales (informativos si los provee el dueño),
   mano de obra, logística, resumen con IVA discriminado,
   observaciones, firmas y pie.
   Paleta: verde #1b4332, marrón #7f4f24.
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
function formatoMetrosPDF(m) {
  const v = Math.round((parseFloat(m) || 0) * 100) / 100;
  return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
}

/* Lee un dataURL JPEG y devuelve {w, h, bytes} (o null).
   Funciona en browser y en node (atob es global en ambos). */
function jpegDesdeDataUrl(dataUrl) {
  try {
    if (typeof dataUrl !== 'string') return null;
    const m = dataUrl.match(/^data:image\/jpeg;base64,(.+)$/);
    if (!m) return null;
    const bin = atob(m[1].replace(/\s+/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null;
    let p = 2;
    while (p + 9 < bytes.length) {
      if (bytes[p] !== 0xFF) break;
      let mk = bytes[p + 1];
      while (mk === 0xFF) { p++; mk = bytes[p + 1]; }
      if (mk === 0xD8 || (mk >= 0xD0 && mk <= 0xD7) || mk === 0x01) { p += 2; continue; }
      const len = (bytes[p + 2] << 8) | bytes[p + 3];
      if (len < 2) break;
      if (mk >= 0xC0 && mk <= 0xC3) {
        const h = (bytes[p + 5] << 8) | bytes[p + 6];
        const w = (bytes[p + 7] << 8) | bytes[p + 8];
        if (w > 0 && h > 0) return { w, h, bytes };
        return null;
      }
      p += 2 + len;
    }
    return null;
  } catch (e) { return null; }
}

// Paleta de la app
const VERDE = [0x1b / 255, 0x43 / 255, 0x32 / 255];
const MARRON = [0x7f / 255, 0x4f / 255, 0x24 / 255];
const TINTA = [0.12, 0.12, 0.12];
const MUTED = [0.42, 0.42, 0.42];
const FONDO = [0.945, 0.95, 0.935];
const BLANCO = [1, 1, 1];
const NEGRO = [0, 0, 0];
const col = (c) => c.map((v) => v.toFixed(3)).join(' ');

/* doc = {
     empresa: { nombreFantasia, tagline, razonSocial, cuit, telefono, email, domicilio,
                condicionFiscal: 'monotributo'|'ri', logoDataUrl },
     numero, letra: 'C'|'B'|'A' (letra del comprobante junto al número),
     fecha ('09/10/2026' — string local, nunca ISO),
     cliente: { nombre, campo, telefono, localidad },
     tipoNombre, metros (number), poligono, hectareas,
     materialesDueno: bool,
     materiales: [{ cantidad, unidad, descripcion, precioUnit, costo }],
     totalMateriales,
     manoObra: { nuevo, desarme, tranqueras, total },
     logistica: { flete, viaticos, total },
     subtotal, contingencia: { porc, monto }, margen: { porc, monto },
     iva: { modo: 'sin'|'10.5'|'21', porc, monto },
     total, faltantes: [codigos], observaciones, validezDias
   }
   Devuelve Blob application/pdf. */
function generarPresupuestoPDF(doc) {
  const ANCHO = 595, ALTO = 842, MARGEN = 48;
  const CW = ANCHO - MARGEN * 2;
  const bytes = [];
  const offsets = [0];
  const push = (arr) => { offsets.push(bytes.length); for (const b of arr) bytes.push(b); };

  const emp = doc.empresa || {};
  const nombreEmp = emp.nombreFantasia || 'EL ATADOR';
  const tagline = emp.tagline || 'Alambrados Rurales';
  const logo = jpegDesdeDataUrl(emp.logoDataUrl);
  const condFiscalTxt = emp.condicionFiscal === 'ri' ? 'Responsable Inscripto' : 'Monotributista';

  const paginas = [];
  let cmds = [];
  let y = 0;
  const nuevaPagina = () => {
    if (cmds.length) paginas.push(cmds);
    cmds = [];
    y = ALTO - MARGEN;
  };
  const rectFill = (x, yBot, w, h, c) => {
    cmds.push(pdfAscii(col(c) + ' rg ' + x.toFixed(1) + ' ' + yBot.toFixed(1) +
      ' ' + w.toFixed(1) + ' ' + h.toFixed(1) + ' re f\n'));
  };
  const txy = (texto, x, yy, tam, negrita, color) => {
    const tb = pdfTextoBytes(texto);
    cmds.push(pdfAscii(col(color || NEGRO) + ' rg BT /' + (negrita ? 'F2' : 'F1') + ' ' + tam + ' Tf ' +
      x.toFixed(1) + ' ' + yy.toFixed(1) + ' Td ('));
    cmds.push(tb);
    cmds.push(pdfAscii(') Tj ET\n'));
  };
  // texto alineado a derecha (ancho estimado Helvetica ~0.52em)
  const txyR = (texto, xDer, yy, tam, negrita, color) => {
    const w = String(texto).length * tam * 0.52;
    txy(texto, xDer - w, yy, tam, negrita, color);
  };
  const linea = (texto, x, tam, negrita, color) => {
    if (y < MARGEN + 20) nuevaPagina();
    txy(texto, x, y, tam, negrita, color);
    y -= tam * 1.4;
  };
  const espacio = (n) => { y -= (n || 8); if (y < MARGEN + 20) nuevaPagina(); };
  const regla = (color, grosor) => {
    if (y < MARGEN + 20) nuevaPagina();
    cmds.push(pdfAscii(col(color || MUTED) + ' rg ' + MARGEN + ' ' + (y - (grosor || 1)).toFixed(1) +
      ' ' + CW + ' ' + (grosor || 1) + ' re f\n'));
    y -= 8 + (grosor || 1);
  };
  const tituloSeccion = (txt) => {
    espacio(6);
    if (y < MARGEN + 40) nuevaPagina();
    txy(txt.toUpperCase(), MARGEN, y, 11, true, VERDE);
    y -= 15;
    regla(VERDE, 2);
  };
  const filaResumen = (etiqueta, valor, tam, negrita, color) => {
    txy(etiqueta, MARGEN + 12, y, tam || 10, false, TINTA);
    txyR(valor, ANCHO - MARGEN - 12, y, tam || 10, !!negrita, color || TINTA);
    y -= (tam || 10) * 1.55;
  };

  // ---- Contenido ----
  nuevaPagina();

  // Encabezado: logo + empresa
  let xEmp = MARGEN;
  let altoLogo = 0;
  if (logo) {
    const lado = 76;
    const k = Math.min(lado / logo.w, lado / logo.h);
    const dw = logo.w * k, dh = logo.h * k;
    altoLogo = dh;
    cmds.push(pdfAscii('q ' + dw.toFixed(1) + ' 0 0 ' + dh.toFixed(1) + ' ' +
      MARGEN.toFixed(1) + ' ' + (y - dh).toFixed(1) + ' cm /ImLogo Do Q\n'));
    xEmp = MARGEN + dw + 14;
  }
  txy(nombreEmp, xEmp, y - 4, 18, true, TINTA);
  txy(tagline, xEmp, y - 26, 10, true, VERDE);
  const rsCuit = [emp.razonSocial, emp.cuit ? 'CUIT ' + emp.cuit : ''].filter(Boolean).join(' · ');
  let yEmp = y - 40;
  if (rsCuit) { txy(rsCuit, xEmp, yEmp, 9, false, MUTED); yEmp -= 13; }
  txy(condFiscalTxt, xEmp, yEmp, 9, true, MARRON); yEmp -= 13;
  const contacto = [emp.telefono, emp.email, emp.domicilio].filter(Boolean).join(' · ');
  if (contacto) { txy(contacto, xEmp, yEmp, 9, false, MUTED); yEmp -= 13; }
  y = Math.min(yEmp, y - altoLogo) - 10;

  // Banda de título (con letra del comprobante: C / B / A)
  if (y < MARGEN + 60) nuevaPagina();
  rectFill(MARGEN, y - 36, CW, 36, VERDE);
  const tituloBanda = doc.letra
    ? 'FACTURA ' + doc.letra + ' Nº ' + (doc.numero || '—')
    : 'PRESUPUESTO Nº ' + (doc.numero || '—');
  txy(tituloBanda, MARGEN + 12, y - 25, 14, true, BLANCO);
  txyR(doc.fecha || '', ANCHO - MARGEN - 12, y - 23, 11, true, BLANCO);
  y -= 48;

  // Cliente / Obra en dos columnas
  if (y < MARGEN + 70) nuevaPagina();
  const cli = doc.cliente || {};
  const colX2 = MARGEN + CW / 2 + 8;
  txy('CLIENTE', MARGEN, y, 9, true, MARRON); txy('OBRA', colX2, y, 9, true, MARRON);
  y -= 15;
  txy(cli.nombre || '—', MARGEN, y, 11, true, TINTA);
  txy(doc.tipoNombre || '—', colX2, y, 11, true, TINTA);
  y -= 15;
  if (cli.campo) { txy(cli.campo, MARGEN, y, 10, false, TINTA); }
  let medTxt = formatoMetrosPDF(doc.metros || 0) + ' lineales';
  if (doc.poligono && doc.hectareas) medTxt += '  ·  ' + doc.hectareas + ' ha';
  txy(medTxt, colX2, y, 10, false, TINTA);
  y -= 14;
  const locTel = [cli.localidad, cli.telefono].filter(Boolean).join(' · ');
  if (locTel) { txy(locTel, MARGEN, y, 10, false, MUTED); y -= 14; }
  espacio(2); regla(MUTED, 1);

  // Materiales
  const dueno = doc.materialesDueno === true;
  tituloSeccion(dueno ? 'Materiales necesarios (provee el dueño)' : 'Materiales e insumos');
  if (dueno) {
    for (const ld of pdfEnvolver('Cantidades informativas: los materiales los provee el dueño y no se incluyen en el total cotizado.', 95))
      linea(ld, MARGEN, 9, false, MUTED);
    espacio(2);
  }
  const items = doc.materiales || [];
  const xCant = MARGEN, xUni = MARGEN + 46, xDesc = MARGEN + 92;
  const xPU = ANCHO - MARGEN - 168, xImp = ANCHO - MARGEN - 84;
  const maxDesc = dueno ? 78 : 40;
  txy('Cant.', xCant, y, 9, true, MUTED);
  txy('Un.', xUni, y, 9, true, MUTED);
  txy('Descripción', xDesc, y, 9, true, MUTED);
  if (!dueno) {
    txy('P. unit.', xPU, y, 9, true, MUTED);
    txy('Importe', xImp, y, 9, true, MUTED);
  }
  y -= 13;
  for (const it of items) {
    const lineasDesc = pdfEnvolver(it.descripcion || 'Ítem', maxDesc);
    if (y - lineasDesc.length * 12 < MARGEN + 20) nuevaPagina();
    const cant = it.cantidad;
    const cantTxt = (Math.round(cant) === cant) ? String(cant) : String(Math.round(cant * 100) / 100);
    txy(cantTxt, xCant, y, 9, false, TINTA);
    txy(it.unidad || '', xUni, y, 9, false, MUTED);
    if (!dueno) {
      txy(it.precioUnit != null ? formatoPesoPDF(it.precioUnit) : 's/p', xPU, y, 9, false, TINTA);
      txy(formatoPesoPDF(it.costo || 0), xImp, y, 9, true, TINTA);
    }
    for (const ld of lineasDesc) { txy(ld, xDesc, y, 9, false, TINTA); y -= 12; }
    y -= 3;
  }
  if (!dueno) {
    espacio(2);
    filaResumen('Subtotal materiales', formatoPesoPDF(doc.totalMateriales || 0), 10, true, TINTA);
  }

  // Mano de obra
  const mo = doc.manoObra || {};
  if ((mo.total || 0) > 0) {
    tituloSeccion('Mano de obra');
    const det = [['Alambrado nuevo', mo.nuevo], ['Desarme y retiro', mo.desarme], ['Tranqueras (instalación)', mo.tranqueras]];
    for (const [et, v] of det) {
      if ((v || 0) > 0) {
        if (y < MARGEN + 20) nuevaPagina();
        txy(et, MARGEN, y, 10, false, TINTA);
        txyR(formatoPesoPDF(v), ANCHO - MARGEN, y, 10, false, TINTA);
        y -= 15;
      }
    }
    filaResumen('Subtotal mano de obra', formatoPesoPDF(mo.total || 0), 10, true, TINTA);
  }

  // Logística
  const lg = doc.logistica || {};
  if ((lg.total || 0) > 0) {
    tituloSeccion('Logística');
    if ((lg.flete || 0) > 0) {
      if (y < MARGEN + 20) nuevaPagina();
      txy('Flete', MARGEN, y, 10, false, TINTA);
      txyR(formatoPesoPDF(lg.flete), ANCHO - MARGEN, y, 10, false, TINTA);
      y -= 15;
    }
    if ((lg.viaticos || 0) > 0) {
      if (y < MARGEN + 20) nuevaPagina();
      txy('Viáticos', MARGEN, y, 10, false, TINTA);
      txyR(formatoPesoPDF(lg.viaticos), ANCHO - MARGEN, y, 10, false, TINTA);
      y -= 15;
    }
    filaResumen('Subtotal logística', formatoPesoPDF(lg.total || 0), 10, true, TINTA);
  }

  // Resumen con IVA discriminado
  espacio(4);
  const iva = doc.iva || { modo: 'sin', porc: 0, monto: 0 };
  const filas = [
    ['Subtotal', formatoPesoPDF(doc.subtotal || 0), 10, false, TINTA]
  ];
  if (doc.contingencia && doc.contingencia.monto > 0)
    filas.push(['Contingencia (' + doc.contingencia.porc + ' %)', formatoPesoPDF(doc.contingencia.monto), 10, false, TINTA]);
  if (doc.margen && doc.margen.monto > 0)
    filas.push(['Margen (' + doc.margen.porc + ' %)', formatoPesoPDF(doc.margen.monto), 10, false, TINTA]);
  if (iva.modo !== 'sin' && iva.monto > 0)
    filas.push(['IVA ' + String(iva.porc).replace('.', ',') + ' % sobre mano de obra', formatoPesoPDF(iva.monto), 10, false, TINTA]);
  const boxH = filas.length * 16 + 44;
  if (y - boxH < MARGEN + 60) nuevaPagina();
  rectFill(MARGEN, y - boxH, CW, boxH, FONDO);
  y -= 20;
  for (const [et, val, tam, neg, c] of filas) filaResumen(et, val, tam, neg, c);
  y -= 2;
  txy('TOTAL', MARGEN + 12, y, 14, true, VERDE);
  txyR(formatoPesoPDF(doc.total || 0), ANCHO - MARGEN - 12, y, 14, true, VERDE);
  y -= 24;
  if (dueno) {
    txy('Materiales no incluidos: los provee el dueño.', MARGEN + 12, y, 9, false, MUTED);
    y -= 13;
  }

  if (doc.faltantes && doc.faltantes.length) {
    espacio(4);
    linea('Atención: hay materiales sin precio cargado (' + doc.faltantes.join(', ') + ').', MARGEN, 10, true, MARRON);
    linea('El total puede estar incompleto: cargá los precios en la pantalla Precios.', MARGEN, 10, false, MUTED);
  }
  if (doc.observaciones) {
    espacio(4);
    linea('Observaciones', MARGEN, 11, true, VERDE);
    for (const ld of pdfEnvolver(doc.observaciones, 92)) linea(ld, MARGEN, 10, false, TINTA);
  }

  // Firmas
  espacio(16);
  if (y < MARGEN + 70) nuevaPagina();
  const yF = y;
  const wF = (CW - 40) / 2;
  cmds.push(pdfAscii('0.6 G 0.8 w ' + MARGEN + ' ' + yF.toFixed(1) + ' m ' + (MARGEN + wF).toFixed(1) + ' ' + yF.toFixed(1) + ' l S 0 G\n'));
  cmds.push(pdfAscii('0.6 G 0.8 w ' + (MARGEN + wF + 40).toFixed(1) + ' ' + yF.toFixed(1) + ' m ' + (ANCHO - MARGEN).toFixed(1) + ' ' + yF.toFixed(1) + ' l S 0 G\n'));
  txy('Prestador — firma y aclaración', MARGEN, yF - 14, 9, false, MUTED);
  txy('Cliente — firma, aclaración y DNI', MARGEN + wF + 40, yF - 14, 9, false, MUTED);
  y = yF - 30;

  // Pie
  espacio(10);
  const pieContacto = [nombreEmp, emp.telefono, emp.email].filter(Boolean).join(' · ');
  linea(pieContacto || nombreEmp, MARGEN, 9, false, MUTED);
  linea('Presupuesto válido ' + (doc.validezDias || 15) + ' días corridos.', MARGEN, 9, false, MUTED);
  if (cmds.length) paginas.push(cmds);

  // ---- Estructura PDF ----
  const nPag = paginas.length;
  const idCatalogo = 1, idPaginas = 2;
  const idFuente1 = 3 + nPag, idFuente2 = 4 + nPag;
  const baseContenido = 5 + nPag;
  const idsContenido = [];
  for (let k = 0; k < nPag; k++) idsContenido.push(baseContenido + k);
  const idImagen = baseContenido + nPag; // solo si hay logo

  for (const b of pdfAscii('%PDF-1.4\n')) bytes.push(b);
  push(pdfAscii(idCatalogo + ' 0 obj\n<< /Type /Catalog /Pages ' + idPaginas + ' 0 R >>\nendobj\n'));
  const kids = [];
  for (let k = 0; k < nPag; k++) kids.push((3 + k) + ' 0 R');
  push(pdfAscii(idPaginas + ' 0 obj\n<< /Type /Pages /Kids [' + kids.join(' ') +
    '] /Count ' + nPag + ' >>\nendobj\n'));
  for (let k = 0; k < nPag; k++) {
    const xobj = logo ? ' /XObject << /ImLogo ' + idImagen + ' 0 R >>' : '';
    push(pdfAscii((3 + k) + ' 0 obj\n<< /Type /Page /Parent ' + idPaginas + ' 0 R ' +
      '/MediaBox [0 0 ' + ANCHO + ' ' + ALTO + '] ' +
      '/Resources << /Font << /F1 ' + idFuente1 + ' 0 R /F2 ' + idFuente2 + ' 0 R >>' + xobj + ' >> ' +
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
  if (logo) {
    push(pdfAscii(idImagen + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + logo.w +
      ' /Height ' + logo.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
      logo.bytes.length + ' >>\nstream\n'));
    for (const b of logo.bytes) bytes.push(b);
    const fin = pdfAscii('\nendstream\nendobj\n');
    for (const b of fin) bytes.push(b);
  }

  const xrefPos = bytes.length;
  const total = (logo ? idImagen : idsContenido[nPag - 1]) + 1;
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

export { generarPresupuestoPDF, jpegDesdeDataUrl, formatoPesoPDF, formatoMetrosPDF };
