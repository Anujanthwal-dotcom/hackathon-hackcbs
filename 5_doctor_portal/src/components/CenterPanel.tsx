"use client";

import {
  Check,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Siren,
  Smartphone,
  Stethoscope,
} from "lucide-react";

interface CenterPanelProps {
  connectedCount: number;
  deviceCount: number;
  alertBed: string | null;
  alertNews2: number | null;
  claimDoctorName: string | null;
  claimBed: string | null;
}

export function CenterPanel({
  connectedCount,
  deviceCount,
  alertBed,
  alertNews2,
  claimDoctorName,
  claimBed,
}: CenterPanelProps) {
  const locked = Boolean(claimDoctorName);
  const dispatched = Boolean(alertBed);
  const bed = claimBed ?? alertBed;
  const deviceNumber = String(deviceCount).padStart(2, "0");

  const steps = [
    {
      icon: Stethoscope,
      title: "Nurse verified",
      detail: alertBed ? `${alertBed} · NEWS2 ${alertNews2 ?? "—"}` : "Awaiting review",
      done: dispatched,
      active: false,
    },
    {
      icon: Siren,
      title: "Concurrent dispatch",
      detail: dispatched
        ? `All ${deviceCount} on-call phones paged`
        : "Triggers on nurse verification",
      done: locked,
      active: dispatched && !locked,
    },
    {
      icon: LockKeyhole,
      title: "Atomic lock",
      detail: locked
        ? `Held by ${claimDoctorName}`
        : "Exactly one claim will win",
      done: locked,
      active: false,
    },
  ];

  return (
    <aside className="mx-auto w-full max-w-[420px] xl:w-[300px] xl:max-w-none">
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-meta font-semibold uppercase tracking-[0.16em] text-ink">
              Race control
            </p>
            <p className="mt-0.5 text-meta text-ink-muted">
              Server-side dispatch arbitration · {deviceCount} devices
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2 py-1 ${
              locked
                ? "border-success/25 bg-success-soft text-success-ink"
                : dispatched
                  ? "border-danger/25 bg-danger-soft text-danger-ink"
                  : "border-line bg-canvas-alt text-ink-muted"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                locked
                  ? "bg-success"
                  : dispatched
                    ? "animate-pulse bg-danger"
                    : "bg-ink-subtle"
              }`}
            />
            <span className="font-mono text-[10px] font-bold tracking-[0.1em]">
              {locked ? "LOCKED" : dispatched ? "OPEN" : "IDLE"}
            </span>
          </div>
        </div>

        {/* device link visual */}
        <div className="mt-4 flex items-center justify-between rounded-panel border border-line bg-canvas px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-info" />
            <span className="font-mono text-meta text-ink">01</span>
          </div>
          <div className="relative mx-2 flex flex-1 items-center">
            <span className="h-px flex-1 bg-gradient-to-r from-info/40 via-line to-brand/40" />
            <span
              className={`mx-1.5 flex h-6 w-6 items-center justify-center rounded-full border ${
                locked
                  ? "border-success/30 bg-success-soft text-success-ink"
                  : dispatched
                    ? "border-danger/30 bg-danger-soft text-danger"
                    : "border-line bg-surface text-ink-subtle"
              }`}
            >
              <LockKeyhole className="h-3 w-3" />
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-brand/40 via-line to-info/40" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-meta text-ink">
              {deviceNumber}
            </span>
            <Smartphone className="h-3.5 w-3.5 text-brand" />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-meta">
          <span className="flex items-center gap-1.5 text-ink-muted">
            <Radio className="h-3 w-3 text-success" />
            {connectedCount} / {deviceCount} phones online
          </span>
          <span className="font-mono text-ink-subtle">asyncio.Lock</span>
        </div>

        <div className="mt-4 space-y-1">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title}>
                <div
                  className={`flex items-center gap-2.5 rounded-panel border px-2.5 py-2 ${
                    step.done
                      ? "border-success/20 bg-success-soft/60"
                      : step.active
                        ? "border-danger/25 bg-danger-soft/60"
                        : "border-transparent bg-canvas"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                      step.done
                        ? "border-success/30 bg-success-soft text-success-ink"
                        : step.active
                          ? "border-danger/30 bg-danger-soft text-danger"
                          : "border-line bg-surface text-ink-subtle"
                    }`}
                  >
                    {step.done ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-meta font-medium ${
                        step.done
                          ? "text-success-ink"
                          : step.active
                            ? "text-danger-ink"
                            : "text-ink-muted"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="truncate text-[10px] text-ink-muted">{step.detail}</p>
                  </div>
                  <span className="font-mono text-[10px] text-ink-subtle">
                    0{index + 1}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="ml-[22px] h-1.5 w-px bg-line" />
                )}
              </div>
            );
          })}
        </div>

        <div
          className={`mt-4 rounded-panel border px-3 py-2.5 ${
            locked
              ? "border-success/25 bg-success-soft/60"
              : "border-line bg-canvas"
          }`}
        >
          {locked ? (
            <>
              <p className="flex items-center gap-1.5 text-meta font-semibold text-success-ink">
                <ShieldCheck className="h-3.5 w-3.5" />
                {claimDoctorName} owns {bed}
              </p>
              <p className="mt-1 text-meta leading-relaxed text-success-ink/80">
                One writer admitted. The competing claims received HTTP 409 and
                the other phones were told to stand down.
              </p>
            </>
          ) : dispatched ? (
            <>
              <p className="flex items-center gap-1.5 text-meta font-semibold text-danger-ink">
                <Siren className="h-3.5 w-3.5" />
                Dispatch open · {bed}
              </p>
              <p className="mt-1 text-meta leading-relaxed text-ink-muted">
                All {deviceCount} devices hold the same alert. The first successful
                POST to
                <span className="font-mono text-ink"> /api/doctor/claim </span>
                wins; the lock is never held across an await.
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-meta font-semibold text-ink-muted">
                <LockKeyhole className="h-3.5 w-3.5" />
                Awaiting escalation
              </p>
              <p className="mt-1 text-meta leading-relaxed text-ink-muted">
                Run the demo on the nursing station. Edge SBAR reaches the hub at
                NEWS2 ≥ 7, then the nurse verification opens the race.
              </p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
