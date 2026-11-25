import { AiError } from "../../../../shared/aiRecipes";
import type { AiCredentials } from "./config";
export class ProviderError extends AiError {
  constructor(
    message: string,
    status: number,
    code: string,
    public retryable = false,
  ) {
    super(message, status, code);
  }
}
/** Never return provider message bodies, headers, keys or images to the client. */
export async function providerError(
  response: Response,
  vision: boolean,
  timeweb = false,
) {
  const data = (await response.json().catch(() => null)) as {
    error?: { code?: unknown };
  } | null;
  const code = String(data?.error?.code ?? "");
  const service = vision ? "Распознавание чека" : "Подбор рецептов";
  const unavailable = vision ? "недоступно" : "недоступен";
  if (timeweb) {
    if ([401, 403, 404].includes(response.status))
      return new ProviderError(
        `${service} сейчас ${unavailable}. Попробуй позже.`,
        503,
        "provider_access",
      );
    if (
      response.status === 402 ||
      /quota|balance|credit|billing|insufficient/i.test(code)
    )
      return new ProviderError(
        `${service} сейчас ${unavailable}. Попробуй позже.`,
        429,
        "provider_quota",
      );
    if (response.status === 429 || response.status >= 500)
      return new ProviderError(
        `${service} сейчас ${unavailable}. Попробуй немного позже.`,
        429,
        "provider_overloaded",
        true,
      );
    return new ProviderError(
      `${service} ${vision ? "не удалось" : "не удался"}. Попробуй позже.`,
      502,
      "provider_request",
    );
  }
  if (code === "1113")
    return new ProviderError(
      `${service} сейчас ${unavailable}. Попробуй позже.`,
      503,
      "provider_access",
    );
  if (
    [
      "1308",
      "1310",
      "1313",
      "1316",
      "1317",
      "1318",
      "1319",
      "1320",
      "1321",
    ].includes(code)
  )
    return new ProviderError(
      `${service} сейчас ${unavailable}. Попробуй позже.`,
      429,
      "provider_quota",
    );
  if (code === "1302")
    return new ProviderError(
      "Сервис занят другим запросом. Подожди немного и попробуй снова.",
      429,
      "provider_rate_limit",
      true,
    );
  if (
    [401, 403].includes(response.status) ||
    ["1211", "1220", "1221", "1311", "1315"].includes(code)
  )
    return new ProviderError(
      `${service} сейчас ${unavailable}. Попробуй позже.`,
      503,
      "provider_access",
    );
  if (code === "1305" || response.status >= 500 || response.status === 429)
    return new ProviderError(
      `${service} сейчас ${unavailable}: сервис ИИ перегружен. Попробуй позже.`,
      429,
      "provider_overloaded",
      true,
    );
  return new ProviderError(
    `${service} ${vision ? "не удалось" : "не удался"}. Попробуй позже.`,
    502,
    "provider_request",
  );
}
export function pause(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error("Отменено"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}
export async function completion(
  body: Record<string, unknown>,
  key: AiCredentials,
  vision: boolean,
  fetcher: typeof fetch,
  signal?: AbortSignal,
  retry = true,
  timeoutMs = vision ? 65000 : 55000,
): Promise<string> {
  const timeweb = typeof key !== "string";
  const token = typeof key === "string" ? key : key.key;
  const payload = { ...body };
  if (typeof key !== "string") {
    const model = vision ? key.visionModel : key.textModel;
    payload.model = model;
    // DeepSeek supports this toggle; Gemini does not accept the GLM parameter.
    delete payload.thinking;
    if (model.startsWith("deepseek/")) payload.thinking = { type: "disabled" };
  }
  const deadline = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  for (let attempt = 0; attempt < (retry ? 2 : 1); attempt++) {
    try {
      const response = await fetcher(
        timeweb
          ? "https://api.timeweb.ai/v1/chat/completions"
          : "https://api.z.ai/api/paas/v4/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: combined,
        },
      );
      if (!response.ok) throw await providerError(response, vision, timeweb);
      const data = (await response.json()) as {
        choices?: { finish_reason?: string; message?: { content?: unknown } }[];
      };
      const choice = data.choices?.[0];
      if (
        typeof choice?.message?.content !== "string" ||
        choice.finish_reason === "length"
      )
        throw new AiError(
          "Ответ получился неполным. Попробуй ещё раз.",
          502,
          "incomplete_response",
        );
      return choice.message.content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
    } catch (err) {
      if (combined.aborted)
        throw new AiError(
          signal?.aborted
            ? "Запрос отменён."
            : "Сервис ИИ долго не отвечает. Попробуй ещё раз.",
          504,
          "request_timeout",
        );
      if (
        err instanceof ProviderError &&
        err.retryable &&
        retry &&
        attempt === 0
      ) {
        await pause(1600, combined);
        continue;
      }
      if (err instanceof AiError) throw err;
      throw new AiError(
        "Не удалось связаться с сервисом ИИ. Попробуй ещё раз.",
        502,
        "provider_network",
      );
    }
  }
  throw new AiError("Сервис ИИ сейчас недоступен. Попробуй позже.", 502);
}
