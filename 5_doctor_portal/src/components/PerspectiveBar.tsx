"use client";

import { ArrowRightLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Doctor } from "@/lib/doctors";
import type { PhoneStatus } from "./DoctorPhone";

interface PerspectiveBarProps {
  doctors: Doctor[];
  statuses: Record<string, PhoneStatus>;
  selectedId: string;
  onSelect: (doctorId: string) => void;
}

export function PerspectiveBar({
  doctors,
  statuses,
  selectedId,
  onSelect,
}: PerspectiveBarProps) {
  const selected = doctors.find((doctor) => doctor.id === selectedId) ?? doctors[0];
  const claim =
    Object.values(statuses).find((status) => status.claimDoctorName) ?? null;
  const winner = claim
    ? (doctors.find((doctor) => doctor.id === claim.claimDoctorId) ?? null)
    : null;
  const standDown = winner
    ? (doctors.find((doctor) => doctor.id !== winner.id) ?? null)
    : null;

  if (!claim || !winner) {
    return (
      <div className="mt-4 flex w-full items-center justify-between gap-3 rounded-panel border border-line bg-surface px-3 py-2.5 shadow-card">
        <span className="flex min-w-0 items-center gap-1.5 text-meta text-ink-muted">
          <ArrowRightLeft className="h-3 w-3 shrink-0" />
          <span className="truncate">
            Viewing{" "}
            <span className="font-semibold text-ink">{selected.name}</span>
          </span>
        </span>
        <span className="shrink-0 font-mono text-[9px] tracking-[0.12em] text-ink-subtle">
          ONE PHONE · FOUR PERSPECTIVES
        </span>
      </div>
    );
  }

  const selectedIsWinner = selected.id === winner.id;
  const standDownIsSelected = standDown ? selected.id === standDown.id : false;

  return (
    <div className="mt-4 w-full rounded-panel border border-line bg-surface px-3 py-2.5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 text-meta text-ink-muted">
          {selectedIsWinner ? (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" />
          ) : (
            <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-warning" />
          )}
          <span className="truncate">
            Viewing{" "}
            <span className="font-semibold text-ink">{selected.name}</span>{" "}
            <span
              className={
                selectedIsWinner ? "text-success-ink" : "text-warning-ink"
              }
            >
              — {selectedIsWinner ? "claim winner" : "stood down"}
            </span>
          </span>
        </p>
        <span className="shrink-0 font-mono text-[10px] text-ink-subtle">
          {claim.claimBed ?? "CASE"} · FIRST-CLAIM LOCK
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(winner.id)}
          disabled={selectedIsWinner}
          className={`rounded-btn border px-2.5 py-1.5 text-meta font-semibold transition ${
            selectedIsWinner
              ? "cursor-default border-success/30 bg-success-soft text-success-ink"
              : "border-line bg-canvas text-ink-muted hover:border-success/30 hover:text-success-ink"
          }`}
        >
          View winner · {winner.name}
        </button>
        {standDown && (
          <button
            type="button"
            onClick={() => onSelect(standDown.id)}
            disabled={standDownIsSelected}
            className={`rounded-btn border px-2.5 py-1.5 text-meta font-semibold transition ${
              standDownIsSelected
                ? "cursor-default border-warning/30 bg-warning-soft text-warning-ink"
                : "border-line bg-canvas text-ink-muted hover:border-warning/30 hover:text-warning-ink"
            }`}
          >
            View stand-down · {standDown.name}
          </button>
        )}
      </div>
    </div>
  );
}
