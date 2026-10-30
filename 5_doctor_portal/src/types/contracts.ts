/**
 * Canonical Cura Health contracts for Doctor Mobile App.
 * In sync with shared_contracts/types.ts
 */

export type BedId = "Room-101" | "Bed-101" | "Bed-102" | "Bed-103" | string;

export type FilterStatus = "PASS" | "ARTIFACT_SUPPRESSED";
export type SensorStatus = "OK" | "PROBE_DISCONNECTED";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM";
export type AlertStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "DISMISSED"
  | "CLAIMED";
export type SbarSource = "GEMINI" | "OPENAI" | "LOCAL_FALLBACK";

export interface TelemetryPacket {
  bed_id: BedId;
  patient_name: string;
  timestamp: string;
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  respiratory_rate: number;
  spo2: number;
  temp_c: number;
}

export interface News2Component {
  parameter: "respiratory_rate" | "spo2" | "systolic_bp" | "heart_rate" | "temp_c";
  label: string;
  value: number;
  score: number;
}

export interface EnrichedTelemetry extends TelemetryPacket {
  map: number;
  news2_score: number;
  news2_components: News2Component[];
  filter_status: FilterStatus;
  sensor_status: SensorStatus;
  patient_context: string;
  received_at: string;
}

export interface Sbar {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

export interface AlertPacket {
  alert_id: string;
  bed_id: BedId;
  patient_name: string;
  severity: Severity;
  news2_score: number;
  sbar: Sbar;
  timestamp: string;
  patient_context: string;
  news2_components: News2Component[];
  sbar_source: SbarSource;
  status: AlertStatus;
}

export interface ClaimRecord {
  alert_id: string;
  doctor_id: string;
  doctor_name: string;
  claimed_at: string;
}

export interface DemoState {
  active: boolean;
  started_at: string | null;
  target_bed_id: string | null;
  eta_seconds: number | null;
}

export interface StateSnapshot {
  beds: Record<string, EnrichedTelemetry>;
  alerts: AlertPacket[];
  claims: Record<string, ClaimRecord>;
  demo: DemoState;
  server_time: string;
}

export type ServerEvent =
  | { type: "STATE_SNAPSHOT"; data: StateSnapshot }
  | { type: "TELEMETRY_STREAM"; data: EnrichedTelemetry }
  | { type: "ALERT_NEW"; data: AlertPacket }
  | { type: "ALERT_VERIFIED"; data: AlertPacket }
  | { type: "ALERT_DISMISSED"; data: AlertPacket }
  | { type: "CASE_CLAIMED"; data: ClaimRecord }
  | { type: "DEMO_STARTED"; data: DemoState }
  | { type: "SYSTEM_RESET"; data: StateSnapshot };
