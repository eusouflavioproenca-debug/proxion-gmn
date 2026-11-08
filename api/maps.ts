// Busca empresas no Google Maps pelo Apify, com página de detalhes para diagnosticar o Perfil da Empresa no Google.
// POST {busca, local, quantidade} inicia a busca; GET ?run=ID consulta o andamento e devolve os resultados.
import { exigirLogin, json } from "./_auth";

export const config = { runtime: "edge" };

const ATOR = "compass~crawler-google-places";
const API = "https://api.apify.com/v2";
const CAMPOS = "title,categoryName,categories,address,city,state,phone,website,url,totalScore,reviewsCount,imagesCount,openingHours,description,claimThisBusiness,permanentlyClosed,temporarilyClosed,placeId";

export default async function handler(req: Request) {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) return json(503, { erro: "sem_token" });
  const negado = await exigirLogin(req);
  if (negado) return negado;
  const auth = { authorization: `Bearer ${token}` };

  if (req.method === "POST") {
    let b: { busca?: string; local?: string; quantidade?: number };
    try {
      b = await req.json();
    } catch {
      return json(400, { erro: "JSON inválido" });
    }
    const busca = (b.busca || "").trim().slice(0, 120);
    const local = (b.local || "Sorocaba, SP, Brasil").trim().slice(0, 120);
    const qtd = Math.max(1, Math.min(40, Number(b.quantidade) || 20));
    if (busca.length < 2) return json(400, { erro: "Diga o que buscar" });
    // Teto de gasto por busca, para não estourar o crédito grátis
    const iniciar = () => fetch(`${API}/acts/${ATOR}/runs?maxTotalChargeUsd=0.8&memory=1024&timeout=900`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: [busca],
        locationQuery: local,
        maxCrawledPlacesPerSearch: qtd,
        language: "pt-BR",
        skipClosedPlaces: true,
        // Página de detalhes: traz horários, fotos, descrição e se o perfil foi reivindicado (essencial para o diagnóstico)
        scrapePlaceDetailPage: true,
        scrapeContacts: false,
        maxImages: 0,
        maxReviews: 0,
      }),
    });
    let r = await iniciar();
    if (!r.ok && [402, 403].includes(r.status)) {
      // Limite de memória do plano grátis: interrompe buscas antigas que ficaram rodando e tenta de novo
      const lista = (await fetch(`${API}/acts/${ATOR}/runs?status=RUNNING&desc=1&limit=50`, { headers: auth }).then((x) => x.json()).catch(() => ({}))) as { data?: { items?: { id: string }[] } };
      for (const it of lista.data?.items ?? []) await fetch(`${API}/actor-runs/${it.id}/abort`, { method: "POST", headers: auth }).catch(() => null);
      if (lista.data?.items?.length) {
        await new Promise((ok) => setTimeout(ok, 3000));
        r = await iniciar();
      }
    }
    const d = (await r.json().catch(() => ({}))) as { data?: { id?: string }; error?: { message?: string } };
    if (!r.ok || !d.data?.id) return json(r.status === 401 ? 503 : 502, { erro: r.status === 401 ? "token_invalido" : d.error?.message || "Não foi possível iniciar a busca" });
    return json(200, { run: d.data.id });
  }

  const run = new URL(req.url).searchParams.get("run") || "";
  if (!/^[A-Za-z0-9]{8,30}$/.test(run)) return json(400, { erro: "run inválido" });
  if (req.method === "DELETE") {
    // Interrompe a busca no Apify para liberar memória e crédito
    await fetch(`${API}/actor-runs/${run}/abort`, { method: "POST", headers: auth }).catch(() => null);
    return json(200, { ok: true });
  }
  const r = await fetch(`${API}/actor-runs/${run}`, { headers: auth });
  const d = (await r.json().catch(() => ({}))) as { data?: { status?: string; defaultDatasetId?: string } };
  if (!r.ok || !d.data) return json(502, { erro: "Não foi possível consultar a busca" });
  const status = d.data.status || "RUNNING";
  if (status !== "SUCCEEDED") return json(200, { status });
  const itens = await fetch(`${API}/datasets/${d.data.defaultDatasetId}/items?clean=true&fields=${CAMPOS}&limit=100`, { headers: auth }).then((x) => x.json()).catch(() => []);
  return json(200, { status, itens: Array.isArray(itens) ? itens : [] });
}
