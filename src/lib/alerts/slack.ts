import axios from "axios";

interface SlackAlertConfig {
  webhookUrl: string;
}

interface AlertData {
  monitorName: string;
  monitorUrl: string;
  status: string;
  trigger: string;
  responseTime?: number | null;
  errorMessage?: string | null;
  timestamp: Date;
  dashboardUrl: string;
}

export async function sendSlackAlert(
  config: SlackAlertConfig,
  data: AlertData
): Promise<void> {
  const isDown = data.trigger === "DOWN";
  const isRecovery = data.trigger === "RECOVERY";
  const color = isDown ? "#ef4444" : isRecovery ? "#22c55e" : "#f59e0b";
  const emoji = isDown ? ":red_circle:" : isRecovery ? ":large_green_circle:" : ":yellow_circle:";

  const payload = {
    text: `${emoji} *${data.monitorName}* is *${data.status}*`,
    attachments: [
      {
        color,
        fields: [
          { title: "Monitor", value: data.monitorName, short: true },
          { title: "URL", value: data.monitorUrl, short: true },
          { title: "Status", value: data.status, short: true },
          ...(data.responseTime !== null && data.responseTime !== undefined
            ? [{ title: "Response Time", value: `${data.responseTime}ms`, short: true }]
            : []),
          ...(data.errorMessage
            ? [{ title: "Error", value: data.errorMessage, short: false }]
            : []),
          { title: "Time", value: data.timestamp.toISOString(), short: true },
        ],
        actions: [
          {
            type: "button",
            text: "View Dashboard",
            url: data.dashboardUrl,
          },
        ],
        footer: "API Monitor",
        ts: Math.floor(data.timestamp.getTime() / 1000),
      },
    ],
  };

  await axios.post(config.webhookUrl, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
  });
}
