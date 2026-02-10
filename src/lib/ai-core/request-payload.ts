type RunQueryPayloadOptions = {
  context: string;
  prompt: string;
  synthesisModel: string;
  fileContent: string;
  selectedModels: string[];
  enableDeliberation: boolean;
  profileType: string;
  skipSynthesis: boolean;
  images?: Array<{ name: string; base64: string; mimeType: string }>;
};

export function buildRunQueryPayload(options: RunQueryPayloadOptions) {
  const {
    context,
    prompt,
    synthesisModel,
    fileContent,
    selectedModels,
    enableDeliberation,
    profileType,
    skipSynthesis,
    images
  } = options;

  return {
    context,
    prompt,
    synthesisModel,
    fileContent,
    selectedModels,
    enableDeliberation,
    profileType,
    skipSynthesis,
    images: images && images.length > 0 ? images : undefined
  };
}
