export type DeliveryDelayRow = {
  vardgivare_namn: string;
  besoksdatum: string;
  besoksstart_tid: string | null;
  forsta_sms_skickad_vid: string | null;
  paminnelse_skickad_vid?: string | null;
  svarad_vid: string | null;
};

export const ANONYMITY_THRESHOLD = 5;

export function average(values: number[]): number {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

/** Parsar besöksstart oavsett om källan är `HH:MM` (CSV) eller `HH:MM:SS` (Postgres TIME). */
function parseVisitStartLocal(date: string, time: string): Date | null {
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;

  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  const seconds = m[3] !== undefined ? Number(m[3]) : 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }

  const local = `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const visitStart = new Date(local);
  return Number.isNaN(visitStart.getTime()) ? null : visitStart;
}

export function calculateDelayHours(date: string, time: string | null, sentAt: string | null): number | null {
  if (!time || !sentAt) return null;
  const visitStart = parseVisitStartLocal(date, time);
  const sent = new Date(sentAt);
  if (!visitStart || Number.isNaN(sent.getTime())) return null;
  return Math.max(0, (sent.getTime() - visitStart.getTime()) / (1000 * 60 * 60));
}

export function bucketForDelay(delayHours: number): string {
  if (delayHours <= 6) return '0-6h';
  if (delayHours <= 24) return '6-24h';
  if (delayHours <= 48) return '24-48h';
  return '48h+';
}

/** Aggregerad SMS/svar-kedja: första utskick vs påminnelse (en rad per mottagare i `enkat_utskick`). */
export type SmsRoundStats = {
  /** Mottagare som fått första SMS inom perioden (samma filter som dashboard). */
  firstSmsRecipients: number;
  /** Svarade utan att någon påminnelse registrerats (första kontakten räcker). */
  answeredAfterFirstOnly: number;
  /** Mottagare som fått skickad påminnelse. */
  remindersSent: number;
  /** Svarade efter att påminnelse skickats (svarstid ≥ påminnelsetid). */
  answeredAfterReminder: number;
  /** answeredAfterFirstOnly / firstSmsRecipients */
  firstRoundRate: number;
  /** answeredAfterReminder / remindersSent, eller null om inga påminnelser. */
  reminderRoundRate: number | null;
};

/**
 * Räknar svarsfrekvens för första SMS resp. för påminnelse-rundan utifrån `enkat_utskick`.
 * Förutsätter att påminnelse bara sätts när den faktiskt skickats till obesvarade.
 */
export function summarizeSmsRoundStats(rows: DeliveryDelayRow[]): SmsRoundStats {
  let firstSmsRecipients = 0;
  let answeredAfterFirstOnly = 0;
  let remindersSent = 0;
  let answeredAfterReminder = 0;

  for (const row of rows) {
    if (!row.forsta_sms_skickad_vid) {
      continue;
    }

    firstSmsRecipients += 1;

    const hasReminder = Boolean(row.paminnelse_skickad_vid);
    const hasAnswer = Boolean(row.svarad_vid);

    if (!hasReminder && hasAnswer) {
      answeredAfterFirstOnly += 1;
    }

    if (hasReminder) {
      remindersSent += 1;
      if (hasAnswer && row.svarad_vid && row.paminnelse_skickad_vid) {
        const answeredAt = new Date(row.svarad_vid).getTime();
        const reminderAt = new Date(row.paminnelse_skickad_vid).getTime();
        if (!Number.isNaN(answeredAt) && !Number.isNaN(reminderAt) && answeredAt >= reminderAt) {
          answeredAfterReminder += 1;
        }
      }
    }
  }

  const firstRoundRate =
    firstSmsRecipients > 0 ? Number((answeredAfterFirstOnly / firstSmsRecipients).toFixed(4)) : 0;
  const reminderRoundRate =
    remindersSent > 0 ? Number((answeredAfterReminder / remindersSent).toFixed(4)) : null;

  return {
    firstSmsRecipients,
    answeredAfterFirstOnly,
    remindersSent,
    answeredAfterReminder,
    firstRoundRate,
    reminderRoundRate
  };
}

export function summarizeDelayRows(rows: DeliveryDelayRow[]) {
  const measured = rows
    .map((row) => {
      const delayHours = calculateDelayHours(row.besoksdatum, row.besoksstart_tid, row.forsta_sms_skickad_vid);
      if (delayHours === null) return null;
      return {
        delayHours,
        answered: !!row.svarad_vid
      };
    })
    .filter(Boolean) as Array<{
      delayHours: number;
      answered: boolean;
    }>;

  const bucketMap = new Map<string, { sent: number; answered: number }>();
  for (const row of measured) {
    const key = bucketForDelay(row.delayHours);
    const current = bucketMap.get(key) || { sent: 0, answered: 0 };
    current.sent += 1;
    if (row.answered) current.answered += 1;
    bucketMap.set(key, current);
  }

  return {
    measuredCount: measured.length,
    averageDelayHours: average(measured.map((row) => row.delayHours)),
    buckets: Array.from(bucketMap.entries()).map(([bucket, values]) => ({
      bucket,
      sent: values.sent,
      answered: values.answered,
      responseRate: values.sent > 0 ? Number((values.answered / values.sent).toFixed(3)) : 0
    }))
  };
}
