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
    | { detail?: string | { detail?: string } }
    | null;
  if (!response.ok) {
    const detail = payload?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.detail ?? `Request failed (HTTP ${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export async function verifyAlert(alertId: string): Promise<void> {
  await request("/api/nurse/action", {
    alert_id: alertId,
    action: "VERIFIED",
    nurse_id: "nurse-ward-4b",
  });
}

export async function dismissAlert(alertId: string): Promise<void> {
  await request("/api/nurse/action", {
    alert_id: alertId,
    action: "DISMISSED",
    nurse_id: "nurse-ward-4b",
    note: "Dismissed at central station",
  });
}

export async function startDemo(): Promise<{
  message: string;
  target_bed_id: string;
  eta_seconds: number;
}> {
  return request("/api/demo/start");
}

export async function resetSystem(): Promise<{ message: string }> {
  return request("/api/reset");
}
