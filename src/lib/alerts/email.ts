import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

interface EmailAlertConfig {
  to: string | string[];
}

interface AlertEmailData {
  monitorName: string;
  monitorUrl: string;
  status: string;
  trigger: string;
  responseTime?: number | null;
  errorMessage?: string | null;
  timestamp: Date;
  dashboardUrl: string;
}

export async function sendEmailAlert(
  config: EmailAlertConfig,
  data: AlertEmailData
): Promise<void> {
  const isDown = data.trigger === "DOWN";
  const subject = isDown
    ? `[ALERT] ${data.monitorName} is DOWN`
    : data.trigger === "RECOVERY"
    ? `[RESOLVED] ${data.monitorName} is back UP`
    : `[WARNING] ${data.monitorName} - ${data.trigger}`;

  const statusColor = isDown ? "#ef4444" : data.trigger === "RECOVERY" ? "#22c55e" : "#f59e0b";
  const statusIcon = isDown ? "🔴" : data.trigger === "RECOVERY" ? "🟢" : "🟡";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: ${statusColor}; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">${statusIcon} Monitor Alert</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px;">${data.monitorName}</h2>
      <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px;">${data.monitorUrl}</p>

      <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status</td>
            <td style="padding: 8px 0; text-align: right;">
              <span style="background: ${statusColor}; color: white; padding: 2px 10px; border-radius: 999px; font-size: 13px; font-weight: 600;">
                ${data.status}
              </span>
            </td>
          </tr>
          ${data.responseTime !== null && data.responseTime !== undefined ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Response Time</td>
            <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px;">${data.responseTime}ms</td>
          </tr>` : ""}
          ${data.errorMessage ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Error</td>
            <td style="padding: 8px 0; text-align: right; color: #ef4444; font-size: 13px;">${data.errorMessage}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td>
            <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px;">${data.timestamp.toISOString()}</td>
          </tr>
        </table>
      </div>

      <a href="${data.dashboardUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
        View Dashboard
      </a>
    </div>
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        API Monitor - You're receiving this because you configured alerts for this monitor.
      </p>
    </div>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@apimonitor.io",
    to: Array.isArray(config.to) ? config.to : [config.to],
    subject,
    html,
  });
}
