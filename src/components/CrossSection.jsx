/* CrossSection — corte transversal del cerramiento (Norma Tradicional
   Argentina, altura final 1.35 m). SVG estático con datos vivos:
   separación de varillas y tramo elástico salen de useFenceMaterials.
   Escala de cotas: 135, 112, 90, 68, 48, 30, 15 cm.
   7 hilos: 5 lisos verdes 17/15 + 2 púas marrones (H4 y H7). */
import React from 'react';
import { useFenceMaterials } from '../hooks/useFenceMaterials.js';

const HILOS = [
  { cm: 135, tipo: 'pua',  etiqueta: 'Púas Bagual' },
  { cm: 112, tipo: 'liso', etiqueta: 'Liso 17/15' },
  { cm: 90,  tipo: 'liso', etiqueta: 'Liso 17/15' },
  { cm: 68,  tipo: 'pua',  etiqueta: 'Púas Bagual' },
  { cm: 48,  tipo: 'liso', etiqueta: 'Liso 17/15' },
  { cm: 30,  tipo: 'liso', etiqueta: 'Liso 17/15' },
  { cm: 15,  tipo: 'liso', etiqueta: 'Liso Rastra' }
];

const SUELO_Y = 300;            // cota 0 cm
const COTA_MAX_CM = 135;
const COTA_MAX_Y = 72;          // y del hilo más alto
const yDe = (cm) => SUELO_Y - (cm / COTA_MAX_CM) * (SUELO_Y - COTA_MAX_Y);

const POSTE_X = 205, POSTE_W = 46;
const REF_X = 792, REF_W = 46;
const VARILLAS_X = [368, 505, 642];
const X_INI = 64, X_FIN = 922;

const COLOR_PUA = '#7f4f24';
const COLOR_LISO = '#2d6a4f';

export default function CrossSection() {
  const { params } = useFenceMaterials();
  const sep = parseFloat(params.sepVarillas) || 2.0;
  const tramo = parseInt(params.distRefuerzo, 10) || 80;
  const sepTxt = sep.toFixed(1).replace('.', ',');

  return (
    <svg viewBox="0 0 990 348" className="w-full h-auto" role="img" aria-label="Corte transversal del alambrado">
      <rect x="0" y="0" width="990" height="348" fill="#f4f3fc" rx="6" />

      {/* postes */}
      <g>
        <rect x={POSTE_X} y={48} width={POSTE_W} height={SUELO_Y - 48} fill={COLOR_PUA} stroke="#582f0e" strokeWidth="2" />
        <rect x={REF_X} y={48} width={REF_W} height={SUELO_Y - 48} fill={COLOR_PUA} stroke="#582f0e" strokeWidth="2" />
        <text x={POSTE_X + POSTE_W / 2} y={38} textAnchor="middle" fontSize="11" fontWeight="700" fill="#582f0e">POSTE QUEBRACHO 2.20m</text>
        <text x={REF_X + REF_W / 2} y={38} textAnchor="middle" fontSize="11" fontWeight="700" fill="#582f0e">POSTE REFUERZO</text>
      </g>

      {/* varillas */}
      {VARILLAS_X.map((x, i) => (
        <g key={x}>
          <rect x={x - 8} y={96} width="16" height={SUELO_Y - 96} fill="#e9b44c" stroke="#c98a2b" strokeWidth="1.5" />
          <text x={x} y={88} textAnchor="middle" fontSize="11" fontWeight="600" fill="#8a6d1c">VARILLA {i + 1}</text>
        </g>
      ))}

      {/* hilos */}
      {HILOS.map((h) => {
        const y = yDe(h.cm);
        const color = h.tipo === 'pua' ? COLOR_PUA : COLOR_LISO;
        return (
          <g key={h.cm}>
            <line x1={X_INI} y1={y} x2={X_FIN} y2={y} stroke={color} strokeWidth={h.tipo === 'pua' ? 3 : 2.5} />
            {[POSTE_X + POSTE_W / 2, REF_X + REF_W / 2, ...VARILLAS_X].map((x, i) => (
              <circle key={i} cx={x} cy={y} r="3.4" fill={color} stroke="#fff" strokeWidth="1" />
            ))}
            <text x={X_INI - 8} y={y + 4} textAnchor="end" fontSize="12" fontWeight="700" fill={color}>{h.cm}cm</text>
            <text x={X_FIN + 8} y={y + 4} fontSize="11" fill="#414844">{h.etiqueta}</text>
          </g>
        );
      })}

      {/* cota de suelo */}
      <line x1={X_INI} y1={SUELO_Y} x2={X_FIN} y2={SUELO_Y} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" />
      <text x={X_INI} y={SUELO_Y + 18} fontSize="11" fill="#414844">COTA DE SUELO</text>
      <text x={X_INI} y={SUELO_Y + 36} fontSize="13" fontWeight="700" fill="#1b4332">{sepTxt} m entre varillas</text>
      <text x={520} y={SUELO_Y + 36} fontSize="13" fontWeight="700" fill="#1b4332" textAnchor="middle">
        Tramo elástico: {tramo} m entre postes de refuerzo
      </text>
    </svg>
  );
}
