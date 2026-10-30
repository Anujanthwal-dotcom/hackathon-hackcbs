/**
 * Cura Health Mobile API client
 */

export interface ClaimPayload {
  alert_id: string;
  doctor_id: string;
  doctor_name: string;
}

export interface PingResult {
  ok: boolean;
  latencyMs: number;
  status: number;
  message?: string;
}

export async function claimCase(
  baseUrl: string,
  alertId: string,
  doctorId: string,
  doctorName: string,
): Promise<{ success: boolean; error?: string }> {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/doctor/claim`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        alert_id: alertId,
        doctor_id: doctorId,
        doctor_name: doctorName,
      }),
    });

    const data = await response.json().catch(() => null);

    if (response.status === 200) {
      return { success: true };
    }

    if (response.status === 409) {
      return {
        success: false,
        error:
          data?.detail || "Case was already claimed by another physician (HTTP 409).",
      };
    }

    return {
      success: false,
      error: data?.detail || `Server returned error (${response.status})`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to reach central server.",
    };
  }
}

export async function testConnection(baseUrl: string): Promise<PingResult> {
  const startTime = Date.now();
  const healthUrl = `${baseUrl.replace(/\/+$/, "")}/api/health`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    return {
      ok: response.ok,
      status: response.status,
      latencyMs,
      message: response.ok ? "Connected to Central Hub" : `HTTP ${response.status}`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      status: 0,
      latencyMs,
      message: err.name === "AbortError" ? "Timed out (>3.5s)" : (err.message || "Unreachable"),
    };
  }
}
