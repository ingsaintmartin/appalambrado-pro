/* EsquemaPlanta — vista en planta reactiva de la línea.
   Dibuja desde el replanteo real: esquineros en extremos, atadores,
   intermedios y tranqueras ubicadas por distancia. Todo en vivo. */
import React from 'react';

const W = 660, H = 168;
const X0 = 56, X1 = 604;
const LINE_Y = 84;

export default function EsquemaPlanta({ metros, replanteo, tranquerasDetalle, poligono }) {
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
  const trq = Array.isArray(tranquerasDetalle) ? tranquerasDetalle : [];

  // posiciones de intermedios dentro de cada tramo
  const posInter = [];
  if (rp && rp.tramos) {
    rp.tramos.forEach((t) => {
      for (let i = 1; i <= t.intermedios; i++) posInter.push(t.desde + t.claroReal * i);
    });
  }
  const posAtadores = rp ? rp.posAtadores.filter((p) => p > 0.01 && p < L - 0.01) : [];

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} className="w-full h-auto" role="img" aria-label="Esquema en planta de la línea">
      <rect x="0" y="0" width={W} height={H} fill="#fbfaf7" rx="6" />
      <text x="16" y="24" fontSize="13" fontWeight="800" fill="#1b4332">VISTA EN PLANTA · {L.toLocaleString('es-AR', { maximumFractionDigits: 0 })} m</text>

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
        <g key={'a' + i}>
          <line x1={xDe(p)} y1={LINE_Y - 22} x2={xDe(p)} y2={LINE_Y + 22} stroke="#7f4f24" strokeWidth="4" />
          <text x={xDe(p)} y={LINE_Y - 28} textAnchor="middle" fontSize="9" fill="#7f4f24" fontWeight="700">{Math.round(p)}</text>
        </g>
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
        return (
          <g key={'t' + i}>
            <rect x={x - 11} y={LINE_Y - 34} width="22" height="14" fill={esTron ? '#b45309' : '#d97706'} stroke="#582f0e" strokeWidth="1.5" rx="2" />
            <line x1={x} y1={LINE_Y - 20} x2={x} y2={LINE_Y - 9} stroke="#582f0e" strokeWidth="1.5" strokeDasharray="2 2" />
            <text x={x} y={LINE_Y - 40} textAnchor="middle" fontSize="9.5" fontWeight="800" fill={esTron ? '#b45309' : '#92610f'}>
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
