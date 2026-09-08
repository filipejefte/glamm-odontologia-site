/* =========================================================================
   Verificação estática do site gerado. Sai com código 1 se encontrar
   qualquer um destes problemas:

   ESTRUTURA
   - link interno para arquivo inexistente, ou âncora que não existe no destino
   - identificador repetido na mesma página
   - arquivo referenciado (imagem, fonte, folha, script) que não está em disco
   - JSON-LD ou manifesto com JSON inválido
   - página sem lang, title, description, canonical, og:image, robots ou CSP
   - número de h1 diferente de um
   - robots.txt e llms.txt em desacordo com a meta robots das páginas

   TELEFONE
   - qualquer telefone, link wa.me ou link tel: que não seja um dos dois
     números conferidos das unidades

   Esta é a verificação mais importante deste projeto em particular. O
   diagnóstico encontrou o rodapé do site atual publicando o número de
   Marília como se fosse também o de Garça: quem lê o rodapé e liga para
   Garça cai em Marília. Um número escrito na mão em qualquer lugar deste
   repositório derruba a build.

   SEGURANÇA
   - qualquer coisa que a CSP proibiria: estilo inline, bloco style,
     manipulador on*, URL javascript:, script ou folha de terceiros, iframe
   - recurso externo de qualquer tipo, inclusive imagem e fonte
   - link em nova aba sem noopener noreferrer, ou link em http
   - frame-ancestors na CSP por meta, que o navegador ignora e acusa
   - vazamento de dado do ambiente de trabalho em arquivo publicável

   CONFORMIDADE (Código de Ética Odontológica, Resolução CFO-118/2012, e
   Resolução CFO-196/2019)
   - identificação obrigatória ausente do rodapé (art. 43)
   - preço, desconto, gratuidade ou modalidade de pagamento (art. 44, I)
   - expressão ou imagem de antes e depois (art. 44, I e Res. 196/2019, que
     é expressa: pessoa jurídica não divulga imagem de resultado)
   - especialidade anunciada em nome da clínica (art. 43 §2º e art. 44, II)
   - promessa de resultado, de cura ou de ausência de dor
   - superlativo e autoatribuição de liderança
   - nota de avaliação ou depoimento de paciente reproduzido
   - travessão ou meia-risca na copy, que é decisão editorial deste projeto

   Uso:  node tools/check.mjs
   ========================================================================= */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* Duas varreduras, com alcances diferentes de propósito.

   PULAR_SITE é o que não faz parte do site servido: o gerador e a
   ferramentaria. Essas pastas não passam pelas regras de HTML.

   PULAR_REPO é bem menor: só o que o .gitignore já segura, mais o .git. A
   varredura de vazamento usa esta, porque tools/ e .github/ VÃO para o
   repositório público e precisam ser conferidos como qualquer outro arquivo.
   Um caminho de máquina esquecido num script de build vaza igual a um numa
   página. */
const PULAR_SITE = new Set(['src', 'tools', 'dist', 'node_modules', '.git', '.claude', '.github', 'interno', 'assets']);
const PULAR_REPO = new Set(['dist', 'node_modules', '.git', '.claude', 'interno']);
const PUBLICAVEIS = /\.(html|css|js|mjs|xml|txt|json|yml|yaml|md|svg|webmanifest|py|ps1|nojekyll|gitignore|gitattributes)$/;

function varrer(dir, pular, acc = []) {
  for (const entrada of readdirSync(dir)) {
    if (pular.has(entrada)) { continue; }
    const p = join(dir, entrada);
    if (statSync(p).isDirectory()) { varrer(p, pular, acc); } else { acc.push(p); }
  }
  return acc;
}

const problemas = [];
const anota = (arquivo, msg) => problemas.push(`${relative(RAIZ, arquivo).replace(/\\/g, '/')}: ${msg}`);

const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);

