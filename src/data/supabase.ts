/** Supabase (login e banco do painel GMN) e IA pela API da Anthropic via /api/ia. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { detalheErro, type DownloadsCap, type SampleCap, type SampleOpts } from "../lib/claude";

/** Aceita a URL do projeto mesmo colada de outro jeito: só o id, sem https, com espaço ou o link do painel. */
export function normalizarUrlSupabase(v: string | undefined): string | undefined {
  const t = (v ?? "").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  if (!t || /^eyJ/.test(t) || /^sb_/.test(t)) return undefined;
  const painel = t.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{10,})/i);
  if (painel) return `https://${painel[1].toLowerCase()}.supabase.co`;
  if (/^[a-z0-9]{15,30}$/i.test(t)) return `https://${t.toLowerCase()}.supabase.co`;
  const comProtocolo = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(comProtocolo);
    return u.hostname.includes(".") ? `${u.protocol}//${u.host}` : undefined;
  } catch {
    return undefined;
  }
}
// Valores públicos do projeto (a chave publishable foi feita para ficar no navegador; quem protege os dados é o login + RLS).
// As variáveis de ambiente, se existirem, têm prioridade.
const PADRAO_URL = "https://gukoinzftfbeiohepiti.supabase.co";
const PADRAO_CHAVE = "sb_publishable_at5FfNLKvQxH9YhMLFNNfw_XgVqD_8G";
const URL_SB = normalizarUrlSupabase(import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? PADRAO_URL;
const CHAVE_SB = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim().replace(/^["']|["']$/g, "") || PADRAO_CHAVE;
export const urlBruta = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").trim();

let cliente: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!URL_SB || !CHAVE_SB) throw new Error("Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente da Vercel.");
  cliente ??= createClient(URL_SB, CHAVE_SB, { auth: { persistSession: true, autoRefreshToken: true } });
  return cliente;
}
export const configurado = () => !!(URL_SB && CHAVE_SB);

// ---------------------------------------------------------------- downloads

export const downloadsNavegador: DownloadsCap = {
  async save({ filename, data }) {
    const blob = typeof data === "string" ? new Blob([data], { type: filename.endsWith(".html") ? "text/html" : "text/plain" }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { status: "saved" };
  },
};

// ---------------------------------------------------------------- IA

type Bloco = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } | { type: "tool_result"; tool_use_id: string; content: string };
type Msg = { role: "user" | "assistant"; content: string | Bloco[] };

async function chamar(msgs: Msg[], opts: SampleOpts | undefined, acumulado: { texto: string }) {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw { code: "session_expired", message: "" };
  let r: Response;
  try {
    r = await fetch("/api/ia", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mensagens: msgs,
        nivel: opts?.modelTier ?? "default",
        ferramentas: opts?.tools?.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema ?? { type: "object", properties: {} } })),
      }),
      signal: opts?.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw { code: "cancelled", message: "" };
    throw { code: "unavailable", message: String(e) };
  }
  if (!r.ok || !r.body) {
    const corpo = await r.text().catch(() => "");
    if (r.status === 403) {
      const msg = (() => { try { return JSON.parse(corpo).erro as string; } catch { return corpo; } })();
      detalheErro.permissao = msg;
      throw { code: "permission_denied", message: msg };
    }
    const code = r.status === 401 ? "session_expired" : r.status === 429 ? "rate_limited" : /prompt is too long|too many tokens/i.test(corpo) ? "prompt_too_large" : r.status === 503 ? "sampling_disabled" : "unavailable";
    throw { code, message: corpo.slice(0, 300) };
  }
  // Lê o fluxo SSE da Anthropic
  const blocos: (Bloco & { json?: string })[] = [];
  let parada = "";
  const leitor = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await leitor.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const evento = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const linha = evento.split("\n").find((l) => l.startsWith("data:"));
        if (!linha) continue;
        let ev: Record<string, any>;
        try {
          ev = JSON.parse(linha.slice(5));
        } catch {
          continue;
        }
        if (ev.type === "content_block_start") blocos[ev.index] = ev.content_block.type === "tool_use" ? { ...ev.content_block, input: {}, json: "" } : { type: "text", text: "" };
        else if (ev.type === "content_block_delta") {
          const b = blocos[ev.index];
          if (ev.delta.type === "text_delta" && b?.type === "text") {
            b.text += ev.delta.text;
            acumulado.texto += ev.delta.text;
            opts?.onText?.({ text: acumulado.texto, delta: ev.delta.text });
          } else if (ev.delta.type === "input_json_delta" && b?.type === "tool_use") b.json += ev.delta.partial_json;
        } else if (ev.type === "message_delta") parada = ev.delta?.stop_reason ?? parada;
        else if (ev.type === "error") throw { code: ev.error?.type === "overloaded_error" ? "rate_limited" : "unavailable", message: ev.error?.message ?? "" };
      }
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") throw { code: "cancelled", message: "" };
    throw e;
  }
  for (const b of blocos) if (b?.type === "tool_use") {
    try { b.input = b.json ? JSON.parse(b.json) : {}; } catch { b.input = {}; }
    delete b.json;
  }
  return { blocos: blocos.filter(Boolean) as Bloco[], parada };
}

