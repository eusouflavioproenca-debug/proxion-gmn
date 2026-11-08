/** Domínio do painel Google Meu Negócio (painel do Fernando). Funções puras, testáveis. */
import { DIA_MS, inicioDoDia, inicioDoMes, isoDia, normalizarNome, normalizarTelefone, normalizarUrl } from "../lib/util";

// ---------------------------------------------------------------- funil

export const ETAPAS = [
  { id: "nova", nome: "Nova empresa", curto: "Nova" },
  { id: "aguardando_ligacao", nome: "Aguardando ligação", curto: "Aguard. ligação" },
  { id: "tentativa", nome: "Tentativa de contato", curto: "Tentativa" },
  { id: "contato", nome: "Contato realizado", curto: "Contato" },
  { id: "interessado", nome: "Interessado", curto: "Interessado" },
  { id: "enviar_whatsapp", nome: "Enviar WhatsApp", curto: "Enviar WhatsApp" },
  { id: "follow_up", nome: "Follow-up", curto: "Follow-up" },
  { id: "aguardando_pagamento", nome: "Aguardando pagamento", curto: "Aguard. pagamento" },
  { id: "vendido", nome: "Serviço vendido", curto: "Vendido" },
  { id: "aguardando_autorizacao", nome: "Aguardando autorização do cliente", curto: "Aguard. autorização" },
  { id: "em_otimizacao", nome: "Em otimização", curto: "Em otimização" },
  { id: "aguardando_google", nome: "Aguardando aprovação do Google", curto: "Aguard. Google" },
  { id: "concluido", nome: "Concluído", curto: "Concluído" },
  { id: "sem_interesse", nome: "Sem interesse", curto: "Sem interesse" },
  { id: "perdido", nome: "Perdido", curto: "Perdido" },
] as const;
export type EtapaId = (typeof ETAPAS)[number]["id"];
export const ETAPA = Object.fromEntries(ETAPAS.map((e, i) => [e.id, { ...e, ordem: i + 1 }])) as Record<EtapaId, (typeof ETAPAS)[number] & { ordem: number }>;
export const isEtapa = (v: unknown): v is EtapaId => typeof v === "string" && v in ETAPA;
export const FINAIS: EtapaId[] = ["concluido", "sem_interesse", "perdido"];
export const VENDIDAS: EtapaId[] = ["vendido", "aguardando_autorizacao", "em_otimizacao", "aguardando_google", "concluido"];
export const INTERESSADAS: EtapaId[] = ["interessado", "enviar_whatsapp", "follow_up", "aguardando_pagamento", ...VENDIDAS];

// ---------------------------------------------------------------- tipos

export type Confianca = "alta" | "media" | "baixa";
export type Prioridade = "alta" | "media" | "baixa";

/** Problema/oportunidade encontrado no Perfil da Empresa no Google. */
export interface Problema {
  id: string;
  titulo: string;
  evidencia: string;
  melhoria: string;
  prioridade: Prioridade;
  /** "fato": a fonte mostra isso; "hipotese": a fonte não trouxe o dado, precisa conferir no perfil real. */
  status: "fato" | "hipotese";
  confianca: Confianca;
}

export interface Perfil {
  existe: boolean;
  link: string;
  categoria: string;
  categorias: string[];
  nota: number | null;
  avaliacoes: number | null;
  fotos: number | null;
  temHorario: boolean | null;
  temDescricao: boolean | null;
  reivindicado: boolean | null;
  fonte: string;
  analisadoEm: number;
}

export interface Contato { id: string; nome: string; cargo: string; telefone: string }

export interface Empresa {
  id: string;
  nome: string;
  segmento: string;
  cidade: string;
  uf: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  site: string;
  instagram: string;
  contatos: Contato[];
  perfil: Perfil | null;
  problemas: Problema[];
  abordagem: string;
  etapa: EtapaId;
  etapaDesde: number;
  valor: number;
  origem: string;
  chave: string;
  observacoes: string;
  ultimoContatoEm: number | null;
  criadoEm: number;
  atualizadoEm: number;
}

