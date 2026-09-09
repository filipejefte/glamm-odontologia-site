/* =========================================================================
   Verificação antes de publicar.

   Roda sem dependência, com `node tools/check.mjs`. Sai com código 1 se
   qualquer regra falhar, e é isso que o fluxo do GitHub Actions usa.

   O QUE ELE PROTEGE, em ordem de gravidade:

   1. VAZAMENTO. O repositório é público. Nenhum caminho da máquina de
      trabalho, nome de usuário, e-mail pessoal ou nome de pasta local pode
      chegar a arquivo publicável. Os padrões pessoais NÃO ficam escritos
      aqui: são lidos de interno/identificadores.txt, que o .gitignore
      segura. Aqui só ficam padrões genéricos.

      ARMADILHA REGISTRADA: um verificador que procura padrões pessoais
      contém, ele mesmo, os padrões que procura, e por isso se acusa. A saída
      é recortar do próprio arquivo o bloco entre as marcas abaixo antes de
      varrê-lo. E, para essa exceção não virar um buraco, o autoteste no fim
      planta um vazamento FORA do bloco e confere que a varredura o encontra.

   2. TELEFONE TROCADO. O diagnóstico encontrou, no site atual da clínica, o
      telefone de Marília publicado no rodapé como se fosse também o de
      Garça. Aqui, qualquer número de telefone, `wa.me` ou `tel:` em qualquer
      arquivo do repositório precisa ser um dos dois conferidos.

   3. O QUE O NAVEGADOR NÃO RECLAMA. Ícone que virou texto solto dentro do
      <svg>, caminho com número colado em número, link interno que aponta
      para arquivo que não existe, âncora sem destino: o navegador engole
      tudo isso em silêncio.

   4. CONTRASTE. Os pares de cor da folha de estilo são calculados aqui, dos
      próprios valores declarados, contra o mínimo da WCAG.
   ========================================================================= */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ESTE = fileURLToPath(import.meta.url);

/* Pastas que não são servidas ao navegador, mas que VÃO para o repositório
   público e por isso entram na varredura de vazamento. */
const PULAR_SITE = new Set(['src', 'tools', 'dist', 'node_modules', '.git', '.claude', '.github', 'interno', 'assets']);
const PULAR_REPO = new Set(['dist', 'node_modules', '.git', '.claude', 'interno']);
const PUBLICAVEIS = /\.(html|css|js|mjs|xml|txt|json|yml|yaml|md|svg|webmanifest|py|ps1)$/;

function varrer(dir, pular, acc = []) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory()) {
      if (!pular.has(item.name)) { varrer(join(dir, item.name), pular, acc); }
    } else {
      acc.push(join(dir, item.name));
    }
  }
  return acc;
}

const problemas = [];
const avisos = [];
const rel = (f) => relative(RAIZ, f).replace(/\\/g, '/');
const anota = (arquivo, msg) => problemas.push(`${rel(arquivo)}: ${msg}`);
const avisa = (arquivo, msg) => avisos.push(`${rel(arquivo)}: ${msg}`);

const arquivosSite = varrer(RAIZ, PULAR_SITE).filter(f => f.endsWith('.html'));
const arquivosRepo = varrer(RAIZ, PULAR_REPO);

const { UNIDADES, CLINICA, PUBLICACAO, TRATAMENTOS } = await import('../src/dados.mjs');
const { todasAsPaginas } = await import('../src/paginas.mjs');

/* ------------------------------------------------------------------ */
/*  1. Vazamento                                                       */
/* ------------------------------------------------------------------ */

