/* CorteReactivo — corte longitudinal del cerramiento 100% REACTIVO.
   Se renderiza desde los parámetros reales (hilos con alturas, palo,
   distancia entre palos, varillado) y se actualiza en vivo al cambiarlos.
   Props: esquema = { palo:{altoCm,etiqueta}, hilos:[{alturaCm,tipo,etiqueta}],
           distPalosM, varillas:{modo,n,espaciamientoCm,ok,mensaje} } */
import React from 'react';

const COLOR_HILO = { pua: '#b45309', liso: '#2d6a4f', electro: '#2563eb' };
const ETIQ_CORTO = { pua: 'PÚA', liso: 'LISO', electro: 'ELEC' };

const W = 660, H = 392;
const SUELO_Y = 308;
const POSTE_X0 = 84, POSTE_X1 = 576, POSTE_W = 18;
const POSTE_PX = 228; // alto en px del palo dibujado

export default function CorteReactivo({ esquema }) {
  if (!esquema) return null;
  const { palo, hilos, distPalosM, varillas } = esquema;
  const pxPorCm = POSTE_PX / Math.max(60, palo.altoCm);
  const yDe = (cm) => SUELO_Y - cm * pxPorCm;
  const topeY = yDe(Math.max(...hilos.map((h) => h.alturaCm), 0));

  const nVar = varillas.modo === 'n' ? varillas.n : varillas.modo === 'central' ? 1 : 0;
  const posVarillas = [];
  for (let i = 1; i <= nVar; i++) posVarillas.push(POSTE_X0 + POSTE_W + ((POSTE_X1 - POSTE_X0 - POSTE_W) * i) / (nVar + 1));
  const esVarillon = varillas.modo === 'central';

  const distTxt = distPalosM.toFixed(2).replace('.', ',').replace(/,00$/, '') + ' m';
  const mostrarEtiq = hilos.length <= 7;

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} className="w-full h-auto" role="img" aria-label="Corte longitudinal reactivo del alambrado">
      <rect x="0" y="0" width={W} height={H} fill="#fbfaf7" rx="6" />

      {/* título */}
      <text x="16" y="24" fontSize="13" fontWeight="800" fill="#1b4332">CORTE LONGITUDINAL · {palo.etiqueta.toUpperCase()}</text>
      <text x="16" y="42" fontSize="11" fill="#6b7280">
        {hilos.length} hilos ({hilos.filter((h) => h.tipo === 'pua').length} púas) · {nVar === 0 ? 'sin varillas' : nVar === 1 && esVarillon ? 'varillón central' : nVar + ' varillas'}
      </text>

      {/* suelo */}
      <line x1="40" y1={SUELO_Y} x2={W - 24} y2={SUELO_Y} stroke="#94a3b8" strokeWidth="2" />
      {Array.from({ length: 24 }, (_, i) => 48 + i * 24).map((x) => (
        <line key={x} x1={x} y1={SUELO_Y} x2={x - 8} y2={SUELO_Y + 10} stroke="#94a3b8" strokeWidth="1.5" />
      ))}
      <text x="44" y={SUELO_Y + 26} fontSize="10" fill="#6b7280">COTA DE SUELO</text>

      {/* varillas / varillón (detrás de los hilos) */}
      {posVarillas.map((x, i) => (
        <g key={i}>
          <rect x={x - (esVarillon ? 6 : 3.5)} y={topeY} width={esVarillon ? 12 : 7} height={SUELO_Y - topeY}
            fill={esVarillon ? '#d9a441' : '#e9b44c'} stroke="#8a6d1c" strokeWidth="1.5" />
          {(esVarillon || nVar <= 6) && (
            <text x={x} y={topeY - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="#8a6d1c">
              {esVarillon ? 'VARILLÓN' : 'V' + (i + 1)}
            </text>
          )}
        </g>
      ))}

      {/* postes */}
      {[POSTE_X0, POSTE_X1].map((x, i) => (
        <g key={i}>
          <rect x={x} y={SUELO_Y - POSTE_PX} width={POSTE_W} height={POSTE_PX} fill="#7f4f24" stroke="#582f0e" strokeWidth="2" />
          <line x1={x + POSTE_W / 2} y1={SUELO_Y - POSTE_PX + 8} x2={x + POSTE_W / 2} y2={SUELO_Y - 8} stroke="#582f0e" strokeWidth="1" opacity="0.5" />
          <text x={x + POSTE_W / 2} y={SUELO_Y - POSTE_PX - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="#582f0e">
            {(palo.altoCm / 100).toFixed(2).replace('.', ',')} m
          </text>
        </g>
      ))}

      {/* hilos */}
      {hilos.map((h, i) => {
        const y = yDe(h.alturaCm);
        const color = COLOR_HILO[h.tipo] || '#2d6a4f';
        return (
          <g key={i}>
            <line x1="40" y1={y} x2={W - 24} y2={y} stroke={color}
              strokeWidth={h.tipo === 'pua' ? 3.2 : 2.4}
              strokeDasharray={h.tipo === 'pua' ? '10 4' : h.tipo === 'electro' ? '3 3' : 'none'} />
            {[POSTE_X0 + POSTE_W / 2, POSTE_X1 + POSTE_W / 2, ...posVarillas].map((x, j) => (
              <circle key={j} cx={x} cy={y} r="3.2" fill={color} stroke="#fff" strokeWidth="1" />
            ))}
            <text x="36" y={y + 4} textAnchor="end" fontSize="11" fontWeight="800" fill={color}>{h.alturaCm}</text>
            {mostrarEtiq && (
              <text x={W - 20} y={y + 4} textAnchor="end" fontSize="9.5" fill="#6b7280">{ETIQ_CORTO[h.tipo]} · {h.alturaCm}cm</text>
            )}
          </g>
        );
      })}
      <text x="36" y={yDe(0) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">cm</text>

      {/* cota de distancia entre palos */}
      <g>
        <line x1={POSTE_X0 + POSTE_W / 2} y1={SUELO_Y + 44} x2={POSTE_X1 + POSTE_W / 2} y2={SUELO_Y + 44} stroke="#1b4332" strokeWidth="1.5" />
        <line x1={POSTE_X0 + POSTE_W / 2} y1={SUELO_Y + 38} x2={POSTE_X0 + POSTE_W / 2} y2={SUELO_Y + 50} stroke="#1b4332" strokeWidth="1.5" />
        <line x1={POSTE_X1 + POSTE_W / 2} y1={SUELO_Y + 38} x2={POSTE_X1 + POSTE_W / 2} y2={SUELO_Y + 50} stroke="#1b4332" strokeWidth="1.5" />
        <rect x={(POSTE_X0 + POSTE_X1) / 2 - 62} y={SUELO_Y + 32} width="124" height="24" fill="#1b4332" rx="3" />
        <text x={(POSTE_X0 + POSTE_X1) / 2} y={SUELO_Y + 49} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{distTxt} ENTRE PALOS</text>
      </g>

      {/* varillado */}
      {nVar > 0 && varillas.espaciamientoCm != null && (
        <text x={(POSTE_X0 + POSTE_X1) / 2} y={SUELO_Y + 74} textAnchor="middle" fontSize="12" fontWeight="700" fill={varillas.ok ? '#2d6a4f' : '#b45309'}>
          {varillas.mensaje}
        </text>
      )}

      {/* leyenda */}
      <g fontSize="10" fill="#6b7280">
        <line x1="40" y1={H - 16} x2="62" y2={H - 16} stroke="#2d6a4f" strokeWidth="2.4" />
        <text x="66" y={H - 12}>Liso</text>
        <line x1="110" y1={H - 16} x2="132" y2={H - 16} stroke="#b45309" strokeWidth="3.2" strokeDasharray="10 4" />
        <text x="136" y={H - 12}>Púa</text>
        <line x1="178" y1={H - 16} x2="200" y2={H - 16} stroke="#2563eb" strokeWidth="2.4" strokeDasharray="3 3" />
        <text x="204" y={H - 12}>Electro</text>
        <rect x="258" y={H - 22} width="12" height="12" fill="#7f4f24" stroke="#582f0e" />
        <text x="274" y={H - 12}>Palo</text>
        <rect x="316" y={H - 22} width="8" height="12" fill="#e9b44c" stroke="#8a6d1c" />
        <text x="328" y={H - 12}>Varilla</text>
      </g>
    </svg>
  );
}
