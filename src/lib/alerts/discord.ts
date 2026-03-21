import axios from "axios";

interface DiscordAlertConfig {
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

export async function sendDiscordAlert(
  config: DiscordAlertConfig,
  data: AlertData
): Promise<void> {
  const isDown = data.trigger === "DOWN";
  const isRecovery = data.trigger === "RECOVERY";
  const color = isDown ? 0xef4444 : isRecovery ? 0x22c55e : 0xf59e0b;
  const emoji = isDown ? "🔴" : isRecovery ? "🟢" : "🟡";

  const fields = [
    { name: "Monitor", value: data.monitorName, inline: true },
    { name: "Status", value: data.status, inline: true },
    { name: "URL", value: data.monitorUrl, inline: false },
  ];

  if (data.responseTime !== null && data.responseTime !== undefined) {
    fields.push({ name: "Response Time", value: `${data.responseTime}ms`, inline: true });
  }

  if (data.errorMessage) {
    fields.push({ name: "Error", value: data.errorMessage, inline: false });
  }

  const payload = {
    embeds: [
      {
        title: `${emoji} ${data.monitorName} is ${data.status}`,
        color,
        fields,
        footer: { text: "API Monitor" },
        timestamp: data.timestamp.toISOString(),
        url: data.dashboardUrl,
      },
    ],
  };

  await axios.post(config.webhookUrl, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
  });
}
