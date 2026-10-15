# Levantamento regional (Fase 4)

> Gerado por `pnpm levantamento:relatorio` a partir da sondagem automática (`web/levantamento/resultado.json`).
> Sondagem de 15 de outubro de 2026 às 20:25, rodada em GitHub Actions. Não edite à mão: corrija a classificação em `web/src/levantamento/classificacao.ts` (AJUSTES) e gere de novo.

## Como foi feito

- Para cada uma das 27 casas legislativas estaduais (26 Assembleias e a Câmara Legislativa do DF) e dos 27 Diários Oficiais, a sondagem acessa os endereços conhecidos (`web/src/levantamento/candidatos.ts`), segue os links mais promissores da página (proposições, dados abertos, API, SAPL, diário) e tenta o SAPL do Interlegis no endereço padrão.
- De cada resposta guarda: situação HTTP, tipo, se é JSON/XML, se é a API do SAPL (e quantas matérias), PDFs, links de proposições, links de dados abertos, página montada no navegador, bloqueio de robô e certificado inválido.
- O nível sai dessas evidências (regra em `classificacao.ts`); quem revisar pode corrigir, e a correção aparece como "(revisado)".
- **Periodicidade:** não é medida pela sondagem. Diários Oficiais costumam sair em dias úteis e as Assembleias publicam conforme as sessões; a confirmação vem da coleta de cada fonte, já na Fase 5.

## Níveis

| Nível | O que significa | Como coletar |
|---|---|---|
| A | Dados estruturados: API, SAPL, JSON ou XML | Conector automático direto (o do SAPL serve a todas as casas que o usam) |
| B | Páginas HTML com a lista das proposições ou edições | Conector que lê as páginas; quebra se o site mudar |
| C | Só PDF, ou página que só monta o conteúdo no navegador | Leitura de PDF ou navegador automatizado; frágil e mais lento |
| D | Fora do ar, bloqueado ou sem lista encontrada | Cadastro manual pelo autor no painel |

## Resumo

| | A | B | C | D |
|---|---|---|---|---|
| Casas legislativas | 9 | 4 | 4 | 10 |
| Diários Oficiais | 0 | 0 | 20 | 7 |

## Por região (casas legislativas)

| Região | A | B | C | D |
|---|---|---|---|---|
| Norte | 4 (AC, AM, RO, TO) | 0 | 0 | 3 (AP, PA, RR) |
| Nordeste | 3 (AL, PB, PI) | 1 (BA) | 1 (RN) | 4 (CE, MA, PE, SE) |
| Centro-Oeste | 0 | 1 (MT) | 2 (GO, MS) | 1 (DF) |
| Sudeste | 2 (MG, SP) | 1 (RJ) | 0 | 1 (ES) |
| Sul | 0 | 1 (SC) | 1 (PR) | 1 (RS) |

## O que os números dizem

- **SAPL (Interlegis):** 7 casas respondem pela mesma API (AC, AL, AM, PB, PI, RO, TO). Um único conector do SAPL cobre todas, com o mesmo formato de matéria, tramitação e autoria.
- **Diários Oficiais:** nenhum tem API; todos publicam edições em PDF ou em consulta por data. Para os estados, o diário é fonte de confirmação (lei publicada, veto), não de acompanhamento diário.
- **Sem resposta de fora do Brasil (11):** AM (diário), AP (Alap), DF (CLDF), DF (diário), ES (Ales), MA (Alema), PE (Alepe), PI (diário), RS (ALRS), RS (diário), TO (diário). Falharam em todas as rodadas (três, em 15/10/2026) por tempo esgotado ou conexão recusada, o que costuma indicar bloqueio de acesso estrangeiro. A coleta desses estados precisa rodar de um servidor no Brasil; a confirmação vem do teste a partir de lá.
- **Região-piloto (Fase 5):** a região com mais casas em nível A é Norte.

## Norte

