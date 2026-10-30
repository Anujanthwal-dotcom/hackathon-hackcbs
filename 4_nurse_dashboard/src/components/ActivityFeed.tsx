"use client";

import {
  CheckCircle2,
  Play,
  Radio,
  RotateCcw,
  Siren,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { ActivityItem } from "@/lib/useHub";

function iconFor(kind: ActivityItem["kind"]) {
  switch (kind) {
    case "alert":
      return { Icon: Siren, className: "border-danger/25 bg-danger-soft text-danger" };
    case "verify":
      return {
        Icon: CheckCircle2,
        className: "border-brand/25 bg-brand-soft text-brand",
      };
    case "dismiss":
      return {
        Icon: XCircle,
        className: "border-line bg-canvas-alt text-ink-muted",
      };
    case "claim":
      return {
        Icon: UserCheck,
        className: "border-success/25 bg-success-soft text-success-ink",
      };
    case "demo":
      return {
        Icon: Play,
        className: "border-info/25 bg-info/10 text-info",
      };
    case "reset":
      return {
        Icon: RotateCcw,
        className: "border-line bg-canvas-alt text-ink-muted",
      };
    default:
      return {
        Icon: Radio,
        className: "border-line bg-canvas-alt text-ink-subtle",
      };
  }
}

function ago(iso: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function ActivityFeed({
  activity,
  now,
}: {
  activity: ActivityItem[];
  now: number;
}) {
  return (
    <section className="rounded-card border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-caption font-semibold uppercase tracking-[0.16em] text-ink">
            Escalation timeline
          </h2>
          <p className="mt-0.5 text-meta text-ink-muted">
            Human decisions and agent events in this session
          </p>
        </div>
        <span className="rounded-full border border-line bg-canvas-alt px-2 py-0.5 font-mono text-meta text-ink-muted">
          {activity.length} events
        </span>
      </div>
      <div className="scrollbar-thin max-h-[300px] overflow-y-auto px-3 py-2">
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Radio className="h-5 w-5 text-ink-subtle" />
            <p className="mt-2 text-caption text-ink-muted">
              No escalation activity yet.
            </p>
            <p className="text-meta text-ink-subtle">
              Run the demo to watch the full nurse-to-doctor handoff.
            </p>
          </div>
        ) : (
          activity.map((item) => {
            const { Icon, className } = iconFor(item.kind);
            return (
              <div
                key={item.id}
                className="flex gap-3 rounded-panel px-2 py-2.5 transition hover:bg-canvas"
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-btn border ${className}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-caption font-medium text-ink">
                      {item.title}
                    </p>
                    <span className="shrink-0 font-mono text-meta text-ink-subtle">
                      {ago(item.at, now)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-meta text-ink-muted">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