export type TipoAtividade = "ligacao" | "mensagem" | "nota" | "etapa";
export type ResultadoLigacao = "atendeu" | "nao_atendeu" | "caixa_postal" | "numero_errado" | "retornar";
export const RESULTADOS: { id: ResultadoLigacao; rotulo: string }[] = [
  { id: "atendeu", rotulo: "Atendeu" },
  { id: "nao_atendeu", rotulo: "Não atendeu" },
  { id: "caixa_postal", rotulo: "Caixa postal" },
  { id: "retornar", rotulo: "Pediu para retornar" },
  { id: "numero_errado", rotulo: "Número errado" },
];

export interface AnaliseLigacao {
  resumo: string;
  interesse: "alto" | "medio" | "baixo" | "nenhum";
  objecoes: string[];
  compromissos: string[];
  proximoPasso: string;
  dataProximo: string;
  etapaSugerida: EtapaId | null;
  mensagem: string;
}

export interface Atividade {
  id: string;
  empresaId: string;
  tipo: TipoAtividade;
  quando: number;
  texto: string;
  resultado?: ResultadoLigacao;
  direcao?: "enviada" | "recebida";
  de?: EtapaId;
  para?: EtapaId;
  analise?: AnaliseLigacao;
  autor: string;
}

export interface Tarefa { id: string; empresaId: string; titulo: string; vence: string; concluida: boolean; criadoEm: number }

export const CHECKLIST = [
  { id: "pagamento", rotulo: "Pagamento confirmado" },
  { id: "autorizacao", rotulo: "Autorização recebida" },
  { id: "acesso", rotulo: "Acesso ao perfil validado" },
  { id: "diagnostico", rotulo: "Diagnóstico realizado" },
  { id: "melhorias", rotulo: "Melhorias preparadas" },
  { id: "aprovadas", rotulo: "Alterações aprovadas" },
  { id: "enviadas", rotulo: "Atualizações enviadas" },
  { id: "conferido", rotulo: "Resultado conferido" },
  { id: "pendencias", rotulo: "Pendências documentadas" },
  { id: "informado", rotulo: "Cliente informado" },
  { id: "concluido", rotulo: "Serviço concluído" },
] as const;
export type ItemChecklist = (typeof CHECKLIST)[number]["id"];

export interface Servico {
  id: string;
  empresaId: string;
  descricao: string;
  valor: number;
  pago: boolean;
  pagoEm: number | null;
  checklist: Partial<Record<ItemChecklist, { feito: boolean; em: number; obs: string }>>;
  evidencias: { id: string; texto: string; url: string; em: number }[];
  resumo: string;
  criadoEm: number;
  concluidoEm: number | null;
}

export interface Candidato extends Omit<Empresa, "etapa" | "etapaDesde" | "ultimoContatoEm" | "atualizadoEm" | "observacoes" | "contatos" | "valor"> {
  status: "pendente" | "aprovado" | "descartado";
  enviadoAoPrincipal: boolean;
}

export interface Config {
  preco: number;
  comissaoPct: number;
  ligacoesDia: number;
  diasTrabalho: number[];
  vendasMes: number;
  nome: string;
}
export const CONFIG_PADRAO: Config = { preco: 100, comissaoPct: 0, ligacoesDia: 30, diasTrabalho: [1, 2, 3, 4, 5, 6], vendasMes: 20, nome: "Fernando" };

// ---------------------------------------------------------------- leitura defensiva

const s = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const b = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const arr = (v: unknown, max = 50): Record<string, unknown>[] => (Array.isArray(v) ? v.slice(0, max).filter((x) => x && typeof x === "object") as Record<string, unknown>[] : []);
const PRI = (v: unknown): Prioridade => (v === "alta" || v === "baixa" ? v : "media");
const CONF = (v: unknown): Confianca => (v === "alta" || v === "baixa" ? v : "media");

export function lerProblemas(v: unknown): Problema[] {
  return arr(v, 20).filter((p) => s(p.titulo)).map((p, i) => ({ id: s(p.id, 40) || `p${i}`, titulo: s(p.titulo, 160), evidencia: s(p.evidencia, 400), melhoria: s(p.melhoria, 400), prioridade: PRI(p.prioridade), status: p.status === "fato" ? "fato" : "hipotese", confianca: CONF(p.confianca) }));
}

