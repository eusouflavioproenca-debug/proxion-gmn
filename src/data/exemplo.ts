/** Dados de exemplo só para a prévia local (nunca vão para o banco real). */
import { mapsParaCandidatos } from "../domain/gmn";
import type { Doc } from "./banco";

export function dadosExemplo(): Record<string, Doc> {
  const agora = Date.now();
  const D = 86_400_000;
  const maps = mapsParaCandidatos([
    { title: "Exemplo · Padaria Pão Quente", categoryName: "Padaria", city: "Sorocaba", state: "São Paulo", phone: "(15) 99111-2222", url: "https://www.google.com/maps/place/x1", totalScore: 4.6, reviewsCount: 87, imagesCount: 4, openingHours: [], claimThisBusiness: true, placeId: "x1" },
    { title: "Exemplo · Barbearia Navalha", categoryName: "Barbearia", city: "Sorocaba", state: "SP", phone: "(15) 99222-3333", website: "https://instagram.com/navalha", url: "https://www.google.com/maps/place/x2", totalScore: 4.9, reviewsCount: 12, imagesCount: 25, openingHours: [{ day: "seg" }], placeId: "x2" },
  ], "Fernando", agora);
  const out: Record<string, Doc> = { "config/geral": { nome: "Fernando", preco: 100, comissaoPct: 0, ligacoesDia: 30, diasTrabalho: [1, 2, 3, 4, 5, 6], vendasMes: 20 } };
  maps.forEach((m, i) => (out[`radar/r${i}`] = m));
  const [e1, e2] = maps;
  out["empresas/e1"] = { ...e1, nome: "Exemplo · Mecânica Turbo", etapa: "aguardando_ligacao", valor: 100, contatos: [], etapaDesde: agora - 2 * D, criadoEm: agora - 2 * D, atualizadoEm: agora, ultimoContatoEm: null, chave: "x9" };
  out["empresas/e2"] = { ...e2, nome: "Exemplo · Pet Feliz", etapa: "interessado", valor: 100, contatos: [], etapaDesde: agora - 3 * D, criadoEm: agora - 5 * D, atualizadoEm: agora, ultimoContatoEm: agora - 3 * D, chave: "x8" };
  out["empresas/e3"] = { nome: "Exemplo · Salão Bela", segmento: "Salão de beleza", cidade: "Sorocaba", telefone: "15993334444", etapa: "aguardando_pagamento", valor: 100, problemas: [], etapaDesde: agora - D, criadoEm: agora - 8 * D, atualizadoEm: agora, ultimoContatoEm: agora - D };
  out["atividades/a1"] = { empresaId: "e2", tipo: "ligacao", resultado: "atendeu", quando: agora - 3 * D, texto: "Gostou da ideia, pediu para mandar explicação no WhatsApp.", autor: "Fernando" };
  out["servicos/s1"] = { empresaId: "e3", descricao: "Otimização do Perfil da Empresa no Google", valor: 100, pago: false, pagoEm: null, checklist: {}, evidencias: [], resumo: "", criadoEm: agora - D, concluidoEm: null };
  out["tarefas/t1"] = { empresaId: "e2", titulo: "Ligar para fechar", vence: new Date(agora).toISOString().slice(0, 10), concluida: false, criadoEm: agora };
  return out;
}
