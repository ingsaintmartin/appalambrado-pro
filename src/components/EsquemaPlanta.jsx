/* EsquemaPlanta — vista en planta reactiva de la línea.
   Dibuja desde el replanteo exacto (si está activo) o desde el resumen
   calculado (modo clásico): esquineros, atadores, intermedios, zonas de
   varillado y tranqueras ubicadas por distancia, con etiquetas de distancia
   por tramo. Todo en vivo: dibujo = cómputo.
   Anti-colisiones: las etiquetas se escalonan (arriba/abajo) y se saltean
   cuando los tramos son angostos en píxeles. */
import React from 'react';

const W = 660, H = 196;
const X0 = 56, X1 = 604;
const LINE_Y = 96;

export default function EsquemaPlanta({ metros, replanteo, tranquerasDetalle, poligono, resumen, sepVarillas }) {
  if (poligono) {
    return (
      <div className="mono text-[13px] text-muted p-4 text-center">
        Vista en planta por tramo: disponible en líneas (no en polígonos cerrados).
      </div>
    );
  }
  const L = Math.max(1, parseFloat(metros) || 0);
  const xDe = (m) => X0 + ((X1 - X0) * Math.min(L, Math.max(0, m))) / L;
  const rp = replanteo || null;
  const r = resumen || {};
  const trq = Array.isArray(tranquerasDetalle) ? tranquerasDetalle : [];

  // ---- posiciones de postes ----
  let posAtadores = [];
  let posInter = [];
  let tramos = []; // [{desde, hasta}] para etiquetas de distancia
  if (rp && rp.posAtadores) {
    // Replanteo exacto: posiciones reales.
    posAtadores = rp.posAtadores.filter((p) => p > 0.01 && p < L - 0.01);
    if (rp.tramos) {
      rp.tramos.forEach((t) => {
        for (let i = 1; i <= t.intermedios; i++) posInter.push(t.desde + t.claroReal * i);
        tramos.push({ desde: t.desde, hasta: t.desde + t.claroReal * (t.intermedios + 1) });
      });
    }
  } else {
    // Modo clásico: posiciones parejas derivadas del resumen (esquemático).
    const nAt = Math.max(0, Math.round(r.atadores) || 0);
    const nInt = Math.max(0, Math.round(r.intermedios) || 0);
    for (let i = 1; i <= nAt; i++) posAtadores.push((L * i) / (nAt + 1));
    for (let i = 1; i <= nInt; i++) posInter.push((L * i) / (nInt + 1));
    // Tramos = segmentos entre postes mayores (esquineros + atadores).
    const mayores = [0, ...posAtadores, L].sort((a, b) => a - b);
    for (let i = 0; i < mayores.length - 1; i++) tramos.push({ desde: mayores[i], hasta: mayores[i + 1] });
  }

  // ---- etiquetas de tramo (distancia), con anti-colisión ----
  // Se muestra la etiqueta si el tramo mide ≥ 26 px; se alterna arriba/abajo.
  const etiqTramos = [];
  tramos.forEach((t, i) => {
    const xA = xDe(t.desde), xB = xDe(t.hasta);
    const ancho = xB - xA;
    if (ancho < 26) return;
    const largo = t.hasta - t.desde;
    const arriba = i % 2 === 0;
    etiqTramos.push({
      x: (xA + xB) / 2,
      y: arriba ? LINE_Y + 52 : LINE_Y + 66,
      txt: largo >= 10 ? Math.round(largo) + ' m' : largo.toFixed(1).replace('.', ',') + ' m'
    });
  });

  // ---- etiquetas de atadores (posición), con anti-colisión ----
  const etiqAtadores = [];
  let ultimoX = -1e9;
  posAtadores.forEach((p) => {
    const x = xDe(p);
    if (x - ultimoX < 30) return; // saltea si está muy junto al anterior
    ultimoX = x;
    etiqAtadores.push({ x, txt: Math.round(p) + '' });
  });

  const fmtL = L.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const sepV = sepVarillas ? String(Number(sepVarillas).toFixed(1)).replace('.', ',') + ' m' : null;

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} className="w-full h-auto" role="img" aria-label="Esquema en planta de la línea">
      <rect x="0" y="0" width={W} height={H} fill="#fbfaf7" rx="6" />
      <text x="16" y="24" fontSize="13" fontWeight="800" fill="#1b4332">VISTA EN PLANTA · {fmtL} m</text>
      {sepV && (
        <text x={W - 16} y="24" textAnchor="end" fontSize="11" fill="#40916c" fontWeight="700">varillado c/ {sepV}</text>
      )}

      {/* zona de varillado (sombreado sutil) */}
      <rect x={X0} y={LINE_Y - 12} width={X1 - X0} height="24" fill="#40916c" opacity="0.07" />

      {/* línea base */}
      <line x1={X0} y1={LINE_Y} x2={X1} y2={LINE_Y} stroke="#1b4332" strokeWidth="3" />
      <text x={X0} y={LINE_Y + 34} textAnchor="middle" fontSize="11" fill="#6b7280">0 m</text>
      <text x={X1} y={LINE_Y + 34} textAnchor="middle" fontSize="11" fill="#6b7280">{Math.round(L)} m</text>

      {/* intermedios */}
      {posInter.map((p, i) => (
        <line key={'i' + i} x1={xDe(p)} y1={LINE_Y - 10} x2={xDe(p)} y2={LINE_Y + 10} stroke="#40916c" strokeWidth="2.5" />
      ))}

      {/* atadores */}
      {posAtadores.map((p, i) => (
        <line key={'a' + i} x1={xDe(p)} y1={LINE_Y - 22} x2={xDe(p)} y2={LINE_Y + 22} stroke="#7f4f24" strokeWidth="4" />
      ))}
      {etiqAtadores.map((e, i) => (
        <text key={'ea' + i} x={e.x} y={LINE_Y - 28} textAnchor="middle" fontSize="9" fill="#7f4f24" fontWeight="700">{e.txt}</text>
      ))}

      {/* etiquetas de distancia por tramo (escalonadas) */}
      {etiqTramos.map((e, i) => (
        <text key={'et' + i} x={e.x} y={e.y} textAnchor="middle" fontSize="9.5" fill="#1b4332" fontWeight="600">{e.txt}</text>
      ))}

      {/* esquineros en extremos */}
      {[X0, X1].map((x, i) => (
        <g key={'e' + i}>
          <rect x={x - 9} y={LINE_Y - 9} width="18" height="18" fill="#1b4332" stroke="#0f172a" strokeWidth="1.5" />
          <text x={x} y={LINE_Y - 16} textAnchor="middle" fontSize="9" fontWeight="800" fill="#1b4332">ESQ</text>
        </g>
      ))}

      {/* tranqueras ubicadas */}
      {trq.map((t, i) => {
        const x = xDe(parseFloat(t.pos) || 0);
        const esTron = t.tipo === 'tranqueron';
        // La etiqueta se corre a la derecha si está muy pegada al borde.
        const ancla = x > X1 - 40 ? 'end' : 'middle';
        const tx = x > X1 - 40 ? x - 4 : x;
        return (
          <g key={'t' + i}>
            <rect x={x - 11} y={LINE_Y - 34} width="22" height="14" fill={esTron ? '#b45309' : '#d97706'} stroke="#582f0e" strokeWidth="1.5" rx="2" />
            <line x1={x} y1={LINE_Y - 20} x2={x} y2={LINE_Y - 9} stroke="#582f0e" strokeWidth="1.5" strokeDasharray="2 2" />
            <text x={tx} y={LINE_Y - 40} textAnchor={ancla} fontSize="9.5" fontWeight="800" fill={esTron ? '#b45309' : '#92610f'}>
              {esTron ? 'TRQ' : 'T'} {Math.round(parseFloat(t.pos) || 0)}m
            </text>
          </g>
        );
      })}

      {/* leyenda */}
      <g fontSize="10" fill="#6b7280">
        <rect x="40" y={H - 24} width="12" height="12" fill="#1b4332" /><text x="56" y={H - 14}>Esquinero</text>
        <line x1="130" y1={H - 18} x2="130" y2={H - 6} stroke="#7f4f24" strokeWidth="4" /><text x="138" y={H - 14}>Atador 2.60m</text>
        <line x1="232" y1={H - 18} x2="232" y2={H - 6} stroke="#40916c" strokeWidth="2.5" /><text x="240" y={H - 14}>Intermedio</text>
        <rect x="322" y={H - 24} width="16" height="10" fill="#d97706" stroke="#582f0e" /><text x="342" y={H - 14}>Tranquera</text>
        <rect x="424" y={H - 24} width="16" height="10" fill="#b45309" stroke="#582f0e" /><text x="444" y={H - 14}>Tranquerón</text>
      </g>
    </svg>
  );
}
