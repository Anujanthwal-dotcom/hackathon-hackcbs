"use client";

import { Radio } from "lucide-react";
import type { Doctor } from "@/lib/doctors";
import { ACCENT_STYLES } from "@/lib/doctors";
import type { PhoneStatus } from "./DoctorPhone";

export type RosterState =
  | "idle"
  | "paged"
  | "holding"
  | "stood-down"
  | "connecting"
  | "offline";

const STATE_BADGE: Record<
  RosterState,
  { label: string; className: string }
> = {
  idle: {
    label: "IDLE",
    className: "border-line bg-canvas-alt text-ink-muted",
  },
  paged: {
    label: "PAGED",
    className: "border-danger/25 bg-danger-soft text-danger-ink",
  },
  holding: {
    label: "HOLDS LOCK",
    className: "border-success/25 bg-success-soft text-success-ink",
  },
  "stood-down": {
    label: "STOOD DOWN",
    className: "border-warning/30 bg-warning-soft text-warning-ink",
  },
  connecting: {
    label: "SYNC",
    className: "border-warning/30 bg-warning-soft text-warning-ink",
  },
  offline: {
    label: "OFFLINE",
    className: "border-danger/25 bg-danger-soft text-danger-ink",
  },
};

interface DoctorRosterProps {
  doctors: Doctor[];
  statuses: Record<string, PhoneStatus>;
  selectedId: string;
  onSelect: (doctorId: string) => void;
}

function stateFor(doctor: Doctor, status?: PhoneStatus): RosterState {
  if (!status) return "connecting";
  if (status.connection === "offline") return "offline";
  if (status.connection === "connecting") return "connecting";
  if (status.claimDoctorId) {
    return status.claimDoctorId === doctor.id ? "holding" : "stood-down";
  }
  if (status.alertBed) return "paged";
  return "idle";
}

function connectionDot(status?: PhoneStatus) {
  if (!status) return "bg-warning";
  if (status.connection === "online") return "bg-success";
  if (status.connection === "connecting") return "bg-warning";
  return "bg-danger";
}

export function DoctorRoster({
  doctors,
  statuses,
  selectedId,
  onSelect,
}: DoctorRosterProps) {
  const onlineCount = doctors.filter(
    (doctor) => statuses[doctor.id]?.connection === "online",
  ).length;
  const anyClaim = doctors.some(
    (doctor) => statuses[doctor.id]?.claimDoctorName,
  );

  return (
    <aside className="min-w-0 w-full xl:w-[280px]">
      <div className="rounded-card border border-line bg-surface p-3 shadow-card">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-meta font-semibold uppercase tracking-[0.16em] text-ink">
              On-call roster
            </p>
            <p className="mt-0.5 text-meta text-ink-muted">
              Select a physician to view their device
            </p>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-meta text-ink-muted">
            <Radio className="h-3 w-3 text-success" />
            {onlineCount}/{doctors.length}
          </span>
        </div>

        <div className="scrollbar-thin mt-3 flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
          {doctors.map((doctor) => {
            const status = statuses[doctor.id];
            const state = stateFor(doctor, status);
            const badge = STATE_BADGE[state];
            const accent = ACCENT_STYLES[doctor.accent];
            const selected = selectedId === doctor.id;

            return (
              <button
                key={doctor.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(doctor.id)}
                className={`group min-w-[224px] shrink-0 rounded-panel border px-2.5 py-2.5 text-left transition xl:w-full xl:min-w-0 ${
                  selected
                    ? `${accent.ring} bg-surface`
                    : "border-line bg-canvas hover:border-field hover:bg-canvas-alt"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-panel border font-mono text-meta font-bold ${accent.avatar}`}
                  >
                    {doctor.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-caption font-semibold text-ink">
                      {doctor.name}
                    </p>
                    <p
                      className={`truncate text-meta font-medium ${accent.text}`}
                    >
                      {doctor.role}
                    </p>
                  </div>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${connectionDot(status)}`}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[10px] tracking-[0.08em] text-ink-subtle">
                    {doctor.device}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.08em] ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-3 hidden rounded-panel border border-brand/20 bg-brand-soft px-2.5 py-2 text-meta leading-relaxed text-brand xl:block">
          {anyClaim
            ? "A claim is locked. Switch devices to compare the winner with each stood-down physician."
            : "Every device holds its own WebSocket session. Switching views does not disconnect the others."}
        </p>
      </div>
    </aside>
  );
}
