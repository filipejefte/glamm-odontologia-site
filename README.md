# Glamm Odontologia

Site institucional da **Glamm Odontologia**, clínica odontológica com unidades
em Marília e em Garça, no interior de São Paulo.

Site estático, sem dependência de nada. Nenhum `npm install`, nenhum framework,
nenhum arquivo carregado de terceiro. O que está publicado são arquivos HTML,
CSS, JS, fontes e imagens, gerados por um script de umas cem linhas.

---

## Como mexer

```bash
node build.mjs --preview   # gera o site em modo prévia (noindex)
node tools/fontes.mjs      # recorta as fontes para os caracteres usados
node tools/check.mjs       # verifica tudo antes de publicar
```

Nesta ordem, sempre que a copy mudar. O recorte de fonte lê o HTML já gerado,
então rodar antes da build recorta para o texto antigo.

```bash
node build.mjs             # produção: indexável, e RECUSA dado pendente
python tools/imagens.py    # regenera ícones e imagem de compartilhamento
```

### A regra que organiza o projeto

`src/dados.mjs` é a **fonte única de verdade**. Nenhum telefone, endereço,
horário ou número de registro é escrito direto no HTML.

Campo com valor `null` é dado que ninguém confirmou com a clínica. Ele vira uma
marcação visível "a confirmar" na prévia e **derruba a build de produção**.

Isso não é zelo decorativo. O diagnóstico que originou este site encontrou, no
site atual da clínica, o rodapé publicando o telefone de Marília como se fosse
também o de Garça. Quem lê o rodapé e liga para Garça cai em Marília. Aqui,
`tools/check.mjs` varre **todo arquivo do repositório** e derruba a verificação
se encontrar qualquer telefone, link `wa.me` ou link `tel:` que não seja um dos
dois números conferidos.

---

## Pendências que travam a build de produção

Oito itens. Enquanto qualquer um estiver aberto, `node build.mjs` sai com erro.

| # | Pendência | Por que trava |
|---|---|---|
| 1 | **Número de inscrição da clínica no CRO-SP** | O art. 43 do Código de Ética Odontológica torna obrigatório informar nome e inscrição da pessoa jurídica em qualquer comunicação. Os canais da clínica publicam `033836` (bio do Instagram, como "CROCL", e os anúncios do Meta). |
| 2 | **Número de inscrição da responsável técnica no CRO-SP** | Mesmo artigo: pessoa jurídica também informa nome e inscrição do responsável técnico. O site atual publica `CRO-SP 125.985` para a pessoa física. A leitura provável é que `033836` seja a clínica e `125.985` a profissional, mas provável não basta para publicar identificação obrigatória em nome de terceiro. |
| 3 | **Especialidade registrada no CRO da responsável técnica** | O site atual anuncia "especialista em ortodontia". O art. 44, II veda anunciar especialidade sem registro no Conselho. Sem o número do registro de especialista, o título não entra. |
| 4 | **Nome, CRO e especialidade dos demais profissionais**, mais autorização de uso de nome e imagem | O art. 43 §2º só permite que a pessoa jurídica anuncie especialidades se tiver profissional inscrito naquela especialidade **e** disponibilizar ao público a relação desses profissionais com as qualificações. Sem a lista, a clínica não pode dizer que tem equipe de especialistas. |
| 5 | **Horário de sexta em Marília** | O site atual diz 8h; a ficha do Google diz 8h30. O site publica 8h30, que é o horário que não manda ninguém para uma porta fechada, mas a divergência precisa ser resolvida na fonte. |
| 6 | **Bairro e CEP da unidade de Garça** | Receita Federal e site dizem Williams / 17402-000. O Google diz Centro / 17400-000, e ainda quebra o nome da rua como "Voluntários, de - 32". O site publica a versão em que duas fontes independentes concordam. O que precisa ser corrigido é a ficha do Google. |
| 7 | **Materiais de faceta oferecidos** | A copy atual cita só resina, e a página de lentes e facetas explica também a porcelana, porque a diferença importa para quem decide. Confirmar o que a clínica oferece. |
| 8 | **Lista completa dos tratamentos** | Os sete com página própria vieram da copy publicada. A biblioteca de imagens do site atual sugere outros (cirurgias, estética restauradora). Conferir se falta algum. |

Além dessas, dois dados simplesmente não existem em fonte pública e valem uma
pergunta: **e-mail de atendimento** e **grafia oficial da rua em Marília**
(a Receita registra "Marrey Junior"; o site e o Google grafam "Marrei Júnior",
e é essa a grafia publicada aqui, porque é a que o mapa resolve).

---

## O que este site não publica, de propósito

Não é omissão nem falta de material. Cada linha tem uma norma atrás.

- **Nota, contagem e texto de avaliação de paciente.** O material de origem veda
  expressamente reproduzir, porque as plataformas divergem entre si e o dado
  envelhece. O art. 44, VI ainda trata da identificação de paciente em peça
  publicitária. `tools/check.mjs` derruba a build se encontrar.
