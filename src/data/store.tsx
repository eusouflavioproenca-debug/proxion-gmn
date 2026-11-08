/** Estado do painel GMN: lê os documentos do banco e expõe listas tipadas e ações. */
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Banco, Doc } from "./banco";
import {
  CONFIG_PADRAO, ETAPA, lerAtividade, lerCandidato, lerConfig, lerEmpresa, lerServico, lerTarefa,
  type Atividade, type Candidato, type Config, type Empresa, type EtapaId, type Servico, type Tarefa,
} from "../domain/gmn";
import { isoDia, novoId } from "../lib/util";

function porColecao<T>(m: Map<string, Doc>, col: string, ler: (id: string, d: Doc) => T | null): T[] {
  const out: T[] = [];
  for (const [path, d] of m) {
    const i = path.lastIndexOf("/");
    if (path.slice(0, i) !== col) continue;
    const v = ler(path.slice(i + 1), d);
    if (v) out.push(v);
  }
  return out;
}

export interface Acoes {
  salvarEmpresa(dados: Partial<Empresa> & { nome: string }, id?: string): Promise<string>;
  mudarEtapa(e: Empresa, para: EtapaId, motivo?: string): Promise<void>;
  excluirEmpresa(id: string): Promise<void>;
  registrar(a: Omit<Atividade, "id" | "autor">): Promise<string>;
  excluirAtividade(id: string): Promise<void>;
  criarTarefa(t: { empresaId: string; titulo: string; vence: string }): Promise<void>;
  concluirTarefa(t: Tarefa): Promise<void>;
  salvarServico(s: Servico): Promise<void>;
  venderServico(e: Empresa, valor: number): Promise<string>;
  salvarCandidatos(lista: Doc[]): Promise<number>;
  decidirCandidato(c: Candidato, status: "aprovado" | "descartado"): Promise<string | null>;
  marcarEnviado(c: Candidato): Promise<void>;
  salvarConfig(c: Config): Promise<void>;
}

export interface Store {
  pronto: boolean;
  banco: Banco;
  empresas: Empresa[];
  atividades: Atividade[];
  tarefas: Tarefa[];
  servicos: Servico[];
  radar: Candidato[];
  config: Config;
  acoes: Acoes;
  ia: boolean;
  preview: boolean;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("Store fora do provider");
  return s;
};