export function lerPerfil(v: unknown): Perfil | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  return {
    existe: p.existe !== false,
    link: s(p.link, 600),
    categoria: s(p.categoria, 120),
    categorias: Array.isArray(p.categorias) ? p.categorias.filter((x): x is string => typeof x === "string").slice(0, 10) : [],
    nota: n(p.nota),
    avaliacoes: n(p.avaliacoes),
    fotos: n(p.fotos),
    temHorario: b(p.temHorario),
    temDescricao: b(p.temDescricao),
    reivindicado: b(p.reivindicado),
    fonte: s(p.fonte, 120),
    analisadoEm: n(p.analisadoEm) ?? 0,
  };
}

export function lerEmpresa(id: string, d: Record<string, unknown>): Empresa | null {
  const nome = s(d.nome, 160);
  if (!nome) return null;
  return {
    id,
    nome,
    segmento: s(d.segmento, 80),
    cidade: s(d.cidade, 80),
    uf: s(d.uf, 2),
    endereco: s(d.endereco, 240),
    telefone: s(d.telefone, 30),
    whatsapp: s(d.whatsapp, 30),
    site: s(d.site, 300),
    instagram: s(d.instagram, 300),
    contatos: arr(d.contatos, 10).filter((c) => s(c.nome)).map((c, i) => ({ id: s(c.id, 40) || `c${i}`, nome: s(c.nome, 80), cargo: s(c.cargo, 60), telefone: s(c.telefone, 30) })),
    perfil: lerPerfil(d.perfil),
    problemas: lerProblemas(d.problemas),
    abordagem: s(d.abordagem, 800),
    etapa: isEtapa(d.etapa) ? d.etapa : "nova",
    etapaDesde: n(d.etapaDesde) ?? n(d.criadoEm) ?? 0,
    valor: n(d.valor) ?? CONFIG_PADRAO.preco,
    origem: s(d.origem, 60),
    chave: s(d.chave, 200),
    observacoes: s(d.observacoes, 4000),
    ultimoContatoEm: n(d.ultimoContatoEm),
    criadoEm: n(d.criadoEm) ?? 0,
    atualizadoEm: n(d.atualizadoEm) ?? 0,
  };
}

export function lerAnalise(v: unknown): AnaliseLigacao | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  const resumo = s(d.resumo, 1500);
  if (!resumo) return null;
  const strs = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === "string").map((y) => y.trim().slice(0, 300)).filter(Boolean).slice(0, 8) : []);
  return {
    resumo,
    interesse: d.interesse === "alto" || d.interesse === "baixo" || d.interesse === "nenhum" ? d.interesse : "medio",
    objecoes: strs(d.objecoes),
    compromissos: strs(d.compromissos),
    proximoPasso: s(d.proximoPasso, 300),
    dataProximo: typeof d.dataProximo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.dataProximo) ? d.dataProximo : "",
    etapaSugerida: isEtapa(d.etapaSugerida) ? d.etapaSugerida : null,
    mensagem: s(d.mensagem, 1500),
  };
}

export function lerAtividade(id: string, d: Record<string, unknown>): Atividade | null {
  const tipo = d.tipo;
  if (tipo !== "ligacao" && tipo !== "mensagem" && tipo !== "nota" && tipo !== "etapa") return null;
  const empresaId = s(d.empresaId, 60);
  if (!empresaId) return null;
  return {
    id,
    empresaId,
    tipo,
    quando: n(d.quando) ?? 0,
    texto: s(d.texto, 4000),
    resultado: RESULTADOS.some((r) => r.id === d.resultado) ? (d.resultado as ResultadoLigacao) : undefined,
    direcao: d.direcao === "recebida" ? "recebida" : d.direcao === "enviada" ? "enviada" : undefined,
    de: isEtapa(d.de) ? d.de : undefined,
    para: isEtapa(d.para) ? d.para : undefined,
    analise: lerAnalise(d.analise) ?? undefined,
    autor: s(d.autor, 80),
  };
}

export function lerTarefa(id: string, d: Record<string, unknown>): Tarefa | null {
  const titulo = s(d.titulo, 200);
  if (!titulo) return null;
  return { id, empresaId: s(d.empresaId, 60), titulo, vence: /^\d{4}-\d{2}-\d{2}$/.test(String(d.vence)) ? String(d.vence) : isoDia(), concluida: d.concluida === true, criadoEm: n(d.criadoEm) ?? 0 };
}

