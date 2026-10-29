import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

const BH = 46; // bar height
const LEVEL = 30; // vertical space per brace level

// Horizontal curly brace from x1 to x2 starting at y, pointing up (dir -1) or down (dir 1).
function hBrace(x1, x2, y, dir, h = 12) {
  const span = x2 - x1;
  const q = Math.max(2, Math.min(h, span / 4));
  const m = (x1 + x2) / 2;
  const d = dir * h * 0.5;
  return `M${x1},${y} q0,${d} ${q},${d} L${m - q},${y + d} q${q},0 ${q},${d} q0,${-d} ${q},${-d} L${x2 - q},${y + d} q${q},0 ${q},${-d}`;
}

// Vertical curly brace at x from y1 to y2, pointing right.
function vBrace(x, y1, y2, w = 14) {
  const q = Math.max(2, Math.min(w, (y2 - y1) / 4));
  const m = (y1 + y2) / 2;
  const d = w * 0.5;
  return `M${x},${y1} q${d},0 ${d},${q} L${x + d},${m - q} q0,${q} ${d},${q} q${-d},0 ${-d},${q} L${x + d},${y2 - q} q0,${q} ${-d},${q}`;
}

function useWidth(ref, fallback = 720) {
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(Math.round(el.getBoundingClientRect().width) || fallback);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}

// Stable layout for a problem: row order, row heights and the drawing scale
// come from every stage of the solution, so nothing jumps between steps.
function planLayout(problem, width) {
  const n = problem.steps.length;
  const all = Array.from({ length: n + 1 }, (_, k) => problem.scene(k));
  const order = [];
  const pad = {};
  let maxLen = 1;
  let right = false;
  let caption = false;
  for (const sc of all) {
    if (sc.caption) caption = true;
    for (const r of sc.rows) {
      if (!order.includes(r.id)) order.push(r.id);
      pad[r.id] = pad[r.id] || { top: 0, bottom: 0 };
      maxLen = Math.max(maxLen, r.segs.reduce((a, g) => a + g.len, 0));
    }
    for (const b of sc.braces) {
      if (b.type === 'right' || b.type === 'end') right = true;
      if (b.type === 'top' || b.type === 'bottom') {
        const lv = (b.level || 0) + 1;
        pad[b.row] = pad[b.row] || { top: 0, bottom: 0 };
        pad[b.row][b.type] = Math.max(pad[b.row][b.type], lv);
      }
    }
  }
  const narrow = width < 520;
  const labelW = narrow ? 64 : 96;
  const rightW = right ? (narrow ? 92 : 132) : 20;
  const ppu = Math.min(120, (width - labelW - rightW) / maxLen);
  let y = caption ? 34 : 12;
  const rowY = {};
  for (const id of order) {
    y += 10 + pad[id].top * LEVEL;
    rowY[id] = y;
    y += BH + 10 + pad[id].bottom * LEVEL;
  }
  return { order, rowY, ppu, labelW, height: y + 10, barRight: labelW + maxLen * ppu };
}