const arquivos = varrer(RAIZ, PULAR_SITE);
const doRepo = varrer(RAIZ, PULAR_REPO);
const paginas = arquivos.filter(f => f.endsWith('.html'));
const cacheIds = new Map();
const idsPara = (arquivo) => {
  if (!cacheIds.has(arquivo)) { cacheIds.set(arquivo, new Set(idsDe(readFileSync(arquivo, 'utf8')))); }
  return cacheIds.get(arquivo);
};

/* ------------------------------------------------------------------ */
/* Telefones conferidos                                                */
/* ------------------------------------------------------------------ */

/* Lidos de src/dados.mjs, que é a fonte única. Não repetidos aqui: se
   estivessem escritos neste arquivo, o verificador passaria a ser uma
   segunda fonte de verdade e poderia divergir da primeira em silêncio. */
const { UNIDADES } = await import('../src/dados.mjs');
const TEL_OK = new Set(UNIDADES.map(u => u.telefone));
const E164_OK = new Set(UNIDADES.map(u => u.e164));

/* ------------------------------------------------------------------ */
/* Vazamento de dado do ambiente                                       */
/* ------------------------------------------------------------------ */

/* Padrões genéricos, que podem ficar num arquivo público sem revelar nada.

   As duas marcas abaixo existem porque este trecho contém, por definição,
   exatamente aquilo que ele procura. Sem elas o verificador se acusa. A
   varredura recorta o que está entre as marcas antes de testar, então o
   restante deste arquivo continua sendo conferido como qualquer outro: a
   isenção é do bloco, não do arquivo. */