export function lerServico(id: string, d: Record<string, unknown>): Servico | null {
  const empresaId = s(d.empresaId, 60);
  if (!empresaId) return null;
  const ck = (d.checklist ?? {}) as Record<string, unknown>;
  const checklist: Servico["checklist"] = {};
  for (const c of CHECKLIST) {
    const v = ck[c.id] as Record<string, unknown> | undefined;
    if (v && typeof v === "object") checklist[c.id] = { feito: v.feito === true, em: n(v.em) ?? 0, obs: s(v.obs, 500) };
  }
  return {
    id,
    empresaId,
    descricao: s(d.descricao, 200) || "Otimização do Perfil da Empresa no Google",
    valor: n(d.valor) ?? CONFIG_PADRAO.preco,
    pago: d.pago === true,
    pagoEm: n(d.pagoEm),
    checklist,
    evidencias: arr(d.evidencias, 30).map((e, i) => ({ id: s(e.id, 40) || `ev${i}`, texto: s(e.texto, 400), url: s(e.url, 600), em: n(e.em) ?? 0 })),
    resumo: s(d.resumo, 4000),
    criadoEm: n(d.criadoEm) ?? 0,
    concluidoEm: n(d.concluidoEm),
  };
}

export function lerCandidato(id: string, d: Record<string, unknown>): Candidato | null {
  const e = lerEmpresa(id, d);
  if (!e) return null;
  const { etapa: _e, etapaDesde: _d, ultimoContatoEm: _u, atualizadoEm: _a, observacoes: _o, contatos: _c, valor: _v, ...resto } = e;
  return { ...resto, status: d.status === "aprovado" || d.status === "descartado" ? d.status : "pendente", enviadoAoPrincipal: d.enviadoAoPrincipal === true };
}

export function lerConfig(d: Record<string, unknown> | undefined): Config {
  const c = d ?? {};
  const dias = Array.isArray(c.diasTrabalho) ? [...new Set(c.diasTrabalho.filter((x): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 6))].sort() : [];
  const num = (v: unknown, def: number, max: number) => Math.min(max, Math.max(0, n(v) ?? def));
  return {
    preco: num(c.preco, CONFIG_PADRAO.preco, 100_000),
    comissaoPct: num(c.comissaoPct, CONFIG_PADRAO.comissaoPct, 100),
    ligacoesDia: num(c.ligacoesDia, CONFIG_PADRAO.ligacoesDia, 300),
    diasTrabalho: dias.length ? dias : CONFIG_PADRAO.diasTrabalho,
    vendasMes: num(c.vendasMes, CONFIG_PADRAO.vendasMes, 10_000),
    nome: s(c.nome, 60) || CONFIG_PADRAO.nome,
  };
}

// ---------------------------------------------------------------- Google Maps → diagnóstico do perfil

export interface ItemMaps {
  title?: string;
  categoryName?: string;
  categories?: string[];
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  url?: string;
  totalScore?: number | null;
  reviewsCount?: number | null;
  imagesCount?: number | null;
  openingHours?: unknown[] | null;
  description?: string | null;
  claimThisBusiness?: boolean | null;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  placeId?: string;
}

const UFS: Record<string, string> = { "são paulo": "SP", "sao paulo": "SP", "rio de janeiro": "RJ", "minas gerais": "MG", paraná: "PR", parana: "PR", "santa catarina": "SC", "rio grande do sul": "RS", bahia: "BA", goiás: "GO", goias: "GO" };
export const ufDe = (e = "") => (/^[A-Z]{2}$/.test(e.trim()) ? e.trim() : UFS[e.trim().toLowerCase()] ?? "");
export const ehRedeSocial = (u: string) => /instagram\.com|facebook\.com|fb\.com|wa\.me|linktr\.ee|whatsapp|tiktok\.com|ifood\.com/i.test(u);

/** Chave para não duplicar empresas: id do Google ou nome + cidade. */
export function chaveEmpresa(p: { placeId?: string; nome: string; cidade: string }): string {
  return p.placeId ? `place:${p.placeId}` : `nome:${normalizarNome(p.nome)}|${normalizarNome(p.cidade)}`;
}

