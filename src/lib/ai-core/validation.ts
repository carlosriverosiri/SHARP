type ValidationInput = {
  prompt: string;
  selectedModels: string[];
  deliberationEnabled: boolean;
};

export function validateRunQuery(input: ValidationInput) {
  const { prompt, selectedModels, deliberationEnabled } = input;

  if (!prompt) return 'Ange en prompt.';
  if (selectedModels.length === 0) return 'Välj minst en AI-modell.';
  if (deliberationEnabled && selectedModels.length < 2) {
    return 'Deliberation kräver minst 2 valda modeller.';
  }
  return null;
}
