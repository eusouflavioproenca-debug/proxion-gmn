import { describe, expect, it } from "vitest";
import { BancoMemoria } from "../src/data/banco";
import { diagnosticarPerfil, lerCandidato, lerConfig, lerEmpresa, ligacoesDoDia, mapsParaCandidatos, metricas, potencialGmn, resumoServico, semSiteProprio, type Empresa, type Servico } from "../src/domain/gmn";

const D = 86_400_000;
const SEG = new Date(2026, 10, 9, 10).getTime();
const DOM = new Date(2026, 10, 8, 10).getTime();
const emp = (p: Partial<Empresa>): Empresa => lerEmpresa(p.id ?? "e", { nome: "X", telefone: "15991110000", etapa: "nova", criadoEm: SEG - 9 * D, ...p })!;

describe("diagnóstico do perfil", () => {
  it("separa o que a fonte mostra (fato) do que falta conferir (hipótese)", () => {
    const { problemas, perfil } = diagnosticarPerfil({ title: "A", claimThisBusiness: true, imagesCount: 2, openingHours: [], reviewsCount: 3, totalScore: 3.9, url: "https://www.google.com/maps/a" });
    expect(perfil.reivindicado).toBe(false);
    const t = problemas.map((p) => p.titulo);
    expect(t).toContain("Perfil possivelmente não reivindicado");
    expect(t).toContain("Horário de funcionamento não publicado");
    expect(problemas.find((p) => p.titulo.startsWith("Sem telefone"))?.status).toBe("hipotese");
    expect(problemas.find((p) => p.titulo.startsWith("Poucas fotos"))?.prioridade).toBe("alta");
  });
  it("sem dados de horário não afirma que falta horário", () => {
    const { problemas } = diagnosticarPerfil({ title: "B", phone: "1", website: "https://b.com.br", openingHours: null, imagesCount: 40, reviewsCount: 80, totalScore: 4.8 });
    expect(problemas.find((p) => p.titulo === "Horários a conferir")?.status).toBe("hipotese");
    expect(problemas.some((p) => p.titulo === "Horário de funcionamento não publicado")).toBe(false);
  });
});

describe("candidatos e ponte", () => {
  const cands = mapsParaCandidatos([{ title: "Padaria", city: "Sorocaba", phone: "15 99999-0000", placeId: "p1", url: "https://www.google.com/maps/p1" }, { title: "Padaria", placeId: "p1" }, { title: "Insta", website: "https://instagram.com/x", placeId: "p2" }, { title: "Com site", website: "https://comsite.com.br", placeId: "p3" }], "Fernando");
  it("remove duplicadas e gera abordagem assinada", () => {
    expect(cands).toHaveLength(3);
    expect(String(cands[0].abordagem)).toContain("Fernando");
  });
  it("identifica quem não tem site próprio (vai para o painel principal)", () => {
    const l = cands.map((c, i) => lerCandidato(`c${i}`, c)!);
    expect(l.map(semSiteProprio)).toEqual([true, true, false]);
  });
  it("ponte não duplica a mesma empresa", async () => {
    const b = new BancoMemoria();
    const item = { tipo: "site" as const, destino: "principal" as const, chave: "place:p1", empresa: {}, motivo: "" };
    expect(await b.enviarPonte(item)).toBe("enviada");
    expect(await b.enviarPonte(item)).toBe("ja_existia");
  });
});

describe("vendas", () => {
  it("potencial sobe com problemas graves e telefone", () => {
    const fraco = potencialGmn(emp({ telefone: "", problemas: [] }));
    const forte = potencialGmn(emp({ problemas: [{ id: "1", titulo: "a", evidencia: "", melhoria: "", prioridade: "alta", status: "fato", confianca: "alta" }, { id: "2", titulo: "b", evidencia: "", melhoria: "", prioridade: "alta", status: "fato", confianca: "alta" }], perfil: { existe: true, link: "", categoria: "", categorias: [], nota: 4, avaliacoes: 50, fotos: 1, temHorario: false, temDescricao: null, reivindicado: false, fonte: "", analisadoEm: 0 } }));
    expect(fraco.total).toBe(0);
    expect(forte.total).toBeGreaterThanOrEqual(55);
    expect(forte.prioridade).toBe("alta");
  });
  it("lista do dia: retorno primeiro, domingo de folga, sem vendidas", () => {
    const es = [emp({ id: "a" }), emp({ id: "b", etapa: "interessado", ultimoContatoEm: SEG - 3 * D }), emp({ id: "c", etapa: "vendido" }), emp({ id: "d", etapa: "tentativa", ultimoContatoEm: SEG - D })];
    const l = ligacoesDoDia(es, [], [{ id: "t", empresaId: "a", titulo: "Ligar 10h", vence: "2026-11-09", concluida: false, criadoEm: 0 }], { ligacoesDia: 30, diasTrabalho: [1, 2, 3, 4, 5, 6] }, SEG);
    expect(l.itens.map((i) => i.empresa.id)).toEqual(["a", "b", "d"]);
    expect(ligacoesDoDia(es, [], [], { ligacoesDia: 30, diasTrabalho: [1, 2, 3, 4, 5, 6] }, DOM).folga).toBe(true);
  });
  it("não confunde contratado com recebido; comissão sobre o recebido", () => {
    const s = (p: Partial<Servico>): Servico => ({ id: "s", empresaId: "a", descricao: "", valor: 100, pago: false, pagoEm: null, checklist: {}, evidencias: [], resumo: "", criadoEm: SEG, concluidoEm: null, ...p });
    const m = metricas([], [], [s({}), s({ id: "s2", pago: true, pagoEm: SEG })], lerConfig({ comissaoPct: 30 }), SEG);
    expect(m.contratadoMes).toBe(200);
    expect(m.recebidoMes).toBe(100);
    expect(m.pendente).toBe(100);
    expect(m.comissaoMes).toBe(30);
  });
  it("resumo do serviço lista o que foi feito", () => {
    const r = resumoServico({ id: "s", empresaId: "a", descricao: "Otimização", valor: 100, pago: true, pagoEm: 1, checklist: { pagamento: { feito: true, em: 1, obs: "" }, diagnostico: { feito: true, em: 1, obs: "5 melhorias" } }, evidencias: [{ id: "1", texto: "Fotos novas", url: "", em: 1 }], resumo: "", criadoEm: 1, concluidoEm: null }, emp({ nome: "Padaria" }));
    expect(r).toContain("Padaria");
    expect(r).toContain("✓ Diagnóstico realizado");
    expect(r).toContain("5 melhorias");
    expect(r).toContain("Fotos novas");
  });
});
