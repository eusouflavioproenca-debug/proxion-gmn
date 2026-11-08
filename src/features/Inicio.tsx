import { useMemo } from "react";
import clsx from "clsx";
import { Phone, PhoneCall, Coffee, CheckCircle2, ListChecks } from "lucide-react";
import { useStore } from "../data/store";
import { useDialogos } from "./Dialogos";
import { ligacoesDoDia, metricas } from "../domain/gmn";
import { Cartao, Selo } from "../ui/kit";
import { Cabecalho, Pagina } from "./Shell";
import { irEmpresa, irPara } from "../lib/rota";
import { dataLonga, formatarTelefone, isoDia, moeda, normalizarTelefone, pct } from "../lib/util";

const MOTIVO = { retorno: { r: "Retorno combinado", t: "bad" }, followup: { r: "Acompanhar", t: "warn" }, tentar_de_novo: { r: "Tentar de novo", t: "neutro" }, primeira: { r: "Primeira ligação", t: "info" } } as const;

export function Inicio() {
  const { empresas, atividades, tarefas, servicos, config, acoes } = useStore();
  const dlg = useDialogos();
  const l = useMemo(() => ligacoesDoDia(empresas, atividades, tarefas, config), [empresas, atividades, tarefas, config]);
  const m = useMemo(() => metricas(empresas, atividades, servicos, config), [empresas, atividades, servicos, config]);
  const h = new Date().getHours();
  const hoje = isoDia();
  const tarefasHoje = tarefas.filter((t) => !t.concluida && t.vence <= hoje).slice(0, 6);
  const bateu = l.feitas >= l.meta;
  const nomeEmp = (id: string) => empresas.find((e) => e.id === id)?.nome ?? "";

  return (
    <Pagina>
      <Cabecalho eyebrow="Painel de vendas" titulo={`${h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"}, ${config.nome.split(" ")[0]}`} descricao={<span className="inline-block first-letter:uppercase">{dataLonga(Date.now())}</span>} />

      <Cartao className="mt-6 p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand/12 text-brand"><PhoneCall className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold">{l.folga ? "Hoje é folga" : "Ligações de hoje"}</h2>
            <p className="text-[13px] text-muted">{l.folga ? "Se quiser adiantar, as primeiras estão abaixo." : bateu ? "Meta batida. O que vier agora é bônus." : `Faltam ${l.meta - l.feitas} para a meta de ${l.meta}.`} Semana: {m.ligacoesSemana}.</p>
          </div>
          {!l.folga && <p className="num text-[26px] font-bold">{l.feitas}<span className="text-[15px] text-dim">/{l.meta}</span></p>}
        </div>
        {!l.folga && <div className="mt-3 h-2 overflow-hidden rounded-full bg-raised"><div className={clsx("h-full rounded-full", bateu ? "bg-ok" : "bg-brand")} style={{ width: `${Math.min(100, (l.feitas / Math.max(1, l.meta)) * 100)}%` }} /></div>}
        {l.folga && <p className="mt-3 flex items-center gap-2 text-[13.5px] text-muted"><Coffee className="size-4" /> Descanse.</p>}
        {!l.folga && bateu && l.itens.length === 0 && <p className="mt-3 flex items-center gap-2 text-[14px] text-ok"><CheckCircle2 className="size-4" /> Tudo feito por hoje.</p>}
        {l.itens.length > 0 && (
          <ol className="mt-3 divide-y divide-line/60">
            {l.itens.slice(0, 8).map((i, n) => (
              <li key={i.empresa.id} className="flex items-center gap-3 py-2.5">
                <span className="num w-5 text-center text-[12.5px] font-bold text-dim">{n + 1}</span>
                <button onClick={() => irEmpresa(i.empresa.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[14.5px] font-semibold">{i.empresa.nome}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px]"><Selo tom={MOTIVO[i.motivo].t}>{MOTIVO[i.motivo].r}</Selo><span className="num text-dim">{i.potencial} pts</span></p>
                  <p className="mt-0.5 truncate text-[12.5px] text-muted">{i.detalhe}</p>
                </button>
                <a href={`tel:+55${normalizarTelefone(i.telefone)}`} aria-label={`Ligar para ${formatarTelefone(i.telefone)}`} onClick={() => setTimeout(() => dlg.ligacao(i.empresa.id), 400)} className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-ink"><Phone className="size-4" /></a>
              </li>
            ))}
          </ol>
        )}
        {!l.folga && l.itens.length < l.meta - l.feitas && <p className="mt-2 text-[12.5px] text-dim">Faltam empresas com telefone para completar a meta. <button className="font-semibold text-brand-soft" onClick={() => irPara("radar")}>Buscar no Radar</button></p>}
      </Cartao>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi r="Ligações no mês" v={String(m.ligacoesMes)} />
        <Kpi r="Empresas contatadas" v={String(m.contatadasMes)} />
        <Kpi r="Interessadas agora" v={String(m.interessadas)} />
        <Kpi r="Vendas no mês" v={`${m.vendidosMes}${config.vendasMes ? `/${config.vendasMes}` : ""}`} d={`Conversão ${pct(m.conversao)}`} />
        <Kpi r="Contratado no mês" v={moeda(m.contratadoMes)} />
        <Kpi r="Recebido no mês" v={moeda(m.recebidoMes)} tom="ok" />
        <Kpi r="A receber" v={moeda(m.pendente)} tom={m.pendente ? "warn" : undefined} />
        <Kpi r={config.comissaoPct ? `Comissão (${config.comissaoPct}%)` : "Serviços em execução"} v={config.comissaoPct ? moeda(m.comissaoMes) : String(m.emExecucao)} />
      </div>

      <Cartao className="mt-4 p-5">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold"><ListChecks className="size-[18px] text-brand" /> Próximos passos de hoje</h2>
        {tarefasHoje.length === 0 ? <p className="mt-3 text-[14px] text-muted">Nada pendente para hoje.</p> : (
          <ul className="mt-2 divide-y divide-line/60">
            {tarefasHoje.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <input type="checkbox" aria-label="Concluir" className="size-4 accent-[rgb(var(--brand))]" checked={t.concluida} onChange={() => acoes.concluirTarefa(t)} />
                <button onClick={() => irEmpresa(t.empresaId)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[14px] font-semibold">{t.titulo}</p>
                  <p className="truncate text-[12.5px] text-muted">{nomeEmp(t.empresaId)}{t.vence < hoje ? " · atrasado" : ""}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </Pagina>
  );
}

function Kpi({ r, v, d, tom }: { r: string; v: string; d?: string; tom?: "ok" | "warn" }) {
  return (
    <Cartao className="p-4">
      <p className="text-[12.5px] text-muted">{r}</p>
      <p className={clsx("num mt-1 text-[22px] font-bold", tom === "ok" && "text-ok", tom === "warn" && "text-warn")}>{v}</p>
      {d && <p className="text-[12px] text-dim">{d}</p>}
    </Cartao>
  );
}