/* INICIO-PADROES  (não mexa nesta marca: o recorte do autoteste depende dela) */
const VAZAMENTOS = [
  { nome: 'caminho absoluto do Windows', re: /\b[A-Za-z]:[\\/]{1,2}[A-Za-z0-9_.\- ]{2,}[\\/]/ },
  { nome: 'pasta de usuário', re: /\bUsers[\\/]/ },
  { nome: 'AppData', re: /\bAppData\b/ },
  { nome: 'pasta de trabalho local', re: /\bProjetos[\\/]/ },
  { nome: 'endereço de e-mail pessoal', re: /[A-Za-z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|live|icloud)\.[a-z.]{2,}/i },
  { nome: 'caminho de perfil do POSIX', re: /\/(home|Users)\/[a-z][a-z0-9_-]*\// },
  { nome: 'variável de ambiente de usuário', re: /%USERPROFILE%|\$HOME\/[A-Za-z]/ }
];

/* A amostra do autoteste mora AQUI DENTRO, e o motivo é o próprio recorte:
   este é o único trecho do arquivo que a varredura não lê. É o que permite
   plantar um vazamento de verdade sem que o arquivo passe a vazar. */
const AMOSTRA_DE_TESTE =
  '\n// C:\\Users\\alguem\\AppData\\Local  Projetos/site  alguem@gmail.com\n';
/* FIM-PADROES */

/* Padrões pessoais, fora do repositório. Sem este arquivo a varredura roda
   igual, só sem a lista específica desta máquina. */
const EXIGIR_IDENTIFICADORES = process.argv.includes('--exigir-identificadores');
const extra = join(RAIZ, 'interno', 'identificadores.txt');
let identificadoresCarregados = 0;

if (existsSync(extra)) {
  for (const linha of readFileSync(extra, 'utf8').split(/\r?\n/)) {
    const t = linha.trim();
    if (!t || t.startsWith('#')) { continue; }
    VAZAMENTOS.push({ nome: 'identificador pessoal', re: new RegExp(t, 'i') });
    identificadoresCarregados++;
  }
} else if (EXIGIR_IDENTIFICADORES) {
  /* Este é o modo do laço local, o que roda antes de publicar. Ali o arquivo
     TEM que existir: sem ele os padrões da máquina de trabalho não são
     aplicados e a varredura fica só com os genéricos. */
  problemas.push(
    'interno/identificadores.txt não existe, e a verificação foi pedida em modo estrito. ' +
    'Sem esse arquivo os padrões da máquina de trabalho não são aplicados.');
} else {
  /* O GitHub Actions clona sem interno/, então lá a lista específica NUNCA
     existe. Isso é registrado alto na saída, e o README diz que a verificação
     que autoriza a publicação é a local, com --exigir-identificadores. */
  avisos.push(
    'interno/identificadores.txt não existe: os padrões da máquina de trabalho NÃO foram aplicados. ' +
    'Antes de publicar, rode "node tools/check.mjs --exigir-identificadores" na máquina que tem o arquivo.');
}

/* O recorte que impede o verificador de se acusar. Vale SÓ para este arquivo,
   SÓ para o bloco entre as marcas, e o bloco tem TAMANHO MÁXIMO.
   O teto é o que fecha o buraco: sem ele, bastaria a marca de fim migrar numa
   edição para o recorte engolir metade do arquivo, e um vazamento plantado
   nessa área cega passaria calado. Se o bloco crescer além do teto, o recorte
   não acontece: o arquivo inteiro é varrido e a regra abaixo acusa. */
const TETO_DO_BLOCO = 1800;
let blocoRecortado = null;

function semOBlocoDePadroes(caminho, texto) {
  if (resolve(caminho) !== resolve(ESTE)) { return texto; }
  const i = texto.indexOf('/* INICIO-' + 'PADROES');
  const j = texto.indexOf('/* FIM-' + 'PADROES */');
  if (i < 0 || j < 0 || j < i) { return texto; }
  if (j - i > TETO_DO_BLOCO) { return texto; }
  blocoRecortado = texto.slice(i, j);
  return texto.slice(0, i) + texto.slice(j);
}

function varrerVazamento(caminho, texto) {
  const achados = [];
  const alvo = semOBlocoDePadroes(caminho, texto);
  for (const { nome, re } of VAZAMENTOS) {
    const m = alvo.match(re);
    if (m) { achados.push(`${nome} (${JSON.stringify(m[0].slice(0, 44))})`); }
  }
  return achados;
}

/* Arquivos de texto sem extensão. O .gitignore é justamente onde caminho de
   máquina costuma aparecer, e sem esta lista ele nunca era lido. */
const TEXTO_SEM_EXTENSAO = new Set(['.gitignore', '.gitattributes', '.nojekyll', 'LICENSE', 'CNAME']);

/* Metadados de imagem: EXIF, XMP e blocos de texto carregam data, câmera,
   GPS, nome de software e, com frequência, o caminho do arquivo original.
   As imagens deste site são geradas por tools/imagens.py e não deveriam ter
   nada disso; a regra existe para o dia em que alguém trocar um arquivo à mão. */
function metadadosDeImagem(nome, bytes) {
  const achados = [];
  if (bytes.length > 8 && bytes.readUInt32BE(0) === 0x89504e47) {
    let p = 8;
    while (p + 8 <= bytes.length) {
      const tam = bytes.readUInt32BE(p);
      const tipo = bytes.toString('latin1', p + 4, p + 8);
      if (['tEXt', 'iTXt', 'zTXt', 'eXIf', 'iCCP', 'tIME'].includes(tipo)) {
        achados.push(`bloco PNG "${tipo}"`);
      }
      if (tipo === 'IEND' || tam > bytes.length) { break; }
      p += 12 + tam;
    }
  } else if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
    let p = 12;
    while (p + 8 <= bytes.length) {
      const tipo = bytes.toString('latin1', p, p + 4);
      const tam = bytes.readUInt32LE(p + 4);
      if (tipo === 'EXIF' || tipo === 'XMP ') { achados.push(`bloco WebP "${tipo.trim()}"`); }
      if (tam > bytes.length) { break; }
      p += 8 + tam + (tam % 2);
    }
  } else if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    if (bytes.includes(Buffer.from('Exif\0\0', 'latin1'))) { achados.push('EXIF em JPEG'); }
  }
  return achados;
}

/* Sequências legíveis dentro de um binário, como o `strings` do POSIX. Varrer
   o binário inteiro produziria casamento aleatório em dado comprimido. */
const legiveisDe = (bytes) =>
  (bytes.toString('latin1').match(/[\x20-\x7e]{6,}/g) || []).join('\n');

let varridosTexto = 0;
let varridosBinarios = 0;

for (const arquivo of arquivosRepo) {
  const nome = arquivo.split(/[\\/]/).pop();
  const ehTexto = PUBLICAVEIS.test(arquivo) || TEXTO_SEM_EXTENSAO.has(nome);

  if (ehTexto) {
    let texto;
    try { texto = readFileSync(arquivo, 'utf8'); } catch { continue; }
    varridosTexto++;
    for (const achado of varrerVazamento(arquivo, texto)) {
      anota(arquivo, `vazamento: ${achado}`);
    }
    continue;
  }

  /* Binário: metadados e o texto legível que houver dentro dele. As fontes
     ficam de fora da varredura de metadado, porque a tabela `name` com o nome
     da fundição é parte legítima do arquivo e a OFL espera que ela esteja lá. */
  let bytes;
  try { bytes = readFileSync(arquivo); } catch { continue; }
  varridosBinarios++;
  if (!/\.(ttf|otf|woff2?)$/i.test(arquivo)) {
    for (const achado of metadadosDeImagem(nome, bytes)) {
      anota(arquivo, `metadado em imagem: ${achado}`);
    }
    for (const achado of varrerVazamento(arquivo, legiveisDe(bytes))) {
      anota(arquivo, `vazamento dentro do binário: ${achado}`);
    }
  }
}