/** Diagnóstico do perfil a partir do que a fonte mostra. O que a fonte não trouxe vira hipótese, nunca fato. */
export function diagnosticarPerfil(i: ItemMaps, agora = Date.now()): { perfil: Perfil; problemas: Problema[] } {
  const link = i.url && /google\./i.test(i.url) ? i.url : "";
  const site = i.website ? normalizarUrl(i.website) : "";
  const fonte = "Google Maps (dados públicos via Apify)";
  const perfil: Perfil = {
    existe: true,
    link,
    categoria: i.categoryName ?? "",
    categorias: (i.categories ?? []).filter(Boolean).slice(0, 10),
    nota: i.totalScore ?? null,
    avaliacoes: i.reviewsCount ?? null,
    fotos: typeof i.imagesCount === "number" ? i.imagesCount : null,
    temHorario: Array.isArray(i.openingHours) ? i.openingHours.length > 0 : null,
    temDescricao: typeof i.description === "string" ? i.description.trim().length > 0 : null,
    reivindicado: typeof i.claimThisBusiness === "boolean" ? !i.claimThisBusiness : null,
    fonte,
    analisadoEm: agora,
  };
  const P: Problema[] = [];
  const add = (p: Omit<Problema, "id">) => P.push({ ...p, id: `p${P.length + 1}` });
  if (perfil.reivindicado === false)
    add({ titulo: "Perfil possivelmente não reivindicado", evidencia: "A ficha mostra a opção “Reivindicar esta empresa”.", melhoria: "Reivindicar e verificar o perfil com o dono para poder editar as informações.", prioridade: "alta", status: "fato", confianca: "alta" });
  if (i.temporarilyClosed)
    add({ titulo: "Aparece como temporariamente fechada", evidencia: "A ficha está marcada como temporariamente fechada.", melhoria: "Confirmar com o dono e corrigir o status se já estiver funcionando.", prioridade: "alta", status: "fato", confianca: "alta" });
  if (!i.phone)
    add({ titulo: "Sem telefone no perfil", evidencia: "A fonte não trouxe telefone na ficha.", melhoria: "Cadastrar telefone ou WhatsApp comercial.", prioridade: "alta", status: "hipotese", confianca: "media" });
  if (!site)
    add({ titulo: "Sem site vinculado", evidencia: "A ficha não tem link de site.", melhoria: "Vincular o site da empresa (ou criar um).", prioridade: "media", status: "fato", confianca: "alta" });
  else if (ehRedeSocial(site))
    add({ titulo: "Link do site aponta para rede social", evidencia: `O link da ficha é ${site}.`, melhoria: "Vincular um site próprio; manter as redes nos campos de redes sociais.", prioridade: "baixa", status: "fato", confianca: "alta" });
  if (perfil.temHorario === false)
    add({ titulo: "Horário de funcionamento não publicado", evidencia: "A ficha não mostra horários.", melhoria: "Publicar horários reais, incluindo feriados.", prioridade: "alta", status: "fato", confianca: "alta" });
  else if (perfil.temHorario === null)
    add({ titulo: "Horários a conferir", evidencia: "A fonte não trouxe os horários.", melhoria: "Conferir no perfil se os horários estão publicados e corretos.", prioridade: "baixa", status: "hipotese", confianca: "baixa" });
  if (perfil.fotos !== null && perfil.fotos < 10)
    add({ titulo: `Poucas fotos (${perfil.fotos})`, evidencia: `A ficha tem ${perfil.fotos} foto(s).`, melhoria: "Adicionar fotos reais de fachada, interior, equipe e produtos/serviços.", prioridade: perfil.fotos < 3 ? "alta" : "media", status: "fato", confianca: "alta" });
  if (perfil.temDescricao === false)
    add({ titulo: "Sem descrição da empresa", evidencia: "A ficha não tem descrição.", melhoria: "Escrever uma descrição com serviços e região atendida (sem exageros nem palavras repetidas).", prioridade: "media", status: "hipotese", confianca: "media" });
  if (perfil.avaliacoes !== null && perfil.avaliacoes < 15)
    add({ titulo: `Poucas avaliações (${perfil.avaliacoes})`, evidencia: `A ficha tem ${perfil.avaliacoes} avaliação(ões).`, melhoria: "Criar um link de avaliação e pedir a clientes reais (nunca avaliações falsas).", prioridade: "media", status: "fato", confianca: "alta" });
  if (perfil.nota !== null && perfil.nota > 0 && perfil.nota < 4.2)
    add({ titulo: `Nota ${perfil.nota.toFixed(1).replace(".", ",")} no Google`, evidencia: `Média de ${perfil.nota.toFixed(1)} em ${perfil.avaliacoes ?? 0} avaliações.`, melhoria: "Responder todas as avaliações, principalmente as negativas, e pedir avaliação a clientes satisfeitos.", prioridade: "media", status: "fato", confianca: "alta" });
  if (perfil.categorias.length <= 1 && perfil.categoria)
    add({ titulo: "Só uma categoria", evidencia: `Categoria encontrada: ${perfil.categoria}.`, melhoria: "Avaliar categorias secundárias que descrevam serviços reais.", prioridade: "baixa", status: "hipotese", confianca: "baixa" });
  return { perfil, problemas: P };
}

