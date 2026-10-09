import { TIPOS_ALAMBRADO } from './calc.js';

/* ============================================================
   AppAlambrado Pro — compartir presupuesto por WhatsApp
   ------------------------------------------------------------
   Intento 1: hoja de compartir del sistema con el archivo PDF
   (navigator.share + canShare files) → el usuario elige
   WhatsApp y manda el PDF como documento.
   Intento 2 (fallback): wa.me con un texto plano amigable
   que lleva el resumen discriminado del presupuesto.
   ============================================================ */

function fmtARS(n) {
  return '$ ' + Math.round(parseFloat(n) || 0).toLocaleString('es-AR');
}

function textoWhatsApp(proyecto, resumen) {
  const tipo = (TIPOS_ALAMBRADO[proyecto.tipo] || {}).nombre || proyecto.tipo;
  const L = [];
  L.push('🧱 *PRESUPUESTO DE ALAMBRADO*');
  L.push('AppAlambrado Pro');
  if (resumen.letra) L.push('Comprobante: Factura ' + resumen.letra);
  L.push('');
  L.push('👤 Cliente: ' + (proyecto.cliente || '—'));
  if (proyecto.campo) L.push('🏡 Campo: ' + proyecto.campo);
  L.push('🧵 Tipo: ' + tipo);
  L.push('📏 Metros: ' + (proyecto.medicion.metros || 0) + ' m' +
    (proyecto.medicion.poligono ? ' (' + (proyecto.medicion.hectareas || 0) + ' ha)' : ''));
  L.push('');
  if (resumen.materialesDueno) {
    L.push('🧰 Materiales: los provee el dueño (no cotizados)');
  } else {
    L.push('🧰 Materiales: ' + fmtARS(resumen.totalMateriales));
  }
  L.push('👷 Mano de obra: ' + fmtARS(resumen.manoObra.total));
  L.push('🚚 Logística: ' + fmtARS(resumen.logistica.total));
  L.push('Subtotal: ' + fmtARS(resumen.subtotal));
  if (resumen.contingencia.monto > 0)
    L.push('Contingencia (' + resumen.contingencia.porc + '%): ' + fmtARS(resumen.contingencia.monto));
  if (resumen.margen.monto > 0)
    L.push('Margen (' + resumen.margen.porc + '%): ' + fmtARS(resumen.margen.monto));
  if (resumen.iva && resumen.iva.modo !== 'sin' && resumen.iva.monto > 0)
    L.push('IVA ' + String(resumen.iva.porc).replace('.', ',') + '% s/ mano de obra: ' + fmtARS(resumen.iva.monto));
  L.push('💰 *TOTAL: ' + fmtARS(resumen.total) + '*');
  if (resumen.faltantes && resumen.faltantes.length)
    L.push('_Faltan precios de: ' + resumen.faltantes.join(', ') + '_');
  L.push('');
  L.push('Válido 15 días. ¡Gracias por consultar!');
  return L.join('\n');
}

async function compartirPresupuesto(proyecto, resumen, blobPdf, nombreArchivo) {
  // 1) Hoja de compartir con el PDF (ideal en el celular)
  try {
    if (blobPdf) {
      const archivo = new File([blobPdf],
        nombreArchivo || ('presupuesto_' + (proyecto.cliente || 'alambrado') + '.pdf'),
        { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        await navigator.share({
          files: [archivo],
          title: 'Presupuesto de alambrado',
          text: 'Presupuesto para ' + (proyecto.cliente || '')
        });
        return 'share';
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelado';
  }
  // 2) Fallback: WhatsApp con texto plano
  const texto = textoWhatsApp(proyecto, resumen);
  const url = 'https://wa.me/?text=' + encodeURIComponent(texto);
  window.open(url, '_blank', 'noopener');
  return 'whatsapp-texto';
}

async function descargarPDF(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const Compartir = {
  presupuesto: compartirPresupuesto,
  textoWhatsApp: textoWhatsApp,
  descargarPDF: descargarPDF,
  fmtARS: fmtARS
};

export { textoWhatsApp, compartirPresupuesto, descargarPDF, fmtARS };
