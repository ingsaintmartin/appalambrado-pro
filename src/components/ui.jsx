/* Kit de componentes del sistema "Agro-Industrial Precision":
   bordes duros 1.5px, sin sombras, botones >=48px, mono para datos. */
import React from 'react';

export function Card({ children, className = '', dark = false }) {
  return <div className={(dark ? 'card-hd-dark' : 'card-hd') + ' p-4 ' + className}>{children}</div>;
}

const TONES = {
  ok: 'bg-okbg text-ok border-ok/40',
  warn: 'bg-warnbg text-warn border-warn/40',
  bad: 'bg-badbg text-bad border-bad/40',
  info: 'bg-blue-50 text-satblue border-satblue/40',
  muted: 'bg-slate-100 text-muted border-line',
  agro: 'bg-agro text-white border-agro-deep'
};
export function Badge({ tone = 'muted', children, className = '' }) {
  return (
    <span className={'inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold mono ' + (TONES[tone] || TONES.muted) + ' ' + className}>
      {children}
    </span>
  );
}

const BTN = {
  primary: 'bg-agro text-white border-agro-deep',
  quebracho: 'bg-quebracho text-white border-quebracho-d',
  whatsapp: 'bg-whatsapp text-[#0b3b18] border-[#128c7e]',
  dark: 'bg-ink text-white border-ink',
  ghost: 'bg-white text-ink border-line',
  danger: 'bg-bad text-white border-bad'
};
export function Btn({ variant = 'primary', className = '', children, ...rest }) {
  return (
    <button
      className={'inline-flex items-center justify-center gap-2 px-4 rounded-md border-[1.5px] font-semibold text-[15px] min-h-[48px] active:translate-y-[1px] disabled:opacity-50 ' + (BTN[variant] || BTN.primary) + ' ' + className}
      {...rest}
    >{children}</button>
  );
}

export function Chip({ children, className = '' }) {
  return (
    <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-line bg-white text-[12px] font-medium mono ' + className}>
      {children}
    </span>
  );
}

/* Slider grueso con valor mono a la derecha */
export function SliderRow({ label, value, min, max, step = 1, onChange, format, hint }) {
  const f = format || ((v) => v);
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="py-1">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[13px] text-muted">{label}</span>
        <span className="mono font-bold text-[15px]">{f(value)}</span>
      </div>
      <input
        type="range" className="slider-hd" style={{ '--fill': pct + '%' }}
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && <div className="text-[12px] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

/* Stepper físico - / valor / + */
export function Stepper({ value, onChange, min = 0, max = 999999, step = 1, format }) {
  const f = format || ((v) => v);
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const btn = 'w-12 h-12 min-w-[48px] rounded-md border-[1.5px] border-line bg-white text-xl font-bold active:bg-canvas-2';
  return (
    <div className="inline-flex items-center gap-2">
      <button className={btn} onClick={() => onChange(clamp(value - step))} aria-label="menos">−</button>
      <span className="mono font-bold text-[16px] min-w-[64px] text-center">{f(value)}</span>
      <button className={btn} onClick={() => onChange(clamp(value + step))} aria-label="más">+</button>
    </div>
  );
}

export function Stat({ label, value, sub, tone }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <div>
      <div className="text-[12px] text-muted mb-0.5">{label}</div>
      <div className={'display font-bold text-[22px] leading-7 ' + color}>{value}</div>
      {sub && <div className="text-[12px] text-muted mono">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ n, title, sub, right }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <div className="text-[11px] font-semibold tracking-widest text-muted uppercase">
          {n ? n + '. ' : ''}{title}
        </div>
        {sub && <div className="text-[13px] text-muted mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={'block ' + className}>
      <span className="block text-[12px] font-medium text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 min-h-[48px]"
      role="switch" aria-checked={checked}
    >
      <span className={'w-12 h-7 rounded-full border-[1.5px] border-line relative transition-colors ' + (checked ? 'bg-agro' : 'bg-slate-200')}>
        <span className={'absolute top-0.5 w-5 h-5 rounded-full bg-white border border-line transition-all ' + (checked ? 'left-[26px]' : 'left-0.5')} />
      </span>
      {label && <span className="text-[14px]">{label}</span>}
    </button>
  );
}

export function EmptyState({ title, sub, action }) {
  return (
    <Card className="text-center py-10">
      <div className="display font-bold text-[18px] mb-1">{title}</div>
      <div className="text-muted text-[14px] mb-4">{sub}</div>
      {action}
    </Card>
  );
}