- **Imagem de diagnóstico ou de resultado, o "antes e depois".** A Resolução
  CFO-196/2019 é expressa: **pessoa jurídica não divulga esse tipo de imagem**,
  só o cirurgião-dentista que executou o procedimento, com consentimento formal
  do paciente. O site atual da clínica publica quatro casos assim.
- **Preço, desconto, promoção, gratuidade e condição de pagamento.** Art. 44, I.
  O site atual responde na FAQ que trabalha com parcelamento; essa pergunta saiu
  inteira daqui.
- **Especialidade anunciada em nome da clínica.** Art. 43 §2º, ver pendência 4.
- **Promessa de resultado, superlativo e comparação com outras clínicas.**
- **Fotografia.** Não há nenhuma foto licenciada da clínica nem autorização de
  uso de imagem de ninguém. O desenho foi feito para funcionar sem foto. Quando
  houver ensaio próprio e autorização por escrito, entram.
- **Rastreador de qualquer tipo.** Sem pixel, sem analytics, sem cookie.

---

## SEO e leitura por assistente de IA

O diagnóstico media isso e dava 3 de 12 para o negócio como entidade. O que
mudou aqui:

- **Um nome só.** "Glamm Odontologia" em todo lugar. O diagnóstico encontrou três
  nomes públicos disputando a mesma identidade: Glamm no CNPJ e nos anúncios,
  Dra. Gabriela Tukasan no Google e no domínio, os dois no Instagram. O nome
  anterior aparece uma vez, na página de equipe, ligando as duas identidades sem
  competir com a marca (`alternateName` no JSON-LD faz o mesmo para a máquina).
- **URL por unidade e por tratamento.** O site atual é página única: tudo mora em
  `/`, sem rota por cidade nem por tratamento. Aqui são 18 páginas, cada uma com
  title, description e dado estruturado próprios.
- **JSON-LD em todas as páginas.** `Dentist` por unidade, com endereço completo,
  telefone próprio e `openingHoursSpecification`; `parentOrganization` ligando as
  duas à mesma marca; `MedicalWebPage` mais `MedicalProcedure` por tratamento;
  `FAQPage`; `BreadcrumbList`.
- **`llms.txt`** na raiz, com a entidade em texto puro. Enquanto o site estiver em
  prévia, a primeira linha do arquivo avisa que não é o canal oficial da clínica.
  `tools/check.mjs` derruba a verificação se essa coerência se perder.
- **Nome, endereço e telefone idênticos** em todas as superfícies, sempre lidos de
  `src/dados.mjs`.

---

## O dente que gira

Na página de tratamentos, uma seção mostra um dente em três dimensões e liga
cada tratamento à parte do dente em que ele atua. Escolher "Polpa e canais"
deixa a casca translúcida e revela a câmara pulpar e os dois canais.

**Sem biblioteca e sem arquivo de modelo.** O caminho comum seria Three.js mais
um GLB: cerca de 1,6 MB entre biblioteca, carregador e malha, contra os 182 KB
do site inteiro. Aqui a malha é gerada em tempo de execução, por três sólidos de
revolução, e desenhada em WebGL 1 puro. Custo total: **7,4 KB comprimidos**, e
nenhuma licença de terceiro a respeitar. A malha é facetada de propósito, porque
é o que conversa com o símbolo da marca, que é um dente lapidado.

**A peça é um acréscimo, nunca o caminho.** O que comanda são os botões da
lista, que são HTML de verdade e funcionam pelo teclado. A tela é `aria-hidden`.
Sem WebGL, sem JavaScript, ou com o arquivo bloqueado, a seção continua sendo
uma lista dos sete tratamentos com links que levam às páginas certas, e a grade
completa de tratamentos está logo acima na mesma página.

**No celular:** a inicialização só acontece quando a seção se aproxima da tela,
o desenho para quando ela sai, a resolução é limitada a duas vezes a do
dispositivo, e o palco declara `touch-action: pan-y`, que é o que garante que o
gesto vertical continua rolando a página em vez de girar o dente. Com
`prefers-reduced-motion` não há rotação automática nem transição de virada.

Abrir a página com `#endodontia`, ou qualquer outro identificador de tratamento,
já seleciona aquela parte.

---

## Desempenho

Medido sobre os arquivos gerados, com gzip que é o que o GitHub Pages serve:

| | bruto | gzip |
|---|---|---|
| Página inicial, tudo que ela carrega | 186 KB | **108 KB** |
| Página de tratamentos, com o dente 3D | 195 KB | **114 KB** |
| Só o dente 3D | 21 KB | **7,4 KB** |

Das 108 KB da home, 53 KB são as três fontes, que já vêm comprimidas e não
encolhem mais. O HTML de 50 KB vira 8,6 KB.