const PESO: Record<Prioridade, number> = { alta: 25, media: 12, baixa: 4 };

/** Potencial de venda do serviço (0–100): problemas do perfil + condições para vender. */
export function potencialGmn(e: Pick<Empresa, "problemas" | "telefone" | "whatsapp" | "perfil" | "etapa">): { total: number; prioridade: Prioridade; motivos: string[] } {
  let t = 0;
  const motivos: string[] = [];
  for (const p of e.problemas) {
    const v = PESO[p.prioridade] * (p.status === "fato" ? 1 : 0.5);
    t += v;
  }
  t = Math.min(70, t);
  const altas = e.problemas.filter((p) => p.prioridade === "alta" && p.status === "fato").length;
  if (altas) motivos.push(`${altas} problema(s) grave(s) confirmado(s)`);
  const tel = [e.whatsapp, e.telefone].some((x) => normalizarTelefone(x).length >= 10);
  if (tel) {
    t += 10;
    motivos.push("Tem telefone para contato");
  }
  const av = e.perfil?.avaliacoes ?? 0;
  if (av >= 20) {
    t += 10;
    motivos.push("Negócio com movimento (avaliações)");
  } else if (av >= 5) t += 5;
  if (INTERESSADAS.includes(e.etapa) && !VENDIDAS.includes(e.etapa)) {
    t += 10;
    motivos.push("Já demonstrou interesse");
  }
  const total = Math.round(Math.min(100, t));
  return { total, prioridade: total >= 55 ? "alta" : total >= 30 ? "media" : "baixa", motivos };
}

export function abordagemSugerida(nome: string, problemas: Problema[], meuNome: string): string {
  const top = problemas.filter((p) => p.status === "fato").sort((a, b) => PESO[b.prioridade] - PESO[a.prioridade]).slice(0, 2);
  const pontos = top.map((p) => p.titulo.toLowerCase()).join(" e ");
  return pontos
    ? `Oi, tudo bem? Aqui é o ${meuNome}. Vi a ficha da ${nome} no Google e notei ${pontos}. Isso faz muita gente desistir antes de ligar. Eu corrijo e deixo o perfil completo por um valor único. Posso te explicar em 2 minutos?`
    : `Oi, tudo bem? Aqui é o ${meuNome}. Trabalho deixando o perfil das empresas no Google completo e atualizado. Posso dar uma olhada na ficha da ${nome} e te mostrar o que dá para melhorar?`;
}

/** Converte resultados do Maps em candidatos do Radar (sem duplicar). */
export function mapsParaCandidatos(itens: ItemMaps[], meuNome: string, agora = Date.now()): Record<string, unknown>[] {
  const vistos = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const i of itens) {
    const nome = (i.title ?? "").trim();
    if (!nome || i.permanentlyClosed) continue;
    const cidade = (i.city ?? "").trim();
    const chave = chaveEmpresa({ placeId: i.placeId, nome, cidade });
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const { perfil, problemas } = diagnosticarPerfil(i, agora);
    const site = i.website ? normalizarUrl(i.website) : "";
    out.push({
      nome: nome.slice(0, 160),
      segmento: (i.categoryName ?? "").slice(0, 80),
      cidade,
      uf: ufDe(i.state),
      endereco: (i.address ?? "").slice(0, 240),
      telefone: (i.phone ?? "").slice(0, 30),
      whatsapp: "",
      site: ehRedeSocial(site) ? "" : site,
      instagram: /instagram\.com/i.test(site) ? site : "",
      perfil,
      problemas,
      abordagem: abordagemSugerida(nome, problemas, meuNome),
      origem: "Google Maps",
      chave,
      status: "pendente",
      enviadoAoPrincipal: false,
      criadoEm: agora,
    });
  }
  return out;
}