/* varredura: ignorar daqui */
const vazamentos = [
  [/\b[A-Za-z]:\\/, 'caminho absoluto do Windows'],
  [/\\Users\\|\/Users\//, 'caminho de perfil de usuário'],
  [/AppData/i, 'caminho AppData'],
  [/Projetos/, 'nome da pasta de trabalho'],
  [/@gmail\.com|@hotmail\.com|@outlook\.com|@yahoo\./i, 'e-mail pessoal'],
  [/scratchpad|tool-results/i, 'caminho de ferramenta']
];
/* varredura: ate aqui */

/* Identificadores pessoais de verdade (nome da máquina, usuário, e-mail,
   nome completo) ficam em interno/identificadores.txt, que o .gitignore
   segura, uma expressão regular por linha. Assim o próprio verificador não
   publica aquilo que ele procura. */
const extra = join(RAIZ, 'interno', 'identificadores.txt');
if (existsSync(extra)) {
  for (const linha of readFileSync(extra, 'utf8').split(/\r?\n/)) {
    const t = linha.trim();
    if (t && !t.startsWith('#')) { vazamentos.push([new RegExp(t, 'i'), 'identificador pessoal']); }
  }
} else if (process.env.CI) {
  /* No CI a pasta interno/ não existe, porque o .gitignore a segura. Os
     padrões genéricos acima continuam valendo; só a lista pessoal não roda. */
  console.log('Aviso: interno/identificadores.txt não existe aqui (esperado no CI).');
} else {
  problemas.push('interno/identificadores.txt: ausente, a varredura de identificadores pessoais não rodou');
}

for (const f of doRepo) {
  if (!PUBLICAVEIS.test(f)) { continue; }
  const txt = readFileSync(f, 'utf8')
    .replace(/\/\* varredura: ignorar daqui \*\/[\s\S]*?\/\* varredura: ate aqui \*\//g, '');
  for (const [re, rotulo] of vazamentos) {
    if (re.test(txt)) { anota(f, `vazamento de dado do ambiente (${rotulo})`); }
  }
}

/* O material de diagnóstico não pode chegar ao repositório público. */
const ignore = existsSync(join(RAIZ, '.gitignore')) ? readFileSync(join(RAIZ, '.gitignore'), 'utf8') : '';
if (!/^interno\/$/m.test(ignore)) { problemas.push('.gitignore: falta a linha "interno/"'); }

/* ------------------------------------------------------------------ */
/* Telefone em qualquer arquivo do repositório                         */
/* ------------------------------------------------------------------ */

for (const f of doRepo) {
  if (!PUBLICAVEIS.test(f)) { continue; }
  const txt = readFileSync(f, 'utf8');

  for (const m of txt.matchAll(/\(\d{2}\)\s?\d{4,5}-\d{4}/g)) {
    if (!TEL_OK.has(m[0])) { anota(f, `telefone não conferido: ${m[0]}`); }
  }
  for (const m of txt.matchAll(/wa\.me\/(\d+)/g)) {
    if (!E164_OK.has(m[1])) { anota(f, `link de WhatsApp para número não conferido: ${m[1]}`); }
  }
  for (const m of txt.matchAll(/tel:\+(\d+)/g)) {
    if (!E164_OK.has(m[1])) { anota(f, `link tel: para número não conferido: ${m[1]}`); }
  }
}

/* ------------------------------------------------------------------ */
/* Manifesto                                                           */
/* ------------------------------------------------------------------ */

const manifesto = join(RAIZ, 'site.webmanifest');
if (existsSync(manifesto)) {
  try {
    const m = JSON.parse(readFileSync(manifesto, 'utf8'));
    for (const ic of m.icons || []) {
      if (!existsSync(join(RAIZ, ic.src))) { anota(manifesto, `ícone declarado e ausente: ${ic.src}`); }
    }
  } catch (e) { anota(manifesto, `manifesto inválido: ${e.message}`); }
} else {
  problemas.push('site.webmanifest: ausente');
}

/* ------------------------------------------------------------------ */
/* Páginas                                                             */
/* ------------------------------------------------------------------ */

let modoRobots = null;

for (const pagina of paginas) {
  const html = readFileSync(pagina, 'utf8');
  const lista = idsDe(html);
  const proprios = new Set(lista);
  cacheIds.set(pagina, proprios);
  const e404 = pagina.endsWith('404.html');

  /* --- identificadores repetidos --- */
  const vistos = new Set();
  for (const id of lista) {
    if (vistos.has(id)) { anota(pagina, `identificador repetido: ${id}`); }
    vistos.add(id);
  }

  /* --- links, âncoras e arquivos referenciados --- */
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(href)) { continue; }
    if (href.startsWith('#')) {
      if (href.length > 1 && !proprios.has(href.slice(1))) { anota(pagina, `âncora interna inexistente: ${href}`); }
      continue;
    }
    const [arquivo, hash] = href.split('#');
    const alvo = resolve(dirname(pagina), arquivo);
    if (!existsSync(alvo)) { anota(pagina, `referência quebrada: ${href}`); continue; }
    if (hash && alvo.endsWith('.html') && !idsPara(alvo).has(hash)) { anota(pagina, `âncora inexistente no destino: ${href}`); }
  }

  /* --- links externos --- */
  for (const m of html.matchAll(/<a\s[^>]*>/g)) {
    const tag = m[0];
    if (/target="_blank"/.test(tag) && !/rel="noopener noreferrer"/.test(tag)) {
      anota(pagina, `link em nova aba sem noopener noreferrer: ${tag.slice(0, 90)}`);
    }
    const href = tag.match(/href="([^"]+)"/);
    if (href && /^http:\/\//.test(href[1])) { anota(pagina, `link sem HTTPS: ${href[1]}`); }
  }

  /* --- JSON-LD --- */
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let dados;
    try { dados = JSON.parse(m[1]); }
    catch (e) { anota(pagina, `JSON-LD inválido: ${e.message}`); continue; }

    const nos = dados['@graph'] || [dados];
    for (const no of nos) {
      const tipos = [].concat(no['@type'] || []);
      if (tipos.includes('Dentist')) {
        /* Uma unidade sem endereço ou sem telefone no dado estruturado é
           exatamente a lacuna que impede um assistente de IA de montar a
           entidade. É o problema que este site existe para resolver. */
        if (no.address && !no.address.postalCode) { anota(pagina, 'JSON-LD: endereço de unidade sem CEP'); }
        if (no.department && !no.telephone) { continue; }
        if (!no.department && !no.telephone) { anota(pagina, `JSON-LD: unidade "${no.name}" sem telephone`); }
      }
      if (tipos.includes('FAQPage')) {
        for (const q of no.mainEntity || []) {
          if (!q.acceptedAnswer || !q.acceptedAnswer.text) { anota(pagina, `JSON-LD: pergunta sem resposta (${q.name})`); }
        }
      }
    }
  }

  /* --- metadados obrigatórios --- */
  if (!/<html lang="pt-BR">/.test(html)) { anota(pagina, 'atributo lang ausente ou diferente de pt-BR'); }
  if (!/<title>[^<]{10,}<\/title>/.test(html)) { anota(pagina, 'title ausente ou curto demais'); }
  const tit = html.match(/<title>([^<]*)<\/title>/);
  if (tit && tit[1].length > 65) { anota(pagina, `title com ${tit[1].length} caracteres (o buscador corta perto de 60)`); }

  const desc = html.match(/<meta name="description" content="([^"]*)"/);
  if (!desc) { anota(pagina, 'meta description ausente'); }
  else if (desc[1].length < 70 || desc[1].length > 320) { anota(pagina, `meta description com ${desc[1].length} caracteres (ideal 70 a 320)`); }
  if (!/<link rel="canonical"/.test(html)) { anota(pagina, 'canonical ausente'); }
  if (!/<meta property="og:image" content="https:\/\//.test(html)) { anota(pagina, 'og:image ausente ou relativa'); }

  const robots = html.match(/<meta name="robots" content="([^"]+)"/);
  if (!robots) { anota(pagina, 'meta robots ausente'); }
  else if (modoRobots === null) { modoRobots = robots[1]; }
  else if (robots[1] !== modoRobots) { anota(pagina, `meta robots divergente das demais páginas (${robots[1]})`); }

  const h1 = [...html.matchAll(/<h1[\s>]/g)].length;
  if (h1 !== 1) { anota(pagina, `${h1} elementos h1 (deve haver exatamente 1)`); }

  /* --- o que a CSP proibiria --- */
  if (!/<meta http-equiv="Content-Security-Policy" content="default-src 'none'/.test(html)) { anota(pagina, 'CSP ausente ou permissiva'); }
  for (const diretiva of ["form-action 'none'", "connect-src 'none'", "base-uri 'none'"]) {
    if (!html.includes(diretiva)) { anota(pagina, `CSP sem a diretiva ${diretiva}`); }
  }
  /* O contrário das linhas acima: esta diretiva não pode estar na meta. O
     navegador a ignora aí e ainda registra erro no console. Ela é cabeçalho
     HTTP, e como tal está anotada no README. */
  if (/<meta http-equiv="Content-Security-Policy"[^>]*frame-ancestors/.test(html)) {
    anota(pagina, 'frame-ancestors na CSP por meta: o navegador ignora e acusa erro; defina como cabeçalho HTTP');
  }
  if (/\sstyle="/.test(html)) { anota(pagina, 'atributo style inline (bloqueado pela CSP)'); }
  if (/<style[\s>]/.test(html)) { anota(pagina, 'bloco style inline (bloqueado pela CSP)'); }
  if (/\son[a-z]+="/i.test(html)) { anota(pagina, 'manipulador de evento inline (bloqueado pela CSP)'); }
  if (/javascript:/i.test(html)) { anota(pagina, 'URL javascript:'); }
  if (/<iframe|<embed|<object/i.test(html)) { anota(pagina, 'conteúdo incorporado de terceiros'); }

  /* Qualquer recurso carregado de fora, de qualquer tipo. O único http
     externo permitido é link de navegação, tratado acima. */
  for (const m of html.matchAll(/(?:src|href)="((?:https?:)?\/\/[^"]+)"/g)) {
    const tagInicio = html.lastIndexOf('<', m.index);
    const tag = html.slice(tagInicio, html.indexOf('>', m.index) + 1);
    if (/^<a[\s>]/i.test(tag)) { continue; }
    if (/rel="canonical"/.test(tag) || /property="og:/.test(tag) || /name="twitter:/.test(tag)) { continue; }
    anota(pagina, `recurso carregado de fora do site: ${m[1].slice(0, 80)}`);
  }

  /* --- caminho de SVG malformado ---
     Confere a ARIDADE de cada comando: quantos números ele recebe. Um "C"
     com cinco números, ou sete, é caminho quebrado, e o navegador não avisa:
     ele desenha o que conseguir e segue em frente.

     O que NÃO dá para conferir aqui: número colado em número. "3.13.82" é
     ambíguo por natureza, porque o segundo ponto decimal legitimamente
     começa um número novo, e é assim que todo ícone minificado é escrito.
     Um espaço perdido entre dois números pode continuar somando a
     quantidade certa e passar por este teste, desenhando outra forma. Foi o
     que aconteceu com a silhueta de dente. Contra isso só existe olhar a
     captura de tela, e é por isso que a revisão visual continua no processo. */
  const ARIDADE = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  for (const m of html.matchAll(/\sd="([^"]+)"/g)) {
    for (const cmd of m[1].matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
      const letra = cmd[1].toLowerCase();
      const n = (cmd[2].match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).length;
      const esperado = ARIDADE[letra];
      if (esperado === 0) {
        if (n) { anota(pagina, `caminho SVG: comando ${cmd[1]} com ${n} número(s), deveria ter zero`); }
      } else if (n === 0 || n % esperado !== 0) {
        anota(pagina, `caminho SVG: comando ${cmd[1]} com ${n} número(s), não é múltiplo de ${esperado}`);
      }
    }
  }

  /* --- texto solto dentro de <svg> ---
     Dado de caminho concatenado como se fosse elemento vira texto dentro do
     <svg>. O navegador não reclama, não desenha e não deixa rastro: o ícone
     some e tudo continua "funcionando". Aconteceu com a silhueta de dente e
     só apareceu na captura de tela, depois de duas revisões visuais feitas
     sobre uma remontagem do código em vez do HTML publicado. */
  for (const m of html.matchAll(/<svg\b[^>]*>([\s\S]*?)<\/svg>/g)) {
    const solto = m[1]
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, '');
    if (solto) { anota(pagina, `texto solto dentro de <svg>: "${solto.slice(0, 40)}"`); }
  }

  /* --- acessibilidade mínima --- */
  for (const m of html.matchAll(/<svg\s([^>]*)>/g)) {
    const attrs = m[1];
    if (!/aria-hidden="true"/.test(attrs) && !/role="img"/.test(attrs) && !/aria-label=/.test(attrs)) {
      anota(pagina, 'svg sem aria-hidden nem rótulo acessível');
    }
  }
  for (const m of html.matchAll(/<img\s([^>]*)>/g)) {
    if (!/\salt="/.test(m[1])) { anota(pagina, 'img sem atributo alt'); }
    if (!/\swidth="\d+"/.test(m[1]) || !/\sheight="\d+"/.test(m[1])) {
      anota(pagina, 'img sem width e height (provoca deslocamento de layout)');
    }
  }

  /* --- identificação obrigatória, art. 43 do Código de Ética --- */
  if (!e404) {
    if (!/Responsável técnica:/.test(html)) { anota(pagina, 'identificação da responsável técnica ausente no rodapé (art. 43)'); }
    if (!/CRO-SP/.test(html)) { anota(pagina, 'inscrição no CRO ausente no rodapé (art. 43)'); }
    if (!/CNPJ/.test(html)) { anota(pagina, 'CNPJ ausente no rodapé'); }
    if (!/não substitui a consulta com cirurgião-dentista/.test(html)) { anota(pagina, 'aviso de caráter informativo ausente'); }
  }

  /* --- vícios de escrita --- */
  const copy = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  const travessao = (copy.match(/—/g) || []).length;
  if (travessao) { anota(pagina, `${travessao} travessão(ões) na copy; separe as frases`); }
  const meiaRisca = (copy.match(/–/g) || []).length;
  if (meiaRisca) { anota(pagina, `${meiaRisca} meia-risca(s) na copy; use "a" ou "até"`); }

  /* --- publicidade odontológica --- */
  const vedados = [
    /* Art. 44, I. O site atual da clínica viola este inciso na FAQ, ao
       responder "sim, trabalhamos com opções de parcelamento". */
    [/parcelament|promo[çc][ãa]o|desconto|R\$\s?\d|\d+\s?x\s?de\b/i, 'preço, desconto ou modalidade de pagamento (art. 44, I)'],
    [/consulta\s+gr[áa]tis|consulta\s+gratuita|sem\s+custo|gratuidade\s+de/i, 'oferta de gratuidade (art. 44, I)'],
    [/custa\s+(menos|mais)|mais\s+barat|mais\s+car[oa]|preço\s+(menor|maior)/i, 'comparação de custo (art. 44, I)'],
    [/antes\s+e\s+depois/i, 'expressão de antes e depois (art. 44, I e Res. CFO 196/2019)'],

    /* Art. 43 §2º e art. 44, II. A forma proibida é a clínica se dizer
       detentora de especialistas sem publicar a relação. Falar da regra,
       como a página de equipe faz, não é anunciar especialidade. */
    [/(equipe|time|corpo|nossos?|nossas?)\s+(de\s+)?especialist/i, 'especialidade anunciada em nome da clínica (art. 43 §2º)'],
    [/somos\s+especialist|especialistas?\s+em\s+\w/i, 'autoatribuição de especialidade (art. 44, II)'],

    /* Promessa. */
    [/garant(imos|ia|ido|e-se)/i, 'promessa ou garantia de resultado'],
    [/100%|\bcura(r|do|da)?\b|milagr/i, 'promessa absoluta ou de cura'],
    [/sem\s+dor\b|indolor/i, 'promessa de ausência de dor'],
    [/resultado\s+(garantido|imediato|certo)/i, 'promessa de resultado'],

    /* Superlativo e comparação. */
    [/melhor\s+(cl[íi]nica|dentista|equipe|atendimento|servi[çc]o|consult[óo]rio)/i, 'superlativo'],
    [/n[ºo°]?\s*1\s+(em|de)\b|l[íi]der\s+em|refer[êe]ncia\s+em/i, 'autoatribuição de liderança'],
    [/[úu]ltima\s+gera[çc][ãa]o|tecnologia\s+de\s+ponta|exclusiv/i, 'autopromoção de equipamento (art. 44, III)'],

    /* Reputação de terceiro. O material de origem veda expressamente
       reproduzir, e o art. 44 trata de publicidade que comercializa a
       Odontologia. */
    [/avalia[çc][ãa]o\s+\d[.,]\d|\d[.,]\d\s*estrelas?|nota\s+\d[.,]\d/i, 'nota de avaliação reproduzida'],
    [/reclame\s*aqui|google\s+reviews|avalia[çc][õo]es\s+no\s+google/i, 'menção a plataforma de reputação'],
    [/depoimento|o\s+que\s+dizem\s+nossos\s+pacientes|pacientes\s+reais/i, 'depoimento de paciente (art. 44, VI)'],
    [/\+?\s?\d[\d.]{2,}\s*(pacientes\s+atendidos|sorrisos)/i, 'contagem de pacientes usada como argumento']
  ];
  for (const [re, rotulo] of vedados) {
    const achado = copy.match(re);
    if (achado) { anota(pagina, `publicidade odontológica: ${rotulo} ("${achado[0].trim().slice(0, 40)}")`); }
  }
}

