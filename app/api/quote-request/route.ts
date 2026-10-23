import { NextResponse } from "next/server";
import { quoteValidationError } from "@/quote/contracts";
import { sendQuoteRequest } from "@/quote/server";
import { readLimitedRequestText, trustedClientIp } from "@/quote/request";

export const runtime = "nodejs";
const maximumBodyBytes = 12_000;
function log(event: "quote_request_invalid_body" | "quote_request_proxy_configuration_invalid") {
  // Event names are deliberately data-free: quote requests contain personal data.
  console.error(`[quote] ${event}`);
}

export async function POST(request: Request) {
  const raw = await readLimitedRequestText(request, maximumBodyBytes);
  if (raw === undefined) { log("quote_request_invalid_body"); return NextResponse.json({ ok: false, error: "invalid" }, { status: 413 }); }
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 }); }
  const parsed = quoteValidationError(data);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: "invalid", field: parsed.field }, { status: 400 });
  // Silently accept bots so the honeypot does not reveal its presence.
  if (parsed.value.businessWebsite) return NextResponse.json({ ok: true });
  const ip = trustedClientIp(request, process.env.QUOTE_TRUST_PROXY === "true");
  if (!ip) { log("quote_request_proxy_configuration_invalid"); return NextResponse.json({ ok: false, error: "service" }, { status: 503 }); }
  const result = await sendQuoteRequest(parsed.value, ip);
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false, error: result.status === 429 ? "rate_limited" : "service" }, { status: result.status });
}