async function rodar(input: string | { role: "user" | "assistant"; content: string }[], opts?: SampleOpts) {
  const msgs: Msg[] = typeof input === "string" ? [{ role: "user", content: input }] : input.map((m) => ({ ...m }));
  const acumulado = { texto: "" };
  for (let volta = 0; volta < 8; volta++) {
    const { blocos, parada } = await chamar(msgs, opts, acumulado);
    const usos = blocos.filter((b): b is Extract<Bloco, { type: "tool_use" }> => b.type === "tool_use");
    if (parada !== "tool_use" || !usos.length || !opts?.tools) return { text: acumulado.texto, truncated: parada === "max_tokens" };
    msgs.push({ role: "assistant", content: blocos });
    const resultados: Bloco[] = [];
    for (const u of usos) {
      const f = opts.tools.find((t) => t.name === u.name);
      let saida: unknown;
      try {
        saida = f ? await f.execute(u.input) : { erro: "ferramenta desconhecida" };
      } catch (e) {
        saida = { erro: (e as Error).message ?? String(e) };
      }
      resultados.push({ type: "tool_result", tool_use_id: u.id, content: typeof saida === "string" ? saida : JSON.stringify(saida ?? null) });
    }
    msgs.push({ role: "user", content: resultados });
    acumulado.texto += acumulado.texto && !acumulado.texto.endsWith("\n") ? "\n" : "";
  }
  return { text: acumulado.texto, truncated: false };
}

function extrairJson(t: string): unknown {
  const limpo = t.replace(/```(?:json)?/gi, "").trim();
  const ini = limpo.search(/[[{]/);
  if (ini < 0) throw { code: "invalid_json", message: "" };
  const fecha = limpo[ini] === "{" ? "}" : "]";
  const fim = limpo.lastIndexOf(fecha);
  try {
    return JSON.parse(limpo.slice(ini, fim + 1));
  } catch {
    throw { code: "invalid_json", message: "" };
  }
}

export const sampleApi: SampleCap = Object.assign((input: Parameters<SampleCap>[0], opts?: SampleOpts) => rodar(input, opts), {
  limits: async () => ({ tools: { maxCount: 20 } }),
  json: async <T,>(input: string, opts?: SampleOpts) => extrairJson((await rodar(`${input}\n\nResponda somente com o JSON, sem texto antes ou depois.`, opts)).text) as T,
});

/** Chama uma função /api/* com o login atual. */
export async function chamarApi<T>(caminho: string, init?: RequestInit): Promise<{ ok: boolean; status: number; dados: T }> {
  const { data } = await supabase().auth.getSession();
  const r = await fetch(caminho, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}), authorization: `Bearer ${data.session?.access_token ?? ""}` } });
  const dados = (await r.json().catch(() => ({}))) as T;
  return { ok: r.ok, status: r.status, dados };
}