export function StoreProvider({ banco, children, ia, preview = false }: { banco: Banco; children: ReactNode; ia: boolean; preview?: boolean }) {
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    banco.carregar().then(() => setPronto(true), (e: { code?: string; message?: string }) => setErro(e.code === "sem_tabela" ? "As tabelas do painel ainda não foram criadas no Supabase (rode o arquivo supabase/schema.sql)." : e.code === "sem_permissao" ? "Seu usuário ainda não foi liberado para este painel." : "Não foi possível carregar os dados. Verifique a internet e recarregue."));
  }, [banco]);
  const docs = useSyncExternalStore((cb) => banco.ouvir(cb), () => banco.docs());

  const v = useMemo(() => {
    const empresas = porColecao(docs, "empresas", lerEmpresa).sort((a, b) => b.atualizadoEm - a.atualizadoEm);
    const atividades = porColecao(docs, "atividades", lerAtividade).sort((a, b) => b.quando - a.quando);
    const tarefas = porColecao(docs, "tarefas", lerTarefa).sort((a, b) => a.vence.localeCompare(b.vence));
    const servicos = porColecao(docs, "servicos", lerServico).sort((a, b) => b.criadoEm - a.criadoEm);
    const radar = porColecao(docs, "radar", lerCandidato).sort((a, b) => b.criadoEm - a.criadoEm);
    const config = docs.has("config/geral") ? lerConfig(docs.get("config/geral")) : CONFIG_PADRAO;
    return { empresas, atividades, tarefas, servicos, radar, config };
  }, [docs]);

  const acoes = useMemo<Acoes>(() => {
    const get = (path: string) => banco.docs().get(path);
    const atualizar = async (path: string, patch: Doc) => {
      const atual = get(path);
      if (!atual) throw { code: "nao_encontrado", message: "Registro não encontrado." };
      await banco.salvar(path, { ...atual, ...patch });
    };
    const marcarContato = async (empresaId: string, quando: number) => {
      const e = get(`empresas/${empresaId}`);
      if (e && (typeof e.ultimoContatoEm !== "number" || (e.ultimoContatoEm as number) < quando)) await banco.salvar(`empresas/${empresaId}`, { ...e, ultimoContatoEm: quando, atualizadoEm: Date.now() });
    };
    const a: Acoes = {
      async salvarEmpresa(dados, id) {
        const agora = Date.now();
        if (id) {
          await atualizar(`empresas/${id}`, { ...dados, atualizadoEm: agora });
          return id;
        }
        const nid = novoId("e");
        await banco.salvar(`empresas/${nid}`, { etapa: "nova", valor: lerConfig(get("config/geral")).preco, contatos: [], problemas: [], ...dados, etapaDesde: agora, criadoEm: agora, atualizadoEm: agora, ultimoContatoEm: null });
        return nid;
      },
      async mudarEtapa(e, para, motivo) {
        if (e.etapa === para) return;
        const agora = Date.now();
        await atualizar(`empresas/${e.id}`, { etapa: para, etapaDesde: agora, atualizadoEm: agora });
        await banco.salvar(`atividades/${novoId("a")}`, { empresaId: e.id, tipo: "etapa", de: e.etapa, para, quando: agora, texto: motivo ?? `${ETAPA[e.etapa].nome} → ${ETAPA[para].nome}`, autor: lerConfig(get("config/geral")).nome });
      },
      async excluirEmpresa(id) {
        await banco.apagar(`empresas/${id}`);
      },
      async registrar(at) {
        const id = novoId("a");
        await banco.salvar(`atividades/${id}`, { ...at, autor: lerConfig(get("config/geral")).nome });
        if (at.tipo === "ligacao" || at.tipo === "mensagem") await marcarContato(at.empresaId, at.quando);
        return id;
      },
      async excluirAtividade(id) {
        await banco.apagar(`atividades/${id}`);
      },
      async criarTarefa(t) {
        await banco.salvar(`tarefas/${novoId("t")}`, { ...t, concluida: false, criadoEm: Date.now() });
      },
      async concluirTarefa(t) {
        await atualizar(`tarefas/${t.id}`, { concluida: !t.concluida });
      },
      async salvarServico(s) {
        const { id, ...resto } = s;
        await banco.salvar(`servicos/${id}`, resto as unknown as Doc);
      },
      async venderServico(e, valor) {
        const id = novoId("s");
        await banco.salvar(`servicos/${id}`, { empresaId: e.id, descricao: "Otimização do Perfil da Empresa no Google", valor, pago: false, pagoEm: null, checklist: {}, evidencias: [], resumo: "", criadoEm: Date.now(), concluidoEm: null });
        if (!["vendido", "aguardando_autorizacao", "em_otimizacao", "aguardando_google", "concluido"].includes(e.etapa)) await a.mudarEtapa(e, "aguardando_pagamento", "Venda fechada: ordem de serviço criada");
        return id;
      },
      async salvarCandidatos(lista) {
        let n = 0;
        for (const d of lista) {
          await banco.salvar(`radar/${novoId("r")}`, d);
          n++;
        }
        return n;
      },
      async decidirCandidato(c, status) {
        await atualizar(`radar/${c.id}`, { status, decididoEm: Date.now() });
        if (status !== "aprovado") return null;
        const { id: _id, status: _s, enviadoAoPrincipal: _e, ...dados } = c;
        return a.salvarEmpresa({ ...dados, etapa: "aguardando_ligacao" });
      },
      async marcarEnviado(c) {
        await atualizar(`radar/${c.id}`, { enviadoAoPrincipal: true });
      },
      async salvarConfig(c) {
        await banco.salvar("config/geral", c as unknown as Doc);
      },
    };
    return a;
  }, [banco]);

  if (erro) return <Erro texto={erro} />;
  return <Ctx.Provider value={{ pronto, banco, ...v, acoes, ia, preview }}>{children}</Ctx.Provider>;
}

function Erro({ texto }: { texto: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-[18px] font-semibold">Não foi possível abrir o painel</p>
      <p className="max-w-md text-[14px] text-muted">{texto}</p>
    </div>
  );
}

export const hojeIso = () => isoDia();
