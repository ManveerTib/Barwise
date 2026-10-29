import React from 'react';
import {
  Check, X, Lightbulb, CaretLeft, CaretRight, Play, Pause, ArrowCounterClockwise, Plus,
  DownloadSimple, UploadSimple, Link as LinkIcon, ArrowSquareOut, CaretDown, Trash, Eye,
  LockSimple, LockSimpleOpen, ArrowRight, Key,
} from '@phosphor-icons/react';
import { LEVELS, levelOf } from '../engine/model.js';

const ICONS = {
  check: Check, x: X, bulb: Lightbulb, back: CaretLeft, next: CaretRight, play: Play, pause: Pause,
  restart: ArrowCounterClockwise, plus: Plus, download: DownloadSimple, upload: UploadSimple, link: LinkIcon,
  external: ArrowSquareOut, chevron: CaretDown, trash: Trash, eye: Eye, lock: LockSimple, unlock: LockSimpleOpen,
  arrow: ArrowRight, key: Key,
};

// One icon family (Phosphor), one weight across the app.
export function Icon({ name, size = 20, className, weight = 'bold' }) {
  const C = ICONS[name];
  return <C size={size} weight={name === 'play' || name === 'pause' ? 'fill' : weight} className={className} aria-hidden="true" />;
}

// Text with **bold** and {n/d} stacked fractions.
export function Rich({ text, as: Tag = 'span', className }) {
  const parts = [];
  const re = /\*\*(.+?)\*\*|\{(\d+)\/(\d+)\}/g;
  let last = 0;
  let m;
  let key = 0;
  const withFracs = (s) => {
    const out = [];
    const inner = /\{(\d+)\/(\d+)\}/g;
    let l = 0;
    let mm;
    while ((mm = inner.exec(s))) {
      if (mm.index > l) out.push(s.slice(l, mm.index));
      out.push(<Frac key={`f${key++}`} n={mm[1]} d={mm[2]} />);
      l = mm.index + mm[0].length;
    }
    if (l < s.length) out.push(s.slice(l));
    return out;
  };
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] != null) parts.push(<strong key={`b${key++}`}>{withFracs(m[1])}</strong>);
    else parts.push(<Frac key={`f${key++}`} n={m[2]} d={m[3]} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Tag className={className}>{parts}</Tag>;
}

export function Frac({ n, d }) {
  return (
    <span className="frac" role="img" aria-label={`${n} over ${d}`}>
      <span aria-hidden="true">{n}</span>
      <span aria-hidden="true">{d}</span>
    </span>
  );
}

export const plain = (text) => text.replace(/\*\*/g, '').replace(/\{(\d+)\/(\d+)\}/g, '$1/$2');

export function MasteryIcon({ skill, level, small }) {
  const lv = level || levelOf(skill);
  const name = LEVELS.find((l) => l.id === lv).name;
  return <span className={`mastery ${lv}${small ? ' sm' : ''}`} title={name} role="img" aria-label={name} />;
}

const AV = ['#1e4fc2', '#2c7a4b', '#a8690a', '#bf3f2d', '#1d7676', '#4a5560'];
export function Avatar({ name = '?', id = '' }) {
  let h = 0;
  for (const ch of id || name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const initials = name.replace(/\(.*\)/, '').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return <span className="avatar" style={{ background: AV[h % AV.length] }} aria-hidden="true">{initials}</span>;
}

// Red-pen marks, drawn the way a tutor marks an exercise book.
export function Tick({ size = 44, style }) {
  return (
    <svg className="pen" width={size} height={size * 0.9} viewBox="0 0 44 40" style={{ left: 0, top: 0, ...style }} aria-hidden="true">
      <path pathLength="1" d="M4 22 C 8 25, 12 29, 16 35 C 22 22, 30 11, 41 3" />
    </svg>
  );
}

// An uneven loop around whatever it is placed over (the parent must be position: relative).
export function Ring() {
  return (
    <svg className="pen" viewBox="0 0 100 50" preserveAspectRatio="none"
      style={{ left: -10, top: -8, width: 'calc(100% + 20px)', height: 'calc(100% + 16px)' }} aria-hidden="true">
      <path pathLength="1" vectorEffect="non-scaling-stroke" d="M58 4 C 30 2, 6 9, 4 25 C 3 41, 34 47, 58 46 C 82 45, 97 37, 96 23 C 95 10, 75 3, 46 6" />
    </svg>
  );
}

export function Cross({ size = 36, style }) {
  return (
    <svg className="pen" width={size} height={size} viewBox="0 0 36 36" style={{ left: 4, top: 2, ...style }} aria-hidden="true">
      <path pathLength="1" d="M7 7 C 14 14, 21 21, 29 30 M29 6 C 21 14, 14 22, 6 29" />
    </svg>
  );
}

export function timeAgo(t) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

// Reveal-on-scroll: adds .in once an element enters the viewport (IntersectionObserver, no scroll listeners).
export function useReveal() {
  React.useEffect(() => {
    document.documentElement.classList.add('js');
    const els = [...document.querySelectorAll('.rise:not(.in)')];
    if (typeof IntersectionObserver === 'undefined') { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
}
