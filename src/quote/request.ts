export async function readLimitedRequestText(request: Request, maximumBytes: number) {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximumBytes)) return undefined;
  if (!request.body) return "";
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maximumBytes) { await reader.cancel(); return undefined; }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

export function trustedClientIp(request: Request, trustedProxy: boolean) {
  if (!trustedProxy) return undefined;
  const value = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!value || value.length > 64 || /[\r\n]/.test(value)) return undefined;
  return /^[0-9a-f:.]+$/i.test(value) ? value.toLowerCase() : undefined;
}
