import axios from "axios";

interface OpsgenieConfig {
  apiKey: string;
  responders?: Array<{ type: string; name: string }>;
}

interface AlertData {
  monitorName: string;
  monitorUrl: string;
  status: string;
  trigger: string;
  responseTime?: number | null;
  errorMessage?: string | null;
  monitorId: string;
}

export async function sendOpsgenieAlert(
  config: OpsgenieConfig,
  data: AlertData
): Promise<void> {
  const isRecovery = data.trigger === "RECOVERY";
  const alias = `monitor-${data.monitorId}`;

  if (isRecovery) {
    await axios.post(
      `https://api.opsgenie.com/v2/alerts/${alias}/close`,
      { note: `${data.monitorName} has recovered` },
      {
        headers: {
          Authorization: `GenieKey ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );
    return;
  }

  const payload = {
    message: `${data.monitorName} is ${data.status}`,
    alias,
    description: data.errorMessage || `Monitor URL: ${data.monitorUrl}`,
    priority: data.trigger === "DOWN" ? "P1" : "P3",
    details: {
      monitorUrl: data.monitorUrl,
      responseTime: data.responseTime?.toString() || "N/A",
    },
    ...(config.responders && { responders: config.responders }),
  };

  await axios.post("https://api.opsgenie.com/v2/alerts", payload, {
    headers: {
      Authorization: `GenieKey ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
}
