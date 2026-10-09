/* Base local Dexie (IndexedDB) + outbox offline-first.
   OJO Dexie: where() sobre propiedades NO indexadas tira SchemaError
   → usar .filter() en memoria. */
import Dexie from 'dexie';

export const db = new Dexie('AppAlambradoDB');

db.version(1).stores({
  proyectos:      'id, estado, updatedAt',
  precios:        'id, codigo',
  ejecucion:      'id, proyectoId',
  outbox:         '++seq, createdAt'
});

/* v2: tabla clientes (gestor de clientes).
   establecimientos y obrasRealizadas van como JSON TEXT,
   igual que los demás campos compuestos del esquema. */
db.version(2).stores({
  proyectos:      'id, estado, updatedAt',
  precios:        'id, codigo',
  ejecucion:      'id, proyectoId',
  clientes:       'id, cuit, updatedAt',
  outbox:         '++seq, createdAt'
});

export function genId(prefix) {
  const u = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  return prefix + '_' + u;
}

export async function encolar(op, subirPendientes) {
  await db.outbox.add({ ...op, createdAt: Date.now() });
  try { if (subirPendientes) subirPendientes(); } catch (e) { /* offline */ }
}

export async function contarPendientes() {
  try { return await db.outbox.count(); } catch (e) { return 0; }
}
