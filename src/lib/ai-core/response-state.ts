type InitialResponsesOptions = {
  includeRound2?: boolean;
};

export function buildInitialResponses({ includeRound2 = true }: InitialResponsesOptions = {}) {
  const base = {
    openai: '',
    anthropic: '',
    google: '',
    grok: '',
    synthesis: '',
    rawResponses: [],
    totalDuration: 0
  };

  if (!includeRound2) {
    return base;
  }

  return {
    ...base,
    'r2-openai': '',
    'r2-anthropic': '',
    'r2-google': '',
    'r2-grok': ''
  };
}
