/* Formato es-AR */
export const fmtARS = (n) => '$ ' + Math.round(parseFloat(n) || 0).toLocaleString('es-AR');
export const fmtARS2 = (n) => '$ ' + (Math.round((parseFloat(n) || 0) * 100) / 100).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const fmtM = (n) => Math.round(parseFloat(n) || 0).toLocaleString('es-AR') + ' m';
export const fmtNum = (n) => Math.round(parseFloat(n) || 0).toLocaleString('es-AR');
export const fmtHa = (n) => (Math.round((parseFloat(n) || 0) * 10) / 10).toLocaleString('es-AR') + ' ha';
export const fmtPct = (n, d = 1) => (parseFloat(n) || 0).toFixed(d).replace('.', ',') + ' %';
export const fmtCoord = (n) => (parseFloat(n) || 0).toFixed(5) + '°';
export const fmtFecha = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch (e) { return ''; }
};
