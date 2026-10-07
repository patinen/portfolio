import { getSite } from "@/content/get-site";
import { chatServerConfig } from "@/chat/server";
import { proxyChat } from "@/chat/proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return proxyChat(request, chatServerConfig(), { getCopy: async locale => (await getSite(locale)).chat });
}
