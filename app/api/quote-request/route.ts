import { NextResponse } from "next/server";
import { quoteValidationError } from "@/quote/contracts";
import { sendQuoteRequest } from "@/quote/server";

export const runtime = "nodejs";
const maximumBodyBytes = 12_000;

export async function POST(request: Request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > maximumBodyBytes) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 }); }
  const parsed = quoteValidationError(data);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: "invalid", field: parsed.field }, { status: 400 });
  // Silently accept bots so the honeypot does not reveal its presence.
  if (parsed.value.businessWebsite) return NextResponse.json({ ok: true });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const result = await sendQuoteRequest(parsed.value, ip);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: result.reason }, { status: result.status });
}
