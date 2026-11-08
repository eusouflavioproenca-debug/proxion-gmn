/** Utilitários puros: ids, datas, formatação e normalização. */

export function novoId(prefixo = ""): string {
  const rnd = (globalThis.crypto?.getRandomValues
    ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(9)))
    : Array.from({ length: 9 }, () => Math.floor(Math.random() * 256)))
    .map((b) => (b % 36).toString(36))
    .join("");
  return prefixo + Date.now().toString(36) + rnd;
}

export const DIA_MS = 86_400_000;

/** AAAA-MM-DD no fuso local. */
export function isoDia(d: Date | number = new Date()): string {
  const x = typeof d === "number" ? new Date(d) : d;
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${dd}`;
}

export function inicioDoDia(d: Date | number = new Date()): number {
  const x = new Date(typeof d === "number" ? d : d.getTime());
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function inicioDoMes(d: Date | number = new Date()): number {
  const x = new Date(typeof d === "number" ? d : d.getTime());
  return new Date(x.getFullYear(), x.getMonth(), 1).getTime();
}

export function diasEntre(a: number, b: number): number {
  return Math.floor((inicioDoDia(b) - inicioDoDia(a)) / DIA_MS);
}

/** Converte "AAAA-MM-DD" (+ "HH:MM") em timestamp local. */
export function dataLocal(dia: string, hora = ""): number {
  const [y, m, d] = dia.split("-").map(Number);
  const [h, min] = hora ? hora.split(":").map(Number) : [0, 0];
  return new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0).getTime();
}

const fmtMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export function moeda(v: number | null | undefined): string {
  return v == null ? "—" : fmtMoeda.format(v);
}

export function moedaCurta(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (v >= 10_000) return `R$ ${Math.round(v / 1000).toLocaleString("pt-BR")} mil`;
  return fmtMoeda.format(v);
}

export function pct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

const fmtDia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const fmtDiaHora = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const fmtLongo = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export const dataCurta = (t: number) => fmtDia.format(t).replace(".", "");
export const dataHora = (t: number) => fmtDiaHora.format(t).replace(".", "");
export const hora = (t: number) => fmtHora.format(t);
export const dataLonga = (t: number) => fmtLongo.format(t);

export function relativo(t: number, agora = Date.now()): string {
  const d = diasEntre(t, agora);
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  if (d === -1) return "amanhã";
  if (d > 1) return `há ${d} dias`;
  return `em ${-d} dias`;
}

export function diaRelativo(dia: string, agora = Date.now()): string {
  return relativo(dataLocal(dia), agora);
}

// ---------- normalização ----------

export function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const SUFIXOS = /\b(ltda|me|epp|eireli|s\/?a|sa|mei|cia|e cia|comercio|servicos)\b/g;

export function normalizarNome(nome: string): string {
  return semAcento(nome.toLowerCase())
    .replace(/[^\p{L}\p{N}\s/]/gu, " ")
    .replace(SUFIXOS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function soDigitos(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/** Telefone brasileiro sem DDI, com DDD (10 ou 11 dígitos). */
export function normalizarTelefone(s: string): string {
  let d = soDigitos(s);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length > 11 && d.startsWith("0")) d = d.replace(/^0+/, "");
  return d;
}

export function formatarTelefone(s: string): string {
  const d = normalizarTelefone(s);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return s.trim();
}

export function linkWhatsApp(s: string, texto = ""): string | null {
  const d = normalizarTelefone(s);
  if (d.length < 10) return null;
  return `https://wa.me/55${d}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function normalizarInstagram(s: string): string {
  const t = (s || "").trim();
  if (!t) return "";
  const m = t.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const h = (m ? m[1] : t).replace(/^@/, "").replace(/\/+$/, "");
  return h.toLowerCase();
}

export function normalizarUrl(s: string): string {
  const t = (s || "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function dominio(s: string): string {
  const t = (s || "").trim().toLowerCase();
  if (!t) return "";
  return t.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
}

export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}
