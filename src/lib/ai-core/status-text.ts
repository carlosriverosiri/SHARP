type StatusContext = {
  selectedModels?: string[];
  waitingCount?: number;
  elapsedSeconds?: number;
  durationText?: string;
  modelName?: string;
  label?: string;
};

export function getStatusText(key: string, context: StatusContext = {}) {
  switch (key) {
    case 'round1-start': {
      const models = context.selectedModels?.join(', ') || '';
      return `Runda 1: Skickar till ${models}...`;
    }
    case 'waiting-models': {
      const count = context.waitingCount ?? 0;
      const elapsed = context.elapsedSeconds ?? 0;
      const suffix = count > 1 ? 'er' : '';
      return `⏳ Väntar på ${count} modell${suffix}... (${elapsed}s)`;
    }
    case 'working': {
      const elapsed = context.elapsedSeconds ?? 0;
      return `⏳ Arbetar... (${elapsed}s)`;
    }
    case 'model-complete': {
      const name = context.modelName || 'Modell';
      const duration = context.durationText || '';
      return duration ? `✓ ${name} klar (${duration})` : `✓ ${name} klar`;
    }
    case 'round2-start': {
      return 'Runda 2: Modellerna granskar varandra...';
    }
    case 'synthesis-start': {
      const label = context.label || '';
      return `Syntes med ${label}...`;
    }
    case 'supersynthesis-start': {
      const label = context.label || '';
      return `Supersyntes med ${label}...`;
    }
    default:
      return '';
  }
}
