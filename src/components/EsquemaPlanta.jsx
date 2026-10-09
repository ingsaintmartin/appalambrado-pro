/* EsquemaPlanta — vista en planta reactiva de la línea.
   Dibuja desde el replanteo exacto (si está activo) o desde el resumen
   calculado (modo clásico): esquineros, atadores, intermedios, zonas de
   varillado y tranqueras ubicadas por distancia, con etiquetas de distancia
   por tramo. Todo en vivo: dibujo = cómputo.
   - Cada tranquera/tranquerón se dibuja como un HUECO A ESCALA según su
     ancho real (m), con sus 2 postes y la hoja; la línea base se interrumpe.
   - Anti-colisiones: etiquetas de tramo en una sola fila (se saltean si el
     tramo es angosto); etiquetas de tranquera escalonadas; posiciones de
     atadores con distancia mínima. */
import React from 'react';
import { normalizarTranquera, textoAnchoTranquera } from '../lib/calc.js';

const W = 660, H = 240;
const X0 = 56, X1 = 604;
const LINE_Y = 108;

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
  const trq = (Array.isArray(tranquerasDetalle) ? tranquerasDetalle : []).map(normalizarTranquera);

  // ---- huecos de tranquera a escala real ----
  const gaps = trq.map((t) => {
    const mitad = t.anchoM / 2;
    let gx0 = xDe(t.pos - mitad), gx1 = xDe(t.pos + mitad);
    // Ancho mínimo en px para que se vea aun en líneas largas.
    const MINPX = 16;
    if (gx1 - gx0 < MINPX) { const c = (gx0 + gx1) / 2; gx0 = c - MINPX / 2; gx1 = c + MINPX / 2; }
    gx0 = Math.max(X0, gx0); gx1 = Math.min(X1, gx1);
    return { ...t, gx0, gx1 };
  }).sort((a, b) => a.pos - b.pos);
  const dentroDeHueco = (m) => gaps.some((g) => {
    const m0 = g.pos - g.anchoM / 2, m1 = g.pos + g.anchoM / 2;
    return m > m0 + 0.05 && m < m1 - 0.05;
  });

  // ---- segmentos de línea base (se interrumpe en cada hueco) ----
  const segmentos = [];
  let cur = X0;
  gaps.forEach((g) => {
    if (g.gx0 > cur + 1) segmentos.push([cur, g.gx0]);
    cur = Math.max(cur, g.gx1);
  });
  if (cur < X1 - 1) segmentos.push([cur, X1]);

  // ---- posiciones de postes ----
  let posAtadores = [];
  let posInter = [];
  let tramos = [];
  if (rp && rp.posAtadores) {
    posAtadores = rp.posAtadores.filter((p) => p > 0.01 && p < L - 0.01);
    if (rp.tramos) {
      rp.tramos.forEach((t) => {
        for (let i = 1; i <= t.intermedios; i++) posInter.push(t.desde + t.claroReal * i);
        tramos.push({ desde: t.desde, hasta: t.desde + t.claroReal * (t.intermedios + 1) });
      });
    }
  } else {
    const nAt = Math.max(0, Math.round(r.atadores) || 0);
    const nInt = Math.max(0, Math.round(r.intermedios) || 0);
    for (let i = 1; i <= nAt; i++) posAtadores.push((L * i) / (nAt + 1));
    for (let i = 1; i <= nInt; i++) posInter.push((L * i) / (nInt + 1));
    const mayores = [0, ...posAtadores, L].sort((a, b) => a - b);
    for (let i = 0; i < mayores.length - 1; i++) tramos.push({ desde: mayores[i], hasta: mayores[i + 1] });
  }
  // Los intermedios no se plantan dentro del hueco de una tranquera.
  posInter = posInter.filter((p) => !dentroDeHueco(p));

  // ---- etiquetas de tramo: una sola fila, se saltean si angostas ----
  const etiqTramos = [];
  let ultimoXT = -1e9;
  tramos.forEach((t) => {
    const xA = xDe(t.desde), xB = xDe(t.hasta);
    if (xB - xA < 30) return;
    const x = (xA + xB) / 2;
    if (x - ultimoXT < 34) return;
    ultimoXT = x;
    const largo = t.hasta - t.desde;
    etiqTramos.push({
      x,
      txt: largo >= 10 ? Math.round(largo) + ' m' : largo.toFixed(1).replace('.', ',') + ' m'
    });
  });

  // ---- etiquetas de atadores (posición), con distancia mínima ----
  // Se saltean si están muy juntos entre sí o pegados a una tranquera.
  const etiqAtadores = [];
  let ultimoX = -1e9;
  posAtadores.forEach((p) => {
    const x = xDe(p);
    if (x - ultimoX < 30) return;
    if (gaps.some((g) => Math.abs(x - (g.gx0 + g.gx1) / 2) < 44)) return;
    ultimoX = x;
    etiqAtadores.push({ x, txt: Math.round(p) + '' });
  });

  // ---- etiquetas de tranqueras: escalonadas arriba/abajo ----
  const etiqTrq = [];
  let ultimoXG = -1e9, nivelG = 0;
  gaps.forEach((g) => {
    const x = (g.gx0 + g.gx1) / 2;
    if (x - ultimoXG < 52) nivelG = 1 - nivelG; // se enciman: alterna nivel
    else nivelG = 0;
    ultimoXG = x;
    const ancla = x > X1 - 46 ? 'end' : x < X0 + 46 ? 'start' : 'middle';
    etiqTrq.push({
      x: ancla === 'middle' ? x : ancla === 'end' ? x - 2 : x + 2,
      y: nivelG === 0 ? LINE_Y - 40 : LINE_Y - 64,
      ancla,
      txt: (g.tipo === 'tranqueron' ? 'TRANQUERÓN ' : 'TRANQUERA ') + textoAnchoTranquera(g.anchoM),
      sub: Math.round(g.pos) + ' m'
    });
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

      {/* línea base por segmentos (huecos en tranqueras) */}
      {segmentos.map((s, i) => (
        <line key={'s' + i} x1={s[0]} y1={LINE_Y} x2={s[1]} y2={LINE_Y} stroke="#1b4332" strokeWidth="3" />
      ))}
      <text x={X0} y={LINE_Y + 24} textAnchor="middle" fontSize="11" fill="#6b7280">0 m</text>
      <text x={X1} y={LINE_Y + 24} textAnchor="middle" fontSize="11" fill="#6b7280">{Math.round(L)} m</text>

      {/* intermedios */}
      {posInter.map((p, i) => (
        <line key={'i' + i} x1={xDe(p)} y1={LINE_Y - 10} x2={xDe(p)} y2={LINE_Y + 10} stroke="#40916c" strokeWidth="2.5" />
      ))}

      {/* atadores */}
      {posAtadores.map((p, i) => (
        <line key={'a' + i} x1={xDe(p)} y1={LINE_Y - 20} x2={xDe(p)} y2={LINE_Y + 20} stroke="#7f4f24" strokeWidth="4" />
      ))}
      {etiqAtadores.map((e, i) => (
        <text key={'ea' + i} x={e.x} y={LINE_Y - 26} textAnchor="middle" fontSize="9" fill="#7f4f24" fontWeight="700">{e.txt}</text>
      ))}

      {/* etiquetas de distancia por tramo (una fila) */}
      {etiqTramos.map((e, i) => (
        <text key={'et' + i} x={e.x} y={LINE_Y + 44} textAnchor="middle" fontSize="10" fill="#1b4332" fontWeight="600">{e.txt}</text>
      ))}

      {/* esquineros en extremos */}
      {[X0, X1].map((x, i) => (
        <g key={'e' + i}>
          <rect x={x - 9} y={LINE_Y - 9} width="18" height="18" fill="#1b4332" stroke="#0f172a" strokeWidth="1.5" rx="2" />
          <text x={x} y={LINE_Y - 15} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#1b4332">ESQ</text>
        </g>
      ))}

      {/* tranqueras: hueco a escala + postes + hoja */}
      {gaps.map((g, i) => {
        const esTron = g.tipo === 'tranqueron';
        const col = esTron ? '#b45309' : '#d97706';
        const et = etiqTrq[i];
        return (
          <g key={'t' + i}>
            {/* hoja */}
            <rect x={g.gx0} y={LINE_Y - 13} width={Math.max(2, g.gx1 - g.gx0)} height="9"
              fill={col} opacity="0.85" stroke="#582f0e" strokeWidth="1.5" rx="2" />
            {esTron && (
              <line x1={(g.gx0 + g.gx1) / 2} y1={LINE_Y - 13} x2={(g.gx0 + g.gx1) / 2} y2={LINE_Y - 4} stroke="#582f0e" strokeWidth="1.5" />
            )}
            {/* 2 postes tipo esquinero */}
            {[g.gx0, g.gx1].map((x, j) => (
              <rect key={'p' + j} x={x - 3.5} y={LINE_Y - 11} width="7" height="22" fill="#1b4332" stroke="#0f172a" strokeWidth="1" rx="1.5" />
            ))}
            {/* etiqueta */}
            <line x1={et.x} y1={et.y + 14} x2={(g.gx0 + g.gx1) / 2} y2={LINE_Y - 16} stroke={col} strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
            <text x={et.x} y={et.y} textAnchor={et.ancla} fontSize="9.5" fontWeight="800" fill={col}>{et.txt}</text>
            <text x={et.x} y={et.y + 11} textAnchor={et.ancla} fontSize="8.5" fill="#6b7280">{et.sub}</text>
          </g>
        );
      })}

      {/* leyenda */}
      <g fontSize="10" fill="#6b7280">
        <rect x="40" y={H - 26} width="12" height="12" fill="#1b4332" rx="2" /><text x="56" y={H - 16}>Esquinero</text>
        <line x1="136" y1={H - 20} x2="136" y2={H - 8} stroke="#7f4f24" strokeWidth="4" /><text x="144" y={H - 16}>Atador 2.60m</text>
        <line x1="238" y1={H - 20} x2="238" y2={H - 8} stroke="#40916c" strokeWidth="2.5" /><text x="246" y={H - 16}>Intermedio</text>
        <rect x="330" y={H - 25} width="18" height="9" fill="#d97706" stroke="#582f0e" rx="2" /><text x="352" y={H - 16}>Tranquera (hueco a escala)</text>
      </g>
    </svg>
  );
}
