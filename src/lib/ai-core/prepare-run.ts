import { buildFilePayload } from './file-utils';
import { buildQueryHash } from './query-hash';
import { buildRunQueryPayload } from './request-payload';
import { getProfileType } from './utils';
import { validateRunQuery } from './validation';

type PrepareRunInput = {
  prompt: string;
  context: string;
  selectedModels: string[];
  deliberationEnabled: boolean;
  synthesisModel: string;
  skipSynthesis: boolean;
  profile: string;
  files: Array<{
    name: string;
    content?: string | { type?: string; base64?: string; mimeType?: string; description?: string };
  }>;
};

type PrepareRunResult =
  | { validationError: string }
  | {
      validationError: null;
      profileType: string;
      fileContent: string;
      imageFiles: Array<{ name: string; base64: string; mimeType: string }>;
      queryHash: string;
      payload: ReturnType<typeof buildRunQueryPayload>;
    };

export function prepareRunQuery(input: PrepareRunInput): PrepareRunResult {
  const validationError = validateRunQuery({
    prompt: input.prompt,
    selectedModels: input.selectedModels,
    deliberationEnabled: input.deliberationEnabled
  });

  if (validationError) {
    return { validationError };
  }

  const profileType = getProfileType(input.profile);
  const { fileContent, imageFiles } = buildFilePayload(input.files);
  const queryHash = buildQueryHash(input.prompt, input.context);
  const payload = buildRunQueryPayload({
    context: input.context,
    prompt: input.prompt,
    synthesisModel: input.synthesisModel,
    fileContent,
    selectedModels: input.selectedModels,
    enableDeliberation: input.deliberationEnabled,
    profileType,
    skipSynthesis: input.skipSynthesis,
    images: imageFiles
  });

  return {
    validationError: null,
    profileType,
    fileContent,
    imageFiles,
    queryHash,
    payload
  };
}
