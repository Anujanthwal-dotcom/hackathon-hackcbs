"use client";

import {
  Activity,
  Droplets,
  Gauge,
  HeartPulse,
  Thermometer,
  Wind,
} from "lucide-react";
import type { EnrichedTelemetry } from "@cura-health/contracts";
import type { BedView } from "@/lib/useHub";
import { Sparkline } from "./Sparkline";

interface BedCardProps {
  bedId: string;
  patientName: string;
  patientContext: string;
  bed?: BedView;
  now: number;
}

function band(score: number) {
  if (score >= 7) {
    return {
      label: "CRITICAL",
      text: "text-danger-ink",
      bg: "bg-danger-soft",
      border: "border-danger/40",
      dot: "bg-danger",
      card: "border-danger/45",
      accent: "#ef4444",
    };
  }
  if (score >= 5) {
    return {
      label: "URGENT",
      text: "text-warning-ink",
      bg: "bg-warning-soft",
      border: "border-warning/40",
      dot: "bg-warning",
      card: "border-warning/40",
      accent: "#f59e0b",
    };
  }
  if (score >= 3) {
    return {
      label: "WATCH",
      text: "text-warning-ink",
      bg: "bg-warning-soft",
      border: "border-warning/30",
      dot: "bg-warning",
      card: "border-line",
      accent: "#f59e0b",
    };
  }
  return {
    label: "STABLE",
    text: "text-success-ink",
    bg: "bg-success-soft",
    border: "border-success/30",
    dot: "bg-success",
    card: "border-line",
    accent: "#10b981",
  };
}

function isAbnormal(key: string, value: number): boolean {
  switch (key) {
    case "hr":
      return value < 60 || value > 100;
    case "sbp":
      return value < 90 || value > 150;
    case "rr":
      return value < 10 || value > 22;
    case "spo2":
      return value < 94;
    case "temp":
      return value < 36 || value > 38;
    case "map":
      return value < 65;
    default:
      return false;
  }
}

export function BedCard({
  bedId,
  patientName,
  patientContext,
  bed,
  now,
}: BedCardProps) {
  const telemetry: EnrichedTelemetry | undefined = bed?.telemetry;
  const score = telemetry?.news2_score ?? 0;
  const colors = band(score);
  const artifact = telemetry?.filter_status === "ARTIFACT_SUPPRESSED";
  const updatedMs = telemetry
    ? Math.max(0, now - new Date(telemetry.received_at).getTime())
    : null;
  const updatedLabel =
    updatedMs === null
      ? "awaiting telemetry"
      : updatedMs < 3000
        ? "live"
        : `${Math.floor(updatedMs / 1000)}s ago`;

  const vitals = telemetry
    ? [
        {
          key: "hr",
          label: "Heart rate",
          unit: "bpm",
          value: Math.round(telemetry.heart_rate),
          icon: HeartPulse,
        },
        {
          key: "sbp",
          label: "Blood pressure",
          unit: "mmHg",
          value: `${Math.round(telemetry.systolic_bp)}/${Math.round(telemetry.diastolic_bp)}`,
          numeric: telemetry.systolic_bp,
          icon: Activity,
        },
        {
          key: "rr",
          label: "Respiratory",
          unit: "/min",
          value: Math.round(telemetry.respiratory_rate),
          icon: Wind,
        },
        {
          key: "spo2",
          label: "Oxygen sat",
          unit: "%",
          value: Math.round(telemetry.spo2),
          icon: Droplets,
        },
        {
          key: "temp",
          label: "Temperature",
          unit: "°C",
          value: telemetry.temp_c.toFixed(1),
          icon: Thermometer,
        },
        {
          key: "map",
          label: "MAP",
          unit: "mmHg",
          value: Math.round(telemetry.map),
          icon: Gauge,
        },
      ]
    : [];

  return (
    <article
      className={`group relative overflow-hidden rounded-card border bg-surface p-4 shadow-card transition-colors ${colors.card}`}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-meta font-semibold tracking-[0.18em] text-brand">
              {bedId.toUpperCase()}
            </p>
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${colors.dot} ${score >= 7 ? "soft-ping" : ""}`}
            />
          </div>
          <h3 className="mt-1 text-title font-semibold tracking-tight text-ink">
            {patientName}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-caption text-ink-muted">
            {patientContext}
          </p>
        </div>
        <div
          className={`flex min-w-[68px] flex-col items-center rounded-panel border px-3 py-2 ${colors.bg} ${colors.border}`}
          title="National Early Warning Score 2"
        >
          <span className="text-meta font-semibold tracking-[0.14em] text-ink-muted">
            NEWS2
          </span>
          <span className={`font-mono text-3xl font-bold leading-none ${colors.text}`}>
            {telemetry ? score : "—"}
          </span>
          <span className={`mt-1 text-meta font-bold tracking-[0.12em] ${colors.text}`}>
            {telemetry ? colors.label : "OFFLINE"}
          </span>
        </div>
      </div>

      {telemetry ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3">
            {vitals.map((vital) => {
              const Icon = vital.icon;
              const numeric =
                "numeric" in vital
                  ? (vital.numeric as number)
                  : (vital.value as number);
              const abnormal =
                vital.key === "spo2" && artifact
                  ? true
                  : isAbnormal(vital.key, Number(numeric));
              const color =
                vital.key === "spo2" && artifact
                  ? "text-warning-ink"
                  : abnormal
                    ? "text-danger"
                    : "text-ink";
              return (
                <div key={vital.key} className="min-w-0">
                  <div className="flex items-center gap-1 text-ink-muted">
                    <Icon className="h-3 w-3" />
                    <span className="truncate text-meta uppercase tracking-[0.08em]">
                      {vital.label}
                    </span>
                  </div>
                  <p className={`mt-0.5 font-mono text-xl font-semibold ${color}`}>
                    {vital.value}
                    <span className="ml-0.5 text-meta font-normal text-ink-subtle">
                      {vital.unit}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Sparkline
              values={bed?.history.map((item) => item.heart_rate) ?? []}
              color="#ef4444"
              label="HR trend"
              unit=" bpm"
            />
            <Sparkline
              values={bed?.history.map((item) => item.systolic_bp) ?? []}
              color="#3882f6"
              label="Systolic trend"
              unit=" mmHg"
            />
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
            {artifact ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-2 py-0.5 text-meta font-semibold tracking-wide text-warning-ink">
                <span className="h-1 w-1 rounded-full bg-warning" />
                PROBE ARTIFACT · ALARM WITHHELD
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-meta font-medium text-ink-muted">
                <span className="h-1 w-1 rounded-full bg-success" />
                EDGE FILTER PASS
              </span>
            )}
            <span className="font-mono text-meta text-ink-subtle">{updatedLabel}</span>
          </div>
        </>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <div className="h-2 w-12 animate-pulse rounded bg-canvas-alt" />
                <div className="h-5 w-10 animate-pulse rounded bg-canvas-alt" />
              </div>
            ))}
          </div>
          <div className="h-16 animate-pulse rounded-panel border border-line bg-canvas" />
          <p className="text-meta text-ink-subtle">Waiting for edge telemetry…</p>
        </div>
      )}
    </article>
  );
}
