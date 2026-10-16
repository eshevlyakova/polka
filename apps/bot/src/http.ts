export const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) => Response.json(data, { status, headers });
export async function limitedJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 32768) throw new Error("Payload too large");
  return JSON.parse(text);
}
