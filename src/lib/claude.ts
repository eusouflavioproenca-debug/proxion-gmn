/** Ponte tipada para os recursos do claude.ai (banco, usuário, IA, downloads). */

export interface DbErr {
  code: string;
  message: string;
}

export interface DocSnap {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
  metadata: { fromCache: boolean; hasPendingWrites: boolean };
}
export interface QuerySnap {
  docs: DocSnap[];
  metadata: { fromCache: boolean; hasPendingWrites: boolean };
}
export interface DocRef {
  id: string;
  path: string;
  get(): Promise<DocSnap>;
  set(d: Record<string, unknown>): Promise<void>;
  update(d: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(next: (s: DocSnap) => void, err?: (e: DbErr) => void): () => void;
}
export interface Query {
  where(f: string, op: string, v: unknown): Query;
  orderBy(f: string, dir?: "asc" | "desc"): Query;
  limit(n: number): Query;
  get(): Promise<QuerySnap>;
  onSnapshot(next: (s: QuerySnap) => void, err?: (e: DbErr) => void): () => void;
}
export interface CollRef extends Query {
  path: string;
  doc(id?: string): DocRef;
}
export interface DbLike {
  doc(path: string): DocRef;
  collection(path: string): CollRef;
}

export interface Profile {
  id: string;
  name: string;
  avatarUrl: string;
  color: string;
  isMe: boolean;
}
export interface UserCap {
  isOwner(): Promise<boolean>;
  canEdit(): Promise<boolean>;
  can(n: string): Promise<boolean | null>;
  id(): Promise<string | null>;
  me(): Promise<{ id: string | null; name: string; avatarUrl: string; color: string; isOwner: boolean }>;
  profiles(ids: string[]): Promise<Record<string, Profile>>;
}

export interface SampleErr {
  code: string;
  message: string;
  text?: string;
}
export interface SampleOpts {
  onText?: (u: { text: string; delta: string }) => void;
  signal?: AbortSignal;
  modelTier?: "quick" | "default" | "complex";
  cache?: boolean | { gcTime?: number; refresh?: boolean };
  tools?: { name: string; description: string; inputSchema?: Record<string, unknown>; execute(input: Record<string, unknown>): unknown }[];
}
export interface SampleCap {
  (input: string | { role: "user" | "assistant"; content: string }[], opts?: SampleOpts): Promise<{ text: string; truncated: boolean }>;
  limits(): Promise<{ tools?: { maxCount: number } }>;
  json<T = unknown>(input: string, opts?: SampleOpts): Promise<T>;
}
export interface DownloadsCap {
  save(r: { filename: string; data: string | Blob }): Promise<{ status: string }>;
}

interface ClaudeGlobal {
  use(name: string): Promise<unknown>;
}

function claudeGlobal(): ClaudeGlobal | null {
  return (window as unknown as { claude?: ClaudeGlobal }).claude ?? null;
}

export async function usar<T>(nome: string): Promise<T | null> {
  const c = claudeGlobal();
  if (!c) return null;
  try {
    return ((await c.use(nome)) as T) ?? null;
  } catch {
    return null;
  }
}

export function noClaude(): boolean {
  return claudeGlobal() !== null;
}

/** Detalhe do último erro de permissão vindo do servidor (versão Vercel). */
export const detalheErro = { permissao: "" };

export function mensagemErroIA(code: string): string {
  switch (code) {
    case "permission_denied":
      return detalheErro.permissao || "Seu usuário não tem permissão para usar a IA.";
    case "not_granted":
      return "A IA não foi autorizada neste app. Autorize quando o claude.ai perguntar.";
    case "rate_limited":
      return "Limite de uso da IA atingido por agora. Tente de novo em alguns minutos.";
    case "session_expired":
      return "Sua sessão expirou. Entre novamente.";
    case "sampling_disabled":
      return "A IA não está disponível (verifique a chave da API da Anthropic).";
    case "refused":
      return "A IA recusou este pedido. Ajuste as informações e tente de novo.";
    case "invalid_json":
      return "A IA respondeu fora do formato esperado. Tente de novo.";
    case "prompt_too_large":
      return "Há informação demais para analisar de uma vez.";
    case "cancelled":
      return "Análise interrompida.";
    case "limite_local":
      return "Limite diário de uso da IA definido em Configurações foi atingido.";
    default:
      return "Falha temporária ao falar com a IA. Tente novamente.";
  }
}
