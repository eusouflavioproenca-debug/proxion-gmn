# Proxion · Google Meu Negócio (painel do Fernando)

Painel separado para prospectar, vender e entregar o serviço de otimização do Perfil da Empresa no Google. O preço padrão é R$ 100 e pode ser alterado em Ajustes.

**Não mexe no painel principal da Proxion.** Este app tem código, endereço, login e tabelas próprias. A troca com o painel principal acontece só pela tabela `ponte`.

## O que já funciona

- **Login próprio**, com e-mail e senha no Supabase, e acesso restrito ao painel GMN.
- **Início:**
  - lista de ligações do dia, com meta diária e dias de trabalho configuráveis;
  - indicadores do mês: ligações, contatadas, interessadas, vendas, conversão, contratado, recebido, a receber e comissão;
  - próximos passos do dia.
- **Radar:**
  - busca empresas reais no Google Maps (via Apify);
  - analisa o perfil de cada uma: reivindicação, horários, fotos, telefone, site, avaliações, nota, descrição e categorias;
  - cada problema traz evidência, prioridade e confiança. O que a fonte não mostra aparece como "a conferir", nunca como fato;
  - sugere uma abordagem;
  - não deixa a mesma empresa entrar duas vezes.
- **Empresas:** funil de 15 etapas, busca e potencial de venda de 0 a 100.
- **Ficha da empresa:**
  - ligar e registrar o resultado (a etapa é sugerida pelo resultado);
  - mensagem com WhatsApp, indicando quem enviou;
  - análise de ligação com IA: a partir da transcrição, gera resumo, interesse, objeções, compromissos, próximo passo, etapa sugerida e mensagem;
  - próximos passos e histórico.
- **Serviços:**
  - cada venda gera uma ordem de serviço com o checklist de 11 itens, observações por item, evidências e resumo para o cliente;
  - a etapa da empresa avança sozinha conforme os itens são marcados (pagamento, autorização, envio, conclusão).
- **Financeiro:** contratado e recebido aparecem separados, com valores a receber e comissão sobre o recebido.
- **Compartilhadas:** empresas sem site enviadas ao painel principal, com o status de cada uma, e oportunidades recebidas de lá, para aceitar ou recusar.
- **PWA:** dá para instalar na tela inicial do celular. Os dados sincronizam em tempo real.

## Configuração

### 1. Supabase (mesmo projeto do painel principal, tabelas novas)

1. No **SQL Editor**, rode `supabase/schema.sql`. Ele cria `paineis`, `fer_docs` e `ponte` e não altera a tabela `docs`.
2. Em **Authentication → Users → Add user**, crie o usuário do Fernando com e-mail e senha, marcando Auto Confirm.
3. Rode o `insert` do passo 4 do `schema.sql` com o e-mail dele. Isso vincula o usuário ao painel `gmn`.

### 2. Vercel (projeto novo)

Importe este repositório e cadastre:

| Variável | Valor |
| --- | --- |
| `OPENAI_API_KEY` | chave da API da OpenAI (ChatGPT), criada em platform.openai.com. Se preferir o Claude, use `ANTHROPIC_API_KEY` no lugar |
| `APIFY_TOKEN` | token do Apify, para a busca no Google Maps |
| `EMAILS_PERMITIDOS` | e-mail de login do Fernando |

O endereço e a chave pública do Supabase já vêm no código. Se quiser, dá para sobrescrever com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, do tipo Config.

## Desenvolvimento

```bash
npm install
npm run dev
npm test
npx vite build --mode preview --outDir dist-preview   # prévia com dados de exemplo
```

## Próximas etapas

- **Central de Otimização Google**, pela API oficial do Google Business Profile. Depende de um projeto no Google Cloud com a API liberada pelo Google, que exige um pedido de acesso, e do OAuth do dono de cada perfil.
- **Assistente de IA do painel**, com consultas aos dados reais.
- **Gravação e transcrição do áudio** dentro do app. Hoje a análise usa a transcrição colada.
- **Integração com o painel principal.** Depende de autorização. Veja `docs/INTEGRACAO.md`.
