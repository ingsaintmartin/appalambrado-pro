/* Persistencia de clientes: Dexie (local) + outbox → Turso (nube).
   Modelo Client portado del export AIStudio; establecimientos y
   obrasRealizadas viajan como JSON TEXT (patrón del esquema). */
import { db, genId, encolar } from './db.js';
import { subirPendientes } from './turso.js';

export async function listarClientes() {
  try {
    const arr = await db.clientes.toArray();
    return arr.sort((a, b) => String(a.razonSocial || '').localeCompare(String(b.razonSocial || ''), 'es'));
  } catch (e) { return []; }
}

export async function guardarCliente(c) {
  const ahora = Date.now();
  const reg = {
    id: c.id || genId('cli'),
    razonSocial: c.razonSocial || '',
    titular: c.titular || '',
    cuit: c.cuit || '',
    telefono: c.telefono || '',
    email: c.email || '',
    domicilioFiscal: c.domicilioFiscal || '',
    establecimientos: Array.isArray(c.establecimientos) ? c.establecimientos : [],
    obrasRealizadas: Array.isArray(c.obrasRealizadas) ? c.obrasRealizadas : [],
    saldoCuentaCorriente: parseFloat(c.saldoCuentaCorriente) || 0,
    createdAt: c.createdAt || ahora,
    updatedAt: ahora
  };
  await db.clientes.put(reg);
  await encolar({ tabla: 'clientes', op: 'upsert', id: reg.id, datos: reg }, subirPendientes);
  return reg;
}

export async function eliminarCliente(id) {
  await db.clientes.delete(id);
  await encolar({ tabla: 'clientes', op: 'delete', id }, subirPendientes);
}