/* Autoteste do recorte. São três asserções, e cada uma fecha um buraco
   diferente que o recorte poderia abrir. */
(function autoteste() {
  const proprio = readFileSync(ESTE, 'utf8');

  /* 1. O arquivo, como está, não vaza. */
  if (varrerVazamento(ESTE, proprio).length) {
    problemas.push('tools/check.mjs: o recorte do bloco de padrões não está funcionando.');
  }

  /* 2. O bloco recortado é PEQUENO e tem a forma esperada. Sem isto, a marca
     de fim poderia migrar numa edição e o recorte engoliria o arquivo. */
  if (blocoRecortado === null) {
    problemas.push(
      `tools/check.mjs: o bloco de padrões passou de ${TETO_DO_BLOCO} bytes, ou as marcas sumiram. ` +
      'O recorte foi desligado e o arquivo inteiro está sendo varrido.');
  } else if (!blocoRecortado.includes('const VAZAMENTOS = [') ||
             !blocoRecortado.includes('const AMOSTRA_DE_TESTE')) {
    problemas.push('tools/check.mjs: o bloco recortado não tem a forma esperada.');
  } else {
    /* 3. Dentro do bloco, um vazamento só é aceitável se estiver DENTRO de um
       literal: as expressões regulares e a amostra de teste. Tirando os
       literais, o que sobra (comentário, nome de variável, código) tem que
       estar limpo. É isso que impede alguém de esconder um caminho de disco
       num comentário dentro da área cega. */
    const semLiterais = blocoRecortado
      .replace(/\/(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*/g, ' ')
      .replace(/'(?:[^'\\]|\\.)*'/g, ' ')
      .replace(/"(?:[^"\\]|\\.)*"/g, ' ');
    for (const { nome, re } of VAZAMENTOS) {
      if (re.test(semLiterais)) {
        problemas.push(`tools/check.mjs: vazamento (${nome}) dentro do bloco recortado, fora de literal.`);
      }
    }
  }

  /* 4. A amostra plantada logo DEPOIS da marca de fim precisa ser encontrada.
     Se não for, o recorte está indo além de onde deveria. */
  const marcaFim = '/* FIM-' + 'PADROES */';
  const plantado = proprio.replace(marcaFim, marcaFim + AMOSTRA_DE_TESTE);
  const encontrados = varrerVazamento(ESTE, plantado);
  if (encontrados.length < 4) {
    problemas.push(
      `tools/check.mjs: o autoteste plantou um vazamento fora do bloco e a varredura achou só ${encontrados.length} de 4.`);
  }
}());

/* ------------------------------------------------------------------ */
/*  2. Telefone                                                        */
/* ------------------------------------------------------------------ */

const TEL_OK = new Set(UNIDADES.map(u => u.telefone));
const E164_OK = new Set(UNIDADES.map(u => u.e164));

for (const arquivo of arquivosRepo) {
  if (!PUBLICAVEIS.test(arquivo)) { continue; }
  let texto;
  try { texto = readFileSync(arquivo, 'utf8'); } catch { continue; }

  for (const m of texto.matchAll(/\(\d{2}\)\s?\d{4,5}-\d{4}/g)) {
    if (!TEL_OK.has(m[0])) { anota(arquivo, `telefone não conferido: ${m[0]}`); }
  }
  for (const m of texto.matchAll(/wa\.me\/(\d+)/g)) {
    if (!E164_OK.has(m[1])) { anota(arquivo, `WhatsApp não conferido: ${m[1]}`); }
  }
  for (const m of texto.matchAll(/tel:\+?(\d+)/g)) {
    if (!E164_OK.has(m[1])) { anota(arquivo, `tel: não conferido: ${m[1]}`); }
  }
}

/* ------------------------------------------------------------------ */
/*  3. .gitignore e material interno                                   */
/* ------------------------------------------------------------------ */

const ignore = existsSync(join(RAIZ, '.gitignore'))
  ? readFileSync(join(RAIZ, '.gitignore'), 'utf8')
  : '';
for (const linha of ['interno/', '.claude/']) {
  if (!ignore.split(/\r?\n/).some(l => l.trim() === linha)) {
    problemas.push(`.gitignore: falta a linha "${linha}", e sem ela material interno vai para o repositório público.`);
  }
}
if (existsSync(join(RAIZ, 'interno')) && !ignore.includes('interno/')) {
  problemas.push('interno/ existe e não está no .gitignore.');
}

/* ------------------------------------------------------------------ */
/*  4. Manifesto, robots, sitemap, llms                                */
/* ------------------------------------------------------------------ */

const indexavel = PUBLICACAO.modo === 'producao';
const rotas = todasAsPaginas().filter(p => !p.arquivo).map(p => p.rota);

