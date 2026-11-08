import { useState } from "react";
import clsx from "clsx";
import { Phone, MessageCircle, Sparkles, PhoneCall, Pencil, Trash2, ExternalLink, Copy, ShoppingBag, ArrowLeft, Plus, Star, Image as Img } from "lucide-react";
import { useStore } from "../data/store";
import { JanelaEmpresa, useDialogos } from "./Dialogos";
import { ETAPA, ETAPAS, RESULTADOS, potencialGmn, progressoChecklist, type Empresa, type EtapaId } from "../domain/gmn";
import { Botao, Cartao, Confirmar, Entrada, Janela, Selecao, Selo, useAcao, useAviso } from "../ui/kit";
import { Pagina } from "./Shell";
import { irPara } from "../lib/rota";
import { dataCurta, dataHora, formatarTelefone, isoDia, linkWhatsApp, moeda, normalizarTelefone } from "../lib/util";

export function Ficha({ id }: { id: string }) {
  const { empresas, atividades, tarefas, servicos, acoes, config } = useStore();
  const dlg = useDialogos();
  const acao = useAcao();
  const avisar = useAviso();
  const [editar, setEditar] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const [vender, setVender] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState("");
  const [diaTarefa, setDiaTarefa] = useState(isoDia(Date.now() + 86_400_000));
  const e = empresas.find((x) => x.id === id);
  if (!e) return <Pagina><p className="text-muted">Empresa não encontrada.</p><Botao className="mt-3" onClick={() => irPara("empresas")}>Voltar</Botao></Pagina>;
  const pot = potencialGmn(e);
  const tel = e.whatsapp || e.telefone || e.contatos.find((c) => c.telefone)?.telefone || "";
  const wpp = linkWhatsApp(e.whatsapp || e.telefone, "");
  const hist = atividades.filter((a) => a.empresaId === e.id);
  const tfs = tarefas.filter((t) => t.empresaId === e.id);
  const svs = servicos.filter((s) => s.empresaId === e.id);

  return (
    <Pagina className="max-w-4xl">
      <button onClick={() => history.length > 1 ? history.back() : irPara("empresas")} className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted"><ArrowLeft className="size-4" /> Voltar</button>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-semibold leading-tight">{e.nome}</h1>
          <p className="text-[14px] text-muted">{[e.segmento, e.cidade && `${e.cidade}${e.uf ? `/${e.uf}` : ""}`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          <p className={clsx("num text-[28px] font-bold leading-none", pot.prioridade === "alta" ? "text-ok" : pot.prioridade === "media" ? "text-warn" : "text-muted")}>{pot.total}</p>
          <p className="text-[11.5px] text-dim">potencial de venda</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tel ? <a href={`tel:+55${normalizarTelefone(tel)}`} onClick={() => setTimeout(() => dlg.ligacao(e.id), 400)} className="flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-[14px] font-semibold text-ink"><Phone className="size-4" /> Ligar</a> : <Botao disabled>Sem telefone</Botao>}
        <Botao icone={<PhoneCall className="size-4" />} onClick={() => dlg.ligacao(e.id)}>Registrar ligação</Botao>
        <Botao icone={<MessageCircle className="size-4" />} onClick={() => dlg.mensagem(e.id)}>Mensagem</Botao>
        <Botao icone={<Sparkles className="size-4" />} onClick={() => dlg.analise(e.id)}>Analisar ligação</Botao>
      </div>

      <Cartao className="mt-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[14px] font-semibold">Etapa</p>
          <Selecao aria-label="Etapa" value={e.etapa} onChange={(x) => acao(() => acoes.mudarEtapa(e, x.target.value as EtapaId), "Etapa atualizada")} className="h-10 w-auto flex-1 py-0">
            {ETAPAS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </Selecao>
          <Botao variante="primario" icone={<ShoppingBag className="size-4" />} onClick={() => setVender(true)}>Vender serviço</Botao>
        </div>
        <div className="mt-4 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
          <Dado r="Telefone" v={e.telefone ? formatarTelefone(e.telefone) : "—"} />
          <Dado r="WhatsApp" v={e.whatsapp ? <a className="text-ok" href={wpp ?? "#"} target="_blank" rel="noopener noreferrer">{formatarTelefone(e.whatsapp)}</a> : "—"} />
          <Dado r="Site" v={e.site ? <a className="text-info" href={e.site} target="_blank" rel="noopener noreferrer">{e.site.replace(/^https?:\/\//, "")}</a> : <span className="text-warn">Sem site próprio</span>} />
          <Dado r="Instagram" v={e.instagram || "—"} />
          <Dado r="Endereço" v={e.endereco || "—"} />
          <Dado r="Valor do serviço" v={moeda(e.valor)} />
        </div>
        {e.observacoes && <p className="mt-3 whitespace-pre-line text-[13.5px] text-muted">{e.observacoes}</p>}
        <div className="mt-3 flex gap-2">
          <Botao tamanho="sm" variante="fantasma" icone={<Pencil className="size-3.5" />} onClick={() => setEditar(true)}>Editar dados</Botao>
          <Botao tamanho="sm" variante="fantasma" icone={<Trash2 className="size-3.5" />} onClick={() => setExcluir(true)}>Excluir</Botao>
        </div>
      </Cartao>

      <Cartao className="mt-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-[16px] font-semibold">Perfil no Google</h2>
          {e.perfil?.link && <a href={e.perfil.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-info">Abrir no Maps <ExternalLink className="size-3.5" /></a>}
        </div>
        {e.perfil ? (
          <>
            <div className="mt-2 flex flex-wrap gap-3 text-[13.5px] text-muted">
              {e.perfil.nota !== null && <span className="inline-flex items-center gap-1"><Star className="size-3.5 text-warn" /> {e.perfil.nota.toFixed(1).replace(".", ",")} ({e.perfil.avaliacoes ?? 0})</span>}
              {e.perfil.fotos !== null && <span className="inline-flex items-center gap-1"><Img className="size-3.5" /> {e.perfil.fotos} fotos</span>}
              {e.perfil.categoria && <span>{e.perfil.categoria}</span>}
            </div>
            <p className="mt-1 text-[12px] text-dim">Fonte: {e.perfil.fonte} · analisado em {dataCurta(e.perfil.analisadoEm)}. O que a fonte não mostra aparece como “a conferir”.</p>
          </>
        ) : <p className="mt-2 text-[13.5px] text-muted">Sem análise do perfil. Empresas vindas do Radar já chegam analisadas.</p>}
        {pot.motivos.length > 0 && <p className="mt-2 text-[12.5px] text-muted">Potencial: {pot.motivos.join(" · ")}</p>}
        {e.problemas.length > 0 && (
          <ul className="mt-3 space-y-2">
            {e.problemas.map((p) => (
              <li key={p.id} className="rounded-xl border border-line/70 bg-base/60 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="flex-1 text-[14px] font-semibold">{p.titulo}</p>
                  <Selo tom={p.prioridade === "alta" ? "bad" : p.prioridade === "media" ? "warn" : "neutro"}>{p.prioridade === "alta" ? "Prioridade alta" : p.prioridade === "media" ? "Média" : "Baixa"}</Selo>
                  <Selo tom={p.status === "fato" ? "ok" : "neutro"}>{p.status === "fato" ? `Confirmado · confiança ${p.confianca}` : "A conferir"}</Selo>
                </div>
                <p className="mt-1 text-[13px] text-muted">{p.evidencia}</p>
                <p className="mt-1 text-[13px]"><b>Melhoria:</b> {p.melhoria}</p>
              </li>
            ))}
          </ul>
        )}
        {e.abordagem && (
          <div className="mt-4 rounded-xl border border-brand/30 bg-brand/[.06] p-3">
            <p className="text-[13px] font-semibold">Sugestão de abordagem</p>
            <p className="mt-1 text-[13.5px] text-muted">{e.abordagem}</p>
            <div className="mt-2 flex gap-2">
              <Botao tamanho="sm" icone={<Copy className="size-3.5" />} onClick={() => navigator.clipboard?.writeText(e.abordagem).then(() => avisar("ok", "Copiado"))}>Copiar</Botao>
              {linkWhatsApp(e.whatsapp || e.telefone, e.abordagem) && <a href={linkWhatsApp(e.whatsapp || e.telefone, e.abordagem)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-ok/15 px-3 py-1.5 text-[13px] font-semibold text-ok"><MessageCircle className="size-3.5" /> WhatsApp</a>}
            </div>
          </div>
        )}
      </Cartao>

      {svs.length > 0 && (
        <Cartao className="mt-4 p-5">
          <h2 className="text-[16px] font-semibold">Serviços</h2>
          <ul className="mt-2 divide-y divide-line/60">
            {svs.map((s) => {
              const pc = progressoChecklist(s);
              return <li key={s.id}><button onClick={() => irPara(`servico-${s.id}`)} className="flex w-full items-center gap-3 py-2.5 text-left"><span className="flex-1 text-[14px] font-semibold">{s.descricao}</span><Selo tom={s.pago ? "ok" : "warn"}>{s.pago ? "Pago" : "A receber"}</Selo><span className="num text-[13px] text-muted">{pc.feitos}/{pc.total}</span></button></li>;
            })}
          </ul>
        </Cartao>
      )}

      <Cartao className="mt-4 p-5">
        <h2 className="text-[16px] font-semibold">Próximos passos</h2>
        <ul className="mt-2 divide-y divide-line/60">
          {tfs.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <input type="checkbox" aria-label="Concluir" className="size-4 accent-[rgb(var(--brand))]" checked={t.concluida} onChange={() => acoes.concluirTarefa(t)} />
              <span className={clsx("flex-1 text-[14px]", t.concluida && "text-dim line-through")}>{t.titulo}</span>
              <span className="text-[12.5px] text-dim">{dataCurta(new Date(`${t.vence}T12:00`).getTime())}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
          <Entrada aria-label="Novo próximo passo" placeholder="Novo próximo passo" value={novaTarefa} onChange={(x) => setNovaTarefa(x.target.value)} />
          <Entrada aria-label="Data" type="date" value={diaTarefa} onChange={(x) => setDiaTarefa(x.target.value)} className="w-[150px]" />
          <Botao icone={<Plus className="size-4" />} disabled={!novaTarefa.trim()} onClick={async () => { await acao(() => acoes.criarTarefa({ empresaId: e.id, titulo: novaTarefa.trim(), vence: diaTarefa })); setNovaTarefa(""); }}>Adicionar</Botao>
        </div>
      </Cartao>

      <Cartao className="mt-4 p-5">
        <h2 className="text-[16px] font-semibold">Histórico</h2>
        {hist.length === 0 ? <p className="mt-2 text-[14px] text-muted">Nada registrado ainda.</p> : (
          <ol className="mt-2 space-y-3">
            {hist.map((a) => (
              <li key={a.id} className="border-l-2 border-line pl-3">
                <p className="text-[13.5px] font-semibold">
                  {a.tipo === "ligacao" ? `Ligação · ${RESULTADOS.find((r) => r.id === a.resultado)?.rotulo ?? ""}${a.analise ? " · analisada" : ""}` : a.tipo === "mensagem" ? (a.direcao === "recebida" ? "Mensagem recebida do cliente" : "Mensagem enviada") : a.tipo === "etapa" ? `${a.de ? ETAPA[a.de].curto : ""} → ${a.para ? ETAPA[a.para].curto : ""}` : "Nota"}
                </p>
                <p className="text-[12px] text-dim">{dataHora(a.quando)} · {a.direcao === "recebida" ? "enviada pelo cliente, registrada por " : "por "}{a.autor}</p>
                {a.texto && a.tipo !== "etapa" && <p className="mt-1 whitespace-pre-line text-[13.5px] text-fg/90">{a.texto}</p>}
              </li>
            ))}
          </ol>
        )}
      </Cartao>

      {editar && <JanelaEmpresa emp={e} onFechar={() => setEditar(false)} />}
      {vender && <JanelaVenda e={e} padrao={config.preco} onFechar={() => setVender(false)} />}
      <Confirmar aberta={excluir} onFechar={() => setExcluir(false)} titulo="Excluir empresa?" texto="O histórico continua salvo, mas a empresa sai das listas." rotulo="Excluir" perigo onConfirmar={async () => { await acao(() => acoes.excluirEmpresa(e.id), "Empresa excluída"); irPara("empresas"); }} />
    </Pagina>
  );
}

function Dado({ r, v }: { r: string; v: React.ReactNode }) {
  return <div className="flex gap-2"><span className="w-28 shrink-0 text-muted">{r}</span><span className="min-w-0 break-words">{v}</span></div>;
}

function JanelaVenda({ e, padrao, onFechar }: { e: Empresa; padrao: number; onFechar: () => void }) {
  const { acoes } = useStore();
  const acao = useAcao();
  const [valor, setValor] = useState(String(e.valor || padrao));
  return (
    <Janela aberta onFechar={onFechar} titulo="Vender serviço" subtitulo={e.nome} rodape={<><Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao><Botao variante="primario" disabled={!Number(valor)} onClick={async () => { const id = await acao(() => acoes.venderServico(e, Number(valor)), "Ordem de serviço criada"); if (id) { onFechar(); irPara(`servico-${id}`); } }}>Criar ordem de serviço</Botao></>}>
      <div className="space-y-3">
        <p className="text-[14px] text-muted">Otimização do Perfil da Empresa no Google. A ordem de serviço já vem com o checklist de entrega.</p>
        <label className="block text-[13px] font-semibold text-muted" htmlFor="vd-v">Valor (R$)</label>
        <Entrada id="vd-v" inputMode="numeric" value={valor} onChange={(x) => setValor(x.target.value.replace(/[^\d]/g, ""))} />
        <p className="text-[12.5px] text-dim">A venda conta como contratada agora e como recebida quando você marcar o pagamento.</p>
      </div>
    </Janela>
  );
}
