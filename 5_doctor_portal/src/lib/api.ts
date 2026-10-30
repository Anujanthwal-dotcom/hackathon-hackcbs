const CENTRAL_URL =
  process.env.NEXT_PUBLIC_CENTRAL_URL ?? "http://localhost:8000";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${CENTRAL_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { detail?: string }
    | null;
  if (!response.ok) {
    throw new Error(payload?.detail ?? `Request failed (HTTP ${response.status})`);
  }
  return payload as T;
}

export async function claimCase(
  alertId: string,
  doctorId: string,
  doctorName: string,
): Promise<void> {
  await request("/api/doctor/claim", {
    alert_id: alertId,
    doctor_id: doctorId,
    doctor_name: doctorName,
  });
}