/* ------------------------------------------------------------------ */
/* robots.txt e llms.txt                                               */
/* ------------------------------------------------------------------ */

const naoIndexa = (modoRobots || '').includes('noindex');

const robotsTxt = join(RAIZ, 'robots.txt');
if (existsSync(robotsTxt)) {
  const txt = readFileSync(robotsTxt, 'utf8');
  const bloqueia = /Disallow:\s*\/\s*$/m.test(txt);
  if (bloqueia !== naoIndexa) {
    problemas.push(`robots.txt: ${bloqueia ? 'bloqueia tudo' : 'libera tudo'}, mas as páginas dizem "${modoRobots}"`);
  }
} else {
  problemas.push('robots.txt: ausente');
}

/* O llms.txt fala com outro leitor, que não obedece robots.txt. Se o site
   está em modo prévia, o aviso de que isto não é o canal oficial da clínica
   tem de estar lá, e logo no começo. */
const llms = join(RAIZ, 'llms.txt');
if (existsSync(llms)) {
  const txt = readFileSync(llms, 'utf8');
  const avisa = /não\s+o\s+canal\s+oficial/i.test(txt.slice(0, 700));
  if (naoIndexa && !avisa) {
    problemas.push('llms.txt: o site está em prévia e o arquivo não avisa, no começo, que não é o canal oficial da clínica');
  }
  if (!naoIndexa && avisa) {
    problemas.push('llms.txt: o site está em produção e o arquivo ainda traz o aviso de prévia');
  }
  for (const m of txt.matchAll(/\(\d{2}\)\s?\d{4,5}-\d{4}/g)) {
    if (!TEL_OK.has(m[0])) { anota(llms, `telefone não conferido: ${m[0]}`); }
  }
} else {
  problemas.push('llms.txt: ausente');
}

