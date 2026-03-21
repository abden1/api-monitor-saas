import axios from "axios";

interface WebhookConfig {
  url: string;
  secret?: string;
  method?: "POST" | "PUT";
  headers?: Record<string, string>;
}

interface AlertData {
  monitorName: string;
  monitorUrl: string;
  status: string;
  trigger: string;
  responseTime?: number | null;
  errorMessage?: string | null;
  monitorId: string;
  timestamp: Date;
}

export async function sendWebhookAlert(
  config: WebhookConfig,
  data: AlertData
): Promise<void> {
  const payload = {
    event: data.trigger.toLowerCase(),
    monitor: {
      id: data.monitorId,
      name: data.monitorName,
      url: data.monitorUrl,
    },
    status: data.status,
    responseTime: data.responseTime,
    errorMessage: data.errorMessage,
    timestamp: data.timestamp.toISOString(),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "APIMonitor-Webhook/1.0",
    ...config.headers,
  };

  if (config.secret) {
    const crypto = await import("crypto");
    const signature = crypto
      .createHmac("sha256", config.secret)
      .update(JSON.stringify(payload))
      .digest("hex");
    headers["X-APIMonitor-Signature"] = `sha256=${signature}`;
  }

  await axios({
    method: config.method || "POST",
    url: config.url,
    data: payload,
    headers,
    timeout: 10000,
  });
}
