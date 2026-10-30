"use client";

import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldAlert,
  Siren,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import type { AlertPacket, ClaimRecord } from "@cura-health/contracts";

interface AlertDrawerProps {
  alert: AlertPacket | null;
  claim?: ClaimRecord;
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onVerify: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

const SBAR_SECTIONS = [
  {
    key: "situation" as const,
    letter: "S",
    title: "Situation",
    accent: "border-danger/20 bg-danger-soft/50",
    badge: "bg-danger-soft text-danger-ink border-danger/30",
  },
  {
    key: "background" as const,
    letter: "B",
    title: "Background",
    accent: "border-info/20 bg-info/5",
    badge: "bg-info/10 text-info border-info/25",
  },
  {
    key: "assessment" as const,
    letter: "A",
    title: "Assessment",
    accent: "border-warning/25 bg-warning-soft/50",
    badge: "bg-warning-soft text-warning-ink border-warning/30",
  },
  {
    key: "recommendation" as const,
    letter: "R",
    title: "Recommendation",
    accent: "border-success/25 bg-success-soft/50",
    badge: "bg-success-soft text-success-ink border-success/30",
  },
];

function statusMeta(alert: AlertPacket, claim?: ClaimRecord) {
  if (claim) {
    return {
      label: "CASE CLAIMED",
      detail: `${claim.doctor_name} is en route`,
      className: "border-success/30 bg-success-soft text-success-ink",
    };
  }
  switch (alert.status) {
    case "VERIFIED":
      return {
        label: "ESCALATED",
        detail: "Awaiting on-call physician claim",
        className: "border-brand/25 bg-brand-soft text-brand",
      };
    case "DISMISSED":
      return {
        label: "DISMISSED",
        detail: "Closed at nursing station",
        className: "border-line bg-canvas-alt text-ink-muted",
      };
    case "CLAIMED":
      return {
        label: "CLAIMED",
        detail: "Physician responding",
        className: "border-success/30 bg-success-soft text-success-ink",
      };
    default:
      return {
        label: "PENDING VERIFICATION",
        detail: "Nurse decision required",
        className: "border-danger/30 bg-danger-soft text-danger-ink",
      };
  }
}

export function AlertDrawer({
  alert,
  claim,
  open,
  busy,
  error,
  onClose,
  onVerify,
  onDismiss,
}: AlertDrawerProps) {
  if (!open || !alert) return null;
  const pending = alert.status === "PENDING_VERIFICATION";
  const meta = statusMeta(alert, claim);
  const time = new Date(alert.timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/35 backdrop-blur-[3px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Incoming alert triage"
        className={`animate-drawer relative flex h-full w-full max-w-[610px] flex-col border-l bg-surface ${
          pending
            ? "alert-pulse border-danger/40"
            : "border-line shadow-pop"
        }`}
      >
        <div className="border-b border-line bg-gradient-to-r from-danger-soft/80 via-surface to-surface px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-panel border border-danger/25 bg-danger-soft">
                <Siren className="h-6 w-6 text-danger" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-danger/30 bg-danger-soft px-2 py-0.5 font-mono text-meta font-bold tracking-[0.14em] text-danger-ink">
                    {alert.severity}
                  </span>
                  <span className={`rounded border px-2 py-0.5 font-mono text-meta font-bold tracking-[0.1em] ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>
                <h2 className="mt-2 text-h2 font-bold tracking-tight text-ink">
                  {alert.bed_id} · {alert.patient_name}
                </h2>
                <p className="text-caption text-ink-muted">
                  {alert.patient_context} · edge brief generated {time}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-btn border border-line bg-surface p-2 text-ink-muted transition hover:bg-canvas-alt hover:text-ink"
              aria-label="Close alert drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-panel border border-danger/25 bg-danger-soft/60 px-3 py-2">
              <p className="text-meta font-semibold tracking-[0.14em] text-ink-muted">
                NEWS2
              </p>
              <p className="font-mono text-2xl font-bold text-danger-ink">
                {alert.news2_score}
              </p>
            </div>
            <div className="rounded-panel border border-line bg-canvas px-3 py-2">
              <p className="text-meta font-semibold tracking-[0.14em] text-ink-muted">
                SBAR SOURCE
              </p>
              <p className="mt-1 flex items-center gap-1 text-caption font-semibold text-ink">
                <BrainCircuit className="h-3.5 w-3.5 text-brand" />
                {alert.sbar_source === "GEMINI" ? "Gemini" : alert.sbar_source === "OPENAI" ? "OpenAI" : "Edge fallback"}
              </p>
            </div>
            <div className="rounded-panel border border-line bg-canvas px-3 py-2">
              <p className="text-meta font-semibold tracking-[0.14em] text-ink-muted">
                ALERT ID
              </p>
              <p className="mt-1 truncate font-mono text-meta text-ink-muted">
                {alert.alert_id}
              </p>
            </div>
          </div>
        </div>

        <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {SBAR_SECTIONS.map((section) => (
            <section
              key={section.key}
              className={`rounded-panel border px-3.5 py-3 ${section.accent}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border font-mono text-meta font-bold ${section.badge}`}
                >
                  {section.letter}
                </span>
                <h3 className="text-meta font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  {section.title}
                </h3>
              </div>
              <p className="mt-1.5 text-body leading-relaxed text-ink">
                {alert.sbar[section.key]}
              </p>
            </section>
          ))}

          <section className="rounded-panel border border-line bg-canvas px-3.5 py-3">
            <h3 className="text-meta font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Deterministic NEWS2 breakdown
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {alert.news2_components.map((component) => (
                <span
                  key={component.parameter}
                  className={`rounded border px-2 py-1 font-mono text-meta ${
                    component.score > 0
                      ? "border-warning/30 bg-warning-soft text-warning-ink"
                      : "border-line bg-surface text-ink-muted"
                  }`}
                >
                  {component.label} {Math.round(component.value)} · +{component.score}
                </span>
              ))}
            </div>
          </section>

          {claim && (
            <section className="flex items-start gap-3 rounded-panel border border-success/25 bg-success-soft/60 px-3.5 py-3">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-ink" />
              <div>
                <p className="text-caption font-semibold text-success-ink">
                  {claim.doctor_name} claimed this case
                </p>
                <p className="text-meta text-success-ink/80">
                  First-to-claim lock confirmed at{" "}
                  {new Date(claim.claimed_at).toLocaleTimeString("en-GB")} · other
                  responders stood down
                </p>
              </div>
            </section>
          )}

          {alert.status === "VERIFIED" && !claim && (
            <section className="flex items-center gap-3 rounded-panel border border-brand/25 bg-brand-soft px-3.5 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
              <div>
                <p className="text-caption font-semibold text-brand">
                  Push delivered to every on-call physician
                </p>
                <p className="text-meta text-brand/75">
                  Waiting for the atomic first-to-claim acknowledgement.
                </p>
              </div>
            </section>
          )}

          {alert.status === "DISMISSED" && (
            <section className="flex items-center gap-3 rounded-panel border border-line bg-canvas-alt px-3.5 py-3">
              <XCircle className="h-4 w-4 text-ink-muted" />
              <div>
                <p className="text-caption font-semibold text-ink">
                  Recorded as non-actionable
                </p>
                <p className="text-meta text-ink-muted">
                  No doctor dispatch was triggered for this alert.
                </p>
              </div>
            </section>
          )}

          {error && (
            <p className="rounded-btn border border-danger/30 bg-danger-soft px-3 py-2 text-caption text-danger-ink">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-line bg-surface px-5 py-4">
          {pending ? (
            <>
              <div className="mb-3 flex items-center gap-2 text-meta text-ink-muted">
                <ShieldAlert className="h-3.5 w-3.5 text-danger" />
                Verify to trigger synchronized doctor dispatch. Dismiss suppresses the
                alarm for this episode.
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => onDismiss(alert.alert_id)}
                  disabled={busy}
                  className="flex-1 rounded-btn border border-field bg-surface px-4 py-3 text-body font-semibold text-ink-muted transition hover:bg-canvas-alt hover:text-ink disabled:opacity-50"
                >
                  Dismiss as Artifact
                </button>
                <button
                  type="button"
                  onClick={() => onVerify(alert.alert_id)}
                  disabled={busy}
                  className="flex flex-[1.4] items-center justify-center gap-2 rounded-btn bg-danger px-4 py-3 text-body font-bold text-white shadow-card transition hover:bg-[#dc2626] disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  Verify & Escalate
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {claim ? (
                  <CheckCircle2 className="h-4 w-4 text-success-ink" />
                ) : alert.status === "VERIFIED" ? (
                  <Clock3 className="h-4 w-4 text-brand" />
                ) : (
                  <XCircle className="h-4 w-4 text-ink-muted" />
                )}
                <p className="text-caption text-ink-muted">{meta.detail}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-btn border border-line bg-surface px-4 py-2 text-caption font-semibold text-ink-muted transition hover:bg-canvas-alt hover:text-ink"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
