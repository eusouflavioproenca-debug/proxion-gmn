// Utilitários das funções da Vercel (arquivos com _ não viram rota).
export function normalizarUrlSb(v: string | undefined) {
  const t = (v ?? "").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  if (!t || /^eyJ/.test(t) || /^sb_/.test(t)) return undefined;
  const painel = t.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{10,})/i);
  if (painel) return `https://${painel[1].toLowerCase()}.supabase.co`;
  if (/^[a-z0-9]{15,30}$/i.test(t)) return `https://${t.toLowerCase()}.supabase.co`;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return u.hostname.includes(".") ? `${u.protocol}//${u.host}` : undefined;
  } catch {
    return undefined;
  }
}

export const SB_URL = normalizarUrlSb(process.env.VITE_SUPABASE_URL) ?? "https://gukoinzftfbeiohepiti.supabase.co";
export const SB_CHAVE = process.env.VITE_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "") || "sb_publishable_at5FfNLKvQxH9YhMLFNNfw_XgVqD_8G";

export const json = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

/** Confere o login do Supabase e a lista de e-mails permitidos. Devolve null se ok, ou a resposta de erro. */
export async function exigirLogin(req: Request): Promise<Response | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { erro: "Sem login" });
  const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: { authorization: `Bearer ${token}`, apikey: SB_CHAVE } });
  if (!u.ok) return json(401, { erro: "Sessão expirada" });
  const user = (await u.json()) as { email?: string };
  // Aceita vírgula, ponto e vírgula, espaço ou quebra de linha entre e-mails, com ou sem aspas
  const permitidos = (process.env.EMAILS_PERMITIDOS || "").split(/[\s,;]+/).map((s) => s.trim().replace(/^["'<]+|["'>]+$/g, "").toLowerCase()).filter((s) => s.includes("@"));
  const email = (user.email || "").trim().toLowerCase();
  if (permitidos.length && !permitidos.includes(email))
    return json(403, { erro: `O e-mail ${email} não está em EMAILS_PERMITIDOS na Vercel. Coloque exatamente esse e-mail lá e faça um Redeploy.` });
  return null;
}
