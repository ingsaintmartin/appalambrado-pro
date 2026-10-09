/* Capa Turso (nube opcional) por HTTP fetch directo.
   Base NUEVA 'appalambrado-pro' — nunca la de MolineroApp.
   Config: import.meta.env.VITE_TURSO_URL / VITE_TURSO_TOKEN
   (en Vercel: variables de entorno del proyecto nuevo). */
import { db } from './db.js';

/* La URL puede venir como libsql:// (formato que entrega Turso); el pipeline
   HTTP necesita https:// — se normaliza acá. Sin esto, fetch() tira por el
   esquema inválido, el sync falla siempre y el outbox queda con PEND eterno. */
const URL = (import.meta.env.VITE_TURSO_URL || '').replace(/\/$/, '').replace(/^libsql:\/\//i, 'https://');
const TOKEN = import.meta.env.VITE_TURSO_TOKEN || '';
export const tursoConfigurado = !!(URL && TOKEN);

async function tursoQuery(sql, args = []) {
  const r = await fetch(URL + '/v2/pipeline', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql, args: args.map(a => ({ type: 'text', value: String(a) })) } }, { type: 'close' }] })
  });
  if (!r.ok) throw new Error('Turso HTTP ' + r.status);
  const j = await r.json();
  const res = j.results && j.results[0] && j.results[0].response;
  if (res && res.type === 'error') throw new Error(res.error.message);
  return (res && res.result) || null;
}

const J = (v) => JSON.stringify(v === undefined ? null : v);

/* Sube la cola outbox en orden. Cada op: {tabla, op:'upsert'|'delete', id, datos} */
export async function subirPendientes(onProgress) {
  if (!tursoConfigurado || !navigator.onLine) return 0;
  const ops = await db.outbox.orderBy('seq').toArray();
  let subidos = 0;
  for (const op of ops) {
    try {
      if (op.tabla === 'proyectos' && op.op === 'upsert') {
        const d = op.datos;
        await tursoQuery(
          `INSERT INTO proyectos (id,cliente,campo,telefono,localidad,tipo,params,medicion,mo,log,porc,estado,resumen,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET cliente=excluded.cliente,campo=excluded.campo,telefono=excluded.telefono,localidad=excluded.localidad,tipo=excluded.tipo,params=excluded.params,medicion=excluded.medicion,mo=excluded.mo,log=excluded.log,porc=excluded.porc,estado=excluded.estado,resumen=excluded.resumen,updated_at=excluded.updated_at`,
          [d.id, d.cliente || '', d.campo || '', d.telefono || '', d.localidad || '', d.tipo, J(d.params), J(d.medicion), J(d.mo), J(d.log), J(d.porc), d.estado, J(d.resumen), d.createdAt || Date.now(), Date.now()]);
      } else if (op.tabla === 'precios' && op.op === 'upsert') {
        const d = op.datos;
        await tursoQuery(
          `INSERT INTO precios (id,codigo,descripcion,unidad,precio,categoria,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(codigo) DO UPDATE SET precio=excluded.precio,updated_at=excluded.updated_at`,
          [d.id, d.codigo, d.descripcion || '', d.unidad || '', d.precio || 0, d.categoria || 'material', Date.now(), Date.now()]);
      } else if (op.tabla === 'ejecucion' && op.op === 'upsert') {
        const d = op.datos;
        await tursoQuery(
          `INSERT INTO ejecucion (id,proyecto_id,reales,dias_reales,costo_mano_obra_real,km_reales,precio_km_real,viaticos_reales,otros_costos,observaciones,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(proyecto_id) DO UPDATE SET reales=excluded.reales,dias_reales=excluded.dias_reales,costo_mano_obra_real=excluded.costo_mano_obra_real,km_reales=excluded.km_reales,precio_km_real=excluded.precio_km_real,viaticos_reales=excluded.viaticos_reales,otros_costos=excluded.otros_costos,observaciones=excluded.observaciones,updated_at=excluded.updated_at`,
          [d.id, d.proyectoId, J(d.reales), d.diasReales || null, d.costoManoObraReal || 0, d.kmReales || 0, d.precioKmReal || 0, d.viaticosReales || 0, J(d.otrosCostos), d.observaciones || '', Date.now(), Date.now()]);
      } else if (op.tabla === 'clientes' && op.op === 'upsert') {
        const d = op.datos;
        await tursoQuery(
          `INSERT INTO clientes (id,razon_social,titular,cuit,telefono,email,domicilio_fiscal,establecimientos,obras_realizadas,saldo_cuenta_corriente,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET razon_social=excluded.razon_social,titular=excluded.titular,cuit=excluded.cuit,telefono=excluded.telefono,email=excluded.email,domicilio_fiscal=excluded.domicilio_fiscal,establecimientos=excluded.establecimientos,obras_realizadas=excluded.obras_realizadas,saldo_cuenta_corriente=excluded.saldo_cuenta_corriente,updated_at=excluded.updated_at`,
          [d.id, d.razonSocial || '', d.titular || '', d.cuit || '', d.telefono || '', d.email || '', d.domicilioFiscal || '', J(d.establecimientos || []), J(d.obrasRealizadas || []), d.saldoCuentaCorriente || 0, d.createdAt || Date.now(), Date.now()]);
      } else if (op.tabla === 'clientes' && op.op === 'delete') {
        await tursoQuery(`DELETE FROM clientes WHERE id = ?`, [op.id]);
      }
      await db.outbox.delete(op.seq);
      subidos++;
      if (onProgress) onProgress(subidos, ops.length);
    } catch (e) {
      break; // se reintenta en la próxima pasada, en orden
    }
  }
  return subidos;
}

export function iniciarSyncAutomatica(onSync) {
  const intentar = () => subirPendientes().then(n => { if (n > 0 && onSync) onSync(n); }).catch(() => {});
  window.addEventListener('online', intentar);
  const id = setInterval(intentar, 30000);
  intentar();
  return () => { window.removeEventListener('online', intentar); clearInterval(id); };
}
