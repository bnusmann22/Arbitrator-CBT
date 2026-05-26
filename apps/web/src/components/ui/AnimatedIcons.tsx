'use client';

/**
 * AnimatedIcons.tsx
 * Pre-built animated icon components used throughout the app.
 * Animations use framer-motion (already in the project) + CSS keyframes.
 * All icons are sourced from lucide-react.
 */

import { motion } from 'framer-motion';
import {
  TriangleAlert,
  CheckCircle2,
  XCircle,
  Siren,
  RefreshCw,
  Landmark,
  ClipboardList,
  Info,
} from 'lucide-react';

// ── Pulse wrapper ─────────────────────────────────────────────────────────────

function PulseWrap({
  children,
  color = 'currentColor',
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <motion.span
      style={{ display: 'inline-flex', color }}
      animate={{ opacity: [1, 0.45, 1] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.span>
  );
}

// ── Warning / TriangleAlert ───────────────────────────────────────────────────

export function WarningIcon({
  size = 16,
  color,
  animate = false,
  className,
  style,
}: {
  size?: number;
  color?: string;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const icon = (
    <TriangleAlert
      size={size}
      className={className}
      style={style}
      color={color}
    />
  );
  return animate ? <PulseWrap color={color}>{icon}</PulseWrap> : icon;
}

// ── CheckCircle (success) ─────────────────────────────────────────────────────

export function SuccessIcon({
  size = 16,
  color = '#059669',
  animate = false,
}: {
  size?: number;
  color?: string;
  animate?: boolean;
}) {
  const icon = <CheckCircle2 size={size} color={color} />;
  if (!animate) return icon;
  return (
    <motion.span
      style={{ display: 'inline-flex', color }}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    >
      {icon}
    </motion.span>
  );
}

// ── XCircle (error) ───────────────────────────────────────────────────────────

export function ErrorIcon({
  size = 16,
  color = '#ef4444',
}: {
  size?: number;
  color?: string;
}) {
  return <XCircle size={size} color={color} />;
}

// ── Siren (critical warning) ──────────────────────────────────────────────────

export function SirenIcon({
  size = 32,
  color = '#ef4444',
  animate = true,
}: {
  size?: number;
  color?: string;
  animate?: boolean;
}) {
  const icon = <Siren size={size} color={color} />;
  return animate ? <PulseWrap color={color}>{icon}</PulseWrap> : icon;
}

// ── RefreshCw (animated spin on hover) ───────────────────────────────────────

export function RefreshIcon({
  size = 14,
  color = 'currentColor',
  spinning = false,
}: {
  size?: number;
  color?: string;
  spinning?: boolean;
}) {
  return (
    <motion.span
      style={{ display: 'inline-flex', color }}
      animate={spinning ? { rotate: 360 } : {}}
      transition={
        spinning
          ? { duration: 0.7, repeat: Infinity, ease: 'linear' }
          : {}
      }
    >
      <RefreshCw size={size} />
    </motion.span>
  );
}

// ── Landmark (brand icon) ─────────────────────────────────────────────────────

export function LandmarkIcon({
  size = 32,
  color = 'currentColor',
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return <Landmark size={size} color={color} className={className} />;
}

// ── ClipboardList (exam/clipboard) ───────────────────────────────────────────

export function ClipboardIcon({
  size = 32,
  color = 'currentColor',
  className,
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <ClipboardList size={size} color={color} className={className} style={style} />
  );
}

// ── Info icon ─────────────────────────────────────────────────────────────────

export function InfoIcon({
  size = 18,
  color = 'currentColor',
}: {
  size?: number;
  color?: string;
}) {
  return <Info size={size} color={color} />;
}
