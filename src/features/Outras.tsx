import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Share2, ArrowUpRight, ArrowDownLeft, Wallet } from "lucide-react";
import { useStore } from "../data/store";
import { abordagemSugerida, chaveEmpresa, lerPerfil, lerProblemas, metricas, semSiteProprio, type Config } from "../domain/gmn";
import type { ItemPonte } from "../data/banco";
import { Botao, Campo, Cartao, Entrada, Selo, Vazio, useAcao } from "../ui/kit";
import { Cabecalho, Pagina } from "./Shell";
import { irEmpresa, irPara } from "../lib/rota";
import { dataCurta, moeda } from "../lib/util";

export function Financeiro() {
  const { empresas, atividades, servicos, config, acoes } = useStore();
  const acao = useAcao();
  const m = useMemo(() => metricas(empresas, atividades, servicos, config), [empresas, atividades, servicos, config]);
  const nome = (id: string) => empresas.find((e) => e.id === id)?.nome ?? "Empresa removida";
  return (
    <Pagina className="max-w-4xl">
      <Cabecalho eyebrow="Financeiro" titulo="Vendas e recebimentos" descricao="Contratado é o que foi vendido; recebido é o que já entrou." />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Bloco r="Contratado no mês" v={moeda(m.contratadoMes)} d={`${m.vendidosMes} venda(s)`} />
        <Bloco r="Recebido no mês" v={moeda(m.recebidoMes)} tom="ok" />
        <Bloco r="A receber (total)" v={moeda(m.pendente)} tom={m.pendente ? "warn" : undefined} />
        <Bloco r={`Comissão${config.comissaoPct ? ` (${config.comissaoPct}%)` : ""}`} v={config.comissaoPct ? moeda(m.comissaoMes) : "Não configurada"} d={config.comissaoPct ? "Sobre o recebido no mês" : undefined} />
      </div>
      <Cartao className="mt-4 p-5">
        <h2 className="text-[16px] font-semibold">Serviços vendidos</h2>
        {servicos.length === 0 ? <Vazio icone={<Wallet className="size-5" />} titulo="Nenhuma venda ainda" texto="As vendas aparecem aqui quando você cria uma ordem de serviço na ficha da empresa." /> : (
          <ul className="mt-2 divide-y divide-line/60">
            {servicos.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <button onClick={() => irPara(`servico-${s.id}`)} className="min-w-0 flex-1 text-left"><p className="truncate text-[14px] font-semibold">{nome(s.empresaId)}</p><p className="text-[12px] text-dim">Vendido em {dataCurta(s.criadoEm)}{s.pagoEm ? ` · pago em ${dataCurta(s.pagoEm)}` : ""}</p></button>
                <span className="num text-[14px] font-semibold">{moeda(s.valor)}</span>
                <Botao tamanho="sm" variante={s.pago ? "fantasma" : "secundario"} onClick={() => acao(() => acoes.salvarServico({ ...s, pago: !s.pago, pagoEm: s.pago ? null : Date.now(), checklist: { ...s.checklist, pagamento: { feito: !s.pago, em: Date.now(), obs: s.checklist.pagamento?.obs ?? "" } } }), s.pago ? "Marcado como a receber" : "Pagamento registrado")}>{s.pago ? "Pago ✓" : "Marcar pago"}</Botao>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </Pagina>
  );
}

function Bloco({ r, v, d, tom }: { r: string; v: string; d?: string; tom?: "ok" | "warn" }) {
  return <Cartao className="p-4"><p className="text-[12.5px] text-muted">{r}</p><p className={clsx("num mt-1 text-[20px] font-bold", tom === "ok" && "text-ok", tom === "warn" && "text-warn")}>{v}</p>{d && <p className="text-[12px] text-dim">{d}</p>}</Cartao>;
}

export function Compartilhadas() {
  const { banco, acoes, empresas, config, preview } = useStore();
  const acao = useAcao();
  const [itens, setItens] = useState<ItemPonte[] | null>(null);
  const carregar = () => banco.lerPonte().then(setItens);
  useEffect(() => { carregar(); }, [banco]); // eslint-disable-line react-hooks/exhaustive-deps
  const enviadas = (itens ?? []).filter((i) => i.origem === "gmn");
  const [vinculo, setVinculo] = useState<string | null | undefined>(undefined);
  useEffect(() => { import("../data/supabase").then(({ supabase }) => supabase().rpc("meu_painel")).then((r) => setVinculo((r?.data as string | null) ?? null), () => setVinculo(undefined)); }, []);
  const recebidas = (itens ?? []).filter((i) => i.destino === "gmn");
  return (
    <Pagina className="max-w-4xl">
      <Cabecalho eyebrow="Integração" titulo="Oportunidades compartilhadas" descricao="Troca com o painel principal da Proxion: empresas sem site vão para lá; oportunidades de Google Meu Negócio vêm para cá." />
      {vinculo === null && !preview && <p className="mt-5 rounded-xl border border-warn/40 bg-warn/10 p-3 text-[13.5px]">Este usuário ainda não está vinculado ao painel GMN no banco, então nada é enviado nem recebido. No Supabase, rode o comando de vínculo (insert into public.paineis … 'gmn') com o e-mail deste login.</p>}
      <Cartao className="mt-5 p-5">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold"><ArrowDownLeft className="size-[18px] text-brand" /> Recebidas do painel principal</h2>
        {itens === null ? <p className="mt-2 text-[14px] text-muted">Carregando…</p> : recebidas.length === 0 ? <p className="mt-2 text-[14px] text-muted">Nenhuma ainda. Quando o painel principal for conectado, as empresas com problemas no Google chegam aqui.</p> : (
          <ul className="mt-2 divide-y divide-line/60">
            {recebidas.map((i) => {
              const e = i.empresa as { nome?: string; cidade?: string; telefone?: string };
              return (
                <li key={i.id} className="py-3">
                  <p className="text-[14.5px] font-semibold">{e.nome}</p>
                  <p className="text-[13px] text-muted">{i.motivo}</p>
                  {i.status === "pendente" ? (
                    <div className="mt-2 flex gap-2">
                      <Botao tamanho="sm" variante="primario" onClick={() => acao(async () => { const r = i.empresa as Record<string, unknown>;
                        const problemas = lerProblemas(r.problemas);
                        const id = await acoes.salvarEmpresa({ nome: String(e.nome ?? ""), segmento: String(r.segmento ?? ""), cidade: String(e.cidade ?? ""), endereco: String(r.endereco ?? ""), telefone: String(e.telefone ?? ""), site: String(r.site ?? ""), perfil: lerPerfil(r.perfil), problemas, abordagem: abordagemSugerida(String(e.nome ?? ""), problemas, config.nome), origem: "Painel principal", etapa: "aguardando_ligacao", chave: i.chave }); await banco.decidirPonte(i.id, "aceita"); await carregar(); irEmpresa(id); }, "Empresa adicionada ao funil")}>Aceitar</Botao>
                      <Botao tamanho="sm" variante="fantasma" onClick={() => acao(async () => { await banco.decidirPonte(i.id, "recusada"); await carregar(); })}>Recusar</Botao>
                    </div>
                  ) : <Selo tom={i.status === "aceita" ? "ok" : "neutro"}>{i.status === "aceita" ? "Aceita" : "Recusada"}</Selo>}
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
      <Cartao className="mt-4 p-5">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold"><ArrowUpRight className="size-[18px] text-brand" /> Enviadas ao painel principal <span className="num text-dim">{enviadas.length}</span></h2>
        <p className="text-[13px] text-muted">Empresas sem site próprio encontradas no seu Radar. Ficam aguardando a aprovação do Flávio.</p>
        {(() => {
          const enviadasChaves = new Set(enviadas.map((i) => i.chave));
          const faltam = empresas.filter((e) => e.perfil && semSiteProprio(e) && !enviadasChaves.has(e.chave || chaveEmpresa({ nome: e.nome, cidade: e.cidade })));
          return faltam.length > 0 ? (
            <Botao className="mt-3" tamanho="sm" onClick={() => acao(async () => {
              let n = 0;
              for (const e of faltam) {
                const r = await banco.enviarPonte({ tipo: "site", destino: "principal", chave: e.chave || chaveEmpresa({ nome: e.nome, cidade: e.cidade }), empresa: { nome: e.nome, segmento: e.segmento, cidade: e.cidade, uf: e.uf, endereco: e.endereco, telefone: e.telefone, instagram: e.instagram, googleMaps: e.perfil?.link ?? "", nota: e.perfil?.nota ?? null, avaliacoes: e.perfil?.avaliacoes ?? null }, motivo: e.site ? "O link da ficha do Google aponta para rede social, não para um site próprio." : "A ficha do Google não tem site vinculado." });
                if (r === "enviada") n++;
              }
              await carregar();
              return n;
            }, "Empresas cadastradas enviadas ao painel principal")}>Enviar {faltam.length} empresa(s) já cadastradas sem site</Botao>
          ) : null;
        })()}
        {enviadas.length === 0 ? <Vazio icone={<Share2 className="size-5" />} titulo="Nada enviado ainda" texto="Faça buscas no Radar: as empresas sem site são enviadas automaticamente." /> : (
          <ul className="mt-2 divide-y divide-line/60">
            {enviadas.map((i) => {
              const e = i.empresa as { nome?: string; cidade?: string };
              const local = empresas.find((x) => x.chave === i.chave);
              return (
                <li key={i.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold">{e.nome}</p><p className="text-[12px] text-dim">{e.cidade} · {dataCurta(new Date(i.criado_em).getTime())}</p></div>
                  {local && <button onClick={() => irEmpresa(local.id)} className="text-[12.5px] font-semibold text-brand-soft">Ver ficha</button>}
                  <Selo tom={i.status === "aceita" ? "ok" : i.status === "recusada" ? "neutro" : "warn"}>{i.status === "aceita" ? "Aprovada" : i.status === "recusada" ? "Recusada" : "Aguardando"}</Selo>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </Pagina>
  );
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function Ajustes({ sair }: { sair?: () => void }) {
  const { config, acoes } = useStore();
  const acao = useAcao();
  const [c, setC] = useState<Config>(config);
  useEffect(() => setC(config), [config]);
  const num = (k: keyof Config, r: string, dica?: string) => <Campo rotulo={r} dica={dica} htmlFor={`aj-${k}`}><Entrada id={`aj-${k}`} inputMode="numeric" value={String(c[k] || "")} onChange={(e) => setC({ ...c, [k]: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></Campo>;
  return (
    <Pagina className="max-w-2xl">
      <Cabecalho eyebrow="Ajustes" titulo="Preferências" />
      <Cartao className="mt-5 space-y-4 p-5">
        <Campo rotulo="Seu nome (aparece nas mensagens e no histórico)" htmlFor="aj-nome"><Entrada id="aj-nome" value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} /></Campo>
        <div className="grid grid-cols-2 gap-3">{num("preco", "Preço do serviço (R$)")}{num("comissaoPct", "Comissão (%)", "0 = sem comissão")}</div>
        <div className="grid grid-cols-2 gap-3">{num("ligacoesDia", "Ligações por dia")}{num("vendasMes", "Meta de vendas no mês")}</div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-muted">Dias de trabalho</p>
          <div className="flex flex-wrap gap-1">{DIAS.map((d, i) => { const on = c.diasTrabalho.includes(i); return <button key={d} type="button" onClick={() => { const dias = on ? c.diasTrabalho.filter((x) => x !== i) : [...c.diasTrabalho, i].sort(); if (dias.length) setC({ ...c, diasTrabalho: dias }); }} className={clsx("h-9 w-[42px] rounded-lg border text-[12px] font-semibold", on ? "border-brand/60 bg-brand/15" : "border-line text-dim")}>{d}</button>; })}</div>
        </div>
        <div className="flex justify-end"><Botao variante="primario" disabled={!c.nome.trim() || JSON.stringify(c) === JSON.stringify(config)} onClick={() => acao(() => acoes.salvarConfig({ ...c, nome: c.nome.trim() }), "Ajustes salvos")}>Salvar</Botao></div>
      </Cartao>
      {sair && <Botao className="mt-4" variante="fantasma" onClick={sair}>Sair da conta</Botao>}
    </Pagina>
  );
}
