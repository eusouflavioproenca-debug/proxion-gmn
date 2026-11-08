import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Home, Radar, Building2, ClipboardCheck, Wallet, Share2, Settings, Menu as MenuIcon, X, LogOut } from "lucide-react";
import { Marca } from "../ui/kit";
import { irPara, useRota } from "../lib/rota";
import { useStore } from "../data/store";

const ITENS = [
  { id: "inicio", nome: "Início", icone: Home },
  { id: "radar", nome: "Radar", icone: Radar },
  { id: "empresas", nome: "Empresas", icone: Building2 },
  { id: "servicos", nome: "Serviços", icone: ClipboardCheck },
  { id: "financeiro", nome: "Financeiro", icone: Wallet },
  { id: "compartilhadas", nome: "Compartilhadas", icone: Share2 },
  { id: "ajustes", nome: "Ajustes", icone: Settings },
] as const;
const BARRA = ["inicio", "radar", "empresas", "servicos"];

function ativoDe(nome: string) {
  return nome === "empresa" ? "empresas" : nome === "servico" ? "servicos" : nome;
}

function Menu({ ativo, onIr, sair }: { ativo: string; onIr: () => void; sair?: () => void }) {
  const { radar, config } = useStore();
  const pend = radar.filter((c) => c.status === "pendente").length;
  return (
    <>
      <div className="px-5 pb-6 pt-6"><Marca /></div>
      <nav className="flex-1 space-y-0.5 px-3">
        {ITENS.map((i) => (
          <button key={i.id} onClick={() => { onIr(); irPara(i.id); }} className={clsx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-semibold transition-colors", ativo === i.id ? "bg-brand/12 text-fg" : "text-muted hover:bg-raised hover:text-fg")}>
            <i.icone className={clsx("size-[18px]", ativo === i.id && "text-brand")} />
            {i.nome}
            {i.id === "radar" && pend > 0 && <span className="num ml-auto rounded-full bg-brand px-1.5 text-[11px] font-bold text-ink">{pend}</span>}
          </button>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-2 border-t border-line/70 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{config.nome}</p>
          <p className="text-[12px] text-dim">Google Meu Negócio</p>
        </div>
        {sair && <button onClick={sair} className="rounded-lg p-2 text-dim hover:text-fg" aria-label="Sair"><LogOut className="size-4" /></button>}
      </div>
    </>
  );
}

export function Shell({ children, sair }: { children: ReactNode; sair?: () => void }) {
  const rota = useRota();
  const ativo = ativoDe(rota.nome);
  const [menu, setMenu] = useState(false);
  const { preview } = useStore();
  useEffect(() => setMenu(false), [rota]);
  useEffect(() => {
    if (!menu) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [menu]);
  return (
    <div className="flex h-full bg-ink">
      <aside className="hidden w-[240px] shrink-0 flex-col overflow-y-auto border-r border-line/70 bg-base lg:flex">
        <Menu ativo={ativo} onIr={() => {}} sair={sair} />
      </aside>
      <div className={clsx("fixed inset-0 z-50 lg:hidden", !menu && "pointer-events-none")} aria-hidden={!menu}>
        <div onClick={() => setMenu(false)} className={clsx("absolute inset-0 bg-black/60 transition-opacity", menu ? "opacity-100" : "opacity-0")} />
        <aside role="dialog" aria-label="Menu" className={clsx("absolute inset-y-0 left-0 flex w-[80%] max-w-[290px] flex-col overflow-y-auto border-r border-line bg-base pt-[env(safe-area-inset-top)] transition-transform", menu ? "translate-x-0" : "-translate-x-full")}>
          <button onClick={() => setMenu(false)} aria-label="Fechar menu" className="absolute right-3 top-4 rounded-lg p-2 text-muted"><X className="size-5" /></button>
          {menu && <Menu ativo={ativo} onIr={() => setMenu(false)} sair={sair} />}
        </aside>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-1.5 border-b border-line/70 bg-base/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
          <button onClick={() => setMenu(true)} aria-label="Abrir menu" className="rounded-lg p-2 text-muted"><MenuIcon className="size-6" /></button>
          <Marca />
        </header>
        {preview && <div className="bg-info/10 px-4 py-2 text-center text-[13px] text-info">Prévia local com dados de exemplo.</div>}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line/70 bg-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {ITENS.filter((i) => BARRA.includes(i.id)).map((i) => (
            <button key={i.id} onClick={() => irPara(i.id)} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", ativo === i.id ? "text-brand" : "text-muted")}>
              <i.icone className="size-5" />{i.nome}
            </button>
          ))}
          <button onClick={() => setMenu(true)} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", !BARRA.includes(ativo) ? "text-brand" : "text-muted")}>
            <MenuIcon className="size-5" />Menu
          </button>
        </nav>
      </div>
    </div>
  );
}

export function Cabecalho({ eyebrow, titulo, children, descricao }: { eyebrow?: string; titulo: string; descricao?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2 text-brand-soft">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-tight sm:text-[30px]">{titulo}</h1>
        {descricao && <div className="mt-1.5 text-[14.5px] text-muted">{descricao}</div>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Pagina({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 animate-rise", className)}>{children}</div>;
}
