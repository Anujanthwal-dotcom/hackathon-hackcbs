/**
 * Canonical Cura Health contracts.
 *
 * Keep these types in sync with schemas.json. These contracts are synthetic-data
 * only; no PHI is represented anywhere in this prototype.
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

/** Raw packet emitted by the bedside synthetic monitor. */
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

/** Edge-enriched telemetry broadcast by the central hub. */
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

/** Alert raised by the edge agent after deterministic risk scoring. */
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

/* ------------------------------------------------------------------ */
/* REST payloads                                                       */
/* ------------------------------------------------------------------ */

export interface NurseActionRequest {
  alert_id: string;
  action: "VERIFIED" | "DISMISSED";
  nurse_id: string;
  note?: string;
}

export interface DoctorClaimRequest {
  alert_id: string;
  doctor_id: string;
  doctor_name: string;
}

export interface DoctorClaimResponse {
  ok: boolean;
  claim: ClaimRecord;
}

export interface ApiError {
  detail: string;
  claimed_by?: string;
}

export interface DemoStartResponse {
  ok: boolean;
  message: string;
  target_bed_id: string;
  eta_seconds: number;
}

/* ------------------------------------------------------------------ */
/* WebSocket events                                                    */
/* ------------------------------------------------------------------ */

export type WsEventType =
  | "STATE_SNAPSHOT"
  | "TELEMETRY_STREAM"
  | "ALERT_NEW"
  | "ALERT_VERIFIED"
  | "ALERT_DISMISSED"
  | "CASE_CLAIMED"
  | "SYSTEM_RESET"
  | "DEMO_STARTED";

export interface StateSnapshotEvent {
  type: "STATE_SNAPSHOT";
  data: StateSnapshot;
}

export interface TelemetryStreamEvent {
  type: "TELEMETRY_STREAM";
  data: EnrichedTelemetry;
}

export interface AlertNewEvent {
  type: "ALERT_NEW";
  data: AlertPacket;
}

export interface AlertVerifiedEvent {
  type: "ALERT_VERIFIED";
  data: AlertPacket;
}

export interface AlertDismissedEvent {
  type: "ALERT_DISMISSED";
  data: AlertPacket;
}

export interface CaseClaimedEvent {
  type: "CASE_CLAIMED";
  data: ClaimRecord;
}

export interface SystemResetEvent {
  type: "SYSTEM_RESET";
  data: StateSnapshot;
}

export interface DemoStartedEvent {
  type: "DEMO_STARTED";
  data: DemoState;
}

export type ServerEvent =
  | StateSnapshotEvent
  | TelemetryStreamEvent
  | AlertNewEvent
  | AlertVerifiedEvent
  | AlertDismissedEvent
  | CaseClaimedEvent
  | SystemResetEvent
  | DemoStartedEvent;

export type PongEvent = { type: "PONG"; data: { server_time: string } };
