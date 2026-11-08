/** Componentes base do design system Proxion. */
import clsx from "clsx";
import { X, Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { iniciais } from "../lib/util";

// ---------------------------------------------------------------- Botão

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: "sm" | "md";
  carregando?: boolean;
  icone?: ReactNode;
};

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { variante = "secundario", tamanho = "md", carregando, icone, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || carregando}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all select-none",
        "disabled:opacity-50 disabled:pointer-events-none active:scale-[.98]",
        tamanho === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[14px]",
        variante === "primario" && "bg-brand text-brand-ink hover:bg-brand-soft shadow-glow",
        variante === "secundario" && "bg-raised text-fg border border-line hover:border-muted/40 hover:bg-[rgb(36_36_41)]",
        variante === "fantasma" && "text-muted hover:text-fg hover:bg-raised",
        variante === "perigo" && "bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25",
        className,
      )}
      {...rest}
    >
      {carregando ? <Loader2 className="size-4 animate-spin" /> : icone}
      {children}
    </button>
  );
});

export function BotaoIcone({
  rotulo,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string }) {
  return (
    <button
      aria-label={rotulo}
      title={rotulo}
      className={clsx(
        "inline-flex size-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-fg disabled:opacity-40",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- Formulários

export function Campo({
  rotulo,
  erro,
  dica,
  children,
  className,
  htmlFor,
}: {
  rotulo: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p className="mt-1 text-[12.5px] font-medium text-bad">{erro}</p>
      ) : dica ? (
        <p className="mt-1 text-[12.5px] text-dim">{dica}</p>
      ) : null}
    </div>
  );
}

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalido?: boolean }>(
  function Entrada({ className, invalido, ...rest }, ref) {
    return <input ref={ref} className={clsx("input", invalido && "!border-bad/70", className)} {...rest} />;
  },
);

export function Texto({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx("input resize-y leading-relaxed", !/min-h-/.test(className ?? "") && "min-h-[88px]", className)} {...rest} />;
}

export function Selecao({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx("input appearance-none bg-[length:16px] pr-9", className)} style={{ backgroundImage: SETA, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }} {...rest}>
      {children}
    </select>
  );
}
const SETA = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23969AA0' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// ---------------------------------------------------------------- Exibição

export function Cartao({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("card", className)} {...rest}>
      {children}
    </div>
  );
}

