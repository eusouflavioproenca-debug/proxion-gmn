# Integração com o painel principal: proposta para autorização

Nada nesta lista foi feito. Todos os itens mexem no painel principal ou no banco dele, por isso dependem da autorização do Flávio.

## Como funciona hoje, sem tocar no painel principal

- O painel GMN grava na tabela `ponte` as empresas **sem site próprio** encontradas no Radar (`tipo = site`, `destino = principal`).
- O painel GMN lê da `ponte` o que tiver `destino = gmn` e permite aceitar ou recusar.
- O painel principal **ainda não lê nem escreve** na `ponte`. Por isso, as empresas enviadas pelo Fernando ficam "Aguardando" até a integração ser ligada.

## O que precisa ser autorizado

1. **Mostrar no Radar do painel principal as empresas que vêm do Fernando.**
   - Seria uma lista "Vindas do painel GMN", com motivo, contato e link do Maps, e os botões Aprovar e Recusar.
   - Aprovar cria a empresa no CRM, na etapa "Nova oportunidade", e marca a `ponte` como aceita. Recusar marca como recusada.
   - Mudança: um componente novo na tela Radar e uma leitura da tabela `ponte`.
2. **Mandar ao Fernando as empresas com problemas no Google.**
   - Na busca do Google Maps do painel principal, as empresas com perfil incompleto iriam para a `ponte` com `destino = gmn`.
   - Seriam as mesmas regras do Radar do Fernando: perfil não reivindicado, sem horários, poucas fotos, sem telefone.
   - Mudança: uma chamada a mais depois da busca, e o diagnóstico do perfil reaproveitado do painel GMN.
3. **Vincular o usuário do Flávio ao painel `principal`.** É uma linha na tabela `paineis`, feita com o insert opcional do `schema.sql`. Sem isso, o painel principal não consegue ler a `ponte`.
4. **(Recomendado) Fechar o painel principal para usuários de outros painéis.**
   - Hoje o Fernando conseguiria entrar no endereço do painel principal com o login dele.
   - Ele não veria nenhum dado do Flávio, porque o banco só mostra os registros de quem criou. Mas veria um CRM vazio e poderia cadastrar coisas nele.
   - A correção é uma regra no banco para que a tabela `docs` aceite só quem é do painel `principal`. Mudança no banco do painel principal.
5. **Venda cruzada.**
   - Quando o Fernando vender a otimização para uma empresa sem site, a sugestão de site já chega ao painel principal pela `ponte`.
   - Quando o Flávio vender um site para uma empresa com o perfil desatualizado, a sugestão iria para o Fernando. Isso depende do item 2.
