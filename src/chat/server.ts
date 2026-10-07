import "server-only";
import { proxyConfig } from "./proxy";
export function chatServerConfig() { return proxyConfig(process.env); }