const manifesto = join(RAIZ, 'site.webmanifest');
if (!existsSync(manifesto)) {
  problemas.push('site.webmanifest não existe.');
} else {
  let m = null;
  try { m = JSON.parse(readFileSync(manifesto, 'utf8')); }
  catch (e) { anota(manifesto, `JSON inválido: ${e.message}`); }
  if (m) {
    for (const icone of m.icons || []) {
      if (!existsSync(join(RAIZ, icone.src))) { anota(manifesto, `ícone ausente: ${icone.src}`); }
    }
    if (!(m.icons || []).some(i => i.purpose === 'maskable')) {
      avisa(manifesto, 'sem ícone maskable.');
    }
  }
}

const robotsTxt = join(RAIZ, 'robots.txt');
if (!existsSync(robotsTxt)) {
  problemas.push('robots.txt não existe.');
} else {
  const r = readFileSync(robotsTxt, 'utf8');
  if (indexavel && !/^Sitemap:/m.test(r)) { anota(robotsTxt, 'em produção, falta a linha Sitemap.'); }
  /* Em prévia o rastreamento fica LIBERADO e quem barra é o `noindex` da
     página. Com `Disallow: /` o robô não chega a ler a meta, e um endereço
     linkado de fora pode ser indexado só pela URL. A regra abaixo, portanto,
     recusa o `Disallow` — o inverso do que parece intuitivo — e a proteção de
     verdade é a que confere o `noindex` em cada página, logo adiante. */
  if (!indexavel) {
    if (/^Disallow:\s*\/\s*$/m.test(r)) {
      anota(robotsTxt, 'em prévia, `Disallow: /` impede o robô de LER o noindex das páginas.');
    }
    if (/^Sitemap:/m.test(r)) {
      anota(robotsTxt, 'em prévia não deve haver Sitemap: nada aqui deve ser proposto para índice.');
    }
  }
}

const sitemap = join(RAIZ, 'sitemap.xml');
if (!existsSync(sitemap)) {
  problemas.push('sitemap.xml não existe.');
} else {
  const s = readFileSync(sitemap, 'utf8');
  if (!s.includes('http://www.sitemaps.org/schemas/sitemap/0.9')) {
    anota(sitemap, 'espaço de nomes errado.');
  }
  const locs = [...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const rota of rotas) {
    const url = `${CLINICA.origem}/${rota}`;
    if (!locs.includes(url)) { anota(sitemap, `falta a rota ${url}`); }
  }
  for (const loc of locs) {
    if (!loc.startsWith(CLINICA.origem)) { anota(sitemap, `URL fora do domínio: ${loc}`); }
  }
}

const llms = join(RAIZ, 'llms.txt');
if (!existsSync(llms)) {
  problemas.push('llms.txt não existe.');
} else {
  const l = readFileSync(llms, 'utf8');
  for (const u of UNIDADES) {
    if (!l.includes(u.telefone)) { anota(llms, `falta o telefone de ${u.cidade}.`); }
    if (!l.includes(u.enderecoCompleto)) { anota(llms, `falta o endereço de ${u.cidade}.`); }
  }
  if (!indexavel && !/AVISO PARA SISTEMAS AUTOMATIZADOS/.test(l)) {
    anota(llms, 'site em modo proposta e o llms.txt não avisa que esta versão não é oficial.');
  }
}

/* ------------------------------------------------------------------ */
/*  5. As páginas                                                      */
/* ------------------------------------------------------------------ */

const idsPor = new Map();
const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
function idsDoArquivo(arquivo) {
  if (!idsPor.has(arquivo)) { idsPor.set(arquivo, new Set(idsDe(readFileSync(arquivo, 'utf8')))); }
  return idsPor.get(arquivo);
}

/* Largura e altura lidas do proprio arquivo, sem dependencia: o cabecalho
   IHDR do PNG e os blocos VP8X / VP8 / VP8L do WebP. */
function medidasDaImagem(caminho) {
  let b;
  try { b = readFileSync(caminho); } catch { return null; }

  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  }

  if (b.length > 30 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    const tipo = b.toString('latin1', 12, 16);
    if (tipo === 'VP8X') {
      return [
        1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
        1 + (b[27] | (b[28] << 8) | (b[29] << 16))
      ];
    }
    if (tipo === 'VP8 ') {
      return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    }
    if (tipo === 'VP8L') {
      const n = b.readUInt32LE(21);
      return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)];
    }
  }
  return null;
}

const canonicas = new Map();

/* Caminho de arquivo a partir de um href. Trata os dois casos: relativo (todas
   as páginas) e absoluto (só a 404, que é servida em qualquer endereço e por
   isso não pode usar caminho relativo). */