O que sustenta isso: nenhuma biblioteca, nenhum framework, nenhum recurso de
terceiro, nenhum rastreador, fontes recortadas para os caracteres que o site
escreve, `width` e `height` em toda imagem (o verificador recusa sem), logotipo
do cabeçalho com `fetchpriority="high"` e o do rodapé com `loading="lazy"`.

Varredura de transbordamento horizontal: **11 páginas × 4 larguras (320, 360,
375 e 414 px), zero casos**. O único elemento mais largo que a tela é a tabela
comparativa das unidades, que rola dentro do próprio quadro de propósito.

---

## Segurança

- **CSP `default-src 'none'`** em toda página, sem exceção para estilo ou script
  embutido. Nada de terceiro carrega: sem CDN, sem fonte remota, sem iframe.
- **`connect-src 'none'` e `form-action 'none'`.** O formulário de agendamento monta
  a mensagem no próprio aparelho e abre o WhatsApp. Nada é enviado, e a CSP prova
  isso em vez de pedir confiança.
- **Fontes hospedadas aqui**, recortadas por `tools/fontes.mjs`.
- **`referrer no-referrer`**, e todo link externo com `noopener noreferrer`.
- **`tools/check.mjs` varre o repositório inteiro** por vazamento de dado do
  ambiente de trabalho, incluindo `tools/` e `.github/`, que também são públicos.
  Os identificadores pessoais ficam em `interno/identificadores.txt`, que o
  `.gitignore` segura, para o próprio verificador não publicar o que procura.

### Cabeçalhos que faltam, e por quê

`frame-ancestors`, `sandbox` e `report-uri` **não funcionam** entregues por
`<meta>`: o navegador ignora e ainda registra erro no console. Só valem como
cabeçalho HTTP, e o GitHub Pages não permite definir cabeçalho. O verificador
inclusive **recusa** a presença de `frame-ancestors` na meta.

Quando o site mudar para `glammodontologia.com.br` em hospedagem própria,
configurar lá:

```
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## A marca

O logotipo **não é recriação**: é o arquivo original que a própria clínica
publica, com a palavra ODONTOLOGIA recolorida para a ardósia da marca na
variante de fundo claro. O manuscrito em ouro é idêntico ao original, pixel a
pixel.

O símbolo (a peça em `src/chrome.mjs`) foi **vetorizado** a partir do ícone
oficial de 512 px: contorno por marching squares no nível 0.5 do campo de alfa,
com precisão de subpixel, simplificado por Douglas-Peucker a 0.45 px. A
conferência foi feita rasterizando o SVG no mesmo quadro da arte original:
**zero pixel diverge acima de 0,5 de alfa**, e a interseção sobre a união fica em
96,8%, sendo o restante borda suavizada.

As cores foram **medidas, não escolhidas**:

| Cor | Valor | Origem |
|---|---|---|
| Ardósia | `#4C526A` | núcleo do traço no ícone oficial de 512 px, 24.981 pixels exatamente nesse valor |
| Ouro escuro | `#A38434` | parada do gradiente declarada nos SVG do site da clínica |
| Ouro claro | `#D2AF57` | a outra parada do mesmo gradiente |

O ouro da marca dá 3,36:1 sobre o creme: serve para filete, símbolo e título
grande, e **não** serve para texto pequeno. Por isso existe `#7D6425`, o mesmo
tom escurecido, com 5,33:1. Todos os pares de cor foram calculados antes de
entrar na folha.

Tipografia: **Spectral** (400 e 600) para display e **Karla** (variável, 400 a
700) para texto, as duas sob SIL Open Font License, com o texto da licença em
`assets/fonts/`.

---

## Publicação

GitHub Pages, branch `main`, raiz do repositório, com `.nojekyll`.

Enquanto for proposta, o site fica em modo prévia: `noindex, nofollow` em toda
página, `robots.txt` bloqueando tudo, aviso no `llms.txt` e faixa de "Prévia de
apresentação" no topo. **Uma proposta de site para uma clínica real não pode
disputar busca com a clínica.**

Para publicar de verdade: preencher as pendências em `src/dados.mjs`, trocar
`CLINICA.origem` pelo domínio próprio, rodar `node build.mjs` (sem `--preview`),
`node tools/fontes.mjs` e `node tools/check.mjs`.

O fluxo em `.github/workflows/verificar.yml` roda a cada envio e confere duas
coisas: que o HTML publicado é exatamente o que o gerador produz, e que ele passa
no verificador.

---

## Estrutura

```
build.mjs               gerador
src/dados.mjs           fonte única de verdade
src/chrome.mjs          casca: head, cabeçalho, rodapé, ícones, marca
src/paginas.mjs         as 18 páginas e o JSON-LD
tools/check.mjs         verificação estática
tools/fontes.mjs        recorte das fontes
tools/imagens.py        ícones e imagem de compartilhamento
assets/                 css, js, fontes, imagens
interno/                material de trabalho, fora do repositório
```
