import twilio from "twilio";

// Created on first use: twilio() throws when the account settings are missing, and that must not
// break every route that merely imports the alert code.
let client: ReturnType<typeof twilio> | null = null;
function getClient() {
  if (!client) client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client;
}

interface SmsAlertConfig {
  to: string | string[];
}

interface AlertSmsData {
  monitorName: string;
  monitorUrl: string;
  status: string;
  trigger: string;
  timestamp: Date;
}

export async function sendSmsAlert(
  config: SmsAlertConfig,
  data: AlertSmsData
): Promise<void> {
  const from = process.env.TWILIO_PHONE_NUMBER!;

  const message = buildSmsMessage(data);
  const recipients = Array.isArray(config.to) ? config.to : [config.to];

  await Promise.all(
    recipients.map((to) =>
      getClient().messages.create({ from, to, body: message })
    )
  );
}

function buildSmsMessage(data: AlertSmsData): string {
  const emoji = data.trigger === "DOWN" ? "🔴" : data.trigger === "RECOVERY" ? "🟢" : "🟡";
  return `${emoji} API Monitor Alert
${data.monitorName} is ${data.status}
URL: ${data.monitorUrl}
Time: ${data.timestamp.toLocaleString()}`;
}