/** A empresa não tem site próprio (pela ficha do Google)? Vira oportunidade para o painel principal. */
export function semSiteProprio(c: Pick<Empresa, "site" | "perfil">): boolean {
  return !c.site || ehRedeSocial(c.site);
}

// ---------------------------------------------------------------- ligações do dia e métricas

export interface ItemLigacao { empresa: Empresa; motivo: "retorno" | "followup" | "primeira" | "tentar_de_novo"; detalhe: string; potencial: number; telefone: string }

export function ligacoesDoDia(empresas: Empresa[], atividades: Atividade[], tarefas: Tarefa[], cfg: Pick<Config, "ligacoesDia" | "diasTrabalho">, agora = Date.now()) {
  const hoje0 = inicioDoDia(agora);
  const hoje = isoDia(agora);
  const folga = !cfg.diasTrabalho.includes(new Date(agora).getDay());
  const ligHoje = atividades.filter((a) => a.tipo === "ligacao" && a.quando >= hoje0 && a.quando < hoje0 + DIA_MS);
  const ja = new Set(ligHoje.map((a) => a.empresaId));
  const tarefaDe = new Map(tarefas.filter((t) => !t.concluida && t.vence <= hoje).map((t) => [t.empresaId, t]));
  const itens: (ItemLigacao & { peso: number })[] = [];
  for (const e of empresas) {
    if (FINAIS.includes(e.etapa) || VENDIDAS.includes(e.etapa) || ja.has(e.id)) continue;
    const tel = [e.whatsapp, e.telefone, ...e.contatos.map((c) => c.telefone)].find((t) => normalizarTelefone(t).length >= 10);
    if (!tel) continue;
    const pot = potencialGmn(e).total;
    const dias = e.ultimoContatoEm ? Math.floor((agora - e.ultimoContatoEm) / DIA_MS) : 999;
    const t = tarefaDe.get(e.id);
    if (t) itens.push({ empresa: e, motivo: "retorno", detalhe: t.titulo, potencial: pot, telefone: tel, peso: 1000 + pot });
    else if (["interessado", "enviar_whatsapp", "follow_up", "aguardando_pagamento"].includes(e.etapa) && dias >= 2) itens.push({ empresa: e, motivo: "followup", detalhe: `${ETAPA[e.etapa].nome} · ${dias} dias`, potencial: pot, telefone: tel, peso: 800 + pot });
    else if (e.etapa === "tentativa" && dias >= 1) itens.push({ empresa: e, motivo: "tentar_de_novo", detalhe: "Não atendeu da última vez", potencial: pot, telefone: tel, peso: 500 + pot });
    else if ((e.etapa === "nova" || e.etapa === "aguardando_ligacao") && !e.ultimoContatoEm) itens.push({ empresa: e, motivo: "primeira", detalhe: e.problemas[0]?.titulo ?? (e.segmento || "Nova empresa"), potencial: pot, telefone: tel, peso: 300 + pot });
  }
  itens.sort((a, b) => b.peso - a.peso);
  const faltam = Math.max(0, cfg.ligacoesDia - ligHoje.length);
  return { folga, meta: cfg.ligacoesDia, feitas: ligHoje.length, itens: itens.slice(0, folga ? 10 : faltam).map(({ peso: _p, ...x }) => x) };
}

