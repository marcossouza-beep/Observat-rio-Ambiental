# SEO — palavras-chave e indexação

> Objetivo: quem pesquisa uma lei ambiental no Google ("PL 1234/2026", "o que muda no licenciamento", "lei ambiental Pará") deve encontrar o parecer do observatório entre os primeiros resultados.
> O protótipo usa endereços com `#` só para demonstração; o site real usa endereços de verdade, gerados no servidor.

## 1. Princípios

1. **Uma página, uma intenção de busca.** A página da lei responde "o que é e em que pé está"; o parecer responde "o que muda e se é bom ou ruim"; a página do parlamentar responde "o que essa pessoa propõe e como vota".
2. **Conteúdo próprio primeiro.** O texto oficial da lei existe em outros sites; o que nos diferencia é o parecer. Páginas de leis ainda sem parecer são indexadas com conteúdo próprio organizado (situação, autoria, votações, links) e o aviso de que o parecer sai em breve.
3. **Autoria visível (E-E-A-T).** Tema jurídico pede autor identificado, com título, foto e presença profissional. Cada parecer tem assinatura discreta no topo (foto, título, redes) e o nome leva à página do autor, que concentra biografia e credenciais.
4. **Resposta logo no início.** O resumo em linguagem simples e o veredito ficam no topo; é o trecho que o Google tende a mostrar.

## 2. Endereços (URLs)

| Página | Endereço |
|---|---|
| Lei / proposição | `/leis/pl-1234-2026-licenciamento-simplificado` |
| Parecer | `/pareceres/pl-1234-2026-licenciamento-simplificado` |
| Estado | `/estados/para` · deputados: `/estados/para/deputados` |
| Parlamentar | `/parlamentares/dep-exemplo-f` |
| Artigo | `/artigos/licenciamento-2026-flexibilizacao-estados` |
| Autor | `/autores/nome-do-autor` |
| Institucionais | `/metodologia`, `/panorama`, `/timeline` |

- Endereço em minúsculas, sem acento, com número e assunto.
- O endereço não muda quando o título muda; se mudar, redirecionamento 301.
- Filtros e ordenações (`?status=`, `?uf=`) não são indexados (canonical para a página sem filtro).

## 3. Palavras-chave de cada parecer

Campos preenchidos pelo autor no editor (seção "SEO"):

| Campo | Exemplo | Uso |
|---|---|---|
| Palavra-chave principal | `PL 1234/2026 licenciamento` | Título, H1, primeiro parágrafo, endereço |
| Nome popular | `PL do licenciamento simplificado` | Muita gente busca pelo apelido dado pela imprensa |
| Secundárias | `licenciamento ambiental fazendas`, `estudo de impacto ambiental`, `Cerrado` | Intertítulos e corpo |
| Título SEO (≤ 60 caracteres) | `PL 1.234/2026: o que muda no licenciamento ambiental` | `<title>` |
| Descrição (≤ 155 caracteres) | `Parecer técnico: o projeto dispensa estudo de impacto para fazendas de médio porte. Alto impacto, maléfico. Vota em 14/10.` | Meta description |
| Endereço (slug) | `pl-1234-2026-licenciamento-simplificado` | URL |

**Padrões automáticos** (o autor pode ajustar):
- Título do parecer: `{Número}: o que muda {assunto} | Parecer | Nome do Site`
- Título da lei: `{Número} — {título curto}: texto, tramitação e votação | Nome do Site`
- Parlamentar: `{Nome} ({PARTIDO}-{UF}): leis ambientais, votos e autorias | Nome do Site`
- Descrição: primeira frase do resumo + impacto e caráter + próximo passo.

**Onde buscar as palavras certas:** Search Console (termos que já trazem visitas), autocompletar e "as pessoas também perguntam" do Google, Google Trends, termos usados na busca interna do site e o apelido usado pela imprensa.

**Checklist automático no editor** (aviso, não bloqueio):
- palavra-chave no título, no H1, no endereço e no primeiro parágrafo;
- pelo menos 3 links internos (lei, parlamentar, tema ou bioma);
- descrição dentro do limite;
- autor, data de publicação e data de atualização preenchidos;
- imagens com texto alternativo;
- dados estruturados válidos.

O editor mostra uma **prévia do resultado no Google** (título, endereço, descrição) enquanto o autor escreve.

## 4. O que é indexado

| Tipo de página | Indexar? | Regra |
|---|---|---|
| Parecer | Sim | Sempre |
| Lei com parecer | Sim | Página distinta: texto, tramitação, atores |
| Lei sem parecer | **Sim** | Com aviso "Parecer em preparação" e o bloco "O que já se sabe" (frase montada a partir dos dados da tramitação: casa, autoria, etapa, votações, emendas), além de autores, tramitação e links internos. Captura a busca desde que o projeto aparece; o parecer entra na mesma página e no mesmo endereço |
| Parlamentar federal | Sim | Se tiver ao menos uma autoria, relatoria ou voto em proposta monitorada |
| Parlamentar estadual | Sim | Só com autoria ou relatoria monitorada; os demais não têm página |
| Estado | Sim | Página de Leis estaduais do estado (painel com padrão de atuação e leis) |
| Temas e biomas | Sem página própria | O resumo fica no Panorama (abas Biomas e Áreas); termos de tema e bioma entram como palavras-chave secundárias dos pareceres |
| Artigo, Panorama, Metodologia, Autor | Sim | Sempre |
| Busca interna, filtros, inscrição, conta | Não | `noindex` |
| PDFs (Nota Técnica, Quadro) | Não | Exigem inscrição; a página do parecer, aberta, é que ranqueia |

