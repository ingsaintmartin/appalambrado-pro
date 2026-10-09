/* Perfil de empresa (contratista) — fila única id='empresa' en Dexie.
   Marca creativa POR DEFECTO: "EL ATADOR · Alambrados Rurales" con el
   logo de public/logo-el-atador.png. El usuario puede cambiar nombre,
   datos y logo por los suyos desde la pantalla Empresa.
   El logo se guarda como dataURL JPEG (máx 512 px) para que el PDF
   pueda incrustarlo directo (DCTDecode) sin dependencias. */
import { db } from './db.js';
import { LOGO_DEFAULT_DATAURL } from './logoDefault.js';

export const LOGO_DEFAULT_PNG = '/logo-el-atador.png';

export const EMPRESA_DEFAULT = {
  id: 'empresa',
  nombreFantasia: 'EL ATADOR',
  tagline: 'Alambrados Rurales',
  razonSocial: '',
  cuit: '',
  telefono: '',
  email: '',
  domicilio: '',
  // Condición fiscal: 'monotributo' (default) | 'ri' (Responsable Inscripto).
  // Monotributista → Factura C (sin IVA discriminado).
  // RI → Factura B (sin IVA) o Factura A (IVA 10,5/21 % en mano de obra).
  condicionFiscal: 'monotributo',
  logoDataUrl: '' // 'data:image/jpeg;base64,...'
};

/* Convierte una imagen (File/Blob o URL) a dataURL JPEG escalada.
   Siempre devuelve JPEG: el PDF lo incrusta sin decodificar. */
export function imagenAJpegDataUrl(fuente, maxDim = 512) {
  return new Promise((resolve, reject) => {
    const url = typeof fuente === 'string' ? fuente : URL.createObjectURL(fuente);
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * k));
        const h = Math.max(1, Math.round(img.height * k));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        if (typeof fuente !== 'string') URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.85));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = url;
  });
}

async function logoDefaultDataUrl() {
  // 1) El PNG en alta (si el deploy lo trae).
  try {
    const r = await fetch(LOGO_DEFAULT_PNG, { cache: 'force-cache' });
    if (r.ok) {
      const blob = await r.blob();
      return await imagenAJpegDataUrl(blob, 512);
    }
  } catch (e) { /* sigue al fallback */ }
  // 2) Fallback embebido (el conector GitHub no sube binarios).
  return LOGO_DEFAULT_DATAURL;
}

export async function cargarEmpresa() {
  try {
    const reg = await db.empresa.get('empresa');
    if (reg) return { ...EMPRESA_DEFAULT, ...reg };
  } catch (e) { /* Dexie aún no migró: se siembra abajo */ }
  const semilla = { ...EMPRESA_DEFAULT, logoDataUrl: await logoDefaultDataUrl() };
  try { await db.empresa.put(semilla); } catch (e) { /* offline-first: sigue en memoria */ }
  return semilla;
}

export async function guardarEmpresa(patch) {
  const actual = await cargarEmpresa();
  const reg = { ...actual, ...patch, id: 'empresa' };
  try { await db.empresa.put(reg); } catch (e) { /* sigue en memoria */ }
  return reg;
}

/* Vuelve a la marca original EL ATADOR (nombre + logo). */
export async function restablecerEmpresa() {
  const semilla = { ...EMPRESA_DEFAULT, logoDataUrl: await logoDefaultDataUrl() };
  try { await db.empresa.put(semilla); } catch (e) { /* sigue en memoria */ }
  return semilla;
}
