# AppAlambrado Pro (PWA real)

PWA para presupuesto y control de costos de alambrados rurales.
Stack: React + Vite + Tailwind CSS + Zustand + Leaflet + Dexie.

## Estado
- `npm run build` compila sin errores; PWA con service worker generado.
- Tests de lógica: `npm test` → 48/48 OK (Haversine, materiales, cotizador, KPIs, PDF).
- App 100% separada de MolineroApp / Heno_360 / AgroControl.

## Puesta en marcha (para Zurdo)

1. **GitHub**: crear el repo `appalambrado-pro` y subir este directorio
   (un solo push con todo para no quemar deploys de Vercel).
2. **Vercel**: importar el repo como proyecto **nuevo** `appalambrado-pro`
   (no reutilizar el de molineros). El build es automático (`npm run build`).
3. **Turso**: crear una base **nueva** (NO la de molineros):
   ```
   turso db create appalambrado-pro
   turso db shell appalambrado-pro < turso-schema.sql
   ```
   Generar un token y setear en Vercel:
   - `VITE_TURSO_URL`
   - `VITE_TURSO_TOKEN`
4. Probar en modo avión: la app anda offline tras la primera carga.

## Estructura
- `src/lib/calc.js` — núcleo puro (geometría, materiales, cotizador, KPIs)
- `src/hooks/` — useGisCalc, useFenceMaterials, useCostEngine, useAuditVariance
- `src/components/` — Module1 (GIS), Module2 (materiales), Module3 (costos), Module4 (ejecución)
- `src/store.js` — estado global Zustand (persistido en localStorage)
- Diseño: sistema "Agro-Industrial Precision" (ver SPEC.md)
