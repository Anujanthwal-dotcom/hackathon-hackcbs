import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import type { Doctor } from "../config/doctors";
import { DOCTORS } from "../config/doctors";
import type {
  AlertPacket,
  ClaimRecord,
  DemoState,
  ServerEvent,
  StateSnapshot,
} from "../types/contracts";
import { claimCase, testConnection } from "../services/api";

export type ConnectionState = "connecting" | "online" | "offline";

interface ConnectionContextValue {
  backendUrl: string;
  setBackendUrl: (url: string) => Promise<void>;
  selectedDoctor: Doctor;
  setSelectedDoctor: (doctor: Doctor) => Promise<void>;
  connectionState: ConnectionState;
  alert: AlertPacket | null;
  claim: ClaimRecord | null;
  demo: DemoState;
  claiming: boolean;
  claimError: string | null;
  claimCurrentCase: () => Promise<boolean>;
  refreshConnection: () => void;
}

const STORAGE_KEY_URL = "@cura_backend_url";
const STORAGE_KEY_DOCTOR = "@cura_selected_doctor_id";
const DEFAULT_URL = "http://localhost:8000";

const EMPTY_DEMO: DemoState = {
  active: false,
  started_at: null,
  target_bed_id: null,
  eta_seconds: null,
};

function activeAlertFromSnapshot(snapshot: StateSnapshot): AlertPacket | null {
  const active = snapshot.alerts
    .filter((a) => a.status === "VERIFIED" || a.status === "CLAIMED")
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  return active[0] ?? null;
}

function httpToWsUrl(httpUrl: string, doctor: Doctor): string {
  const clean = httpUrl.replace(/\/+$/, "");
  let ws = clean;
  if (ws.startsWith("http://")) {
    ws = "ws://" + ws.slice(7);
  } else if (ws.startsWith("https://")) {
    ws = "wss://" + ws.slice(8);
  }
  const params = new URLSearchParams({
    role: "doctor",
    doctor_id: doctor.id,
    doctor_name: doctor.name,
  });
  return `${ws}/ws?${params.toString()}`;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [backendUrl, setBackendUrlState] = useState<string>(DEFAULT_URL);
  const [selectedDoctor, setSelectedDoctorState] = useState<Doctor>(DOCTORS[0]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [alert, setAlert] = useState<AlertPacket | null>(null);
  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  const [demo, setDemo] = useState<DemoState>(EMPTY_DEMO);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  // Load saved preferences
  useEffect(() => {
    isMounted.current = true;
    (async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(STORAGE_KEY_URL);
        if (savedUrl) setBackendUrlState(savedUrl);

        const savedDocId = await AsyncStorage.getItem(STORAGE_KEY_DOCTOR);
        if (savedDocId) {
          const doc = DOCTORS.find((d) => d.id === savedDocId);
          if (doc) setSelectedDoctorState(doc);
        }
      } catch (e) {
        console.warn("Error loading stored settings", e);
      }
    })();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const setBackendUrl = useCallback(async (url: string) => {
    const formatted = url.trim().replace(/\/+$/, "");
    setBackendUrlState(formatted);
    await AsyncStorage.setItem(STORAGE_KEY_URL, formatted);
  }, []);

  const setSelectedDoctor = useCallback(async (doctor: Doctor) => {
    setSelectedDoctorState(doctor);
    await AsyncStorage.setItem(STORAGE_KEY_DOCTOR, doctor.id);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {}
      socketRef.current = null;
    }
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (pingTimer.current) clearInterval(pingTimer.current);

    setConnectionState("connecting");

    const wsUrl = httpToWsUrl(backendUrl, selectedDoctor);

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMounted.current) return;
        setConnectionState("online");
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("PING");
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        if (!isMounted.current) return;
        let packet: ServerEvent | { type: "PONG" };
        try {
          packet = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (packet.type) {
          case "STATE_SNAPSHOT": {
            const nextAlert = activeAlertFromSnapshot(packet.data);
            setAlert(nextAlert);
            setClaim(
              nextAlert ? packet.data.claims[nextAlert.alert_id] ?? null : null,
            );
            setDemo(packet.data.demo);
            break;
          }
          case "ALERT_VERIFIED": {
            setAlert(packet.data);
            setClaim(null);
            setClaimError(null);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
            break;
          }
          case "CASE_CLAIMED": {
            setAlert((prev) =>
              prev?.alert_id === packet.data.alert_id
                ? { ...prev, status: "CLAIMED" }
                : prev,
            );
            setClaim((prev) =>
              prev?.alert_id === packet.data.alert_id ? packet.data : prev,
            );
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            break;
          }
          case "ALERT_DISMISSED": {
            setAlert((prev) =>
              prev?.alert_id === packet.data.alert_id ? null : prev,
            );
            setClaim((prev) =>
              prev?.alert_id === packet.data.alert_id ? null : prev,
            );
            break;
          }
          case "SYSTEM_RESET": {
            setAlert(null);
            setClaim(null);
            setClaimError(null);
            setDemo(packet.data.demo);
            break;
          }
          case "DEMO_STARTED": {
            setDemo(packet.data);
            break;
          }
          default:
            break;
        }
      };

      ws.onerror = () => {
        if (!isMounted.current) return;
        setConnectionState("offline");
      };

      ws.onclose = () => {
        if (pingTimer.current) clearInterval(pingTimer.current);
        if (!isMounted.current) return;
        setConnectionState("offline");
        reconnectTimer.current = setTimeout(() => {
          if (isMounted.current) connectWebSocket();
        }, 3000);
      };
    } catch {
      setConnectionState("offline");
    }
  }, [backendUrl, selectedDoctor]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
    };
  }, [connectWebSocket]);

  const claimCurrentCase = useCallback(async (): Promise<boolean> => {
    if (!alert) return false;
    setClaiming(true);
    setClaimError(null);

    const result = await claimCase(
      backendUrl,
      alert.alert_id,
      selectedDoctor.id,
      selectedDoctor.name,
    );

    setClaiming(false);
    if (!result.success) {
      setClaimError(result.error || "Claim failed.");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      return false;
    }
    return true;
  }, [alert, backendUrl, selectedDoctor]);

  const refreshConnection = useCallback(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  return (
    <ConnectionContext.Provider
      value={{
        backendUrl,
        setBackendUrl,
        selectedDoctor,
        setSelectedDoctor,
        connectionState,
        alert,
        claim,
        demo,
        claiming,
        claimError,
        claimCurrentCase,
        refreshConnection,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export function useConnection(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnection must be used within ConnectionProvider");
  return ctx;
}
