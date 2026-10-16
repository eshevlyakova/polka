const encoder = new TextEncoder();
async function hmac(key: Uint8Array, text: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(text)),
  );
}
export async function validateInitData(
  raw: string,
  token: string,
  now = Math.floor(Date.now() / 1000),
): Promise<number> {
  if (!raw || raw.length > 8192) throw new Error("Unauthorized");
  const params = new URLSearchParams(raw);
  const hash = params.get("hash");
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) throw new Error("Unauthorized");
  const keys = new Set<string>();
  for (const [key] of params) {
    if (keys.has(key)) throw new Error("Unauthorized");
    keys.add(key);
  }
  params.delete("hash");
  const check = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = await hmac(encoder.encode("WebAppData"), token);
  const signature = await hmac(secret, check);
  const received = Uint8Array.from(hash.match(/../g)!, (x) => parseInt(x, 16));
  let difference = 0;
  signature.forEach((byte, i) => {
    difference |= byte ^ received[i];
  });
  const authDate = Number(params.get("auth_date"));
  if (
    difference !== 0 ||
    !Number.isFinite(authDate) ||
    authDate <= 0 ||
    now - authDate > 3600 ||
    authDate > now + 30
  )
    throw new Error("Unauthorized");
  const user = JSON.parse(params.get("user") ?? "{}") as { id?: number };
  if (!Number.isSafeInteger(user.id) || user.id! <= 0)
    throw new Error("Unauthorized");
  return user.id!;
}
