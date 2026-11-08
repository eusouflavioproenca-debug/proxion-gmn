import { useMemo, useState } from "react";
import clsx from "clsx";
import { Plus, Search, Building2 } from "lucide-react";
import { useStore } from "../data/store";
import { useDialogos } from "./Dialogos";
import { ETAPA, potencialGmn, type EtapaId } from "../domain/gmn";
import { Botao, Cartao, Entrada, Selo, Vazio } from "../ui/kit";
import { Cabecalho, Pagina } from "./Shell";
import { irEmpresa } from "../lib/rota";
import { relativo, semAcento } from "../lib/util";

const GRUPOS: { id: string; nome: string; etapas: EtapaId[] }[] = [
  { id: "prospec", nome: "A ligar", etapas: ["nova", "aguardando_ligacao", "tentativa"] },
  { id: "negoc", nome: "Negociando", etapas: ["contato", "interessado", "enviar_whatsapp", "follow_up", "aguardando_pagamento"] },
  { id: "exec", nome: "Vendidas", etapas: ["vendido", "aguardando_autorizacao", "em_otimizacao", "aguardando_google"] },
  { id: "fim", nome: "Encerradas", etapas: ["concluido", "sem_interesse", "perdido"] },
];

export function Empresas() {
  const { empresas } = useStore();
  const dlg = useDialogos();
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("prospec");
  const [etapa, setEtapa] = useState<EtapaId | "">("");
  const g = GRUPOS.find((x) => x.id === grupo)!;
  const lista = useMemo(() => {
    const q = semAcento(busca.toLowerCase().trim());
    return empresas
      .filter((e) => (q ? semAcento(`${e.nome} ${e.segmento} ${e.cidade} ${e.telefone}`.toLowerCase()).includes(q) : g.etapas.includes(e.etapa) && (!etapa || e.etapa === etapa)))
      .map((e) => ({ e, p: potencialGmn(e) }))
      .sort((a, b) => b.p.total - a.p.total);
  }, [empresas, busca, g, etapa]);
  return (
    <Pagina className="max-w-4xl">
      <Cabecalho eyebrow="CRM" titulo="Empresas" descricao={`${empresas.length} no total`}>
        <Botao variante="primario" icone={<Plus className="size-4" />} onClick={dlg.novaEmpresa}>Nova empresa</Botao>
      </Cabecalho>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
        <Entrada aria-label="Buscar" placeholder="Buscar por nome, segmento, cidade ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
      </div>
      {!busca && (
        <>
          <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl border border-line bg-base p-1">
            {GRUPOS.map((x) => {
              const n = empresas.filter((e) => x.etapas.includes(e.etapa)).length;
              return <button key={x.id} onClick={() => { setGrupo(x.id); setEtapa(""); }} className={clsx("rounded-lg py-2 text-[12.5px] font-semibold sm:text-[13.5px]", grupo === x.id ? "bg-raised text-fg" : "text-muted")}>{x.nome} <span className="num text-dim">{n}</span></button>;
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {g.etapas.map((id) => {
              const n = empresas.filter((e) => e.etapa === id).length;
              return <button key={id} onClick={() => setEtapa(etapa === id ? "" : id)} className={clsx("rounded-full border px-2.5 py-1 text-[12.5px]", etapa === id ? "border-brand/60 bg-brand/10 text-fg" : "border-line text-muted")}>{ETAPA[id].curto} {n}</button>;
            })}
          </div>
        </>
      )}
      {lista.length === 0 ? (
        <Cartao className="mt-4"><Vazio icone={<Building2 className="size-5" />} titulo="Nenhuma empresa aqui" texto="Busque empresas no Radar ou cadastre uma manualmente." /></Cartao>
      ) : (
        <ul className="mt-4 space-y-2">
          {lista.map(({ e, p }) => (
            <li key={e.id}>
              <button onClick={() => irEmpresa(e.id)} className="card flex w-full items-center gap-3 p-4 text-left hover:border-brand/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{e.nome}</p>
                  <p className="truncate text-[13px] text-muted">{[e.segmento, e.cidade].filter(Boolean).join(" · ")}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Selo>{ETAPA[e.etapa].curto}</Selo>
                    {e.problemas.length > 0 && <Selo tom="warn">{e.problemas.length} melhoria(s) no perfil</Selo>}
                    {e.ultimoContatoEm && <span className="text-[12px] text-dim">Contato {relativo(e.ultimoContatoEm)}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={clsx("num text-[20px] font-bold", p.prioridade === "alta" ? "text-ok" : p.prioridade === "media" ? "text-warn" : "text-muted")}>{p.total}</p>
                  <p className="text-[11px] text-dim">potencial</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Pagina>
  );
}
