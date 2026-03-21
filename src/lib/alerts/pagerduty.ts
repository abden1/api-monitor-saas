import axios from "axios";

interface PagerDutyConfig {
  integrationKey: string;
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

export async function sendPagerDutyAlert(
  config: PagerDutyConfig,
  data: AlertData
): Promise<void> {
  const isRecovery = data.trigger === "RECOVERY";

  const payload = {
    routing_key: config.integrationKey,
    event_action: isRecovery ? "resolve" : "trigger",
    dedup_key: `monitor-${data.monitorId}`,
    payload: {
      summary: isRecovery
        ? `${data.monitorName} is back UP`
        : `${data.monitorName} is ${data.status}`,
      source: data.monitorUrl,
      severity: data.trigger === "DOWN" ? "critical" : "warning",
      custom_details: {
        monitor_name: data.monitorName,
        monitor_url: data.monitorUrl,
        status: data.status,
        response_time: data.responseTime,
        error: data.errorMessage,
      },
    },
  };

  await axios.post(
    "https://events.pagerduty.com/v2/enqueue",
    payload,
    {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    }
  );
}
