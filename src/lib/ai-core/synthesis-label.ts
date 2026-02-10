export function getSynthesisLabel(model: string) {
  const map: Record<string, string> = {
    claude: 'Claude Sonnet',
    'claude-opus': 'Claude Opus 4.5',
    openai: 'OpenAI GPT-5.2',
    gpt4o: 'GPT-4o',
    gemini: 'Gemini',
    grok: 'Grok'
  };
  return map[model] || model;
}
