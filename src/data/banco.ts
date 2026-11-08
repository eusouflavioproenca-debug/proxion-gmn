/** Banco do painel GMN: documentos em memória sincronizados com a tabela fer_docs do Supabase.
 *  Não lê nem escreve na tabela do painel principal (docs). A troca com ele passa só pela tabela "ponte". */
import type { SupabaseClient } from "@supabase/supabase-js";

export type Doc = Record<string, unknown>;

export interface ItemPonte {
  id: string;
  tipo: "site" | "gmn";
  origem: "principal" | "gmn";
  destino: "principal" | "gmn";
  chave: string;
  empresa: Doc;
  motivo: string;
  status: "pendente" | "aceita" | "recusada";
  criado_em: string;
}

export interface Banco {
  carregar(): Promise<void>;
  docs(): Map<string, Doc>;
  salvar(path: string, dados: Doc): Promise<void>;
  apagar(path: string): Promise<void>;
  ouvir(cb: () => void): () => void;
  /** Envia oportunidade ao outro painel. Ignora se a mesma empresa já foi enviada. */
  enviarPonte(item: Omit<ItemPonte, "id" | "status" | "criado_em" | "origem">): Promise<"enviada" | "ja_existia" | "indisponivel">;
  lerPonte(): Promise<ItemPonte[]>;
  decidirPonte(id: string, status: "aceita" | "recusada"): Promise<void>;
}

const colecaoDe = (path: string) => path.split("/").slice(0, -1).join("/");

/** Banco em memória: prévia local e testes. */
export class BancoMemoria implements Banco {
  private m = new Map<string, Doc>();
  private ouvintes = new Set<() => void>();
  ponte: ItemPonte[] = [];
  constructor(inicial: Record<string, Doc> = {}) {
    for (const [k, v] of Object.entries(inicial)) this.m.set(k, v);
  }
  async carregar() {}
  docs() {
    return this.m;
  }
  private emitir() {
    this.m = new Map(this.m);
    this.ouvintes.forEach((f) => f());
  }
  async salvar(path: string, dados: Doc) {
    this.m.set(path, structuredClone(dados));
    this.emitir();
  }
  async apagar(path: string) {
    this.m.delete(path);
    this.emitir();
  }
  ouvir(cb: () => void) {
    this.ouvintes.add(cb);
    return () => void this.ouvintes.delete(cb);
  }
  async enviarPonte(item: Omit<ItemPonte, "id" | "status" | "criado_em" | "origem">) {
    if (this.ponte.some((p) => p.destino === item.destino && p.chave === item.chave && p.tipo === item.tipo)) return "ja_existia" as const;
    this.ponte.push({ ...item, origem: "gmn", id: `pt${this.ponte.length + 1}`, status: "pendente", criado_em: new Date().toISOString() });
    return "enviada" as const;
  }
  async lerPonte() {
    return this.ponte.filter((p) => p.destino === "gmn" || p.origem === "gmn");
  }
  async decidirPonte(id: string, status: "aceita" | "recusada") {
    const p = this.ponte.find((x) => x.id === id);
    if (p) p.status = status;
  }
}

/** Banco no Supabase (tabela fer_docs) com tempo real entre aparelhos. */
export class BancoSupabase implements Banco {
  private m = new Map<string, Doc>();
  private ouvintes = new Set<() => void>();
  constructor(private sb: SupabaseClient) {}

  private emitir() {
    this.m = new Map(this.m);
    this.ouvintes.forEach((f) => f());
  }
  async carregar() {
    const novo = new Map<string, Doc>();
    for (let ini = 0; ; ini += 1000) {
      const { data, error } = await this.sb.from("fer_docs").select("path,dados").order("path").range(ini, ini + 999);
      if (error) throw { code: error.code === "42P01" ? "sem_tabela" : error.code === "42501" ? "sem_permissao" : "indisponivel", message: error.message };
      for (const r of data ?? []) novo.set(r.path as string, r.dados as Doc);
      if (!data || data.length < 1000) break;
    }
    this.m = novo;
    this.emitir();
    if (!this.canal) {
      this.canal = true;
      this.sb
        .channel("fer_docs")
        .on("postgres_changes", { event: "*", schema: "public", table: "fer_docs" }, (p) => {
          if (p.eventType === "DELETE") {
            const path = (p.old as { path?: string }).path;
            if (path) this.m.delete(path);
          } else {
            const r = p.new as { path: string; dados: Doc };
            this.m.set(r.path, r.dados);
          }
          this.emitir();
        })
        .subscribe();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") this.carregar().catch(() => {});
      });
    }
  }
  private canal = false;
  docs() {
    return this.m;
  }
  async salvar(path: string, dados: Doc) {
    const { error } = await this.sb.from("fer_docs").upsert({ path, colecao: colecaoDe(path), dados, atualizado: new Date().toISOString() });
    if (error) throw { code: error.code === "42501" ? "sem_permissao" : "indisponivel", message: error.message };
    this.m.set(path, dados);
    this.emitir();
  }
  async apagar(path: string) {
    const { error } = await this.sb.from("fer_docs").delete().eq("path", path);
    if (error) throw { code: "indisponivel", message: error.message };
    this.m.delete(path);
    this.emitir();
  }
  ouvir(cb: () => void) {
    this.ouvintes.add(cb);
    return () => void this.ouvintes.delete(cb);
  }
  async enviarPonte(item: Omit<ItemPonte, "id" | "status" | "criado_em" | "origem">) {
    const id = `pt_${item.tipo}_${item.chave}`.replace(/[^a-zA-Z0-9_:|.-]/g, "").slice(0, 200);
    const { error } = await this.sb.from("ponte").insert({ id, ...item, origem: "gmn", status: "pendente" });
    if (!error) return "enviada";
    if (error.code === "23505") return "ja_existia";
    return "indisponivel";
  }
  async lerPonte() {
    const { data, error } = await this.sb.from("ponte").select("*").order("criado_em", { ascending: false }).limit(500);
    if (error) return [];
    return (data ?? []) as ItemPonte[];
  }
  async decidirPonte(id: string, status: "aceita" | "recusada") {
    await this.sb.from("ponte").update({ status, decidido_em: new Date().toISOString() }).eq("id", id);
  }
}
