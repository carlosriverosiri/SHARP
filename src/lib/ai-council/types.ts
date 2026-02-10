export type AiCouncilProject = {
  id: string;
  name?: string;
  kb_project_id?: string | null;
  auto_include_kb?: boolean | null;
  context?: string | null;
  color?: string | null;
  icon?: string | null;
  is_pinned?: boolean | null;
  categories?: Array<{ count?: number }>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AiCouncilSession = {
  id?: string;
  name?: string | null;
  prompt?: string;
  created_at?: string;
  kb_project_id?: string | null;
  kb_project_name?: string | null;
  synthesis?: string | null;
  supersynthesis?: string | null;
  responses?: Record<string, any> | Array<any>;
  round2_responses?: Record<string, any> | Array<any> | null;
  selected_models?: string[] | null;
  profile?: string | null;
  deliberation_enabled?: boolean | null;
  total_cost?: number | null;
  synthesis_model?: string | null;
  total_duration_ms?: number | null;
  tags?: string[] | null;
  context?: string | null;
  response_openai?: any;
  response_anthropic?: any;
  response_google?: any;
  response_grok?: any;
  [key: string]: any;
};

export type CurrentResponses = {
  openai?: string;
  anthropic?: string;
  google?: string;
  grok?: string;
  synthesis?: string;
  isSuperSynthesis?: boolean;
  rawResponses?: Array<any>;
  totalDuration?: number;
  totalCost?: any;
  round2Responses?: Array<any> | Record<string, any>;
  [key: string]: any;
};

export type ImageContent = {
  type: 'image';
  base64: string;
  mimeType: string;
  description: string;
};

export type UploadedFile = {
  name: string;
  size: number;
  content: string | ImageContent;
};

export type CostInfo = {
  totalCost?: number;
  totalCostUSD?: number;
  inputTokens?: number;
  outputTokens?: number;
};

export type ModelResponse = {
  response?: string;
  content?: string;
  model?: string;
  provider?: string;
  duration?: number;
  cost?: CostInfo;
  error?: string;
};

export type KbProject = {
  id: string;
  name: string;
};

export type KbProjectInfo = KbProject & {
  icon?: string | null;
  itemCount?: number;
  tokens?: number;
};

export type PromptLibraryItem = {
  id: string;
  name: string;
  prompt: string;
};

export type ContextLibraryItem = {
  id: string;
  name: string;
  content: string;
};
