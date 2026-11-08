import { useState } from "react";
import clsx from "clsx";
import { ClipboardCheck, ArrowLeft, Copy, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useStore } from "../data/store";
import { CHECKLIST, progressoChecklist, resumoServico, type Servico } from "../domain/gmn";
import { Botao, Cartao, Entrada, Selo, Texto, Vazio, useAcao, useAviso } from "../ui/kit";
import { Cabecalho, Pagina } from "./Shell";
import { irEmpresa, irPara } from "../lib/rota";
import { dataCurta, moeda, normalizarUrl } from "../lib/util";

const status = (s: Servico) => (s.concluidoEm ? "concluido" : !s.pago ? "pagamento" : "execucao");
const ROTULO = { pagamento: "Aguardando pagamento", execucao: "Em execução", concluido: "Concluído" } as const;

export function Servicos() {
  const { servicos, empresas } = useStore();
  const [aba, setAba] = useState<"pagamento" | "execucao" | "concluido">("execucao");
  const lista = servicos.filter((s) => status(s) === aba);
  return (
    <Pagina className="max-w-4xl">
      <Cabecalho eyebrow="Entrega" titulo="Serviços" descricao="Cada venda vira uma ordem de serviço com checklist." />
      <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-base p-1">
        {(Object.keys(ROTULO) as (keyof typeof ROTULO)[]).map((k) => <button key={k} onClick={() => setAba(k)} className={clsx("rounded-lg py-2 text-[12.5px] font-semibold sm:text-[13.5px]", aba === k ? "bg-raised text-fg" : "text-muted")}>{ROTULO[k]} <span className="num text-dim">{servicos.filter((s) => status(s) === k).length}</span></button>)}
      </div>
      {lista.length === 0 ? <Cartao className="mt-4"><Vazio icone={<ClipboardCheck className="size-5" />} titulo="Nada aqui" texto="Use “Vender serviço” na ficha da empresa para criar uma ordem de serviço." /></Cartao> : (
        <ul className="mt-4 space-y-2">
          {lista.map((s) => {
            const e = empresas.find((x) => x.id === s.empresaId);
            const p = progressoChecklist(s);
            return (
              <li key={s.id}>
                <button onClick={() => irPara(`servico-${s.id}`)} className="card w-full p-4 text-left hover:border-brand/40">
                  <div className="flex items-center gap-2"><p className="flex-1 truncate text-[15px] font-semibold">{e?.nome ?? "Empresa removida"}</p><span className="num text-[14px] font-semibold">{moeda(s.valor)}</span></div>
                  <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-brand" style={{ width: `${(p.feitos / p.total) * 100}%` }} /></div><span className="num text-[12.5px] text-muted">{p.feitos}/{p.total}</span></div>
                  <p className="mt-1 text-[12px] text-dim">Vendido em {dataCurta(s.criadoEm)}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Pagina>
  );
}

export function ServicoPagina({ id }: { id: string }) {
  const { servicos, empresas, acoes } = useStore();
  const acao = useAcao();
  const avisar = useAviso();
  const s = servicos.find((x) => x.id === id);
  const [ev, setEv] = useState({ texto: "", url: "" });
  if (!s) return <Pagina><p className="text-muted">Serviço não encontrado.</p></Pagina>;
  const e = empresas.find((x) => x.id === s.empresaId);
  const p = progressoChecklist(s);
  const salvar = (n: Servico, msg?: string) => acao(() => acoes.salvarServico(n), msg);
  async function marcar(item: (typeof CHECKLIST)[number]["id"], feito: boolean) {
    if (!s) return;
    const atual = s.checklist[item];
    const n: Servico = { ...s, checklist: { ...s.checklist, [item]: { feito, em: Date.now(), obs: atual?.obs ?? "" } } };
    if (item === "pagamento") { n.pago = feito; n.pagoEm = feito ? Date.now() : null; }
    await salvar(n);
    if (e && item === "pagamento" && feito && e.etapa === "aguardando_pagamento") await acoes.mudarEtapa(e, "vendido", "Pagamento confirmado");
    if (e && item === "autorizacao" && feito && ["vendido", "aguardando_autorizacao"].includes(e.etapa)) await acoes.mudarEtapa(e, "em_otimizacao", "Autorização recebida");
    if (e && item === "enviadas" && feito && e.etapa === "em_otimizacao") await acoes.mudarEtapa(e, "aguardando_google", "Alterações enviadas ao Google");
  }
  async function concluir() {
    if (!s) return;
    const resumo = s.resumo || resumoServico(s, e);
    await salvar({ ...s, concluidoEm: Date.now(), resumo, checklist: { ...s.checklist, concluido: { feito: true, em: Date.now(), obs: s.checklist.concluido?.obs ?? "" } } }, "Serviço concluído");
    if (e && e.etapa !== "concluido") await acoes.mudarEtapa(e, "concluido", "Serviço concluído");
  }
  return (
    <Pagina className="max-w-3xl">
      <button onClick={() => irPara("servicos")} className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted"><ArrowLeft className="size-4" /> Serviços</button>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <button onClick={() => e && irEmpresa(e.id)} className="text-left text-[22px] font-semibold hover:text-brand-soft">{e?.nome ?? "Empresa"}</button>
          <p className="text-[14px] text-muted">{s.descricao} · vendido em {dataCurta(s.criadoEm)}</p>
        </div>
        <div className="text-right"><p className="num text-[22px] font-bold">{moeda(s.valor)}</p><Selo tom={s.pago ? "ok" : "warn"}>{s.pago ? `Pago em ${dataCurta(s.pagoEm ?? 0)}` : "A receber"}</Selo></div>
      </div>

      <Cartao className="mt-4 p-5">
        <div className="flex items-center justify-between"><h2 className="text-[16px] font-semibold">Checklist de entrega</h2><span className="num text-[13px] text-muted">{p.feitos}/{p.total}</span></div>
        <ul className="mt-3 space-y-2">
          {CHECKLIST.filter((c) => c.id !== "concluido").map((c) => {
            const v = s.checklist[c.id];
            return (
              <li key={c.id} className="rounded-xl border border-line/70 bg-base/60 p-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="size-5 accent-[rgb(var(--brand))]" checked={!!v?.feito} disabled={!!s.concluidoEm} onChange={(x) => marcar(c.id, x.target.checked)} />
                  <span className={clsx("flex-1 text-[14px] font-semibold", v?.feito && "text-muted")}>{c.rotulo}</span>
                  {v?.feito && <span className="text-[11.5px] text-dim">{dataCurta(v.em)}</span>}
                </label>
                {!s.concluidoEm && <Entrada aria-label={`Observação: ${c.rotulo}`} placeholder="Observação (opcional)" defaultValue={v?.obs ?? ""} onBlur={(x) => { if (x.target.value !== (v?.obs ?? "")) salvar({ ...s, checklist: { ...s.checklist, [c.id]: { feito: !!v?.feito, em: v?.em ?? Date.now(), obs: x.target.value.trim() } } }); }} className="mt-2 h-9 text-[13px]" />}
                {s.concluidoEm && v?.obs && <p className="mt-1 text-[13px] text-muted">{v.obs}</p>}
              </li>
            );
          })}
        </ul>
      </Cartao>

      <Cartao className="mt-4 p-5">
        <h2 className="text-[16px] font-semibold">Evidências</h2>
        <p className="text-[13px] text-muted">Links de prints (Drive, Google Fotos) ou descrição do que foi feito.</p>
        <ul className="mt-2 space-y-1.5">
          {s.evidencias.map((x) => (
            <li key={x.id} className="flex items-start gap-2 text-[13.5px]">
              <span className="flex-1">{x.texto}{x.url && <> — <a href={x.url} target="_blank" rel="noopener noreferrer" className="text-info">{x.url.replace(/^https?:\/\//, "").slice(0, 40)}</a></>}</span>
              {!s.concluidoEm && <button aria-label="Remover" onClick={() => salvar({ ...s, evidencias: s.evidencias.filter((y) => y.id !== x.id) })} className="text-dim"><Trash2 className="size-3.5" /></button>}
            </li>
          ))}
        </ul>
        {!s.concluidoEm && (
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Entrada aria-label="Descrição" placeholder="O que foi feito" value={ev.texto} onChange={(x) => setEv({ ...ev, texto: x.target.value })} />
            <Entrada aria-label="Link" placeholder="Link (opcional)" value={ev.url} onChange={(x) => setEv({ ...ev, url: x.target.value })} />
            <Botao icone={<Plus className="size-4" />} disabled={!ev.texto.trim()} onClick={async () => { await salvar({ ...s, evidencias: [...s.evidencias, { id: `ev${Date.now()}`, texto: ev.texto.trim(), url: ev.url.trim() ? normalizarUrl(ev.url) : "", em: Date.now() }] }); setEv({ texto: "", url: "" }); }}>Adicionar</Botao>
          </div>
        )}
      </Cartao>

      <Cartao className="mt-4 p-5">
        <h2 className="text-[16px] font-semibold">Resumo para o cliente</h2>
        <Texto aria-label="Resumo" className="mt-2 min-h-[160px] text-[13.5px]" value={s.resumo || resumoServico(s, e)} onChange={(x) => salvar({ ...s, resumo: x.target.value })} />
        <div className="mt-2 flex flex-wrap gap-2">
          <Botao tamanho="sm" icone={<Copy className="size-3.5" />} onClick={() => navigator.clipboard?.writeText(s.resumo || resumoServico(s, e)).then(() => avisar("ok", "Resumo copiado"))}>Copiar</Botao>
          {!s.concluidoEm && <Botao tamanho="sm" variante="primario" icone={<CheckCircle2 className="size-3.5" />} onClick={concluir} disabled={!s.pago}>{s.pago ? "Concluir serviço" : "Confirme o pagamento para concluir"}</Botao>}
        </div>
      </Cartao>
    </Pagina>
  );
}
