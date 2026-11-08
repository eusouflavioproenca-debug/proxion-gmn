import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { MapPin, Search, Square, Check, X, ExternalLink, Globe, Star } from "lucide-react";
import { useStore } from "../data/store";
import { chaveEmpresa, lerCandidato, mapsParaCandidatos, potencialGmn, semSiteProprio, type Candidato, type ItemMaps } from "../domain/gmn";
import { Botao, Cartao, Entrada, Selecao, Selo, Vazio, useAcao, useAviso } from "../ui/kit";
import { Cabecalho, Pagina } from "./Shell";
import { irEmpresa } from "../lib/rota";
import { dataCurta, normalizarNome, plural } from "../lib/util";

const CHAVE = "fer:busca-maps";
const EXEMPLOS = ["restaurante", "salão de beleza", "barbearia", "oficina mecânica", "pet shop", "dentista", "academia", "padaria"];
type Andamento = { run: string; busca: string; inicio: number };
const ler = (): Andamento | null => { try { const v = JSON.parse(localStorage.getItem(CHAVE) || "null"); return v && Date.now() - v.inicio < 20 * 60_000 ? v : null; } catch { return null; } };
const gravar = (v: Andamento | null) => { try { if (v) localStorage.setItem(CHAVE, JSON.stringify(v)); else localStorage.removeItem(CHAVE); } catch { /* */ } };

/** Envia ao painel principal as empresas sem site próprio (Regra A/D). */
export async function enviarSemSite(cands: Candidato[], banco: ReturnType<typeof useStore>["banco"], marcar: (c: Candidato) => Promise<void>) {
  let n = 0;
  for (const c of cands) {
    if (c.enviadoAoPrincipal || !semSiteProprio(c)) continue;
    const r = await banco.enviarPonte({
      tipo: "site",
      destino: "principal",
      chave: c.chave,
      empresa: { nome: c.nome, segmento: c.segmento, cidade: c.cidade, uf: c.uf, endereco: c.endereco, telefone: c.telefone, instagram: c.instagram, googleMaps: c.perfil?.link ?? "", nota: c.perfil?.nota ?? null, avaliacoes: c.perfil?.avaliacoes ?? null },
      motivo: c.site ? "O link da ficha do Google aponta para rede social, não para um site próprio." : "A ficha do Google não tem site vinculado.",
    });
    if (r !== "indisponivel") { await marcar(c); n++; }
  }
  return n;
}

