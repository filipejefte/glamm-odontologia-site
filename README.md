# Glamm Odontologia

Site institucional da **Glamm Odontologia**, clínica odontológica com unidades
em **Marília** e **Garça**, interior de São Paulo.

No ar em <https://filipejefte.github.io/glamm-odontologia-site/>, **em modo de
apresentação**: `noindex` em todas as 20 páginas e um aviso no `llms.txt`.
Enquanto a clínica tiver outro site publicado, dois endereços disputando o mesmo
nome prejudicam os dois.

O `robots.txt` **libera** o rastreamento de propósito. Com `Disallow: /` o robô
não chega a ler o `noindex`, e um endereço linkado de fora pode acabar indexado
só pela URL — exatamente o que se quer evitar. Quem barra é a página.

---

## Sumário

- [O que este site resolve](#o-que-este-site-resolve)
- [Como ele é feito](#como-ele-é-feito)
- [Comandos](#comandos)
- [O modelo tridimensional](#o-modelo-tridimensional)
- [Desenho](#desenho)
- [Busca, e assistente de IA](#busca-e-assistente-de-ia)
- [As normas que moldaram a copy](#as-normas-que-moldaram-a-copy)
- [Pendências que travam a produção](#pendências-que-travam-a-produção)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Ir para produção](#ir-para-produção)
- [Origem do material e licenças](#origem-do-material-e-licenças)
- [Mapa dos arquivos](#mapa-dos-arquivos)

---

## O que este site resolve

Cada linha abaixo saiu do diagnóstico de presença digital da clínica.

| Achado no site atual | O que este site faz |
|---|---|
| O rodapé publica o telefone de Marília como se fosse também o de Garça | Telefone lido só de `src/dados.mjs`, um por unidade. `tools/check.mjs` derruba a verificação se qualquer arquivo do repositório contiver um número, um `wa.me` ou um `tel:` que não seja um dos dois conferidos, **e** se o telefone de uma unidade aparecer no corpo da página da outra sem estar identificado |
| Três nomes públicos disputando a mesma identidade | "Glamm Odontologia" em todo lugar. O nome anterior aparece como `alternateName` no dado estruturado e uma vez na página de equipe, para ligar as duas identidades sem competir com a marca |
| Página única: nada para o buscador ranquear por tratamento nem por cidade | 20 páginas, cada uma com title, description, canonical, trilha e dado estruturado próprios. Sete tratamentos e duas unidades têm URL, e existem `/urgencia/` e `/primeira-consulta/`, que respondem pergunta inteira |
| Zero H1, sem meta description, sem Open Graph, sem JSON-LD | Tudo presente, e o verificador derruba a build se faltar |
| Achabilidade de Garça: 3 de 12 | Página própria, endereço por extenso, telefone próprio, WhatsApp próprio, horário completo e `Dentist` em JSON-LD, com o mesmo peso de Marília |
| O site não linka para o Instagram | Instagram no rodapé e em `sameAs` |
| Bio cita `@dragabrielatukasanreis`, perfil que não existe | Só `@glammodontologia` é linkado |
| 138 KB de pixel do Meta, 47% da página | Nenhum rastreador. A política de segurança de conteúdo proíbe |
| Copy duplicada ao vivo na etapa 02 | A etapa foi reescrita |

---

## Como ele é feito

**Sem npm, sem dependência, sem framework.** Node puro gera HTML estático.

```
src/dados.mjs      fonte única de verdade: identidade, unidades, tratamentos,
                   equipe, dúvidas. Nada factual é escrito no HTML
src/marca.mjs      o símbolo em SVG, os ícones de interface, a ilustração de
                   reserva do modelo tridimensional
src/chrome.mjs     cabeça, topo, rodapé e o grafo de dado estruturado
src/paginas.mjs    o corpo de cada página
build.mjs          monta tudo e escreve robots.txt, sitemap.xml, llms.txt
                   e site.webmanifest
```

**A trava dos campos `null`.** Campo com valor `null` em `src/dados.mjs` é dado
que ninguém confirmou com a clínica. Na prévia ele vira uma marcação amarela
visível na página; na build de produção ele **derruba o processo**. É de
propósito: um site que não publica é melhor que um site que publica o telefone
errado de uma unidade, que foi exatamente o que o diagnóstico encontrou.

O HTML gerado **vai versionado**, porque o GitHub Pages serve o branch. O fluxo
do GitHub Actions regenera e exige que nada mude, o que impede o HTML publicado
de se descolar da fonte.

---

## Comandos

Sempre nesta ordem quando a copy mudar:

```bash
node build.mjs --preview                      # gera as páginas com as pendências marcadas
node tools/fontes.mjs                         # recorta as fontes ao texto do HTML já gerado
node tools/check.mjs --exigir-identificadores # verifica antes de publicar
```

**`--exigir-identificadores` não é opcional antes de publicar.** Os padrões
pessoais desta máquina ficam em `interno/identificadores.txt`, que não vai para
o repositório — e, portanto, **não existe no GitHub Actions**. Lá a varredura
roda só com os padrões genéricos e diz isso alto na saída. A verificação que
autoriza a publicação é a local, com a bandeira, que **falha** se o arquivo não
estiver no lugar.

O recorte de fonte **lê o HTML gerado**. Rodar antes da build recorta para o
texto antigo, e a fonte perde glifo em silêncio.

Ao mexer em ícone, na marca ou no retrato:

```bash
python tools/imagens.py      # depende de Pillow e numpy
```

Para gerar a versão de produção, sem marcações de pendência:

```bash
node build.mjs               # recusa rodar enquanto houver campo null
```

### O que `tools/check.mjs` verifica

Sai com código 1 e é o que o GitHub Actions roda.

1. **Vazamento.** Nenhum caminho da máquina de trabalho, nome de usuário,
   e-mail pessoal ou pasta local em arquivo publicável. Os padrões pessoais
   ficam em `interno/identificadores.txt`, que não vai para o repositório; no
   script público só há padrões genéricos.
2. **Telefone.** Qualquer número, `wa.me` ou `tel:` precisa ser um dos dois
   conferidos, e o telefone de uma unidade não pode aparecer na página da outra
   sem estar identificado. No dado estruturado, cada nó `Dentist` é conferido
   contra o endereço e o telefone da unidade a que pertence.
3. **O que o navegador não reclama.** Texto solto dentro de `<svg>` (que ele não
   desenha e não registra), caminho SVG com número colado em número, link
   interno quebrado, âncora sem destino, `<img>` sem `alt` ou sem `width`/`height`.
4. **Cabeça.** Um `h1` por página, sem salto de nível de título, title,
   description, canonical única, Open Graph, `noindex` coerente com o modo de
   publicação, JSON-LD que parseia e traz `Organization` e `Dentist`.
5. **Terceiros.** Nenhum `<script>`, `<link>`, `url()` de CSS ou domínio fora da
   lista prevista. Nenhum rastreador.
6. **Contraste.** Os pares de cor são **calculados** a partir dos valores
   declarados na folha de estilo, contra o mínimo da WCAG. Não são estimados.
7. **Dado estruturado.** Toda referência `@id` resolve dentro do mesmo grafo,
   o telefone de cada nó `Dentist` é o E.164 da unidade a que ele pertence, e o
   endereço bate com o cadastro.
8. **Imagem.** O `width`/`height` declarado no HTML é comparado com as medidas
   lidas do próprio arquivo (cabeçalho `IHDR` do PNG, blocos `VP8X`/`VP8`/`VP8L`
   do WebP). Sem isso, `src/dados.mjs` e `tools/imagens.py` podem se descolar em
   silêncio.
9. **Metadado de imagem.** Nenhum bloco `tEXt`, `iTXt`, `eXIf`, `iCCP`, `XMP` nas
   imagens publicadas: eles carregam data, câmera, GPS e caminho do arquivo
   original. Os binários também são varridos por sequência legível.
10. **Ele mesmo.** Um verificador que procura padrões pessoais contém os padrões
   que procura, e por isso se acusaria. O bloco de padrões é recortado do
   próprio arquivo antes da varredura, e a exceção tem três travas: o bloco não
   pode passar de 1800 bytes (senão o recorte é desligado e o arquivo inteiro é
   varrido), o que sobra dele fora de literais tem que estar limpo, e um
   autoteste planta um vazamento logo **depois** da marca de fim e confere que a
   varredura o encontra.

---

## O modelo tridimensional

O molar que gira na capa **não é um arquivo de modelo**. Não há biblioteca, não
há `.glb`, não há textura, não há requisição. A geometria nasce em
`assets/js/dente3d.js`, de um campo de distância com sinal, e é poligonizada por
*surface nets* no próprio navegador, em WebGL 1 puro. São 14 KB de código, e
nenhum byte de malha.

Três motivos, somados:

1. a política de segurança do site é `default-src 'none'` e não abre para
   terceiro; um modelo de banco de imagens exigiria licença e, na prática, uma
   requisição a outro domínio;
2. o arquivo inteiro pesa menos que qualquer malha exportada;
3. **como a forma é uma fórmula, a região que cada tratamento toca é calculada,
   e não pintada à mão num mapa de textura.** É isso que permite o próximo item.

**Ele é um índice, não um enfeite.** Na capa, cada ficha de tratamento ao lado
do modelo é um link comum com um atributo `data-regiao`. Passar o cursor ou o
foco acende a parte correspondente do dente: face, esmalte, colo, raiz, polpa ou
gengiva. Em endodontia o esmalte fica translúcido e a câmara pulpar aparece por
dentro. Na página de cada tratamento o mesmo modelo entra já com a região
daquele tratamento acesa.

**A conta é fatiada.** São cerca de 460 mil avaliações do campo de distância, e
num bloco único isso trava a entrada por centenas de milissegundos num celular
modesto — justamente enquanto a pessoa tenta tocar em "Agendar". Cada malha é
uma tarefa separada, o contexto WebGL é criado antes de qualquer conta (sem ele
não há por que gastá-la), o laço de animação para quando o modelo sai da tela ou
a aba fica escondida, e a perda de contexto devolve a ilustração de reserva em
vez de deixar um retângulo quebrado.

Sem JavaScript, as fichas continuam sendo links para as páginas dos tratamentos
— que é o que o buscador lê — e uma ilustração em SVG fica no lugar do modelo,
com a mesma região destacada por CSS.

As medidas estão em milímetros no código, de um primeiro molar inferior: coroa
de 10,4 mm no sentido mésio-distal por 9,4 mm no vestíbulo-lingual, 7,5 mm de
altura de coroa e duas raízes de cerca de 11 mm. A gengiva é translúcida de
propósito: é o que deixa a raiz visível dentro do alvéolo sem recorrer ao truque
de banco de imagens, que é colar o dente na frente do bloco e só funcionar de
frente.

A orientação das faces não depende de eu ter acertado o sentido na mão: o volume
assinado da malha é calculado depois da poligonização e, se der negativo, a ordem
dos índices é invertida.

**Acessibilidade.** Três botões abaixo do modelo giram para os dois lados e
pausam a rotação automática. Eles não são enfeite: girar por arrasto é gesto de
trajetória, e a WCAG 2.2 exige uma alternativa de toque simples (2.5.7);
movimento que começa sozinho e dura mais de cinco segundos precisa de um jeito
de parar (2.2.2); e um `<canvas role="img">` que recebe foco não anuncia que é
operável, então a operação por teclado ficaria inalcançável justamente para quem
depende dela (4.1.2) — por isso o canvas **não** é focável, e quem opera são os
botões. No celular, `touch-action: pan-y pinch-zoom` deixa passar a rolagem
vertical e a pinça. Com `prefers-reduced-motion`, a rotação automática não
acontece, e a preferência é observada ao vivo.

---

## Desenho

**Porcelana e ouro.** O branco quente, o filete de ouro e o manuscrito vêm da
identidade que a clínica já tem. O que é novo é o ar entre as coisas, a serifada
de alto contraste em itálico como acento, e a faixa escura que faz o ouro
brilhar.

**As cores foram medidas, não escolhidas.**

| Cor | Valor | Como foi obtida |
|---|---|---|
| Ardósia | `#4C526A` | 24.981 pixels exatamente nesse valor no ícone de 512 px da clínica: é preenchimento vetorial chapado, não estimativa |
| Ouro, extremo escuro | `#A38434` | parada literal do gradiente declarado nos SVG do site atual |
| Ouro, extremo claro | `#D2AF57` | a outra parada do mesmo gradiente |

**O ouro é forma, não é tinta de texto pequeno.** `#A38434` dá 3,35:1 sobre a
porcelana: passa para texto grande e não passa para texto pequeno. Então título
e itálico grande usam `#A38434`; rótulo e legenda usam `#7A5F1F` (4,9:1); e o
botão de ouro é forma preenchida com tinta quase preta por cima (5,1:1 no
extremo escuro do gradiente, 8,6:1 no claro). Todos os pares são recalculados
pelo verificador a cada rodada.

**O símbolo é vetor da arte oficial, não desenho a olho.** Contornos por
*marching squares* no nível 0,5 do campo de alfa do ícone de 512 px,
simplificados por Douglas-Peucker a 0,45 px, conferidos por rasterização própria
contra a original: **zero pixel divergindo acima de 0,5 de alfa**, interseção
sobre união de 96,8%. A mesma geometria alimenta o SVG das páginas e o
rasterizador de `tools/imagens.py`, então ícone e página não podem divergir.

**As duas variantes do logotipo não são recorte a mão.** Cada pixel é
classificado pela saturação em HSV: o manuscrito é cromático, a palavra
ODONTOLOGIA é acromática. Na variante de fundo claro só a palavra muda de cor, e
o alfa nunca é tocado — o manuscrito em ouro sai idêntico ao original, pixel a
pixel.

**Tipografia.** Duas famílias variáveis, servidas deste domínio e recortadas ao
texto que o site escreve: **Hanken Grotesk** para texto e interface (24 KB) e
**Cormorant Garamond** para título (22 KB), mais o itálico (10 KB). O itálico é
recortado num conjunto separado, tirado só do que está dentro de `<em>` no HTML
gerado: 45 caracteres em vez de 144.

**Movimento.** Nada aparece ao rolar. Conteúdo escondido atrás de observador de
interseção fica invisível quando o script falha. Aqui o movimento só existe em
resposta a gesto: passar o cursor, focar, arrastar o modelo.

---

## Busca, e assistente de IA

- **18 URLs**, uma por tratamento, uma por unidade, mais os hubs, a clínica, a
  equipe, as dúvidas, o contato e a privacidade. É o que devolve à clínica a
  busca de cauda longa ("lente de contato dental em Marília").
- **Toda página abre respondendo**, em uma ou duas frases que se sustentam fora
  do contexto. É o trecho que o assistente cita e o que a pessoa lê antes de
  decidir rolar.
- **Um grafo de dado estruturado**, repetido em toda página com `@id` estável:
  `Organization` + `MedicalOrganization` para a marca, um `Dentist` por unidade
  com endereço, horário e serviços, `WebSite`, `BreadcrumbList` por página,
  `FAQPage` onde há perguntas, `MedicalWebPage` + `MedicalProcedure` em cada
  tratamento e `Person` na equipe. É assim que buscador e assistente entendem
  que as duas unidades, o site e a marca são a mesma entidade.
- **`llms.txt`** na raiz, com identificação, as duas unidades por extenso, os
  sete tratamentos, as perguntas frequentes e — enquanto for prévia — um aviso
  para sistemas automatizados não usarem este endereço como fonte.
- **Sem coordenada geográfica no dado estruturado**, de propósito: as duas
  fichas do Google carregam endereço divergente e não há levantamento próprio.
  `geo` sem conferência é pior que `geo` ausente, porque passa a mandar gente
  para o lugar errado com a autoridade do dado estruturado.
- **Mapas por busca de endereço, nunca por ponto salvo**, pelo mesmo motivo.

---

## As normas que moldaram a copy

Odontologia é profissão regulamentada, e a publicidade odontológica segue o
Código de Ética Odontológica (Resolução CFO-118/2012) e a Resolução CFO-196/2019.
**O site atual da clínica contraria quatro pontos, e este faz o contrário em
todos.** Vale antecipar essa conversa com a cliente: as ausências abaixo são
deliberadas, e a página `/a-clinica/` as explica ao paciente.

- **Art. 44, I** veda anunciar preço, gratuidade e **modalidade de pagamento**.
  A FAQ do site atual responde "sim, trabalhamos com parcelamento". Saiu inteira.
- **Resolução CFO-196/2019**: pessoa jurídica **não divulga imagem de
  diagnóstico nem de resultado**. Só o cirurgião-dentista que executou, com
  consentimento. O site atual publica quatro casos de "antes e depois". Não
  entram.
- **Art. 44, VI**: depoimento com nome de paciente e reprodução de nota de
  avaliação. Saíram, e no lugar entraram compromissos verificáveis na própria
  consulta.
- **Art. 43 §2º**: a pessoa jurídica só anuncia especialidade se tiver
  profissional inscrito naquela especialidade **e publicar a relação** desses
  profissionais com as qualificações. Por isso "equipe de especialistas" saiu, e
  a página `/equipe/` existe para destravar a afirmação assim que a lista
  existir. **É o item de maior retorno da lista de pendências.**
- **Art. 43**: é obrigatório constar nome e inscrição da **pessoa jurídica** e
  nome e inscrição do **responsável técnico**. São dois números diferentes, e
  estão no rodapé de toda página assim que forem confirmados.
- **Art. 44, II e III**: especialidade sem registro e equipamento como
  diferencial não comprovado. "1.000+ pacientes atendidos" e "câmera intraoral
  de última geração" saíram; a página da câmera explica o que ela faz e o que
  ela não substitui.

---

## Pendências que travam a produção

Enquanto qualquer campo `null` existir em `src/dados.mjs`, `node build.mjs`
(produção) recusa rodar. Os dois primeiros são os de maior efeito.

| # | O que falta | Por que trava | Leitura provável |
|---|---|---|---|
| 1 | **Inscrição da clínica no CRO** | Art. 43: identificação obrigatória em toda comunicação | Há candidato, em `interno/NOTAS-INTERNAS.md`. Não entra aqui: este repositório é público e o Pages serve o README |
| 2 | **Inscrição da responsável técnica no CRO** | Idem, e é um número diferente do da clínica | Idem. Conferir na consulta pública do CFO antes de publicar qualquer um dos dois |
| 3 | **Relação dos demais profissionais**: nome completo, CRO, especialidade registrada e autorização de uso de nome e imagem | Art. 43 §2º: sem a lista, a clínica não pode anunciar especialidade | — |
| 4 | **Especialidade registrada da fundadora** | Art. 44, II: só entra com registro no Conselho | — |
| 5 | **Horário de sexta em Marília** | Site diz 8h, Google diz 8h30. Publicamos 8h30, que é o que não manda ninguém para uma porta fechada | — |
| 6 | **Bairro e CEP de Garça** | Receita e site dizem Williams / 17402-000; Google diz Centro / 17400-000. Publicamos a versão em que duas fontes concordam. **O que precisa mudar é a ficha do Google** | — |
| 7 | **Grafia da rua em Marília** | Receita grafa "Marrey Junior"; site e Google grafam "Marrei Júnior". Publicamos a grafia pública, que é a que o mapa resolve. Corrigir no cadastro federal | — |
| 8 | **E-mail de atendimento** | Não foi localizado em fonte pública | — |
| 9 | **Autorização de uso da fotografia da fundadora** | O retrato veio da biblioteca do site atual. Confirmar que a clínica tem o direito de uso e quer usá-lo aqui | — |
| 10 | **Licença dos sete ícones de tratamento** | Também vieram do site atual, que é assinado pela Metrix Digital. Recoloridos para o ouro da marca, mas o desenho é o mesmo. Confirmar a licença, ou substituir | — |
| 11 | **Logotipo em vetor** | Não existe versão vetorial pública: a maior resolução disponível é 800 × 262. Pedir o original à clínica ou à agência | — |
| 12 | **Domínio** | `glammodontologia.com.br` já é da clínica, registrado em 27/02/2026 e pago até 27/02/2027, sem resolver. Basta apontar | — |
| 13 | **A imagem de compartilhamento não carrega inscrição no CRO** | `assets/img/og.png` é a peça que aparece quando o link é colado no WhatsApp, que é o canal principal da clínica. Ela viaja destacada do rodapé, e o art. 43 alcança essa peça. Assim que os números do item 1 e 2 existirem, acrescentar a inscrição em `tools/imagens.py` e regerar | — |
| 14 | **"Atendimento particular"** | O site repete a frase, apoiado no art. 43 §1º (informar convênios e credenciamentos é informação de serviço). Uma leitura estrita do art. 44, I (modalidade de pagamento) é possível. Vale uma pergunta objetiva ao CRO-SP antes de publicar | — |

---

## Segurança e privacidade

- **Nenhum terceiro.** Sem CDN, sem fonte de serviço externo, sem mapa
  embutido, sem pixel, sem analítica. Fontes, imagens e scripts saem deste
  domínio.
- **Nenhum cookie, nenhum formulário, nenhum armazenamento local.**
- **Política de segurança de conteúdo** em toda página, `default-src 'none'`,
  sem `unsafe-inline`. Não há um `<style>` nem um `<script>` em linha no site;
  o único `<script>` sem `src` é o de tipo `application/ld+json`, que o
  navegador não executa.
- **`referrer: no-referrer`**, e todo link externo com `rel="noopener noreferrer"`.
- **Repositório**: issues, wiki, projects e discussions desligados; o fluxo do
  Actions roda com `permissions: contents: read`, sem persistir credencial no
  disco, com teto de tempo e cancelamento de execução repetida; `interno/` e
  `.claude/` no `.gitignore`; a identidade do git usa o endereço `noreply` do
  GitHub.
- **O repositório é público e o GitHub Pages serve TODOS os arquivos dele**,
  inclusive `src/`, `tools/` e este README. Comentário de código é conteúdo
  publicado: nada confidencial, e nenhum dado de terceiro que o site tenha
  decidido não publicar, pode ficar num comentário. Os números de inscrição no
  CRO, por exemplo, ficam só em `interno/NOTAS-INTERNAS.md`, e `tools/check.mjs`
  recusa a verificação se algo com cara de inscrição aparecer em arquivo
  publicável.

### O que falta quando sair do GitHub Pages

Três diretivas de CSP **não funcionam** quando a política vem por `<meta>`: o
navegador as ignora e ainda registra erro no console. Por isso elas não estão
lá. Em hospedagem própria, configure como **cabeçalho HTTP**:

```
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

O verificador **recusa** a presença dessas diretivas na meta, justamente para
ninguém achar que estão valendo.

---

## Ir para produção

1. Confirmar as pendências e preencher os campos `null` em `src/dados.mjs`.
2. Em `src/dados.mjs`, no bloco `PUBLICACAO`, trocar
   `modo: 'proposta'` por `modo: 'producao'` e
   `robots: 'noindex, nofollow'` por `robots: 'index, follow, max-image-preview:large'`.
3. Trocar `CLINICA.origem` para `https://glammodontologia.com.br` e apontar o
   domínio (CNAME no Registro.br + arquivo `CNAME` no repositório).
4. `node build.mjs` — sem `--preview`. Ele recusa rodar se sobrar campo `null`.
5. `node tools/fontes.mjs` e `node tools/check.mjs`.
6. Publicar, e então **redirecionar `dragabrielatukasan.com.br`** para o domínio
   novo. Enquanto os dois estiverem no ar disputando o mesmo nome, os dois
   perdem.

---

## Origem do material e licenças

| Item | Origem |
|---|---|
| Logotipo manuscrito e símbolo | Biblioteca de mídia do site atual da clínica, em 800 × 262 e 512 × 512 |
| Retrato da fundadora | Biblioteca de mídia do site atual, recorte sem fundo, 1852 × 2560 |
| Sete ícones de tratamento | Biblioteca de mídia do site atual, recoloridos para o ouro da marca a partir do canal de alfa |
| Hanken Grotesk | SIL Open Font License 1.1 — `assets/fonts/OFL-hanken.txt` |
| Cormorant Garamond | SIL Open Font License 1.1 — `assets/fonts/OFL-cormorant.txt` |
| Modelo tridimensional, ícones de interface, ilustração de reserva | Feitos aqui, sem terceiros |

Os arquivos `.ttf` completos das duas famílias vão versionados de propósito: sem
eles `tools/fontes.mjs` não roda numa cópia nova e o recorte deixa de ser
reproduzível. A OFL permite redistribuir, e a licença acompanha. O site servido
não os carrega: só os `woff2` recortados.

---

## Mapa dos arquivos

```
index.html                    início
tratamentos/                  hub + 7 páginas de tratamento
unidades/                     hub + Marília + Garça
a-clinica/  primeira-consulta/  urgencia/
equipe/  duvidas/  contato/  privacidade/
404.html
llms.txt  robots.txt  sitemap.xml  site.webmanifest  .nojekyll

assets/css/site.css           folha única
assets/js/site.js             menu e âncoras; a página funciona inteira sem ele
assets/js/dente3d.js          o molar em WebGL
assets/fonts/                 os .ttf de origem, os .woff2 recortados e as licenças
assets/img/                   marca, ícones, retrato e a imagem de compartilhamento

src/                          a fonte do site
tools/imagens.py              gera marca, ícones, retrato e og.png
tools/fontes.mjs              recorta as fontes
tools/check.mjs               verificação antes de publicar
build.mjs                     monta tudo

interno/                      NÃO versionado: diagnóstico, arte original,
                              identificadores pessoais e a versão anterior do site
```
