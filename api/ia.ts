// Função da Vercel (Edge): repassa os pedidos de IA para a API da Anthropic.
// A chave fica só no servidor. Só aceita pedidos de quem está logado no app e é o dono.
import { exigirLogin } from "./_auth";

export const config = { runtime: "edge" };

const MODELOS: Record<string, string> = {
  quick: process.env.MODELO_RAPIDO || "claude-haiku-5-5",
  default: process.env.MODELO_PADRAO || "claude-sonnet-5-5",
  complex: process.env.MODELO_COMPLEXO || "claude-opus-5-5",
};
const MAX_TOKENS: Record<string, number> = { quick: 4000, default: 8000, complex: 16000 };

const resp = (status: number, msg: string) => new Response(JSON.stringify({ erro: msg }), { status, headers: { "content-type": "application/json" } });

export default async function handler(req: Request) {
  if (req.method !== "POST") return resp(405, "Use POST");
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return resp(503, "IA não configurada: defina ANTHROPIC_API_KEY na Vercel.");
  const negado = await exigirLogin(req);
  if (negado) return negado;

  let corpo: { mensagens?: unknown[]; nivel?: string; ferramentas?: unknown[] };
  try {
    corpo = await req.json();
  } catch {
    return resp(400, "JSON inválido");
  }
  if (!Array.isArray(corpo.mensagens) || !corpo.mensagens.length) return resp(400, "Sem mensagens");
  const nivel = corpo.nivel && MODELOS[corpo.nivel] ? corpo.nivel : "default";

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODELOS[nivel],
      max_tokens: MAX_TOKENS[nivel],
      stream: true,
      messages: corpo.mensagens,
      ...(Array.isArray(corpo.ferramentas) && corpo.ferramentas.length ? { tools: corpo.ferramentas } : {}),
    }),
    signal: req.signal,
  });
  if (!r.ok || !r.body) return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
  return new Response(r.body, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
}
