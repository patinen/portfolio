import { NextResponse } from "next/server";
import { quoteValidationError } from "@/quote/contracts";
import { sendQuoteRequest } from "@/quote/server";
import { readLimitedRequestText, trustedClientIp } from "@/quote/request";

export const runtime = "nodejs";
const maximumBodyBytes = 12_000;

export async function POST(request: Request) {
  const raw = await readLimitedRequestText(request, maximumBodyBytes);
  if (raw === undefined) return NextResponse.json({ ok: false, error: "invalid" }, { status: 413 });
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 }); }
  const parsed = quoteValidationError(data);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: "invalid", field: parsed.field }, { status: 400 });
  // Silently accept bots so the honeypot does not reveal its presence.
  if (parsed.value.businessWebsite) return NextResponse.json({ ok: true });
  const ip = trustedClientIp(request, process.env.QUOTE_TRUST_PROXY === "true");
  if (!ip) return NextResponse.json({ ok: false, error: "configuration" }, { status: 503 });
  const result = await sendQuoteRequest(parsed.value, ip);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: result.reason }, { status: result.status });
}
