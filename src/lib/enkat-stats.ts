export type DeliveryDelayRow = {
  vardgivare_namn: string;
  besoksdatum: string;
  besoksstart_tid: string | null;
  forsta_sms_skickad_vid: string | null;
  svarad_vid: string | null;
};

export const ANONYMITY_THRESHOLD = 5;

export function average(values: number[]): number {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function calculateDelayHours(date: string, time: string | null, sentAt: string | null): number | null {
  if (!time || !sentAt) return null;
  const visitStart = new Date(`${date}T${time}:00`);
  const sent = new Date(sentAt);
  if (Number.isNaN(visitStart.getTime()) || Number.isNaN(sent.getTime())) return null;
  return Math.max(0, (sent.getTime() - visitStart.getTime()) / (1000 * 60 * 60));
}

export function bucketForDelay(delayHours: number): string {
  if (delayHours <= 6) return '0-6h';
  if (delayHours <= 24) return '6-24h';
  if (delayHours <= 48) return '24-48h';
  return '48h+';
}

export function summarizeDelayRows(rows: DeliveryDelayRow[]) {
  const measured = rows
    .map((row) => {
      const delayHours = calculateDelayHours(row.besoksdatum, row.besoksstart_tid, row.forsta_sms_skickad_vid);
      if (delayHours === null) return null;
      return { delayHours, answered: !!row.svarad_vid };
    })
    .filter(Boolean) as Array<{ delayHours: number; answered: boolean }>;

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
