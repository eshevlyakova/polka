import type { AiEnv } from "./handler";
import { handleRequest } from "../router";
declare const process: { env: AiEnv };
declare const Buffer: {
  from(
    value: string,
    encoding: "base64",
  ): { toString(encoding: "utf8"): string };
};
type FunctionEvent = {
  path?: string;
  url?: string;
  queryStringParameters?: Record<string, string>;
  httpMethod: string;
  headers?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
};
export async function handler(event: FunctionEvent) {
  const method = event.httpMethod || "GET";
  const body = event.isBase64Encoded
    ? Buffer.from(event.body ?? "", "base64").toString("utf8")
    : event.body;
  const path =
    event.queryStringParameters?.route ??
    event.path ??
    event.url ??
    "/api/ai/recipes";
  const url = new URL(path, "https://polka-api.local");
  if (!url.pathname.startsWith("/api/")) url.pathname = "/api/ai/recipes";
  for (const [key, value] of Object.entries(event.queryStringParameters ?? {}))
    if (key !== "route") url.searchParams.set(key, value);
  const request = new Request(url, {
    method,
    headers: event.headers,
    ...(method !== "GET" && method !== "HEAD" ? { body } : {}),
  });
  const response = await handleRequest(request, process.env);
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
    isBase64Encoded: false,
  };
}
