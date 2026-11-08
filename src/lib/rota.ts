import { useEffect, useState } from "react";

export type Rota =
  | { nome: "inicio" | "radar" | "empresas" | "servicos" | "financeiro" | "compartilhadas" | "ajustes" }
  | { nome: "empresa"; id: string }
  | { nome: "servico"; id: string };

const SIMPLES = ["inicio", "radar", "empresas", "servicos", "financeiro", "compartilhadas", "ajustes"] as const;

export function lerRota(hash: string): Rota {
  const h = hash.replace(/^#\/?/, "");
  if (h.startsWith("empresa-")) return { nome: "empresa", id: h.slice(8) };
  if (h.startsWith("servico-")) return { nome: "servico", id: h.slice(8) };
  return (SIMPLES as readonly string[]).includes(h) ? ({ nome: h } as Rota) : { nome: "inicio" };
}

export function irPara(r: string) {
  location.hash = r;
  window.scrollTo({ top: 0 });
}
export const irEmpresa = (id: string) => irPara(`empresa-${id}`);

export function useRota(): Rota {
  const [r, setR] = useState(() => lerRota(location.hash));
  useEffect(() => {
    const f = () => setR(lerRota(location.hash));
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return r;
}
