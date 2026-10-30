"use client";

import { useEffect, useState } from "react";
import type {
  AlertPacket,
  ClaimRecord,
  DemoState,
  EnrichedTelemetry,
  ServerEvent,
  StateSnapshot,
} from "@cura-health/contracts";

export type ConnectionState = "connecting" | "online" | "offline";

export interface BedView {
  telemetry: EnrichedTelemetry;
  history: EnrichedTelemetry[];
}

export type ActivityKind =
  | "alert"
  | "verify"
  | "dismiss"
  | "claim"
  | "demo"
  | "reset"
  | "system";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  at: string;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";
const EMPTY_DEMO: DemoState = {
  active: false,
  started_at: null,
  target_bed_id: null,
  eta_seconds: null,
};

export function useHub() {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [beds, setBeds] = useState<Record<string, BedView>>({});
  const [alerts, setAlerts] = useState<Record<string, AlertPacket>>({});
  const [claims, setClaims] = useState<Record<string, ClaimRecord>>({});
  const [demo, setDemo] = useState<DemoState>(EMPTY_DEMO);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let stopped = false;
    let retry = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let socket: WebSocket | null = null;

    const record = (
      kind: ActivityKind,
      title: string,
      detail: string,
      at = new Date().toISOString(),
    ) => {
      setActivity((previous) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            kind,
            title,
            detail,
            at,
          },
          ...previous,
        ].slice(0, 40),
      );
    };

    const applySnapshot = (snapshot: StateSnapshot) => {
      setBeds((previous) => {
        const next: Record<string, BedView> = {};
        for (const [bedId, telemetry] of Object.entries(snapshot.beds)) {
          const history = previous[bedId]
            ? [...previous[bedId].history, telemetry].slice(-36)
            : [telemetry];
          next[bedId] = { telemetry, history };
        }
        return next;
      });
      setAlerts(
        Object.fromEntries(snapshot.alerts.map((alert) => [alert.alert_id, alert])),
      );
      setClaims(snapshot.claims);
      setDemo(snapshot.demo);
    };

    const connect = () => {
      if (stopped) return;
      setConnection("connecting");
      const ws = new WebSocket(WS_URL);
      socket = ws;

      ws.onopen = () => {
        retry = 0;
        setConnection("online");
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("PING");
        }, 20000);
      };

      ws.onmessage = (message) => {
        let event: ServerEvent | { type: "PONG"; data: unknown };
        try {
          event = JSON.parse(message.data as string);
        } catch {
          return;
        }
        switch (event.type) {
          case "STATE_SNAPSHOT":
            applySnapshot(event.data);
            break;
          case "TELEMETRY_STREAM": {
            const telemetry = event.data;
            setBeds((previous) => {
              const history = previous[telemetry.bed_id]
                ? [...previous[telemetry.bed_id].history, telemetry].slice(-36)
                : [telemetry];
              return {
                ...previous,
                [telemetry.bed_id]: { telemetry, history },
              };
            });
            break;
          }
          case "ALERT_NEW":
            setAlerts((previous) => ({
              ...previous,
              [event.data.alert_id]: event.data,
            }));
            record(
              "alert",
              `NEWS2 ${event.data.news2_score} alert — ${event.data.bed_id}`,
              `${event.data.patient_name} · edge SBAR ready for nurse verification`,
              event.data.timestamp,
            );
            break;
          case "ALERT_VERIFIED":
            setAlerts((previous) => ({
              ...previous,
              [event.data.alert_id]: event.data,
            }));
            record(
              "verify",
              `Alert verified — ${event.data.bed_id}`,
              "Escalated to all on-call physicians",
              event.data.timestamp,
            );
            break;
          case "ALERT_DISMISSED":
            setAlerts((previous) => ({
              ...previous,
              [event.data.alert_id]: event.data,
            }));
            record(
              "dismiss",
              `Alert dismissed — ${event.data.bed_id}`,
              "Nurse marked the event as non-actionable",
              event.data.timestamp,
            );
            break;
          case "CASE_CLAIMED":
            setClaims((previous) => ({
              ...previous,
              [event.data.alert_id]: event.data,
            }));
            setAlerts((previous) => {
              const alert = previous[event.data.alert_id];
              if (!alert) return previous;
              return {
                ...previous,
                [event.data.alert_id]: { ...alert, status: "CLAIMED" },
              };
            });
            record(
              "claim",
              `${event.data.doctor_name} claimed the case`,
              `Bed ${event.data.alert_id.replace("alt_", "")} · ${event.data.doctor_name} is en route`,
              event.data.claimed_at,
            );
            break;
          case "SYSTEM_RESET":
            applySnapshot(event.data);
            record(
              "reset",
              "Ward state reset",
              "All alerts, claims, and telemetry baselines cleared",
            );
            break;
          case "DEMO_STARTED":
            setDemo(event.data);
            record(
              "demo",
              "Demo scenario armed",
              "Room-101 is decompensating — watch NEWS2 climb",
            );
            break;
          case "PONG":
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (stopped) return;
        setConnection("offline");
        const delay = Math.min(6000, 600 * 2 ** Math.min(retry, 4));
        retry += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      socket?.close();
    };
  }, []);

  return { connection, beds, alerts, claims, demo, activity };
}