export function Radar() {
  const { radar, empresas, acoes, banco, config } = useStore();
  const avisar = useAviso();
  const acao = useAcao();
  const [busca, setBusca] = useState("");
  const [local, setLocal] = useState("Sorocaba, SP");
  const [qtd, setQtd] = useState("20");
  const [andamento, setAndamento] = useState<Andamento | null>(ler);
  const [seg, setSeg] = useState(0);
  const [semToken, setSemToken] = useState(false);
  const ref = useRef({ radar, empresas });
  ref.current = { radar, empresas };

  useEffect(() => {
    if (!andamento) return;
    let vivo = true;
    const t = setInterval(() => setSeg(Math.round((Date.now() - andamento.inicio) / 1000)), 1000);
    (async () => {
      const { chamarApi } = await import("../data/supabase");
      while (vivo) {
        await new Promise((r) => setTimeout(r, 5000));
        if (!vivo) return;
        const r = await chamarApi<{ status?: string; itens?: ItemMaps[] }>(`/api/maps?run=${andamento.run}`).catch(() => null);
        if (!r?.ok) continue;
        if (r.dados.status === "SUCCEEDED") {
          const conhecidas = new Set([...ref.current.empresas.map((e) => e.chave || chaveEmpresa({ nome: e.nome, cidade: e.cidade })), ...ref.current.radar.map((c) => c.chave)]);
          const nomes = new Set(ref.current.empresas.map((e) => normalizarNome(e.nome)));
          const novos = mapsParaCandidatos(r.dados.itens ?? [], config.nome).filter((c) => !conhecidas.has(c.chave as string) && !nomes.has(normalizarNome(c.nome as string)));
          const total = (r.dados.itens ?? []).length;
          await acoes.salvarCandidatos(novos);
          const cands = novos.map((d, i) => lerCandidato(`tmp${i}`, d)).filter(Boolean) as Candidato[];
          const semSite = cands.filter((c) => semSiteProprio(c)).length;
          avisar("ok", `${plural(novos.length, "empresa nova", "empresas novas")} no Radar${total > novos.length ? ` (${total - novos.length} já conhecidas)` : ""}${semSite ? ` · ${semSite} sem site vão para o painel principal` : ""}`);
          break;
        }
        if (r.dados.status && !["READY", "RUNNING"].includes(r.dados.status)) { avisar("erro", "A busca não terminou. Tente com menos empresas."); break; }
      }
      if (vivo) { gravar(null); setAndamento(null); }
    })();
    return () => { vivo = false; clearInterval(t); };
  }, [andamento, acoes, avisar, config.nome]);

  // Envia ao painel principal o que ainda não foi enviado (empresas sem site)
  const enviando = useRef(false);
  useEffect(() => {
    const falta = radar.filter((c) => !c.enviadoAoPrincipal && semSiteProprio(c));
    if (!falta.length || enviando.current) return;
    enviando.current = true;
    enviarSemSite(falta, banco, acoes.marcarEnviado).finally(() => { enviando.current = false; });
  }, [radar, banco, acoes]);

  async function iniciar(e: React.FormEvent) {
    e.preventDefault();
    const { chamarApi } = await import("../data/supabase");
    const r = await chamarApi<{ run?: string; erro?: string }>("/api/maps", { method: "POST", body: JSON.stringify({ busca: busca.trim(), local: `${local.trim()}, Brasil`, quantidade: Number(qtd) }) }).catch(() => null);
    if (!r) return avisar("erro", "Sem conexão.");
    if (r.status === 503) return setSemToken(true);
    if (!r.ok || !r.dados.run) return avisar("erro", r.dados.erro || "Não foi possível iniciar a busca.");
    const a = { run: r.dados.run, busca: busca.trim(), inicio: Date.now() };
    gravar(a);
    setSeg(0);
    setAndamento(a);
  }

  const pend = radar.filter((c) => c.status === "pendente").map((c) => ({ c, p: potencialGmn({ ...c, etapa: "nova" }) })).sort((a, b) => b.p.total - a.p.total);

  return (
    <Pagina className="max-w-4xl">
      <Cabecalho eyebrow="Radar" titulo="Encontrar empresas" descricao="Busca no Google Maps e analisa o perfil de cada empresa. Empresas sem site também vão para o painel principal." />
      <Cartao className="mt-6 p-5">
        <form onSubmit={iniciar}>
          <p className="flex items-center gap-2 text-[16px] font-semibold"><MapPin className="size-5 text-brand" /> Buscar no Google Maps</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Entrada aria-label="O que buscar" placeholder="O que buscar (ex.: restaurante)" value={busca} onChange={(e) => setBusca(e.target.value)} disabled={!!andamento} />
            <Entrada aria-label="Cidade" value={local} onChange={(e) => setLocal(e.target.value)} disabled={!!andamento} />
            <Selecao aria-label="Quantidade" value={qtd} onChange={(e) => setQtd(e.target.value)} disabled={!!andamento} className="h-10 w-auto py-0">{[10, 20, 40].map((n) => <option key={n} value={n}>{n} empresas</option>)}</Selecao>
          </div>
          {!andamento && <div className="mt-2 flex flex-wrap gap-1.5">{EXEMPLOS.map((x) => <button key={x} type="button" onClick={() => setBusca(x)} className="rounded-full border border-line px-2.5 py-1 text-[12.5px] text-muted">{x}</button>)}</div>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {andamento ? (
              <><Botao variante="primario" carregando disabled>Buscando “{andamento.busca}”… {seg}s</Botao><Botao variante="fantasma" icone={<Square className="size-3.5" />} onClick={() => { const run = andamento.run; gravar(null); setAndamento(null); import("../data/supabase").then(({ chamarApi }) => chamarApi(`/api/maps?run=${run}`, { method: "DELETE" })).catch(() => {}); }}>Parar busca</Botao><span className="text-[12.5px] text-dim">De 1 a 4 minutos.</span></>
            ) : <Botao variante="primario" type="submit" icone={<Search className="size-4" />} disabled={busca.trim().length < 2}>Buscar</Botao>}
          </div>
          {semToken && <p className="mt-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-[13.5px]">Falta cadastrar o <b>APIFY_TOKEN</b> nas variáveis da Vercel deste painel e fazer um Redeploy.</p>}
        </form>
      </Cartao>

      <h2 className="mt-6 text-[16px] font-semibold">Para aprovar <span className="num text-dim">{pend.length}</span></h2>
      {pend.length === 0 ? <Cartao className="mt-3"><Vazio icone={<MapPin className="size-5" />} titulo="Nada para aprovar" texto="Faça uma busca acima. As empresas chegam com o diagnóstico do perfil e a sugestão de abordagem." /></Cartao> : (
        <ul className="mt-3 space-y-3">
          {pend.map(({ c, p }) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{c.nome}</p>
                  <p className="text-[13px] text-muted">{[c.segmento, c.cidade, c.telefone].filter(Boolean).join(" · ")}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12.5px]">
                    {c.perfil?.nota != null && <span className="inline-flex items-center gap-1 text-muted"><Star className="size-3.5 text-warn" /> {c.perfil.nota.toFixed(1).replace(".", ",")} ({c.perfil.avaliacoes ?? 0})</span>}
                    {semSiteProprio(c) && <Selo tom="info"><Globe className="mr-1 inline size-3" />Sem site{c.enviadoAoPrincipal ? " · enviado ao painel principal" : ""}</Selo>}
                    {c.perfil?.link && <a href={c.perfil.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-info">Maps <ExternalLink className="size-3" /></a>}
                  </div>
                </div>
                <div className="text-right"><p className={clsx("num text-[20px] font-bold", p.prioridade === "alta" ? "text-ok" : p.prioridade === "media" ? "text-warn" : "text-muted")}>{p.total}</p><p className="text-[11px] text-dim">potencial</p></div>
              </div>
              {c.problemas.length > 0 && (
                <ul className="mt-2 space-y-1 text-[13px]">
                  {c.problemas.slice(0, 5).map((x) => <li key={x.id} className="flex gap-2"><span className={clsx("mt-1.5 size-1.5 shrink-0 rounded-full", x.prioridade === "alta" ? "bg-bad" : x.prioridade === "media" ? "bg-warn" : "bg-dim")} /><span><b>{x.titulo}</b>{x.status === "hipotese" ? <span className="text-dim"> (a conferir)</span> : null}</span></li>)}
                </ul>
              )}
              <p className="mt-2 text-[11.5px] text-dim">Fonte: {c.perfil?.fonte || "Google Maps"} · {c.perfil?.analisadoEm ? dataCurta(c.perfil.analisadoEm) : ""}</p>
              <div className="mt-3 flex gap-2">
                <Botao variante="primario" tamanho="sm" icone={<Check className="size-3.5" />} onClick={async () => { const id = await acao(() => acoes.decidirCandidato(c, "aprovado"), "Empresa adicionada ao funil"); if (id) irEmpresa(id); }}>Aprovar</Botao>
                <Botao tamanho="sm" variante="fantasma" icone={<X className="size-3.5" />} onClick={() => acao(() => acoes.decidirCandidato(c, "descartado"))}>Descartar</Botao>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Pagina>
  );
}
