"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  BedDouble,
  CheckCircle2,
  Loader2,
  Radio,
  ShieldCheck,
  Siren,
  Sparkles,
} from "lucide-react";
import { AlertDrawer } from "@/components/AlertDrawer";
import { ActivityFeed } from "@/components/ActivityFeed";
import { BedCard } from "@/components/BedCard";
import { Header } from "@/components/Header";
import { PipelinePanel } from "@/components/PipelinePanel";
import { useHub } from "@/lib/useHub";
import {
  dismissAlert,
  resetSystem,
  startDemo,
  verifyAlert,
} from "@/lib/api";

const BED_ORDER = ["Room-101"];

const BED_META: Record<string, { name: string; context: string }> = {
  "Room-101": {
    name: "Marcus Vance",
    context: "Post-Op Day 1 right hemicolectomy",
  },
};

type ToastTone = "info" | "success" | "error";

export default function NurseDashboardPage() {
  const { connection, beds, alerts, claims, demo, activity } = useHub();
  const [now, setNow] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [closedId, setClosedId] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: ToastTone;
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = (message: string, tone: ToastTone = "info") => {
    setToast({ message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  };

  const sortedAlerts = useMemo(
    () =>
      Object.values(alerts).sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [alerts],
  );
  const pendingAlerts = useMemo(
    () => sortedAlerts.filter((alert) => alert.status === "PENDING_VERIFICATION"),
    [sortedAlerts],
  );
  const latestPendingId = pendingAlerts[0]?.alert_id ?? null;

  useEffect(() => {
    if (latestPendingId && latestPendingId !== closedId) {
      setSelectedId(latestPendingId);
      setDrawerError(null);
    }
  }, [latestPendingId, closedId]);

  useEffect(() => {
    if (selectedId && !alerts[selectedId]) setSelectedId(null);
  }, [alerts, selectedId]);

  const selectedAlert = selectedId ? (alerts[selectedId] ?? null) : null;
  const selectedClaim = selectedAlert
    ? claims[selectedAlert.alert_id]
    : undefined;
  const drawerOpen = Boolean(selectedAlert);

  const artifactCount = Object.values(beds).filter(
    (bed) => bed.telemetry.filter_status === "ARTIFACT_SUPPRESSED",
  ).length;
  const activeEscalations = sortedAlerts.filter(
    (alert) => alert.status === "VERIFIED" || alert.status === "CLAIMED",
  ).length;
  const claimCount = Object.keys(claims).length;
  const activeBedCount = Object.keys(beds).length;

  const handleRunDemo = async () => {
    setDemoBusy(true);
    setClosedId(null);
    setSelectedId(null);
    setDrawerError(null);
    try {
      const response = await startDemo();
      showToast(
        `${response.message} ETA ${response.eta_seconds}s.`,
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Demo trigger failed.",
        "error",
      );
    } finally {
      setDemoBusy(false);
    }
  };

  const handleReset = async () => {
    setResetBusy(true);
    setSelectedId(null);
    setClosedId(null);
    setDrawerError(null);
    try {
      const response = await resetSystem();
      showToast(response.message, "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Reset failed.",
        "error",
      );
    } finally {
      setResetBusy(false);
    }
  };

  const handleVerify = async (alertId: string) => {
    setActionBusy(true);
    setDrawerError(null);
    try {
      await verifyAlert(alertId);
      showToast("Verified — all on-call physicians notified.", "success");
    } catch (error) {
      setDrawerError(
        error instanceof Error ? error.message : "Verification failed.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleDismiss = async (alertId: string) => {
    setActionBusy(true);
    setDrawerError(null);
    try {
      await dismissAlert(alertId);
      showToast("Alert dismissed. No doctor dispatch triggered.", "info");
    } catch (error) {
      setDrawerError(
        error instanceof Error ? error.message : "Dismissal failed.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleClose = () => {
    if (selectedAlert) setClosedId(selectedAlert.alert_id);
    setSelectedId(null);
  };

  return (
    <div className="relative min-h-screen bg-canvas">
      <div className="relative">
        <Header
          connection={connection}
          now={now}
          demo={demo}
          alerts={sortedAlerts}
          claims={claims}
          demoBusy={demoBusy}
          resetBusy={resetBusy}
          onRunDemo={handleRunDemo}
          onReset={handleReset}
        />

        <main className="mx-auto max-w-[1720px] px-5 pb-16 pt-5 xl:px-8">
          {latestPendingId && !drawerOpen && (
            <button
              type="button"
              onClick={() => {
                setClosedId(null);
                setSelectedId(latestPendingId);
              }}
              className="mb-4 flex w-full items-center justify-between gap-3 rounded-panel border border-danger/30 bg-danger-soft/70 px-4 py-3 text-left transition hover:bg-danger-soft"
            >
              <span className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
                </span>
                <Siren className="h-4 w-4 text-danger" />
                <span className="text-caption font-semibold text-danger-ink">
                  Critical escalation awaiting nurse review —{" "}
                  {pendingAlerts[0]?.bed_id}
                </span>
              </span>
              <span className="rounded-md border border-danger/30 bg-surface px-2.5 py-1 text-meta font-semibold text-danger-ink">
                Review SBAR
              </span>
            </button>
          )}

          <section className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <div className="rounded-panel border border-line bg-surface px-4 py-3 shadow-card">
              <div className="flex items-center gap-2 text-ink-muted">
                <BedDouble className="h-3.5 w-3.5" />
                <span className="text-meta font-semibold uppercase tracking-[0.14em]">
                  Room monitored
                </span>
              </div>
              <p className="mt-1 font-mono text-2xl font-semibold text-ink">
                {activeBedCount}
                <span className="ml-1 text-body font-normal text-ink-subtle">
                  / 1
                </span>
              </p>
            </div>
            <div className="rounded-panel border border-line bg-surface px-4 py-3 shadow-card">
              <div className="flex items-center gap-2 text-ink-muted">
                <BellRing className="h-3.5 w-3.5" />
                <span className="text-meta font-semibold uppercase tracking-[0.14em]">
                  Active escalations
                </span>
              </div>
              <p
                className={`mt-1 font-mono text-2xl font-semibold ${
                  activeEscalations > 0 ? "text-danger" : "text-ink"
                }`}
              >
                {activeEscalations}
              </p>
            </div>
            <div className="rounded-panel border border-line bg-surface px-4 py-3 shadow-card">
              <div className="flex items-center gap-2 text-ink-muted">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="text-meta font-semibold uppercase tracking-[0.14em]">
                  Artifacts filtered
                </span>
              </div>
              <p
                className={`mt-1 font-mono text-2xl font-semibold ${
                  artifactCount > 0 ? "text-warning-ink" : "text-ink"
                }`}
              >
                {artifactCount}
                <span className="ml-1 text-meta font-normal text-ink-subtle">
                  local only
                </span>
              </p>
            </div>
            <div className="rounded-panel border border-line bg-surface px-4 py-3 shadow-card">
              <div className="flex items-center gap-2 text-ink-muted">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-meta font-semibold uppercase tracking-[0.14em]">
                  Physician claims
                </span>
              </div>
              <p
                className={`mt-1 font-mono text-2xl font-semibold ${
                  claimCount > 0 ? "text-success-ink" : "text-ink"
                }`}
              >
                {claimCount}
                <span className="ml-1 text-meta font-normal text-ink-subtle">
                  first-to-claim
                </span>
              </p>
            </div>
          </section>

          <section className="mb-5">
            <div className="mb-2.5 flex items-end justify-between">
              <div>
                <h2 className="text-caption font-semibold uppercase tracking-[0.16em] text-ink">
                  Live room telemetry
                </h2>
                <p className="mt-0.5 text-caption text-ink-muted">
                  Continuous edge-scored vitals · NEWS2 composite risk · 1.5
                  second refresh
                </p>
              </div>
              <div className="hidden items-center gap-1.5 text-meta text-ink-muted sm:flex">
                <Radio className="h-3 w-3 text-success" />
                {connection === "online"
                  ? "WebSocket synchronized"
                  : "Reconnecting to central hub"}
              </div>
            </div>
            <div className="grid gap-3 grid-cols-1">
              {BED_ORDER.map((bedId) => {
                const bed = beds[bedId];
                const meta = BED_META[bedId];
                return (
                  <BedCard
                    key={bedId}
                    bedId={bedId}
                    patientName={bed?.telemetry.patient_name ?? meta.name}
                    patientContext={
                      bed?.telemetry.patient_context ?? meta.context
                    }
                    bed={bed}
                    now={now}
                  />
                );
              })}
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
            <ActivityFeed activity={activity} now={now} />
            <PipelinePanel
              connection={connection}
              bedCount={activeBedCount}
              artifactCount={artifactCount}
              alertCount={sortedAlerts.length}
              claimCount={claimCount}
            />
          </div>

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-meta text-ink-subtle">
            <span>
              Cura Health · synthetic demonstration · no protected health
              information
            </span>
            <span className="font-mono">
              edge:8001 → hub:8000 · nurse:3000 · doctor:3001
            </span>
          </footer>
        </main>
      </div>

      <AlertDrawer
        alert={selectedAlert}
        claim={selectedClaim}
        open={drawerOpen}
        busy={actionBusy}
        error={drawerError}
        onClose={handleClose}
        onVerify={handleVerify}
        onDismiss={handleDismiss}
      />

      {toast && (
        <div className="animate-toast fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-panel border border-line bg-surface px-4 py-3 shadow-pop">
          {toast.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-ink" />
          ) : toast.tone === "error" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          ) : (
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          )}
          <p className="text-caption leading-relaxed text-ink">
            {toast.message}
          </p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 text-ink-subtle hover:text-ink"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {demoBusy && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-6">
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-meta text-ink-muted shadow-pop">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
            Resetting ward and accelerating Room-101…
          </div>
        </div>
      )}
    </div>
  );
}