Como o parecer é aberto a todos, **não há conteúdo escondido na página** e não é preciso marcação de paywall.

## 5. Dados estruturados (schema.org, JSON-LD)

| Página | Tipos |
|---|---|
| Parecer e artigo | `Article` + `author` (`Person`) + `about` (`Legislation`) + `BreadcrumbList` |
| Lei | `Legislation` (identificador, jurisdição, data, situação) + `BreadcrumbList` |
| Autor | `ProfilePage` + `Person` (`jobTitle`, `image`, `sameAs` com as redes) |
| Parlamentar | `ProfilePage` + `Person` (`memberOf` a casa legislativa) |
| Site | `Organization` + `WebSite` com `SearchAction` (caixa de busca) |

Exemplo do parecer:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "PL 1.234/2026: o que muda no licenciamento ambiental",
  "datePublished": "2026-10-09",
  "dateModified": "2026-10-12",
  "author": {
    "@type": "Person",
    "name": "Nome do Autor",
    "jobTitle": "Mestre em Direito Ambiental",
    "url": "https://nomedosite.com.br/autores/nome-do-autor",
    "image": "https://nomedosite.com.br/img/autor.jpg",
    "sameAs": ["https://www.linkedin.com/in/...", "https://lattes.cnpq.br/...", "https://www.instagram.com/..."]
  },
  "about": {
    "@type": "Legislation",
    "name": "Projeto de Lei nº 1.234/2026",
    "legislationIdentifier": "PL 1234/2026",
    "legislationJurisdiction": "BR"
  },
  "publisher": { "@type": "Organization", "name": "Nome do Site", "logo": "https://nomedosite.com.br/logo.png" },
  "image": "https://nomedosite.com.br/og/pl-1234-2026.png"
}
```

## 6. Parte técnica

- **Páginas geradas no servidor** (Next.js), com HTML completo na primeira resposta.
- **Sitemaps separados** (`/sitemap-pareceres.xml`, `-leis`, `-parlamentares`, `-artigos`) com `lastmod` atualizado a cada nova versão do parecer.
- **Avisar buscadores** a cada publicação ou atualização (sitemap e IndexNow para Bing).
- **Canonical** em todas as páginas; uma única versão de cada endereço (https, sem barra final).
- **Imagem de compartilhamento automática** (1200 × 630) por parecer, no mesmo padrão do card do Instagram.
- **Velocidade (Core Web Vitals):** LCP < 2,5 s, INP < 200 ms, CLS < 0,1; imagens em WebP; fontes com subconjunto.
- **Links internos automáticos:** parecer ↔ lei ↔ parlamentares ↔ estado ↔ Panorama ("Assuntos" e "Quem está por trás").
- **Trilha de navegação** visível em todas as páginas internas, com marcação `BreadcrumbList`.
- **Busca interna:** busca textual em português sem acento e com sinônimos (ex.: `APP` = área de preservação permanente; `tilápia` → espécies exóticas). Os termos buscados alimentam a lista de palavras-chave.

## 7. Acompanhamento

- Google Search Console e Bing Webmaster Tools desde o lançamento.
- Painel mensal: páginas indexadas × enviadas, impressões, cliques, CTR e posição por tipo de página; consultas que mais trazem visitas; páginas com erro.
- Revisão trimestral dos títulos e descrições dos pareceres com CTR baixo.

## 8. Leis indexadas antes do parecer

- **Título:** `{Número}: o que é, situação e votação — parecer em breve | Nome do Site`; quando o parecer sai, o título muda para o padrão do parecer (mesmo endereço).
- **Descrição:** a frase "O que já se sabe" resumida + "Parecer técnico em preparação".
- **Na página:** aviso "Parecer em preparação", bloco "O que já se sabe" e botão "Avise-me quando o parecer sair" (transforma a visita orgânica em inscrito).
- **Ao publicar o parecer:** `dateModified` e `lastmod` atualizados, sitemap reenviado e aviso aos buscadores; inscritos que pediram aviso recebem e-mail.
- **Cuidado editorial:** o aviso promete o parecer "nos próximos dias". Ele aparece para as propostas ativadas na triagem (fila de pareceres). Propostas só acompanhadas, sem parecer previsto, mostram "Acompanhando: siga para saber quando houver novidade", para não prometer o que não virá.
- **Acompanhar no Search Console:** páginas com impressões altas e ainda sem parecer indicam onde há demanda; servem para priorizar a fila.
