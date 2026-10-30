"use client";

import {
  Activity,
  Check,
  Loader2,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { AlertPacket, ClaimRecord, DemoState } from "@cura-health/contracts";
import type { ConnectionState } from "@/lib/useHub";

interface HeaderProps {
  connection: ConnectionState;
  now: number;
  demo: DemoState;
  alerts: AlertPacket[];
  claims: Record<string, ClaimRecord>;
  demoBusy: boolean;
  resetBusy: boolean;
  onRunDemo: () => void;
  onReset: () => void;
}

function connectionStyles(connection: ConnectionState) {
  if (connection === "online") {
    return {
      label: "Live telemetry",
      icon: Wifi,
      className: "border-success/30 bg-success-soft text-success-ink",
      dot: "bg-success",
    };
  }
  if (connection === "connecting") {
    return {
      label: "Connecting",
      icon: Radio,
      className: "border-warning/30 bg-warning-soft text-warning-ink",
      dot: "bg-warning",
    };
  }
  return {
    label: "Hub offline",
    icon: WifiOff,
    className: "border-danger/30 bg-danger-soft text-danger-ink",
    dot: "bg-danger",
  };
}

export function Header({
  connection,
  now,
  demo,
  alerts,
  claims,
  demoBusy,
  resetBusy,
  onRunDemo,
  onReset,
}: HeaderProps) {
  const details = connectionStyles(connection);
  const ConnectionIcon = details.icon;
  const hasAlert = alerts.length > 0;
  const verified = alerts.some(
    (alert) => alert.status === "VERIFIED" || alert.status === "CLAIMED",
  );
  const claimed = Object.keys(claims).length > 0;
  const steps = [
    { label: "Trigger", done: demo.active || hasAlert },
    { label: "Review SBAR", done: hasAlert },
    { label: "Nurse verify", done: verified },
    { label: "Doctor claim", done: claimed },
  ];
  const activeStep = steps.findIndex((step) => !step.done);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-4 px-5 py-4 xl:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-panel bg-brand shadow-card">
              <ShieldCheck className="h-6 w-6 text-white" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-h2 font-bold tracking-tight text-ink">
                  Cura <span className="text-brand">Health</span>
                </h1>
                <span className="rounded border border-line bg-canvas-alt px-1.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-ink-muted">
                  CENTRAL
                </span>
              </div>
              <p className="text-caption text-ink-muted">
                Ward 4B · Post-Surgical Step-Down · Human-in-the-loop triage
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden items-center gap-2 rounded-btn border border-line bg-surface px-3 py-2 md:flex">
              <Activity className="h-3.5 w-3.5 text-ink-subtle" />
              <div className="leading-tight">
                <p className="font-mono text-caption text-ink">
                  {now
                    ? new Date(now).toLocaleTimeString("en-GB", { hour12: false })
                    : "--:--:--"}
                </p>
                <p className="text-meta text-ink-muted">
                  {now
                    ? new Date(now).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })
                    : "synchronizing"}
                </p>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 rounded-btn border px-3 py-2 text-meta font-medium ${details.className}`}
              title="ws://localhost:8000/ws"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${details.dot} opacity-50`} />
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${details.dot}`} />
              </span>
              <ConnectionIcon className="h-3.5 w-3.5" />
              {details.label}
            </div>

            <button
              type="button"
              onClick={onRunDemo}
              disabled={demoBusy || resetBusy}
              className="inline-flex items-center gap-2 rounded-btn bg-brand px-4 py-2 text-body font-semibold text-white shadow-card transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {demoBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              Run Demo
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={demoBusy || resetBusy}
              className="inline-flex items-center gap-2 rounded-btn border border-field bg-surface px-3 py-2 text-body font-medium text-ink-muted transition hover:bg-canvas-alt hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resetBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-panel border border-line bg-surface px-4 py-2.5 shadow-card">
          <div className="flex items-center gap-2">
            <span className="text-meta font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Demo sequence
            </span>
            {demo.active && (
              <span className="rounded-full border border-brand/25 bg-brand-soft px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-brand">
                BED-103 ARMED
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              return (
                <div key={step.label} className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-meta font-semibold tracking-wide transition ${
                      step.done
                        ? "border-success/30 bg-success-soft text-success-ink"
                        : isActive
                          ? "border-brand/25 bg-brand-soft text-brand"
                          : "border-line bg-canvas-alt text-ink-subtle"
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${
                        step.done
                          ? "bg-success text-white"
                          : isActive
                            ? "bg-brand text-white"
                            : "bg-line text-ink-muted"
                      }`}
                    >
                      {step.done ? <Check className="h-2.5 w-2.5" /> : index + 1}
                    </span>
                    {step.label}
                  </div>
                  {index < steps.length - 1 && (
                    <span
                      className={`h-px w-4 ${step.done ? "bg-success/40" : "bg-line"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="hidden text-meta text-ink-muted lg:block">
            {demo.active
              ? "Room-101 vitals are drifting — the edge agent will synthesize SBAR at NEWS2 ≥ 7."
              : "Run Demo resets the ward, then accelerates Room-101 decompensation."}
          </p>
        </div>
      </div>
    </header>
  );
}