export function Selo({ children, tom = "neutro", className }: { children: ReactNode; tom?: "neutro" | "brand" | "ok" | "warn" | "bad" | "info"; className?: string }) {
  return (
    <span
      className={clsx(
        "chip",
        tom === "neutro" && "bg-raised text-muted border border-line",
        tom === "brand" && "bg-brand/15 text-brand-soft",
        tom === "ok" && "bg-ok/12 text-ok",
        tom === "warn" && "bg-warn/12 text-warn",
        tom === "bad" && "bg-bad/12 text-bad",
        tom === "info" && "bg-info/12 text-info",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ nome, src, cor, tamanho = 28 }: { nome: string; src?: string; cor?: string; tamanho?: number }) {
  return src ? (
    <img src={src} alt="" width={tamanho} height={tamanho} className="rounded-full object-cover ring-1 ring-line" style={{ width: tamanho, height: tamanho }} />
  ) : (
    <span
      className="inline-flex items-center justify-center rounded-full text-[11px] font-bold text-ink"
      style={{ width: tamanho, height: tamanho, background: cor || "rgb(var(--muted))" }}
    >
      {iniciais(nome)}
    </span>
  );
}

export function Vazio({ icone, titulo, texto, acao }: { icone: ReactNode; titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-line bg-raised text-brand">{icone}</div>
      <div>
        <p className="font-display text-[16px] font-semibold">{titulo}</p>
        <p className="mx-auto mt-1 max-w-sm text-[14px] text-muted">{texto}</p>
      </div>
      {acao}
    </div>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 text-[14px] text-muted">
      <Loader2 className="size-4 animate-spin text-brand" /> {texto}
    </div>
  );
}

export function Abas<T extends string>({
  abas,
  atual,
  onChange,
}: {
  abas: { id: T; rotulo: string; contador?: number }[];
  atual: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {abas.map((a) => (
        <button
          key={a.id}
          role="tab"
          aria-selected={atual === a.id}
          onClick={() => onChange(a.id)}
          className={clsx(
            "relative shrink-0 px-3.5 py-2.5 text-[14px] font-semibold transition-colors",
            atual === a.id ? "text-fg" : "text-muted hover:text-fg",
          )}
        >
          {a.rotulo}
          {a.contador ? <span className="num ml-1.5 text-[12px] text-dim">{a.contador}</span> : null}
          {atual === a.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Janela (modal / folha no celular)

export function Janela({
  aberta,
  onFechar,
  titulo,
  subtitulo,
  children,
  rodape,
  largura = "max-w-xl",
}: {
  aberta: boolean;
  onFechar: () => void;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    const anterior = document.activeElement as HTMLElement | null;
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,textarea,select,button[data-foco]")?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", esc);
      anterior?.focus?.();
    };
  }, [aberta, onFechar]);
  if (!aberta) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] animate-pop" onClick={onFechar} />
      <div
        ref={ref}
        className={clsx(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] border border-line bg-surface shadow-2xl animate-sheet sm:rounded-2xl",
          largura,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-3.5 pt-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-[13px] text-muted">{subtitulo}</p>}
          </div>
          <BotaoIcone rotulo="Fechar" onClick={onFechar} className="-mr-2 -mt-1">
            <X className="size-5" />
          </BotaoIcone>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {rodape && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-base/40 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{rodape}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------- Confirmação

export function Confirmar({
  aberta,
  titulo,
  texto,
  rotulo = "Confirmar",
  perigo,
  onConfirmar,
  onFechar,
}: {
  aberta: boolean;
  titulo: string;
  texto: string;
  rotulo?: string;
  perigo?: boolean;
  onConfirmar: () => Promise<void> | void;
  onFechar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <Janela
      aberta={aberta}
      onFechar={onFechar}
      titulo={titulo}
      largura="max-w-md"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao
            data-foco
            variante={perigo ? "perigo" : "primario"}
            carregando={ocupado}
            onClick={async () => {
              setOcupado(true);
              try {
                await onConfirmar();
                onFechar();
              } finally {
                setOcupado(false);
              }
            }}
          >
            {rotulo}
          </Botao>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-muted">{texto}</p>
    </Janela>
  );
}

// ---------------------------------------------------------------- Avisos (toasts)

type Toast = { id: number; tom: "ok" | "erro" | "info"; texto: string };
const ToastCtx = createContext<(tom: Toast["tom"], texto: string) => void>(() => {});
export const useAviso = () => useContext(ToastCtx);

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([]);
  const n = useRef(0);
  const avisar = useCallback((tom: Toast["tom"], texto: string) => {
    const id = ++n.current;
    setLista((l) => [...l.slice(-3), { id, tom, texto }]);
    setTimeout(() => setLista((l) => l.filter((t) => t.id !== id)), tom === "erro" ? 7000 : 3800);
  }, []);
  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6" aria-live="polite">
          {lista.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border border-line bg-raised px-4 py-3 text-[14px] shadow-2xl animate-rise"
            >
              {t.tom === "ok" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
              ) : t.tom === "erro" ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-bad" />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0 text-info" />
              )}
              <span>{t.texto}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

/** Executa uma gravação mostrando sucesso/erro ao usuário. */
export function useAcao() {
  const avisar = useAviso();
  return useCallback(
    async <T,>(fn: () => Promise<T>, sucesso?: string): Promise<T | undefined> => {
      try {
        const r = await fn();
        if (sucesso) avisar("ok", sucesso);
        return r;
      } catch (e) {
        avisar("erro", (e as Error)?.message || "Algo deu errado. Tente novamente.");
        return undefined;
      }
    },
    [avisar],
  );
}

// ---------------------------------------------------------------- Marca

export function Marca({ compacta }: { compacta?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden="true">
  <rect width="64" height="64" rx="16" fill="#FF6A1A"/>
  <path d="M19 49V15h11.5c6.6 0 11 4.3 11 10s-4.4 10-11 10H25" fill="none" stroke="#0B0B0D" strokeWidth="6.6" strokeLinecap="round" strokeLinejoin="round"/>
  <circle cx="45" cy="47" r="3.8" fill="#0B0B0D"/>
  <path d="M36.6 47a8.4 8.4 0 0 1 8.4-8.4" fill="none" stroke="#0B0B0D" strokeWidth="2.8" strokeLinecap="round"/>
      </svg>
      {!compacta && (
        <div className="leading-none">
          <div className="font-display text-[15px] font-bold tracking-[0.12em]">PROXION</div>
          <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-dim">Google Meu Negócio</div>
        </div>
      )}
    </div>
  );
}
