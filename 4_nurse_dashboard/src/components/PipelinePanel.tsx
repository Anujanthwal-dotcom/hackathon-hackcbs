"use client";

import {
  ArrowDown,
  BedDouble,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  RadioTower,
  Smartphone,
  Stethoscope,
} from "lucide-react";
import type { ConnectionState } from "@/lib/useHub";

interface PipelinePanelProps {
  connection: ConnectionState;
  bedCount: number;
  artifactCount: number;
  alertCount: number;
  claimCount: number;
}

export function PipelinePanel({
  connection,
  bedCount,
  artifactCount,
  alertCount,
  claimCount,
}: PipelinePanelProps) {
  const nodes = [
    {
      icon: BedDouble,
      title: "Bedside telemetry",
      detail: "3 monitors · 1.5s packets",
      status: bedCount > 0 ? "STREAMING" : "WAITING",
      tone: bedCount > 0 ? "emerald" : "amber",
    },
    {
      icon: Cpu,
      title: "In-room edge agent",
      detail:
        artifactCount > 0
          ? `${artifactCount} artifact suppressed locally`
          : "NEWS2 + artifact suppression",
      status: connection === "online" ? "ARMED" : "LOCAL",
      tone: artifactCount > 0 ? "amber" : "cyan",
    },
    {
      icon: RadioTower,
      title: "Central hub",
      detail: "ws://localhost:8000/ws",
      status: connection === "online" ? "LIVE" : "RECONNECTING",
      tone: connection === "online" ? "emerald" : "rose",
    },
    {
      icon: Stethoscope,
      title: "Nursing station",
      detail: "Human-in-the-loop verification",
      status: "YOU",
      tone: "violet",
    },
    {
      icon: Smartphone,
      title: "Doctor dispatch",
      detail: claimCount > 0 ? "Case claimed · phones locked" : "On-call phones · first-to-claim",
      status: claimCount > 0 ? "CLAIMED" : alertCount > 0 ? "QUEUED" : "IDLE",
      tone: claimCount > 0 ? "emerald" : alertCount > 0 ? "amber" : "slate",
    },
  ];

  const toneMap: Record<string, string> = {
    emerald: "border-success/25 bg-success-soft text-success-ink",
    cyan: "border-info/25 bg-info/10 text-info",
    amber: "border-warning/30 bg-warning-soft text-warning-ink",
    rose: "border-danger/25 bg-danger-soft text-danger-ink",
    violet: "border-brand/25 bg-brand-soft text-brand",
    slate: "border-line bg-canvas-alt text-ink-muted",
  };

  return (
    <section className="rounded-card border border-line bg-surface shadow-card">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-caption font-semibold uppercase tracking-[0.16em] text-ink">
            Autonomous escalation pipeline
          </h2>
          <BrainCircuit className="h-4 w-4 text-brand" />
        </div>
        <p className="mt-0.5 text-meta text-ink-muted">
          Deterministic locally · agentic at the edge · human at the hub
        </p>
      </div>
      <div className="px-4 py-3">
        {nodes.map((node, index) => {
          const Icon = node.icon;
          return (
            <div key={node.title}>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-btn border ${toneMap[node.tone]}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-caption font-medium text-ink">{node.title}</p>
                  <p className="truncate text-meta text-ink-muted">{node.detail}</p>
                </div>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.08em] ${toneMap[node.tone]}`}
                >
                  {node.status}
                </span>
              </div>
              {index < nodes.length - 1 && (
                <div className="ml-4 flex h-4 items-center">
                  <ArrowDown className="h-3 w-3 text-ink-subtle" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mx-4 mb-4 flex items-center gap-2 rounded-panel border border-success/25 bg-success-soft/60 px-3 py-2">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-ink" />
        <p className="text-meta leading-relaxed text-success-ink">
          Raw threshold alarms never reach the ward network. Only verified,
          SBAR-enriched escalations are dispatched.
        </p>
      </div>
    </section>
  );
}
