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

function visitWindowForStartTime(time: string | null): 'Förmiddag' | 'Eftermiddag' | null {
  if (!time) return null;
  const m = String(time).trim().match(/^(\d{1,2})/);
  if (!m) return null;
  const hour = Number.parseInt(m[1], 10);
  if (Number.isNaN(hour)) return null;
  return hour < 12 ? 'Förmiddag' : 'Eftermiddag';
}

function answeredBeforeReminder(row: DeliveryDelayRow): boolean {
  if (!row.svarad_vid) return false;
  if (!row.paminnelse_skickad_vid) return true;

  const answeredAt = new Date(row.svarad_vid).getTime();
  const reminderAt = new Date(row.paminnelse_skickad_vid).getTime();

  if (Number.isNaN(answeredAt) || Number.isNaN(reminderAt)) {
    return false;
  }

  return answeredAt < reminderAt;
}

export function summarizeDelayRows(rows: DeliveryDelayRow[]) {
  const measured = rows
    .map((row) => {
      const delayHours = calculateDelayHours(row.besoksdatum, row.besoksstart_tid, row.forsta_sms_skickad_vid);
      if (delayHours === null) return null;
      return {
        delayHours,
        answered: !!row.svarad_vid,
        answeredBeforeReminder: answeredBeforeReminder(row),
        visitWindow: visitWindowForStartTime(row.besoksstart_tid)
      };
    })
    .filter(Boolean) as Array<{
      delayHours: number;
      answered: boolean;
      answeredBeforeReminder: boolean;
      visitWindow: 'Förmiddag' | 'Eftermiddag' | null;
    }>;

  const bucketMap = new Map<string, { sent: number; answered: number }>();
  const visitWindowMap = new Map<string, { sent: number; answered: number; answeredBeforeReminder: number }>();
  for (const row of measured) {
    const key = bucketForDelay(row.delayHours);
    const current = bucketMap.get(key) || { sent: 0, answered: 0 };
    current.sent += 1;
    if (row.answered) current.answered += 1;
    bucketMap.set(key, current);

    if (row.visitWindow) {
      const currentVisitWindow = visitWindowMap.get(row.visitWindow) || { sent: 0, answered: 0, answeredBeforeReminder: 0 };
      currentVisitWindow.sent += 1;
      if (row.answered) currentVisitWindow.answered += 1;
      if (row.answeredBeforeReminder) currentVisitWindow.answeredBeforeReminder += 1;
      visitWindowMap.set(row.visitWindow, currentVisitWindow);
    }
  }

  return {
    measuredCount: measured.length,
    averageDelayHours: average(measured.map((row) => row.delayHours)),
    buckets: Array.from(bucketMap.entries()).map(([bucket, values]) => ({
      bucket,
      sent: values.sent,
      answered: values.answered,
      responseRate: values.sent > 0 ? Number((values.answered / values.sent).toFixed(3)) : 0
    })),
    visitStartSegments: ['Förmiddag', 'Eftermiddag']
      .map((label) => {
        const values = visitWindowMap.get(label);
        if (!values) return null;

        return {
          label,
          sent: values.sent,
          answered: values.answered,
          answeredBeforeReminder: values.answeredBeforeReminder,
          responseRate: values.sent > 0 ? Number((values.answered / values.sent).toFixed(3)) : 0,
          beforeReminderRate: values.sent > 0 ? Number((values.answeredBeforeReminder / values.sent).toFixed(3)) : 0
        };
      })
      .filter(Boolean)
  };
}
