"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Clock3,
  Hand,
  Loader2,
  LockKeyhole,
  MoonStar,
  Radio,
  ShieldCheck,
  Siren,
  Stethoscope,
  XCircle,
} from "lucide-react";
import type { Doctor } from "@/lib/doctors";
import { ACCENT_STYLES } from "@/lib/doctors";
import type { ConnectionState } from "@/lib/useDoctorPhone";
import { useDoctorPhone } from "@/lib/useDoctorPhone";
import type { AlertPacket, ClaimRecord } from "@cura-health/contracts";
import { PhoneFrame } from "./PhoneFrame";

export interface PhoneStatus {
  connection: ConnectionState;
  alertBed: string | null;
  alertNews2: number | null;
  claimDoctorId: string | null;
  claimDoctorName: string | null;
  claimBed: string | null;
}

interface DoctorPhoneProps {
  doctor: Doctor;
  playAlarm: () => void;
  onStatus: (status: PhoneStatus) => void;
}

function fmtTime(iso?: string | null) {
  if (!iso) return "--:--:--";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const SBAR_BLOCKS = [
  {
    key: "situation" as const,
    letter: "S",
    title: "Situation",
    className: "border-danger/20 bg-danger-soft/60",
    badge: "border-danger/30 bg-danger-soft text-danger-ink",
    heading: "text-danger-ink",
  },
  {
    key: "background" as const,
    letter: "B",
    title: "Background",
    className: "border-info/20 bg-info/5",
    badge: "border-info/25 bg-info/10 text-info",
    heading: "text-info",
  },
  {
    key: "assessment" as const,
    letter: "A",
    title: "Assessment",
    className: "border-warning/25 bg-warning-soft/60",
    badge: "border-warning/30 bg-warning-soft text-warning-ink",
    heading: "text-warning-ink",
  },
  {
    key: "recommendation" as const,
    letter: "R",
    title: "Recommendation",
    className: "border-success/25 bg-success-soft/60",
    badge: "border-success/30 bg-success-soft text-success-ink",
    heading: "text-success-ink",
  },
];

function ConnectionBadge({ connection }: { connection: ConnectionState }) {
  const online = connection === "online";
  const connecting = connection === "connecting";
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "bg-success" : connecting ? "bg-warning" : "bg-danger"
        }`}
      />
      <span
        className={`font-mono text-[10px] font-semibold tracking-[0.1em] ${
          online
            ? "text-success-ink"
            : connecting
              ? "text-warning-ink"
              : "text-danger-ink"
        }`}
      >
        {online ? "LIVE" : connecting ? "SYNC" : "OFFLINE"}
      </span>
    </div>
  );
}

function PatientSummary({
  alert,
  claim,
}: {
  alert: AlertPacket;
  claim: ClaimRecord;
}) {
  const component = (parameter: string) =>
    alert.news2_components.find((item) => item.parameter === parameter)?.value;
  const hr = component("heart_rate");
  const sbp = component("systolic_bp");
  const spo2 = component("spo2");

  return (
    <div className="mx-4 mb-4 rounded-panel border border-success/25 bg-success-soft/70 px-3 py-2.5 text-left">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-success-ink">
          HANDOFF SNAPSHOT
        </p>
        <p className="font-mono text-[10px] text-success-ink/80">
          {fmtTime(claim.claimed_at)}
        </p>
      </div>
      <p className="mt-1 text-caption font-semibold text-ink">
        {alert.patient_name}
      </p>
      <p className="text-meta text-ink-muted">{alert.patient_context}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {hr !== undefined && (
          <span className="rounded border border-success/30 bg-surface px-1.5 py-0.5 font-mono text-[10px] text-success-ink">
            HR {Math.round(hr)}
          </span>
        )}
        {sbp !== undefined && (
          <span className="rounded border border-success/30 bg-surface px-1.5 py-0.5 font-mono text-[10px] text-success-ink">
            SBP {Math.round(sbp)}
          </span>
        )}
        {spo2 !== undefined && (
          <span className="rounded border border-success/30 bg-surface px-1.5 py-0.5 font-mono text-[10px] text-success-ink">
            SpO2 {Math.round(spo2)}%
          </span>
        )}
        <span className="rounded border border-success/30 bg-surface px-1.5 py-0.5 font-mono text-[10px] text-success-ink">
          NEWS2 {alert.news2_score}
        </span>
      </div>
    </div>
  );
}

export function DoctorPhone({ doctor, playAlarm, onStatus }: DoctorPhoneProps) {
  const accentStyle = ACCENT_STYLES[doctor.accent];
  const handleVerified = useCallback(() => {
    playAlarm();
  }, [playAlarm]);

  const {
    connection,
    alert,
    claim,
    demo,
    claiming,
    claimError,
    claimCaseNow,
  } = useDoctorPhone(doctor.id, doctor.name, handleVerified);

  const statusRef = useRef(onStatus);
  useEffect(() => {
    statusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    statusRef.current({
      connection,
      alertBed: alert?.bed_id ?? null,
      alertNews2: alert?.news2_score ?? null,
      claimDoctorId: claim?.doctor_id ?? null,
      claimDoctorName: claim?.doctor_name ?? null,
      claimBed: alert?.bed_id ?? null,
    });
  }, [alert, claim, connection]);

  const isWinner = Boolean(claim && alert && claim.doctor_id === doctor.id);
  const isStandDown = Boolean(claim && alert && claim.doctor_id !== doctor.id);

  let screen: React.ReactNode;

  if (isWinner && claim && alert) {
    screen = (
      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-success-soft/70 via-canvas to-canvas">
        <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-success/30 bg-success-soft">
            <span className="absolute inset-0 rounded-full border border-success/20" />
            <CheckCircle2 className="h-10 w-10 text-success-ink" />
          </div>
          <span className="mt-5 rounded-full border border-success/30 bg-success-soft px-3 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-success-ink">
            CASE LOCKED
          </span>
          <h2 className="mt-3 text-h2 font-bold leading-tight text-ink">
            Active Case: {alert.bed_id} — En Route
          </h2>
          <p className="mt-2 text-caption leading-relaxed text-ink-muted">
            {alert.patient_name} · {alert.patient_context}
          </p>

          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            <div className="rounded-panel border border-line bg-surface px-2.5 py-2 text-left shadow-card">
              <p className="text-[10px] tracking-[0.12em] text-ink-muted">NEWS2</p>
              <p className="font-mono text-xl font-bold text-danger">
                {alert.news2_score}
              </p>
            </div>
            <div className="rounded-panel border border-line bg-surface px-2.5 py-2 text-left shadow-card">
              <p className="text-[10px] tracking-[0.12em] text-ink-muted">CLAIMED</p>
              <p className="mt-1 font-mono text-caption text-ink">
                {fmtTime(claim.claimed_at)}
              </p>
            </div>
          </div>
        </div>

        <PatientSummary alert={alert} claim={claim} />

        <div className="border-t border-line bg-surface px-4 py-3">
          <p className="flex items-center justify-center gap-1.5 text-meta text-success-ink">
            <ShieldCheck className="h-3.5 w-3.5" />
            Other responders automatically stood down
          </p>
        </div>
      </div>
    );
  } else if (isStandDown && claim && alert) {
    screen = (
      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-warning-soft/50 via-canvas to-canvas">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-warning/30 bg-warning-soft">
            <XCircle className="h-10 w-10 text-warning-ink" />
          </div>
          <span className="mt-5 rounded-full border border-line bg-canvas-alt px-3 py-1 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-muted">
            CASE LOCKED ELSEWHERE
          </span>
          <h2 className="mt-3 text-h2 font-bold leading-tight text-ink">
            Claimed by {claim.doctor_name} — Stand Down
          </h2>
          <p className="mt-2 text-caption leading-relaxed text-ink-muted">
            {alert.bed_id} · first-to-claim lock is held by another physician.
            No action required from you.
          </p>

          <div className="mt-5 w-full rounded-panel border border-line bg-surface px-3 py-3 text-left shadow-card">
            <p className="flex items-center gap-1.5 text-meta font-semibold text-ink">
              <Clock3 className="h-3.5 w-3.5 text-ink-subtle" />
              Claim recorded {fmtTime(claim.claimed_at)}
            </p>
            <p className="mt-1 text-meta leading-relaxed text-ink-muted">
              All on-call responders were notified simultaneously. The hub released
              one atomic winner; every competing claim returned HTTP 409.
            </p>
          </div>
        </div>

        <div className="border-t border-line bg-surface px-4 py-3">
          <p className="flex items-center justify-center gap-1.5 text-meta text-ink-subtle">
            <LockKeyhole className="h-3.5 w-3.5" />
            Atomic dispatch guard · asyncio.Lock
          </p>
        </div>
      </div>
    );
  } else if (alert) {
    screen = (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="alert-screen border-b border-danger/20 bg-danger-soft/70 px-4 pb-3.5 pt-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
            <span className="text-[10px] font-bold tracking-[0.16em] text-danger-ink">
              CRITICAL ESCALATION
            </span>
            <span className="ml-auto rounded border border-danger/30 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-danger-ink">
              NEWS2 {alert.news2_score}
            </span>
          </div>
          <h2 className="mt-2 text-h2 font-bold leading-tight text-ink">
            {alert.bed_id} · {alert.patient_name}
          </h2>
          <p className="mt-0.5 line-clamp-1 text-meta text-ink-muted">
            {alert.patient_context}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-meta text-ink-muted">
            <CheckCircle2 className="h-3 w-3 text-success" />
            Nurse verified · {fmtTime(alert.timestamp)} ·{" "}
            {alert.sbar_source === "GEMINI" ? "Gemini SBAR" : alert.sbar_source === "OPENAI" ? "OpenAI SBAR" : "Edge SBAR"}
          </p>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto px-3.5 py-3">
          {SBAR_BLOCKS.map((block) => (
            <div
              key={block.key}
              className={`rounded-panel border px-2.5 py-2 ${block.className}`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border font-mono text-[10px] font-bold ${block.badge}`}
                >
                  {block.letter}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.12em] ${block.heading}`}
                >
                  {block.title}
                </span>
              </div>
              <p className="mt-1 text-meta leading-relaxed text-ink">
                {alert.sbar[block.key]}
              </p>
            </div>
          ))}

          <div className="flex flex-wrap gap-1 pt-0.5">
            {alert.news2_components
              .filter((component) => component.score > 0)
              .map((component) => (
                <span
                  key={component.parameter}
                  className="rounded border border-warning/25 bg-warning-soft px-1.5 py-0.5 font-mono text-[10px] text-warning-ink"
                >
                  {component.label} {Math.round(component.value)} · +{component.score}
                </span>
              ))}
          </div>
        </div>

        <div className="border-t border-line bg-surface px-4 py-3">
          {claimError && (
            <p className="mb-2 rounded-btn border border-danger/30 bg-danger-soft px-2 py-1.5 text-meta leading-relaxed text-danger-ink">
              {claimError}
            </p>
          )}
          <button
            type="button"
            onClick={claimCaseNow}
            disabled={claiming}
            className="flex w-full items-center justify-center gap-2 rounded-btn bg-danger px-4 py-3.5 text-body font-bold text-white shadow-card transition hover:bg-[#dc2626] active:scale-[0.99] disabled:opacity-60"
          >
            {claiming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Hand className="h-4 w-4" />
            )}
            {claiming ? "Claiming case…" : "Accept Case"}
          </button>
          <p className="mt-2 flex items-center justify-center gap-1 text-center text-meta text-ink-muted">
            <LockKeyhole className="h-3 w-3" />
            First physician to accept locks the case · others stand down
          </p>
        </div>
      </div>
    );
  } else {
    screen = (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-card border border-line bg-surface shadow-card">
            <MoonStar className="h-7 w-7 text-ink-subtle" />
            {demo.active && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-surface bg-brand" />
            )}
          </div>
          <p className="mt-4 text-body font-semibold text-ink">
            No active escalations
          </p>
          <p className="mt-1 max-w-[230px] text-meta leading-relaxed text-ink-muted">
            Listening to the central hub. You will be paged when the nursing
            station verifies a critical deterioration.
          </p>

          {demo.active && (
            <div className="mt-5 w-full rounded-panel border border-brand/20 bg-brand-soft px-3 py-2.5 text-left">
              <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-brand">
                <Radio className="h-3 w-3" />
                DEMO LIVE · BED-103
              </p>
              <p className="mt-1 text-meta leading-relaxed text-brand/80">
                Post-op deterioration in progress. Edge agent is scoring NEWS2
                and preparing the SBAR brief.
              </p>
            </div>
          )}

          <div className="mt-6 w-full space-y-2 rounded-panel border border-line bg-surface px-3 py-3 text-left shadow-card">
            {[
              { icon: Stethoscope, text: "Nurse verifies the edge alert" },
              { icon: Siren, text: "All on-call phones ring together" },
              { icon: LockKeyhole, text: "First accept wins the atomic lock" },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.text} className="flex items-center gap-2">
                  <Icon className="h-3 w-3 shrink-0 text-ink-subtle" />
                  <span className="text-meta text-ink-muted">{step.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-line bg-surface px-4 py-3">
          <p className="flex items-center justify-center gap-1.5 text-meta text-ink-subtle">
            <LockKeyhole className="h-3 w-3" />
            Secure physician channel · ward 4B
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-phone">
      <PhoneFrame accent={doctor.accent} caption={doctor.device}>
        <div className="flex shrink-0 items-center gap-2.5 border-b border-line bg-surface px-4 py-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-panel border font-mono text-meta font-bold ${accentStyle.avatar}`}
          >
            {doctor.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-caption font-semibold text-ink">
              {doctor.name}
            </p>
            <p className={`truncate text-[10px] font-medium ${accentStyle.text}`}>
              {doctor.role}
            </p>
          </div>
          <ConnectionBadge connection={connection} />
        </div>

        {screen}

        <div className="flex shrink-0 items-center justify-between border-t border-line bg-surface px-4 py-2">
          <span className="font-mono text-[9px] tracking-[0.12em] text-ink-subtle">
            ON-CALL · WARD 4B
          </span>
          <span className="font-mono text-[9px] text-ink-subtle">
            {doctor.id}
          </span>
        </div>
      </PhoneFrame>
    </div>
  );
}
