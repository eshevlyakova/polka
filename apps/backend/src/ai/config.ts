import { AiError } from "../../../../shared/aiRecipes";

export interface AiProviderEnv {
  API_GLM?: string;
  TIMEWEB_AI_TOKEN?: string;
  AI_TEXT_MODEL?: string;
  AI_VISION_MODEL?: string;
  AI_SPEECH_MODEL?: string;
}

export interface TimewebConnection {
  provider: "timeweb";
  key: string;
  textModel: string;
  visionModel: string;
}

// A plain key retains compatibility with the existing Z.ai integration.
export type AiCredentials = string | TimewebConnection;

export function aiCredentials(env: AiProviderEnv): AiCredentials {
  if (env.TIMEWEB_AI_TOKEN?.trim())
    return {
      provider: "timeweb",
      key: env.TIMEWEB_AI_TOKEN.trim(),
      textModel: env.AI_TEXT_MODEL?.trim() || "deepseek/deepseek-flash",
      visionModel: env.AI_VISION_MODEL?.trim() || "gemini/gemini-3.8-flash",
    };
  if (env.API_GLM?.trim()) return env.API_GLM.trim();
  throw new AiError("Не удалось связаться с помощником Полки. Попробуй позже.", 503);
}