/* ------------------------------------------------------------------ */
/* Classe de estilo sem dono.

   Depois de uma reforma de layout sobra sempre alguma regra que não estiliza
   mais nada. Não quebra a página, então ninguém vê: só engorda o arquivo que
   todo visitante baixa. Esta regra compara os dois lados.

   O sentido contrário — classe usada no HTML sem regra na folha — NÃO é erro
   aqui de propósito: várias existem só como gancho de leitura ou de âncora,
   e transformar isso em erro obrigaria a inventar regra vazia. */
const folha = join(RAIZ, 'assets', 'css', 'site.css');
if (existsSync(folha)) {
  const css = readFileSync(folha, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  /* url('../fonts/hanken.woff2') e afins não são seletores. */
  const semUrl = css.replace(/url\([^)]*\)/g, '');
  const declaradas = new Set([...semUrl.matchAll(/\.([A-Za-z][\w-]*)/g)].map(m => m[1]));

  const usadas = new Set();
  for (const p of paginas) {
    for (const m of readFileSync(p, 'utf8').matchAll(/\sclass="([^"]*)"/g)) {
      m[1].split(/\s+/).filter(Boolean).forEach(c => usadas.add(c));
    }
  }
  /* O script põe e tira classe em tempo de execução; essas não aparecem em
     nenhum HTML gerado e nem por isso estão sobrando. */
  /* `arquivos` não alcança assets/, que é pulado na varredura das páginas:
     ler o diretório dos scripts direto é o que evita acusar como morta toda
     classe que só existe depois de um clique. */
  const dirJs = join(RAIZ, 'assets', 'js');
  const scripts = existsSync(dirJs) ? readdirSync(dirJs).filter(f => f.endsWith('.js')) : [];
  if (!scripts.length) { problemas.push('assets/js: nenhum script encontrado para conferir as classes de tempo de execução'); }
  for (const j of scripts) {
    const js = readFileSync(join(dirJs, j), 'utf8');
    for (const m of js.matchAll(/classList\.(?:add|remove|toggle|contains)\(\s*'([^']+)'/g)) {
      m[1].split(/\s+/).filter(Boolean).forEach(c => usadas.add(c));
    }
  }

  for (const c of [...declaradas].sort()) {
    if (!usadas.has(c)) { anota(folha, `a classe .${c} não estiliza nada em nenhuma página`); }
  }
}

/* ------------------------------------------------------------------ */

console.log(`${paginas.length} páginas verificadas, ${arquivos.length} arquivos do site, ${doRepo.length} arquivos do repositório varridos por vazamento e por telefone.`);
console.log(`Telefones aceitos: ${[...TEL_OK].join(', ')}`);
if (problemas.length) {
  console.log(`\n${problemas.length} problema(s):`);
  problemas.forEach(p => console.log('  - ' + p));
  process.exitCode = 1;
} else {
  console.log('Nenhum problema encontrado.');
}