export default function BarModel({ problem, k, label = 'Bar model', maxWidth = 860, shell = false }) {
  const wrap = useRef(null);
  const hatchId = 'hatch' + useId().replace(/:/g, '');
  const width = Math.max(300, Math.min(useWidth(wrap), maxWidth));
  const plan = useMemo(() => planLayout(problem, width), [problem, width]);
  const sc = useMemo(() => problem.scene(k), [problem, k]);

  if (!sc.rows.length && !shell) {
    return (
      <div ref={wrap} className="model-wrap" data-ui>
        <div className="model-empty"><p>The model draws here, one step at a time.</p></div>
      </div>
    );
  }

  const { rowY, ppu, labelW } = plan;
  const pos = {};
  const segEls = [];
  const rowEnd = {};
  for (const r of sc.rows) {
    let x = labelW;
    r.segs.forEach((g, i) => {
      const w = g.len * ppu;
      pos[g.id] = { x, w, row: r.id };
      const y = rowY[r.id];
      const tw = (g.text || '').length * 9.6 + 8;
      segEls.push(
        <g key={g.id} className={`seg ${g.cls}${g.ghost ? ' ghost' : ''} enter-${g.enter || 'grow'}`} data-ghost={g.ghost ? hatchId : undefined}
          style={{ transform: `translate(${x}px, ${y}px)`, '--d': `${i * 70}ms` }}>
          <g className="seg-in">
            <rect width={Math.max(1, w)} height={BH} rx="1" style={g.ghost ? { fill: `url(#${hatchId})` } : undefined} />
            {g.sub && w > 34 ? <text className="sub" x="6" y="14">{g.sub}</text> : null}
            {g.text && tw <= w + 2 ? (
              <text key={g.text} className="v" x={w / 2} y={g.sub ? BH / 2 + 10 : BH / 2 + 5} textAnchor="middle">{g.text}</text>
            ) : null}
          </g>
        </g>
      );
      x += w;
    });
    rowEnd[r.id] = x;
  }

  const braceEls = sc.braces.map((b) => {
    const cls = `brace ${b.cls || ''}`;
    if (b.type === 'right') {
      const y1 = rowY[b.rows[0]];
      const y2 = rowY[b.rows[b.rows.length - 1]] + BH;
      const x = Math.max(...b.rows.map((r) => rowEnd[r] ?? labelW)) + 10;
      return (
        <g key={b.id} className={cls}>
          <path key={`${y1}-${y2}`} pathLength="1" d={vBrace(x, y1, y2)} />
          <text key={b.text + (b.sub || '')} x={x + 20} y={(y1 + y2) / 2 + (b.sub ? -3 : 5)}>
            {b.text}
            {b.sub ? <tspan className="sub" x={x + 20} dy="18">{b.sub}</tspan> : null}
          </text>
        </g>
      );
    }
    if (b.type === 'end') {
      const y = rowY[b.row] + BH / 2 + 6;
      return (
        <g key={b.id} className={`end-label ${b.cls || ''}`}>
          <text key={b.text} x={(rowEnd[b.row] ?? labelW) + 12} y={y}>{b.text}</text>
        </g>
      );
    }
    const a = pos[b.from];
    const z = pos[b.to];
    if (!a || !z) return null;
    const x1 = a.x + 2;
    const x2 = z.x + z.w - 2;
    const lv = b.level || 0;
    const up = b.type === 'top';
    const y = up ? rowY[b.row] - 4 - lv * LEVEL : rowY[b.row] + BH + 4 + lv * LEVEL;
    const ty = up ? y - 12 : y + 22;
    return (
      <g key={b.id} className={cls}>
        <path key={`${x1}-${x2}-${y}`} pathLength="1" d={hBrace(x1, x2, y, up ? -1 : 1)} />
        <text key={b.text + (b.sub || '')} x={(x1 + x2) / 2} y={ty} textAnchor="middle">
          {b.text}
          {b.sub ? <tspan className="sub">{'  ' + b.sub}</tspan> : null}
        </text>
      </g>
    );
  });

  const describe = sc.rows.map((r) => `${r.label}: ${r.segs.filter((g) => !g.ghost).map((g) => g.text || 'unit').join(', ')}`).join('. ');

  return (
    <div ref={wrap} className="model-wrap" data-ui>
      <svg className="model" viewBox={`0 0 ${width} ${plan.height}`} width={width} height={plan.height} role="img" aria-label={`${label}. ${describe}`}>
        <defs>
          <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="var(--sheet)" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--tone-2)" strokeWidth="3" />
          </pattern>
        </defs>
        {sc.caption ? <text className="caption" x={labelW} y="20" key={sc.caption}>{sc.caption}</text> : null}
        {sc.rows.map((r) => (
          <text key={`l-${r.id}`} className="row-label" x={labelW - 12} y={rowY[r.id] + BH / 2 + 5} textAnchor="end">{r.label}</text>
        ))}
        {segEls}
        {braceEls}
      </svg>
    </div>
  );
}
