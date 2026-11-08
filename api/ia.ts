// Função da Vercel (Edge): repassa os pedidos de IA para a OpenAI (ChatGPT) ou para a Anthropic (Claude),
// conforme a chave cadastrada. A chave fica só no servidor. Só aceita pedidos de quem está logado e liberado.
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
  const chaveOpenai = process.env.OPENAI_API_KEY?.trim();
  const chave = process.env.ANTHROPIC_API_KEY?.trim();
  if (!chaveOpenai && !chave) return resp(503, "IA não configurada: defina OPENAI_API_KEY (ChatGPT) ou ANTHROPIC_API_KEY na Vercel.");
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
  if (chaveOpenai) return viaOpenai(chaveOpenai, corpo.mensagens, nivel, req.signal);

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

// ---------------------------------------------------------------- OpenAI (ChatGPT)

const MODELOS_OPENAI: Record<string, string> = {
  quick: process.env.OPENAI_MODELO_RAPIDO || process.env.OPENAI_MODELO || "gpt-5-mini",
  default: process.env.OPENAI_MODELO || "gpt-5-mini",
  complex: process.env.OPENAI_MODELO_COMPLEXO || process.env.OPENAI_MODELO || "gpt-5-mini",
};

type Bloco = { type?: string; text?: string; content?: string };
const texto = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? (c as Bloco[]).map((b) => b.text ?? b.content ?? "").join("\n") : "");

/** Chama a OpenAI e devolve a resposta no mesmo formato de fluxo que o app já entende. */
async function viaOpenai(chave: string, mensagens: unknown[], nivel: string, signal: AbortSignal) {
  const msgs = (mensagens as { role?: string; content?: unknown }[]).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: texto(m.content) }));
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${chave}` },
    body: JSON.stringify({ model: MODELOS_OPENAI[nivel], messages: msgs, max_completion_tokens: MAX_TOKENS[nivel] }),
    signal,
  });
  const d = (await r.json().catch(() => ({}))) as { choices?: { message?: { content?: string }; finish_reason?: string }[]; error?: { message?: string; code?: string } };
  if (!r.ok) {
    const status = r.status === 429 ? 429 : r.status === 401 ? 503 : r.status === 400 && /context|too long|maximum/i.test(d.error?.message ?? "") ? 400 : 502;
    return new Response(JSON.stringify({ erro: d.error?.message ?? "Erro na OpenAI" }), { status, headers: { "content-type": "application/json" } });
  }
  const t = d.choices?.[0]?.message?.content ?? "";
  const parada = d.choices?.[0]?.finish_reason === "length" ? "max_tokens" : "end_turn";
  const ev = (o: unknown) => `event: x\ndata: ${JSON.stringify(o)}\n\n`;
  const corpo = ev({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }) + ev({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: t } }) + ev({ type: "message_delta", delta: { stop_reason: parada } });
  return new Response(corpo, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
}
