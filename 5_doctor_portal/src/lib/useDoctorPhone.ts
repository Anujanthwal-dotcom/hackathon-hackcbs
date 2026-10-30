"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AlertPacket,
  ClaimRecord,
  DemoState,
  ServerEvent,
  StateSnapshot,
} from "@cura-health/contracts";
import { claimCase } from "./api";

export type ConnectionState = "connecting" | "online" | "offline";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";
const EMPTY_DEMO: DemoState = {
  active: false,
  started_at: null,
  target_bed_id: null,
  eta_seconds: null,
};

function activeAlertFromSnapshot(snapshot: StateSnapshot): AlertPacket | null {
  const active = snapshot.alerts
    .filter(
      (alert) => alert.status === "VERIFIED" || alert.status === "CLAIMED",
    )
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  return active[0] ?? null;
}

export function useDoctorPhone(
  doctorId: string,
  doctorName: string,
  onVerified: () => void,
) {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [alert, setAlert] = useState<AlertPacket | null>(null);
  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  const [demo, setDemo] = useState<DemoState>(EMPTY_DEMO);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const verifiedRef = useRef(onVerified);

  useEffect(() => {
    verifiedRef.current = onVerified;
  }, [onVerified]);

  useEffect(() => {
    let stopped = false;
    let retry = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let socket: WebSocket | null = null;

    const params = new URLSearchParams({
      role: "doctor",
      doctor_id: doctorId,
      doctor_name: doctorName,
    });
    const url = `${WS_URL}?${params.toString()}`;

    const connect = () => {
      if (stopped) return;
      setConnection("connecting");
      const ws = new WebSocket(url);
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
          case "STATE_SNAPSHOT": {
            const nextAlert = activeAlertFromSnapshot(event.data);
            setAlert(nextAlert);
            setClaim(
              nextAlert ? (event.data.claims[nextAlert.alert_id] ?? null) : null,
            );
            setDemo(event.data.demo);
            break;
          }
          case "ALERT_VERIFIED": {
            setAlert(event.data);
            setClaim(null);
            setClaimError(null);
            verifiedRef.current();
            break;
          }
          case "CASE_CLAIMED": {
            setAlert((previous) => {
              if (!previous || previous.alert_id !== event.data.alert_id) {
                return previous;
              }
              return { ...previous, status: "CLAIMED" };
            });
            setClaim((previous) => {
              if (previous && previous.alert_id !== event.data.alert_id) {
                return previous;
              }
              return event.data;
            });
            break;
          }
          case "ALERT_DISMISSED": {
            setAlert((previous) =>
              previous?.alert_id === event.data.alert_id ? null : previous,
            );
            setClaim((previous) =>
              previous?.alert_id === event.data.alert_id ? null : previous,
            );
            break;
          }
          case "SYSTEM_RESET":
            setAlert(null);
            setClaim(null);
            setClaimError(null);
            setDemo(event.data.demo);
            break;
          case "DEMO_STARTED":
            setDemo(event.data);
            break;
          case "ALERT_NEW":
          case "TELEMETRY_STREAM":
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

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      socket?.close();
    };
  }, [doctorId, doctorName]);

  const claimCaseNow = async () => {
    if (!alert || claiming) return;
    setClaiming(true);
    setClaimError(null);
    try {
      await claimCase(alert.alert_id, doctorId, doctorName);
    } catch (error) {
      setClaimError(
        error instanceof Error ? error.message : "Claim request failed.",
      );
    } finally {
      setClaiming(false);
    }
  };

  return {
    connection,
    alert,
    claim,
    demo,
    claiming,
    claimError,
    claimCaseNow,
  };
}
