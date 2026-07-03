import type { Alert } from "./health";
import type { Logger } from "../lib/logging";

/** Where alerts go. Console for dev; webhook for a real channel (Slack, etc.). */
export interface AlertSink {
  emit(alerts: Alert[]): Promise<void>;
}

export class LoggerAlertSink implements AlertSink {
  constructor(private readonly logger: Logger) {}
  async emit(alerts: Alert[]): Promise<void> {
    for (const a of alerts) {
      if (a.severity === "critical") this.logger.error({ code: a.code }, `ALERT: ${a.message}`);
      else this.logger.warn({ code: a.code }, `ALERT: ${a.message}`);
    }
  }
}

/** POSTs a JSON summary to a webhook URL (e.g. a Slack incoming webhook). */
export class WebhookAlertSink implements AlertSink {
  constructor(
    private readonly url: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}
  async emit(alerts: Alert[]): Promise<void> {
    if (alerts.length === 0) return;
    const text = alerts.map((a) => `[${a.severity.toUpperCase()}] ${a.message}`).join("\n");
    await this.fetchImpl(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, alerts }),
    });
  }
}
