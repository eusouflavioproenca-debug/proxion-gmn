/** Janelas usadas em várias telas: registrar ligação, mensagem, analisar ligação com IA, nova empresa. */
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Sparkles, Square, MessageCircle } from "lucide-react";
import { useStore } from "../data/store";
import { ETAPA, ETAPAS, RESULTADOS, lerAnalise, promptAnaliseLigacao, type AnaliseLigacao, type Empresa, type EtapaId, type ResultadoLigacao } from "../domain/gmn";
import { Botao, Campo, Entrada, Janela, Selecao, Texto, useAcao, useAviso } from "../ui/kit";
import { dataLocal, isoDia, linkWhatsApp } from "../lib/util";
import { mensagemErroIA } from "../lib/claude";

type Estado = null | { tipo: "ligacao" | "mensagem" | "analise"; empresaId: string } | { tipo: "nova" };
interface Api { ligacao(id: string): void; mensagem(id: string): void; analise(id: string): void; novaEmpresa(): void }
const Ctx = createContext<Api | null>(null);
export const useDialogos = () => useContext(Ctx)!;

export function DialogosProvider({ children }: { children: ReactNode }) {
  const [e, setE] = useState<Estado>(null);
  const api = useMemo<Api>(() => ({ ligacao: (id) => setE({ tipo: "ligacao", empresaId: id }), mensagem: (id) => setE({ tipo: "mensagem", empresaId: id }), analise: (id) => setE({ tipo: "analise", empresaId: id }), novaEmpresa: () => setE({ tipo: "nova" }) }), []);
  const fechar = () => setE(null);
  return (
    <Ctx.Provider value={api}>
      {children}
      {e?.tipo === "ligacao" && <JanelaLigacao empresaId={e.empresaId} onFechar={fechar} />}
      {e?.tipo === "mensagem" && <JanelaMensagem empresaId={e.empresaId} onFechar={fechar} />}
      {e?.tipo === "analise" && <JanelaAnalise empresaId={e.empresaId} onFechar={fechar} />}
      {e?.tipo === "nova" && <JanelaEmpresa onFechar={fechar} />}
    </Ctx.Provider>
  );
}

const agoraHora = () => new Date().toTimeString().slice(0, 5);
const maisDias = (n: number) => isoDia(Date.now() + n * 86_400_000);

/** Etapa sugerida pelo resultado da ligação. */
export function etapaPorResultado(atual: EtapaId, r: ResultadoLigacao): EtapaId | null {
  const ord = ETAPA[atual].ordem;
  if (r === "atendeu" && ord < ETAPA.contato.ordem) return "contato";
  if ((r === "nao_atendeu" || r === "caixa_postal") && ord < ETAPA.tentativa.ordem) return "tentativa";
  if (r === "numero_errado" && ord < ETAPA.contato.ordem) return "perdido";
  return null;
}

