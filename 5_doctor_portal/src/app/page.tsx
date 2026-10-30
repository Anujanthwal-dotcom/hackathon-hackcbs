"use client";

import { useCallback, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  RadioTower,
  ShieldCheck,
  Smartphone,
  Volume2,
  VolumeX,
} from "lucide-react";
import { CenterPanel } from "@/components/CenterPanel";
import type { PhoneStatus } from "@/components/DoctorPhone";
import { DoctorPhone } from "@/components/DoctorPhone";
import { DoctorRoster } from "@/components/DoctorRoster";
import { PerspectiveBar } from "@/components/PerspectiveBar";
import { DOCTORS } from "@/lib/doctors";
import { useChime } from "@/lib/useChime";

const NURSE_URL =
  process.env.NEXT_PUBLIC_NURSE_URL ?? "http://localhost:3000";

export default function DoctorPortalPage() {
  const { armed, arm, playAlarm } = useChime();
  const [selectedDoctorId, setSelectedDoctorId] = useState(DOCTORS[0].id);
  const [statuses, setStatuses] = useState<Record<string, PhoneStatus>>({});

  const handleStatus = useCallback((doctorId: string, status: PhoneStatus) => {
    setStatuses((previous) => {
      const current = previous[doctorId];
      if (
        current &&
        current.connection === status.connection &&
        current.alertBed === status.alertBed &&
        current.alertNews2 === status.alertNews2 &&
        current.claimDoctorId === status.claimDoctorId &&
        current.claimDoctorName === status.claimDoctorName &&
        current.claimBed === status.claimBed
      ) {
        return previous;
      }
      return { ...previous, [doctorId]: status };
    });
  }, []);

  const statusList = Object.values(statuses);
  const connectedCount = statusList.filter(
    (status) => status.connection === "online",
  ).length;
  const alertStatus = statusList.find((status) => status.alertBed) ?? null;
  const claimStatus = statusList.find((status) => status.claimDoctorName) ?? null;

  const alertBed = alertStatus?.alertBed ?? null;
  const alertNews2 = alertStatus?.alertNews2 ?? null;
  const claimDoctorName = claimStatus?.claimDoctorName ?? null;
  const claimBed = claimStatus?.claimBed ?? claimStatus?.alertBed ?? null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <div className="relative mx-auto max-w-[1400px] px-5 pb-14 pt-6 xl:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-panel bg-brand shadow-card">
              <Smartphone className="h-6 w-6 text-white" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-info" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-h2 font-bold tracking-tight text-ink">
                  Cura <span className="text-brand">Health</span>
                </h1>
                <span className="rounded border border-line bg-canvas-alt px-1.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-ink-muted">
                  DISPATCH
                </span>
              </div>
              <p className="text-caption text-ink-muted">
                Selectable physician device simulator · human-verified ·
                first-to-claim
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={NURSE_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-btn border border-line bg-surface px-3 py-2 text-meta font-medium text-ink-muted transition hover:border-field hover:text-ink sm:flex"
            >
              Nursing station
              <ExternalLink className="h-3 w-3" />
            </a>

            <div className="flex items-center gap-2 rounded-btn border border-line bg-surface px-3 py-2">
              <RadioTower className="h-3.5 w-3.5 text-ink-subtle" />
              <span className="font-mono text-meta text-ink">
                {connectedCount}/{DOCTORS.length}
              </span>
              <span className="text-meta text-ink-muted">phones online</span>
            </div>

            <button
              type="button"
              onClick={() => {
                void arm();
              }}
              title={armed ? "Play a test chime" : "Enable the browser alarm"}
              className={`inline-flex items-center gap-2 rounded-btn border px-3.5 py-2 text-meta font-semibold transition ${
                armed
                  ? "border-success/30 bg-success-soft text-success-ink hover:bg-success-soft/80"
                  : "border-warning/30 bg-warning-soft text-warning-ink hover:bg-warning-soft/80"
              }`}
            >
              {armed ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              {armed ? "Audio armed" : "Arm audio alerts"}
            </button>
          </div>
        </header>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-panel border border-line bg-surface px-4 py-2.5 shadow-card">
          <span className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Escalation policy
          </span>
          <span className="h-3 w-px bg-line" />
          <span className="text-meta text-ink-muted">
            Nurse verification pages every on-call device simultaneously
          </span>
          <span className="text-ink-subtle">→</span>
          <span className="text-meta text-ink-muted">
            first accept wins the atomic lock
          </span>
          <span className="text-ink-subtle">→</span>
          <span className="text-meta text-ink-muted">
            competing devices stand down
          </span>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-success/25 bg-success-soft px-2.5 py-1 text-meta text-success-ink md:flex">
            <CheckCircle2 className="h-3 w-3" />
            Synthetic demo · no PHI
          </span>
        </div>

        <main className="mt-6 grid grid-cols-1 justify-center gap-6 xl:grid-cols-[280px_342px_300px] xl:items-start">
          <DoctorRoster
            doctors={DOCTORS}
            statuses={statuses}
            selectedId={selectedDoctorId}
            onSelect={setSelectedDoctorId}
          />

          <div className="flex w-full min-w-0 flex-col items-center xl:w-[342px]">
            <div className="w-full max-w-[342px]">
              {DOCTORS.map((doctor) => (
                <div
                  key={doctor.id}
                  className={
                    selectedDoctorId === doctor.id ? "block" : "hidden"
                  }
                >
                  <DoctorPhone
                    doctor={doctor}
                    playAlarm={playAlarm}
                    onStatus={(status) => handleStatus(doctor.id, status)}
                  />
                </div>
              ))}
            </div>

            <PerspectiveBar
              doctors={DOCTORS}
              statuses={statuses}
              selectedId={selectedDoctorId}
              onSelect={setSelectedDoctorId}
            />
          </div>

          <div className="xl:pt-6">
            <CenterPanel
              connectedCount={connectedCount}
              deviceCount={DOCTORS.length}
              alertBed={alertBed}
              alertNews2={alertNews2}
              claimDoctorName={claimDoctorName}
              claimBed={claimBed}
            />
          </div>
        </main>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-meta text-ink-subtle">
          <span className="flex items-center gap-1.5">
            <ArrowUpRight className="h-3 w-3" />
            Every on-call phone holds an independent WebSocket session to
            ws://localhost:8000/ws
          </span>
          <span className="font-mono">
            nurse:3000 → hub:8000 → doctor:3001
          </span>
        </footer>
      </div>
    </div>
  );
}
