"use client";

import { useId } from "react";

interface SparklineProps {
  values: number[];
  color: string;
  label: string;
  unit?: string;
  height?: number;
}

export function Sparkline({
  values,
  color,
  label,
  unit = "",
  height = 42,
}: SparklineProps) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const width = 160;
  const pad = 3;
  const subset = values.slice(-30);
  const min = subset.length ? Math.min(...subset) : 0;
  const max = subset.length ? Math.max(...subset) : 1;
  const span = max - min || 1;
  const points = subset.map((value, index) => {
    const x =
      subset.length === 1
        ? width / 2
        : pad + (index * (width - pad * 2)) / (subset.length - 1);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = points.length
    ? `M ${points[0][0]},${height} L ${line.replaceAll(" ", " L ")} L ${points[points.length - 1][0]},${height} Z`
    : "";
  const latest = subset.length ? subset[subset.length - 1] : null;

  return (
    <div className="rounded-panel border border-line bg-canvas px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-meta font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {label}
        </span>
        <span className="font-mono text-meta text-ink-muted">
          {latest === null ? "—" : `${Math.round(latest)}${unit}`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} trend`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={0}
            x2={width}
            y1={height * fraction}
            y2={height * fraction}
            stroke="rgba(148,163,184,0.18)"
            strokeWidth={1}
          />
        ))}
        {area && <path d={area} fill={`url(#${gradientId})`} />}
        {points.length > 1 && (
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {latest !== null && points.length > 0 && (
          <circle
            cx={points[points.length - 1][0]}
            cy={points[points.length - 1][1]}
            r={2.1}
            fill={color}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}