| UF | Casa | Nível da casa | Onde | Respostas | Nível do diário | Onde | Respostas |
|---|---|---|---|---|---|---|---|
| AC | Aleac | **A** · API do SAPL respondendo (19341 matérias) | [sapl.al.ac.leg.br](https://sapl.al.ac.leg.br/api/materia/materialegislativa/?page_size=1) | 1/3 | **C** · edições em PDF (2 na página) | [diario.ac.gov.br](https://diario.ac.gov.br/normas.php) | 7/7 |
| AM | Aleam | **A** · API do SAPL respondendo (79222 matérias) | [sapl.al.am.leg.br](https://sapl.al.am.leg.br/api/materia/materialegislativa/?page_size=1) | 1/2 | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [diario.imprensaoficial.am.gov.br](https://diario.imprensaoficial.am.gov.br/) | 0/2 |
| AP | Alap | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [www.al.ap.leg.br](https://www.al.ap.leg.br/) | 0/3 | **C** · edições em PDF (1 na página) | [diofe.portal.ap.gov.br](https://diofe.portal.ap.gov.br/) | 1/3 |
| PA | Alepa | **D** · site no ar, mas a página de proposições não traz a lista no HTML; falta localizar a consulta (revisado) | [www.alepa.pa.gov.br](https://www.alepa.pa.gov.br/Home/Page/Proposicoes) | 4/5 | **C** · edições em PDF (2 na página) | [www.ioepa.com.br](http://www.ioepa.com.br/portal/) | 2/2 |
| RO | ALE-RO | **A** · API do SAPL respondendo (57115 matérias) | [sapl.al.ro.leg.br](https://sapl.al.ro.leg.br/api/materia/materialegislativa/?page_size=1) | 8/8 | **C** · edições em PDF (15 na página) | [diof.ro.gov.br](https://diof.ro.gov.br/) | 6/6 |
| RR | ALE-RR | **D** · usa o SAPL, mas a API recusa o acesso (403) e o site não mostra conteúdo sem o navegador; pedir liberação à ALE-RR (revisado) | [sapl.al.rr.leg.br](https://sapl.al.rr.leg.br/) | 1/2 · certificado inválido | **C** · site no ar; edições sem link direto na página inicial (consulta por data) | [www.imprensaoficial.rr.gov.br](https://www.imprensaoficial.rr.gov.br/) | 1/1 |
| TO | Aleto | **A** · API do SAPL respondendo (14533 matérias) | [sapl.al.to.leg.br](https://sapl.al.to.leg.br/api/materia/materialegislativa/?page_size=1) | 5/6 | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [diariooficial.to.gov.br](https://diariooficial.to.gov.br/) | 0/1 |

## Nordeste

| UF | Casa | Nível da casa | Onde | Respostas | Nível do diário | Onde | Respostas |
|---|---|---|---|---|---|---|---|
| AL | ALE-AL | **A** · API do SAPL respondendo (15578 matérias) | [sapl.al.al.leg.br](https://sapl.al.al.leg.br/api/materia/materialegislativa/?page_size=1) | 14/14 | **C** · edições em PDF (2 na página) | [www.imprensaoficial.al.gov.br](https://www.imprensaoficial.al.gov.br/) | 3/3 |
| BA | Alba | **B** · página com lista de proposições em HTML (30 links) | [www.al.ba.gov.br](https://www.al.ba.gov.br/atividade-legislativa-nova/proposicoes) | 7/8 | **C** · site no ar; edições sem link direto na página inicial (consulta por data) | [www.ba.gov.br](https://www.ba.gov.br/egba/) | 3/4 |
| CE | Alece | **D** · site responde de forma intermitente e a página de proposições testada não existe (404); falta localizar a consulta de proposições (revisado) | [www.al.ce.gov.br](https://www.al.ce.gov.br/) | 6/8 | **C** · edições em PDF (2 na página) | [www.ce.gov.br](https://www.ce.gov.br/diario-oficial/) | 2/3 · certificado inválido |
| MA | Alema | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [www.al.ma.leg.br](https://www.al.ma.leg.br/) | 0/2 | **D** · nenhum endereço respondeu com conteúdo | [www.diariooficial.ma.gov.br](https://www.diariooficial.ma.gov.br/) | 0/1 |
| PB | ALPB | **A** · API do SAPL respondendo (151350 matérias) | [sapl3.al.pb.leg.br](https://sapl3.al.pb.leg.br/api/materia/materialegislativa/?page_size=1) | 9/9 | **C** · edições em PDF (4 na página) | [auniao.pb.gov.br](https://auniao.pb.gov.br/doe) | 5/5 |
| PE | Alepe | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [www.alepe.pe.gov.br](https://www.alepe.pe.gov.br/) | 0/3 | **C** · consulta montada no navegador | [diariooficial.cepe.com.br](https://diariooficial.cepe.com.br/diariooficialweb/) | 1/1 |
| PI | Alepi | **A** · API do SAPL respondendo (21421 matérias) | [sapl.al.pi.leg.br](https://sapl.al.pi.leg.br/api/materia/materialegislativa/?page_size=1) | 8/8 | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [www.diariooficial.pi.gov.br](https://www.diariooficial.pi.gov.br/) | 0/1 |
| RN | ALRN | **C** · lista de proposições não encontrada em HTML; o site publica documentos em PDF (6 na página) | [www.al.rn.leg.br](https://www.al.rn.leg.br/) | 4/5 · certificado inválido | **C** · site no ar; edições sem link direto na página inicial (consulta por data) | [www.diariooficial.rn.gov.br](https://www.diariooficial.rn.gov.br/) | 1/2 |
| SE | Alese | **D** · site no ar, mas sem lista de proposições encontrada; cadastro manual até achar a fonte | [al.se.leg.br](https://al.se.leg.br/) | 2/3 | **D** · nenhum endereço respondeu com conteúdo | [www.segrase.se.gov.br](https://www.segrase.se.gov.br/) | 0/2 |

## Centro-Oeste

| UF | Casa | Nível da casa | Onde | Respostas | Nível do diário | Onde | Respostas |
|---|---|---|---|---|---|---|---|
| DF | CLDF | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [www.cl.df.gov.br](https://www.cl.df.gov.br/) | 0/3 | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [www.dodf.df.gov.br](https://www.dodf.df.gov.br/) | 0/2 |
| GO | Alego | **C** · lista de proposições não encontrada em HTML; o site publica documentos em PDF (6 na página) | [portal.al.go.leg.br](https://portal.al.go.leg.br/) | 4/5 | **C** · site no ar; edições sem link direto na página inicial (consulta por data) | [diariooficial.abc.go.gov.br](https://diariooficial.abc.go.gov.br/) | 7/7 |
| MS | ALEMS | **C** · lista de proposições não encontrada em HTML; o site publica documentos em PDF (4 na página) | [al.ms.gov.br](https://al.ms.gov.br/) | 6/7 | **C** · edições em PDF (10 na página) | [www.diariooficial.ms.gov.br](https://www.diariooficial.ms.gov.br/) | 1/1 |
| MT | ALMT | **B** · SAPL instalado mas sem uso (1 matéria); API própria (api.al.mt.gov.br) exige chave (resposta 401): pedir acesso; até lá, lista de proposições em HTML (revisado) | [www.al.mt.gov.br](https://www.al.mt.gov.br/proposicao/) | 11/14 | **C** · consulta montada no navegador | [www.iomat.mt.gov.br](https://www.iomat.mt.gov.br/legislacao/diario_justica) | 7/7 |

## Sudeste

| UF | Casa | Nível da casa | Onde | Respostas | Nível do diário | Onde | Respostas |
|---|---|---|---|---|---|---|---|
| ES | Ales | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [www.al.es.gov.br](https://www.al.es.gov.br/) | 0/3 | **C** · edições em PDF (13 na página) | [dio.es.gov.br](https://dio.es.gov.br/) | 4/4 |
| MG | ALMG | **A** · portal de dados abertos com API documentada (dadosabertos.almg.gov.br); as consultas testadas responderam erro 500: acertar os parâmetros pela documentação antes do conector (revisado) | [dadosabertos.almg.gov.br](https://dadosabertos.almg.gov.br/documentacao/index) | 15/20 | **C** · consulta montada no navegador | [www.jornalminasgerais.mg.gov.br](https://www.jornalminasgerais.mg.gov.br/) | 1/1 |
| RJ | Alerj | **B** · consulta de proposições no sistema Lotus Notes da Alerj (páginas HTML, sem API); falta testar a listagem (revisado) | [alerjln1.alerj.rj.gov.br](http://alerjln1.alerj.rj.gov.br/scpro2327.nsf/Internet/LeiInt?OpenForm) | 5/8 | **C** · site no ar; edições sem link direto na página inicial (consulta por data) | [www.ioerj.com.br](https://www.ioerj.com.br/portal/) | 1/1 |
| SP | Alesp | **A** · dados estruturados (arquivo para baixar) | [www.al.sp.gov.br](https://www.al.sp.gov.br/repositorioDados/processo_legislativo/proposituras.zip) | 22/23 | **C** · edições em PDF (1 na página) | [www.imprensaoficial.com.br](https://www.imprensaoficial.com.br/) | 3/3 |

## Sul

| UF | Casa | Nível da casa | Onde | Respostas | Nível do diário | Onde | Respostas |
|---|---|---|---|---|---|---|---|
| PR | Alep | **C** · a consulta de proposições é protegida por captcha; o portal de dados abertos não traz proposições; resta a leitura dos documentos em PDF (revisado) | [consultas.assembleia.pr.leg.br](https://consultas.assembleia.pr.leg.br/) | 3/4 | **C** · site no ar; edições sem link direto na página inicial (consulta por data) | [www.dioe.pr.gov.br](https://www.dioe.pr.gov.br/) | 1/2 · certificado inválido |
| RS | ALRS | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [ww4.al.rs.gov.br](https://ww4.al.rs.gov.br/) | 0/3 | **D** · não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil | [www.diariooficial.rs.gov.br](https://www.diariooficial.rs.gov.br/) | 0/1 |
| SC | Alesc | **B** · página com lista de proposições em HTML (42 links) | [portalelegis.alesc.sc.gov.br](https://portalelegis.alesc.sc.gov.br/proposicoes/processo-legislativo) | 11/12 | **C** · site no ar; edições sem link direto na página inicial (consulta por data) | [doe.sea.sc.gov.br](https://doe.sea.sc.gov.br/) | 2/2 · certificado inválido |

"Respostas" mostra quantos endereços sondados responderam sem erro.

Níveis: A = dados estruturados (API, SAPL, JSON/XML); B = páginas HTML com a lista; C = só PDF ou página montada no navegador; D = cadastro manual.