export function metricas(empresas: Empresa[], atividades: Atividade[], servicos: Servico[], cfg: Config, agora = Date.now()) {
  const mes0 = inicioDoMes(agora);
  const hoje0 = inicioDoDia(agora);
  const dow = new Date(agora).getDay();
  const semana0 = hoje0 - ((dow + 6) % 7) * DIA_MS;
  const lig = atividades.filter((a) => a.tipo === "ligacao");
  const ligMes = lig.filter((a) => a.quando >= mes0);
  const contatadas = new Set(ligMes.filter((a) => a.resultado === "atendeu").map((a) => a.empresaId)).size;
  const vendidosMes = servicos.filter((s) => s.criadoEm >= mes0);
  const contratado = vendidosMes.reduce((t, s) => t + s.valor, 0);
  const recebido = servicos.filter((s) => s.pago && (s.pagoEm ?? 0) >= mes0).reduce((t, s) => t + s.valor, 0);
  const pendente = servicos.filter((s) => !s.pago).reduce((t, s) => t + s.valor, 0);
  const interessadas = empresas.filter((e) => INTERESSADAS.includes(e.etapa)).length;
  return {
    ligacoesHoje: lig.filter((a) => a.quando >= hoje0).length,
    ligacoesSemana: lig.filter((a) => a.quando >= semana0).length,
    ligacoesMes: ligMes.length,
    contatadasMes: contatadas,
    interessadas,
    vendidosMes: vendidosMes.length,
    conversao: contatadas ? vendidosMes.length / contatadas : null,
    contratadoMes: contratado,
    recebidoMes: recebido,
    pendente,
    comissaoMes: Math.round((recebido * cfg.comissaoPct) / 100),
    emExecucao: servicos.filter((s) => !s.concluidoEm).length,
    concluidosMes: servicos.filter((s) => (s.concluidoEm ?? 0) >= mes0).length,
  };
}

export function progressoChecklist(s: Servico): { feitos: number; total: number } {
  return { feitos: CHECKLIST.filter((c) => s.checklist[c.id]?.feito).length, total: CHECKLIST.length };
}

export function resumoServico(s: Servico, e: Empresa | undefined): string {
  const feitos = CHECKLIST.filter((c) => s.checklist[c.id]?.feito);
  const obs = CHECKLIST.map((c) => s.checklist[c.id]?.obs ? `• ${c.rotulo}: ${s.checklist[c.id]!.obs}` : "").filter(Boolean);
  return [
    `Resumo do serviço — ${e?.nome ?? "Empresa"}`,
    s.descricao,
    "",
    `Etapas concluídas (${feitos.length}/${CHECKLIST.length}):`,
    ...feitos.map((c) => `✓ ${c.rotulo}`),
    ...(obs.length ? ["", "Observações:", ...obs] : []),
    ...(s.evidencias.length ? ["", "Evidências:", ...s.evidencias.map((v) => `• ${v.texto}${v.url ? ` — ${v.url}` : ""}`)] : []),
  ].join("\n");
}

// ---------------------------------------------------------------- análise de ligação (prompt)

export function promptAnaliseLigacao(e: Empresa, transcricao: string, meuNome: string, quando = Date.now()): string {
  return `Você é o analista comercial de um serviço de otimização do Perfil da Empresa no Google (Google Meu Negócio), vendido por ${meuNome} por valor único.
Analise a transcrição da ligação com a empresa abaixo e responda APENAS com JSON:
{"resumo":"3 a 4 frases","interesse":"alto|medio|baixo|nenhum","objecoes":[""],"compromissos":[""],"proximoPasso":"","dataProximo":"AAAA-MM-DD","etapaSugerida":"","mensagem":""}
REGRAS:
- Use só o que foi dito. Não invente preços, prazos ou promessas. Nunca prometa posição no Google.
- A ligação foi em ${isoDia(quando)}. Converta datas relativas em AAAA-MM-DD.
- "etapaSugerida": um destes ids: ${ETAPAS.map((x) => `${x.id} (${x.nome})`).join(", ")}.
- "mensagem": WhatsApp curto, natural, citando algo específico da conversa, assinado por ${meuNome}. Sem mencionar inteligência artificial.
EMPRESA: ${JSON.stringify({ nome: e.nome, segmento: e.segmento, cidade: e.cidade, etapa: ETAPA[e.etapa].nome, problemasDoPerfil: e.problemas.map((p) => p.titulo) })}
TRANSCRIÇÃO: ${transcricao.slice(0, 40_000)}`;
}