function JanelaLigacao({ empresaId, onFechar }: { empresaId: string; onFechar: () => void }) {
  const { empresas, acoes } = useStore();
  const acao = useAcao();
  const emp = empresas.find((x) => x.id === empresaId);
  const [resultado, setResultado] = useState<ResultadoLigacao>("atendeu");
  const [texto, setTexto] = useState("");
  const [etapa, setEtapa] = useState<EtapaId | "">("");
  const [prox, setProx] = useState("");
  const [proxDia, setProxDia] = useState(maisDias(1));
  const [salvando, setSalvando] = useState(false);
  if (!emp) return null;
  const sugerida = etapaPorResultado(emp.etapa, resultado);
  const destino = etapa || sugerida || "";
  async function salvar() {
    if (!emp) return;
    setSalvando(true);
    const ok = await acao(async () => {
      await acoes.registrar({ empresaId: emp.id, tipo: "ligacao", resultado, quando: Date.now(), texto: texto.trim() });
      if (destino) await acoes.mudarEtapa(emp, destino as EtapaId, `Ligação: ${RESULTADOS.find((r) => r.id === resultado)!.rotulo}`);
      if (prox.trim()) await acoes.criarTarefa({ empresaId: emp.id, titulo: prox.trim(), vence: proxDia });
      return true;
    }, "Ligação registrada");
    setSalvando(false);
    if (ok) onFechar();
  }
  return (
    <Janela aberta onFechar={onFechar} titulo="Registrar ligação" subtitulo={emp.nome} rodape={<><Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao><Botao variante="primario" carregando={salvando} onClick={salvar}>Salvar</Botao></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {RESULTADOS.map((r) => <button key={r.id} type="button" onClick={() => setResultado(r.id)} className={clsx("rounded-xl border px-2 py-2.5 text-[13px] font-semibold", resultado === r.id ? "border-brand/60 bg-brand/12 text-fg" : "border-line text-muted")}>{r.rotulo}</button>)}
        </div>
        <Campo rotulo="O que foi conversado (opcional)" htmlFor="lg-t"><Texto id="lg-t" value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-[90px]" placeholder="Interesse, objeções, combinados…" /></Campo>
        <Campo rotulo="Mover para a etapa" htmlFor="lg-e">
          <Selecao id="lg-e" value={etapa || sugerida || ""} onChange={(e) => setEtapa(e.target.value as EtapaId)}>
            <option value="">Manter em “{ETAPA[emp.etapa].nome}”</option>
            {ETAPAS.map((x) => <option key={x.id} value={x.id}>{x.nome}{x.id === sugerida ? " (sugerida)" : ""}</option>)}
          </Selecao>
        </Campo>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Campo rotulo="Próximo passo (opcional)" htmlFor="lg-p"><Entrada id="lg-p" value={prox} onChange={(e) => setProx(e.target.value)} placeholder={resultado === "atendeu" ? "Ex.: enviar explicação no WhatsApp" : "Ex.: ligar de novo"} /></Campo>
          <Campo rotulo="Quando" htmlFor="lg-d"><Entrada id="lg-d" type="date" value={proxDia} onChange={(e) => setProxDia(e.target.value)} /></Campo>
        </div>
      </div>
    </Janela>
  );
}

function JanelaMensagem({ empresaId, onFechar }: { empresaId: string; onFechar: () => void }) {
  const { empresas, acoes } = useStore();
  const acao = useAcao();
  const emp = empresas.find((x) => x.id === empresaId);
  const [direcao, setDirecao] = useState<"enviada" | "recebida">("enviada");
  const [texto, setTexto] = useState(emp?.abordagem ?? "");
  const [dia, setDia] = useState(isoDia());
  const [hr, setHr] = useState(agoraHora());
  if (!emp) return null;
  const wpp = linkWhatsApp(emp.whatsapp || emp.telefone, texto);
  return (
    <Janela aberta onFechar={onFechar} titulo="Mensagem" subtitulo={emp.nome} rodape={<><Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao><Botao variante="primario" disabled={!texto.trim()} onClick={async () => { if (await acao(async () => { await acoes.registrar({ empresaId: emp.id, tipo: "mensagem", direcao, texto: texto.trim(), quando: dataLocal(dia, hr) }); return true; }, "Mensagem registrada")) onFechar(); }}>Registrar no histórico</Botao></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-base p-1">
          {([["enviada", "Eu enviei"], ["recebida", "O cliente enviou"]] as const).map(([v, r]) => <button key={v} type="button" onClick={() => setDirecao(v)} className={clsx("rounded-lg py-2 text-[13px] font-semibold", direcao === v ? "bg-raised text-fg" : "text-muted")}>{r}</button>)}
        </div>
        <Campo rotulo={direcao === "enviada" ? "Mensagem" : "O que o cliente escreveu"} htmlFor="mg-t"><Texto id="mg-t" value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-[130px]" /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Data" htmlFor="mg-d"><Entrada id="mg-d" type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
          <Campo rotulo="Hora" htmlFor="mg-h"><Entrada id="mg-h" type="time" value={hr} onChange={(e) => setHr(e.target.value)} /></Campo>
        </div>
        {direcao === "enviada" && wpp && <a href={wpp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-ok/15 px-3 py-2 text-[13.5px] font-semibold text-ok"><MessageCircle className="size-4" /> Abrir no WhatsApp com este texto</a>}
      </div>
    </Janela>
  );
}

function JanelaAnalise({ empresaId, onFechar }: { empresaId: string; onFechar: () => void }) {
  const { empresas, acoes, ia, config } = useStore();
  const acao = useAcao();
  const avisar = useAviso();
  const emp = empresas.find((x) => x.id === empresaId);
  const [transcricao, setTranscricao] = useState("");
  const [consent, setConsent] = useState(false);
  const [a, setA] = useState<AnaliseLigacao | null>(null);
  const [rodando, setRodando] = useState(false);
  const [mover, setMover] = useState(true);
  const ctl = useRef<AbortController | null>(null);
  if (!emp) return null;
  async function analisar() {
    if (!emp) return;
    ctl.current = new AbortController();
    setRodando(true);
    try {
      const { sampleApi } = await import("../data/supabase");
      const r = await sampleApi.json(promptAnaliseLigacao(emp, transcricao, config.nome), { signal: ctl.current.signal, modelTier: "default" });
      const l = lerAnalise(r);
      if (!l) throw { code: "invalid_json" };
      setA(l);
    } catch (e) {
      const c = (e as { code?: string }).code ?? "";
      if (c !== "cancelled") avisar("erro", c === "invalid_json" ? "A análise veio incompleta. Tente de novo." : mensagemErroIA(c));
    } finally {
      setRodando(false);
    }
  }
  async function salvar() {
    if (!emp || !a) return;
    const ok = await acao(async () => {
      await acoes.registrar({ empresaId: emp.id, tipo: "ligacao", resultado: "atendeu", quando: Date.now(), texto: a.resumo, analise: a });
      if (mover && a.etapaSugerida && a.etapaSugerida !== emp.etapa) await acoes.mudarEtapa(emp, a.etapaSugerida, "Sugerido pela análise da ligação");
      if (a.proximoPasso) await acoes.criarTarefa({ empresaId: emp.id, titulo: a.proximoPasso, vence: a.dataProximo || maisDias(1) });
      return true;
    }, "Ligação analisada e registrada");
    if (ok) onFechar();
  }
  const wpp = a ? linkWhatsApp(emp.whatsapp || emp.telefone, a.mensagem) : null;
  return (
    <Janela aberta onFechar={() => { ctl.current?.abort(); onFechar(); }} titulo="Analisar ligação" subtitulo={emp.nome}
      rodape={a ? <><Botao variante="fantasma" onClick={() => setA(null)}>Voltar</Botao><Botao variante="primario" onClick={salvar}>Salvar no histórico</Botao></> : <>{rodando && <Botao variante="fantasma" icone={<Square className="size-3.5" />} onClick={() => ctl.current?.abort()}>Parar</Botao>}<Botao variante="primario" icone={<Sparkles className="size-4" />} carregando={rodando} disabled={!ia || transcricao.trim().length < 40 || !consent} onClick={analisar}>Analisar</Botao></>}>
      {!a ? (
        <div className="space-y-4">
          <Campo rotulo="Transcrição da ligação" dica="Cole o texto da gravação (do app de gravação do celular ou de um transcritor)." htmlFor="an-t"><Texto id="an-t" value={transcricao} onChange={(e) => setTranscricao(e.target.value)} className="min-h-[180px]" /></Campo>
          <label className="flex items-start gap-2 text-[13.5px]"><input type="checkbox" className="mt-0.5 accent-[rgb(var(--brand))]" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> A pessoa foi avisada de que a ligação seria gravada (LGPD).</label>
          {!ia && <p className="text-[13px] text-warn">A IA ainda não está configurada neste painel.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <Campo rotulo="Resumo" htmlFor="an-r"><Texto id="an-r" value={a.resumo} onChange={(e) => setA({ ...a, resumo: e.target.value })} /></Campo>
          <p className="text-[13.5px]">Interesse: <b>{{ alto: "alto", medio: "médio", baixo: "baixo", nenhum: "nenhum" }[a.interesse]}</b></p>
          {a.objecoes.length > 0 && <div><p className="label">Objeções</p><ul className="text-[13.5px] text-muted">{a.objecoes.map((o) => <li key={o}>• {o}</li>)}</ul></div>}
          {a.compromissos.length > 0 && <div><p className="label">Compromissos</p><ul className="text-[13.5px] text-muted">{a.compromissos.map((o) => <li key={o}>• {o}</li>)}</ul></div>}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Campo rotulo="Próximo passo" htmlFor="an-p"><Entrada id="an-p" value={a.proximoPasso} onChange={(e) => setA({ ...a, proximoPasso: e.target.value })} /></Campo>
            <Campo rotulo="Quando" htmlFor="an-d"><Entrada id="an-d" type="date" value={a.dataProximo} onChange={(e) => setA({ ...a, dataProximo: e.target.value })} /></Campo>
          </div>
          {a.etapaSugerida && <label className="flex items-center gap-2 text-[13.5px]"><input type="checkbox" className="accent-[rgb(var(--brand))]" checked={mover} onChange={(e) => setMover(e.target.checked)} /> Mover para “{ETAPA[a.etapaSugerida].nome}”</label>}
          <Campo rotulo="Mensagem de follow-up" htmlFor="an-m"><Texto id="an-m" value={a.mensagem} onChange={(e) => setA({ ...a, mensagem: e.target.value })} className="min-h-[100px]" /></Campo>
          {wpp && a.mensagem && <a href={wpp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-ok"><MessageCircle className="size-4" /> Enviar pelo WhatsApp</a>}
        </div>
      )}
    </Janela>
  );
}

export function JanelaEmpresa({ onFechar, emp }: { onFechar: () => void; emp?: Empresa }) {
  const { acoes, empresas } = useStore();
  const acao = useAcao();
  const [d, setD] = useState({ nome: emp?.nome ?? "", segmento: emp?.segmento ?? "", cidade: emp?.cidade ?? "Sorocaba", uf: emp?.uf ?? "SP", telefone: emp?.telefone ?? "", whatsapp: emp?.whatsapp ?? "", site: emp?.site ?? "", instagram: emp?.instagram ?? "", endereco: emp?.endereco ?? "", observacoes: emp?.observacoes ?? "" });
  const dup = !emp && d.nome.trim().length > 2 ? empresas.find((e) => e.nome.toLowerCase() === d.nome.trim().toLowerCase()) : undefined;
  const C = (k: keyof typeof d, r: string, extra?: Partial<React.InputHTMLAttributes<HTMLInputElement>>) => <Campo rotulo={r} htmlFor={`em-${k}`}><Entrada id={`em-${k}`} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} {...extra} /></Campo>;
  return (
    <Janela aberta onFechar={onFechar} titulo={emp ? "Editar empresa" : "Nova empresa"} rodape={<><Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao><Botao variante="primario" disabled={!d.nome.trim()} onClick={async () => { const id = await acao(() => acoes.salvarEmpresa({ ...d, nome: d.nome.trim(), origem: emp?.origem || "Cadastro manual" }, emp?.id), emp ? "Empresa atualizada" : "Empresa cadastrada"); if (id) { onFechar(); if (!emp) location.hash = `empresa-${id}`; } }}>Salvar</Botao></>}>
      <div className="space-y-4">
        {C("nome", "Nome da empresa")}
        {dup && <p className="-mt-2 text-[13px] text-warn">Já existe uma empresa com esse nome.</p>}
        <div className="grid grid-cols-2 gap-3">{C("segmento", "Segmento")}{C("cidade", "Cidade")}</div>
        <div className="grid grid-cols-2 gap-3">{C("telefone", "Telefone", { inputMode: "tel" })}{C("whatsapp", "WhatsApp", { inputMode: "tel" })}</div>
        {C("site", "Site")}
        {C("instagram", "Instagram")}
        {C("endereco", "Endereço")}
        <Campo rotulo="Observações" htmlFor="em-obs"><Texto id="em-obs" value={d.observacoes} onChange={(e) => setD({ ...d, observacoes: e.target.value })} /></Campo>
      </div>
    </Janela>
  );
}