const PREFIXO = new URL(CLINICA.origem).pathname.replace(/\/*$/, '/');
function resolverCaminho(pasta, href) {
  if (!href.startsWith('/')) { return join(pasta, href); }
  if (!href.startsWith(PREFIXO)) { return null; }
  return join(RAIZ, href.slice(PREFIXO.length));
}

for (const arquivo of arquivosSite) {
  const html = readFileSync(arquivo, 'utf8');
  const pasta = dirname(arquivo);

  /* -- cabeça -- */
  if (!/<html lang="pt-BR"/.test(html)) { anota(arquivo, 'falta lang="pt-BR" no <html>.'); }

  const titulo = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  if (!titulo) { anota(arquivo, 'sem <title>.'); }
  else if (titulo.length > 65) { avisa(arquivo, `title com ${titulo.length} caracteres: o buscador corta perto de 60.`); }

  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!desc) { anota(arquivo, 'sem meta description.'); }
  else if (desc.length < 70 || desc.length > 175) {
    avisa(arquivo, `meta description com ${desc.length} caracteres (o bom fica entre 70 e 175).`);
  }

  /* A 404 é a exceção, e de propósito: ela é servida em qualquer caminho, e
     uma canonical apontando todas elas para a raiz faria a raiz ser indexada
     como página de erro. */
  const eh404 = arquivo.endsWith('404.html');
  const canonica = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!canonica && !eh404) { anota(arquivo, 'sem canonical.'); }
  else if (canonica && eh404) { anota(arquivo, 'a 404 não deve ter canonical.'); }
  else if (canonica) {
    if (canonicas.has(canonica)) {
      anota(arquivo, `canonical repetida com ${rel(canonicas.get(canonica))}: ${canonica}`);
    }
    canonicas.set(canonica, arquivo);
  }

  const robots = (html.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || '';
  if (!indexavel && !robots.includes('noindex')) {
    anota(arquivo, 'site em modo proposta e a página NÃO traz noindex.');
  }
  if (indexavel && robots.includes('noindex')) {
    anota(arquivo, 'site em produção e a página traz noindex.');
  }

  /* `og:url` não entra na 404 pelo mesmo motivo da canonical: ela é servida em
     qualquer caminho, e apontar para a raiz faz o card do link quebrado virar
     o card da home. */
  for (const prop of ['og:title', 'og:description', 'og:image', 'og:type']) {
    if (!html.includes(`property="${prop}"`)) { anota(arquivo, `falta ${prop}.`); }
  }
  if (!eh404 && !html.includes('property="og:url"')) { anota(arquivo, 'falta og:url.'); }
  if (eh404 && html.includes('property="og:url"')) { anota(arquivo, 'a 404 não deve ter og:url.'); }

  /* -- política de segurança -- */
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/) || [])[1];
  if (!csp) {
    anota(arquivo, 'sem Content-Security-Policy.');
  } else {
    if (!csp.includes("default-src 'none'")) { anota(arquivo, "CSP sem default-src 'none'."); }
    if (/unsafe-inline|unsafe-eval/.test(csp)) { anota(arquivo, 'CSP com unsafe-inline ou unsafe-eval.'); }
    /* Regra invertida, de propósito: em <meta> o navegador IGNORA estas três
       diretivas e ainda registra erro no console. Ver README. */
    for (const proibida of ['frame-ancestors', 'sandbox', 'report-uri', 'report-to']) {
      if (csp.includes(proibida)) {
        anota(arquivo, `CSP em <meta> com "${proibida}": o navegador ignora e registra erro no console.`);
      }
    }
  }

  /* -- nada em linha -- */
  if (/<style[\s>]/.test(html)) { anota(arquivo, '<style> em linha: a CSP bloqueia.'); }
  for (const m of html.matchAll(/<script([^>]*)>/g)) {
    const attrs = m[1];
    if (attrs.includes('application/ld+json')) { continue; }
    if (!/\ssrc=/.test(attrs)) { anota(arquivo, '<script> em linha sem src: a CSP bloqueia.'); }
  }

  /* -- dado estruturado -- */
  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocos.length) { anota(arquivo, 'sem JSON-LD.'); }
  for (const b of blocos) {
    try {
      const dado = JSON.parse(b[1]);
      const grafo = dado['@graph'] || [dado];
      const tipos = grafo.map(n => [].concat(n['@type']).join('/'));
      if (!tipos.some(t => t.includes('Organization'))) { anota(arquivo, 'JSON-LD sem Organization.'); }
      if (!tipos.some(t => t.includes('Dentist'))) { anota(arquivo, 'JSON-LD sem Dentist.'); }
      if (!tipos.some(t => t.includes('MedicalProcedure'))) { anota(arquivo, 'JSON-LD sem MedicalProcedure.'); }
      /* Toda referência `@id` tem que resolver dentro do MESMO grafo. Uma
         referência solta não é erro de sintaxe: o consumidor simplesmente não
         encontra a entidade e a página perde a ligação que a marcação existia
         para criar. */
      const declarados = new Set(grafo.map(n => n['@id']).filter(Boolean));
      const referenciados = [];
      (function procurar(no) {
        if (Array.isArray(no)) { no.forEach(procurar); return; }
        if (!no || typeof no !== 'object') { return; }
        const chaves = Object.keys(no);
        if (chaves.length === 1 && chaves[0] === '@id') { referenciados.push(no['@id']); return; }
        for (const k of chaves) { procurar(no[k]); }
      }(grafo));
      for (const ref of new Set(referenciados)) {
        if (!declarados.has(ref)) { anota(arquivo, `JSON-LD: referência @id sem nó correspondente: ${ref}`); }
      }

      /* O telefone de cada unidade no dado estruturado precisa ser o dela. Um
         número trocado aqui é pior que no texto: o buscador e o assistente de
         IA leem daqui com autoridade. */
      for (const no of grafo) {
        if (![].concat(no['@type']).includes('Dentist')) { continue; }
        const dona = UNIDADES.find(x => no['@id'] && no['@id'].includes(`/unidades/${x.slug}/`));
        if (!dona) { anota(arquivo, `nó Dentist com @id fora das unidades: ${no['@id']}`); continue; }
        if (no.telephone !== `+${dona.e164}`) {
          anota(arquivo, `JSON-LD: a unidade de ${dona.cidade} está com o telefone ${no.telephone}, e devia ser +${dona.e164}.`);
        }
        const rua = no.address && no.address.streetAddress;
        if (rua !== `${dona.logradouro}, ${dona.numero}`) {
          anota(arquivo, `JSON-LD: a unidade de ${dona.cidade} está com o endereço "${rua}".`);
        }
      }

      for (const no of grafo) {
        if (no['@type'] === 'FAQPage') {
          for (const q of no.mainEntity || []) {
            if (!q.acceptedAnswer || !q.acceptedAnswer.text) {
              anota(arquivo, `FAQPage com pergunta sem resposta: ${q.name}`);
            }
          }
        }
      }
    } catch (e) {
      anota(arquivo, `JSON-LD inválido: ${e.message}`);
    }
  }

  /* -- estrutura -- */
  const h1 = [...html.matchAll(/<h1[\s>]/g)].length;
  if (h1 !== 1) { anota(arquivo, `${h1} elementos h1 (tem que ser exatamente 1).`); }

  /* Salto de nível: h2 antes de h1, h4 sem h3 acima. */
  const niveis = [...html.matchAll(/<h([1-4])[\s>]/g)].map(m => Number(m[1]));
  let anterior = 0;
  for (const n of niveis) {
    if (anterior && n > anterior + 1) {
      avisa(arquivo, `salto de título: h${anterior} seguido de h${n}.`);
      break;
    }
    anterior = n;
  }

  /* -- imagens -- */
  for (const m of html.matchAll(/<img\b([^>]*)>/g)) {
    const a = m[1];
    if (!/\salt=/.test(a)) { anota(arquivo, `<img> sem alt: ${a.slice(0, 70)}`); }
    const larg = Number((a.match(/\swidth="(\d+)"/) || [])[1]);
    const alt = Number((a.match(/\sheight="(\d+)"/) || [])[1]);
    if (!larg || !alt) {
      anota(arquivo, `<img> sem width/height, o que causa salto de layout: ${a.slice(0, 70)}`);
    }
    const src = (a.match(/\ssrc="([^"]+)"/) || [])[1];
    if (src && !/^(https?:|data:)/.test(src)) {
      const alvo = resolverCaminho(pasta, src);
      if (!alvo || !existsSync(alvo)) {
        anota(arquivo, `imagem inexistente: ${src}`);
      } else if (larg && alt) {
        /* As medidas declaradas TÊM que ser as do arquivo. Elas vêm de
           src/dados.mjs escritas à mão, enquanto o arquivo sai de
           tools/imagens.py: os dois podem se descolar em silêncio, e o efeito
           é a imagem esticada mais o salto de layout que o width/height
           existia para evitar. */
        const real = medidasDaImagem(alvo);
        if (real && (real[0] !== larg || real[1] !== alt)) {
          anota(arquivo, `<img src="${src}"> declara ${larg}x${alt} e o arquivo tem ${real[0]}x${real[1]}.`);
        }
      }
    }
  }

  /* -- SVG: o ícone que não existia -- */
  for (const m of html.matchAll(/<svg\b[^>]*>([\s\S]*?)<\/svg>/g)) {
    const dentro = m[1];
    const solto = dentro.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
    /* Texto solto dentro de <svg> não é desenhado e não deixa rastro. A
       exceção é <title>/<desc>, cujo conteúdo é removido acima junto com as
       marcações; o que sobra tem que ser vazio. */
    if (solto.length > 0 && !/<(title|desc|text)[\s>]/.test(dentro)) {
      anota(arquivo, `texto solto dentro de <svg>, que o navegador não desenha: ${JSON.stringify(solto.slice(0, 50))}`);
    }
    for (const p of dentro.matchAll(/\sd="([^"]+)"/g)) {
      if (/\d+\.\d+\.\d+/.test(p[1])) {
        anota(arquivo, 'caminho SVG com número colado em número (dois pontos decimais seguidos).');
      }
    }
  }

  /* -- links -- */
  for (const m of html.matchAll(/<a\b([^>]*)>/g)) {
    const a = m[1];
    const href = (a.match(/\shref="([^"]+)"/) || [])[1];
    if (!href) { anota(arquivo, `<a> sem href: ${a.slice(0, 60)}`); continue; }

    if (/^https?:/.test(href)) {
      if (a.includes('target="_blank"') && !/rel="[^"]*noopener/.test(a)) {
        anota(arquivo, `link externo com target="_blank" sem rel="noopener": ${href.slice(0, 60)}`);
      }
      continue;
    }
    if (/^(tel:|mailto:)/.test(href)) { continue; }

    if (href.startsWith('#')) {
      if (href.length > 1 && !idsDoArquivo(arquivo).has(decodeURIComponent(href.slice(1)))) {
        anota(arquivo, `âncora sem destino: ${href}`);
      }
      continue;
    }

    const [caminho, ancora] = href.split('#');
    /* A 404 usa caminho absoluto, porque é servida em qualquer endereço. Aqui
       ele é resolvido contra a raiz do repositório, descontado o prefixo do
       endereço de publicação. */
    let alvo = resolverCaminho(pasta, caminho);
    if (!alvo) {
      anota(arquivo, `caminho absoluto fora do prefixo de publicação (${PREFIXO}): ${href}`);
      continue;
    }
    if (caminho === '' || caminho.endsWith('/')) { alvo = join(alvo, 'index.html'); }
    if (!existsSync(alvo)) {
      anota(arquivo, `link interno quebrado: ${href}`);
    } else if (ancora && alvo.endsWith('.html') && !idsDoArquivo(alvo).has(decodeURIComponent(ancora))) {
      anota(arquivo, `âncora sem destino em ${rel(alvo)}: #${ancora}`);
    }
  }

  /* -- recursos -- */
  /* Só os <link> que CARREGAM alguma coisa. `canonical` aponta para o endereço
     público de propósito, e não é requisição. */
  for (const m of html.matchAll(/<link\b([^>]*)>/g)) {
    const attrs = m[1];
    const tipo = (attrs.match(/\srel="([^"]+)"/) || [])[1] || '';
    if (!/stylesheet|preload|icon|manifest/.test(tipo)) { continue; }
    const href = (attrs.match(/\shref="([^"]+)"/) || [])[1];
    if (!href) { anota(arquivo, `<link rel="${tipo}"> sem href.`); continue; }
    if (/^https?:/.test(href)) { anota(arquivo, `<link rel="${tipo}"> para terceiro: ${href}`); continue; }
    const alvoLink = resolverCaminho(pasta, href);
    if (!alvoLink || !existsSync(alvoLink)) { anota(arquivo, `<link rel="${tipo}"> para arquivo inexistente: ${href}`); }
  }
  for (const m of html.matchAll(/<script[^>]*src="([^"]+)"/g)) {
    const src = m[1];
    if (/^https?:/.test(src)) { anota(arquivo, `<script> de terceiro: ${src}`); continue; }
    const alvoJs = resolverCaminho(pasta, src);
    if (!alvoJs || !existsSync(alvoJs)) { anota(arquivo, `<script> inexistente: ${src}`); }
  }

  /* -- terceiros -- */
  for (const m of html.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
    const dominio = m[1].toLowerCase();
    const permitidos = [
      'www.instagram.com', 'wa.me', 'www.google.com', 'schema.org',
      'www.w3.org', 'www.sitemaps.org', 'filipejefte.github.io',
      CLINICA.dominioAnterior, CLINICA.dominioProprio
    ];
    if (!permitidos.includes(dominio)) {
      anota(arquivo, `domínio de terceiro não previsto: ${dominio}`);
    }
  }
  if (/googletagmanager|google-analytics|facebook\.net|fbq\(|gtag\(|hotjar|clarity\.ms/i.test(html)) {
    anota(arquivo, 'rastreador encontrado.');
  }
}

/* Toda rota planejada virou arquivo. */
for (const rota of rotas) {
  const alvo = join(RAIZ, rota, 'index.html');
  if (!existsSync(alvo)) { problemas.push(`rota sem arquivo: /${rota}`); }
}
if (!existsSync(join(RAIZ, '404.html'))) { problemas.push('404.html não existe.'); }
if (!existsSync(join(RAIZ, '.nojekyll'))) { problemas.push('.nojekyll não existe: o Pages vai rodar Jekyll.'); }

/* ------------------------------------------------------------------ */
/*  6. Folha de estilo, fontes e contraste                             */
/* ------------------------------------------------------------------ */

const folha = join(RAIZ, 'assets', 'css', 'site.css');
if (!existsSync(folha)) {
  problemas.push('assets/css/site.css não existe.');
} else {
  const css = readFileSync(folha, 'utf8');

  for (const m of css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
    const u = m[1];
    if (/^https?:|^\/\//.test(u)) { anota(folha, `url() para terceiro: ${u}`); continue; }
    if (u.startsWith('data:')) { continue; }
    if (!existsSync(resolve(dirname(folha), u))) { anota(folha, `url() para arquivo inexistente: ${u}`); }
  }
  if (/@import\s+url\(['"]?https?:/.test(css)) { anota(folha, '@import de terceiro.'); }

  /* Contraste, calculado dos valores declarados.

     SÓ O PRIMEIRO BLOCO `:root`. Varrer a folha inteira guardava a ÚLTIMA
     ocorrência de cada variável, e o bloco `@media (prefers-contrast: more)`
     redeclara quatro delas: o verificador passou a medir cores que ninguém vê
     por padrão e deu "tudo certo" para um par que reprovava de verdade. */
  const raizCss = css.match(/:root\s*\{([\s\S]*?)\}/);
  const vars = {};
  if (!raizCss) {
    anota(folha, 'não achei o bloco :root para conferir o contraste.');
  } else {
    for (const m of raizCss[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) {
      vars[m[1]] = m[2];
    }
  }

  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
  };
  const razao = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  const PARES = [
    ['tinta', 'porcelana', 4.5, 'texto principal sobre o fundo'],
    ['tinta-2', 'porcelana', 4.5, 'texto secundário sobre o fundo'],
    ['tinta-3', 'porcelana', 4.5, 'texto terciário sobre o fundo'],
    ['tinta-2', 'areia', 4.5, 'texto secundário sobre a faixa clara'],
    ['tinta-3', 'areia', 4.5, 'texto terciário sobre a faixa clara'],
    ['ouro-tinta', 'porcelana', 4.5, 'rótulo em ouro sobre o fundo'],
    ['ouro-tinta', 'areia', 4.5, 'rótulo em ouro sobre a faixa clara'],
    ['ouro-tinta', 'papel', 4.5, 'rótulo em ouro sobre o cartão'],
    ['ouro-esc', 'porcelana', 3.0, 'itálico do título em ouro (texto grande)'],
    ['ouro-esc', 'areia', 3.0, 'itálico do título em ouro na faixa clara'],
    ['tinta-clara', 'noite', 4.5, 'texto claro sobre a faixa escura'],
    ['tinta-clara-2', 'noite', 4.5, 'texto secundário sobre a faixa escura'],
    ['tinta-clara-2', 'noite-2', 4.5, 'texto secundário sobre o rodapé'],
    ['tinta-3-escura', 'noite-2', 4.5, 'texto legal do rodapé'],
    ['tinta-3', 'areia-2', 4.5, 'legenda sobre o painel do retrato'],
    ['linha-botao', 'porcelana', 3.0, 'borda do botão vazado (componente)'],
    ['linha-botao-escura', 'noite', 3.0, 'borda do botão vazado na faixa escura'],
    ['ouro', 'noite', 3.0, 'rótulo em ouro dentro da caixa de agendamento'],
    ['ouro', 'noite', 4.5, 'ouro sobre a faixa escura'],
    ['ouro', 'noite-2', 4.5, 'ouro sobre o rodapé']
  ];

  for (const [frente, fundo, minimo, onde] of PARES) {
    if (!vars[frente] || !vars[fundo]) {
      anota(folha, `par de contraste sem variável declarada: --${frente} sobre --${fundo}`);
      continue;
    }
    const r = razao(vars[frente], vars[fundo]);
    if (r < minimo) {
      anota(folha, `contraste ${r.toFixed(2)}:1 abaixo de ${minimo}:1 — ${onde} (--${frente} sobre --${fundo}).`);
    }
  }

  /* A tinta do botão de ouro é literal na folha, não é variável. */
  if (vars['ouro-esc'] && vars['ouro']) {
    for (const parada of ['ouro', 'ouro-esc']) {
      const r = razao('#1B1608', vars[parada]);
      if (r < 4.5) {
        anota(folha, `tinta do botão sobre --${parada}: ${r.toFixed(2)}:1, abaixo de 4.5:1.`);
      }
    }
  }
}

for (const fonte of ['hanken.woff2', 'cormorant.woff2', 'cormorant-italico.woff2']) {
  const f = join(RAIZ, 'assets', 'fonts', fonte);
  if (!existsSync(f)) { problemas.push(`assets/fonts/${fonte} não existe: rode node tools/fontes.mjs.`); }
  else if (statSync(f).size > 60 * 1024) { avisa(f, `${Math.round(statSync(f).size / 1024)} KB é muito para uma fonte recortada.`); }
}

/* Licenças das fontes, que a OFL exige distribuir junto. */
for (const licenca of ['OFL-hanken.txt', 'OFL-cormorant.txt']) {
  if (!existsSync(join(RAIZ, 'assets', 'fonts', licenca))) {
    problemas.push(`assets/fonts/${licenca} não existe, e a OFL exige distribuir a licença junto da fonte.`);
  }
}

/* ------------------------------------------------------------------ */
/*  7. Cobertura do conteúdo                                           */
/* ------------------------------------------------------------------ */

for (const t of TRATAMENTOS) {
  const alvo = join(RAIZ, 'tratamentos', t.slug, 'index.html');
  if (!existsSync(alvo)) { problemas.push(`tratamento sem página: ${t.slug}`); continue; }
  const html = readFileSync(alvo, 'utf8');
  if (!html.includes(t.resposta.slice(0, 60))) {
    anota(alvo, 'a resposta curta do tratamento não está na página.');
  }
  if (!existsSync(join(RAIZ, 'assets', 'img', `ico-${t.icone}.webp`))) {
    problemas.push(`ícone ausente: assets/img/ico-${t.icone}.webp`);
  }
}
for (const u of UNIDADES) {
  const alvo = join(RAIZ, 'unidades', u.slug, 'index.html');
  if (!existsSync(alvo)) { problemas.push(`unidade sem página: ${u.slug}`); continue; }
  const html = readFileSync(alvo, 'utf8');
  if (!html.includes(u.telefone)) { anota(alvo, `a página não traz o telefone de ${u.cidade}.`); }
  /* O número da outra unidade PODE aparecer, mas só onde está identificado
     como sendo dela: no bloco final da página e no rodapé, que lista as duas.
     Antes disso a página fala de uma unidade só, e é aí que trocar o número
     produz o erro que o diagnóstico encontrou no site atual. */
  const outra = UNIDADES.find(x => x.id !== u.id);
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  const corte = texto.indexOf('Também atendemos em');
  const cabeca = corte > 0 ? texto.slice(0, corte) : texto;
  for (const m of cabeca.matchAll(new RegExp('(.{0,80})' + outra.telefone.replace(/[()]/g, '\\$&'), 'g'))) {
    if (!new RegExp(`unidade de ${outra.cidade}`, 'i').test(m[1])) {
      anota(alvo, `o telefone de ${outra.cidade} aparece no corpo da página de ${u.cidade} sem estar identificado como dela: ${JSON.stringify(m[1].slice(-50))}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Saída                                                              */
/* ------------------------------------------------------------------ */

const totalHtml = arquivosSite.length;
console.log('');
console.log(`  ${totalHtml} páginas, ${arquivosRepo.length} arquivos no repositório`);
console.log(`  varredura de vazamento: ${varridosTexto} arquivos de texto e ${varridosBinarios} binários`);
console.log(`  modo: ${PUBLICACAO.modo}, ${VAZAMENTOS.length} padrões` +
  ` (${identificadoresCarregados} da máquina de trabalho)`);
console.log('');

if (avisos.length) {
  console.log(`  ${avisos.length} aviso(s):`);
  for (const a of avisos) { console.log(`    · ${a}`); }
  console.log('');
}

if (problemas.length) {
  console.error(`  ${problemas.length} PROBLEMA(S):`);
  for (const p of problemas) { console.error(`    ✗ ${p}`); }
  console.error('');
  process.exit(1);
}

console.log('  Tudo certo.');
console.log('');
void posix;
