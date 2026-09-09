/* =========================================================================
   Reduz as fontes ao que este site realmente escreve.

   O conjunto de caracteres não é chutado: é lido do HTML já gerado. O script
   varre as páginas, tira as marcações, junta os caracteres que sobraram com
   um conjunto base do português e recorta as fontes exatamente nisso. Se
   amanhã a copy ganhar um caractere novo, basta rodar de novo.

   SÃO DUAS FAMÍLIAS, e o motivo está registrado. A versão anterior deste site
   usava uma só, para economizar peso. O desenho novo apoia a hierarquia numa
   serifada de alto contraste em itálico, que é o acento que a marca já tem no
   manuscrito do logotipo e na chamada do site atual. Isso não se imita com
   peso de uma grotesca. As duas são variáveis e continuam variáveis depois do
   recorte, então o site inteiro roda com três arquivos.

   Fonte hospedada aqui, e não em serviço externo, por dois motivos somados: a
   política de segurança do site não abre para terceiro, e a página de
   privacidade promete que nenhuma requisição sai deste domínio. Promessa que
   depende de CDN não é promessa.

   Depende de python com fontTools e brotli.

   Uso:  node build.mjs --preview  &&  node tools/fontes.mjs
   ========================================================================= */

import { execFileSync } from 'node:child_process';
import { statSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'assets', 'fonts');

/* Conjunto base: o alfabeto do português, pontuação de texto e algarismos.
   Serve de piso, para o recorte não depender só do que a copy de hoje usa. */
const BASE =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  'ÀÁÂÃÄÇÈÉÊÍÏÓÔÕÖÚÜÑàáâãäçèéêíïóôõöúüñ' +
  ' .,;:!?()[]{}\'"/\\|@#$%&*+-=_<>~^`' + ' ‘’“”…ºª°©®–—';

function varrer(dir, acc = []) {
  for (const nome of readdirSync(dir, { withFileTypes: true })) {
    if (nome.isDirectory()) {
      if (['assets', 'src', 'tools', 'interno', 'node_modules', '.git', '.github'].includes(nome.name)) { continue; }
      varrer(join(dir, nome.name), acc);
    } else if (nome.name.endsWith('.html')) {
      acc.push(join(dir, nome.name));
    }
  }
  return acc;
}

/* AS ENTIDADES SÃO DECODIFICADAS, não apagadas. Apagá-las custou o `·` de
   todas as páginas: ele é escrito `&middot;` no rodapé, no topo e em cada
   rótulo de cidade, sumia antes da coleta, ficava de fora do recorte e era
   desenhado pela fonte de reserva do sistema — outro peso, outra altura, no
   separador que aparece em toda página. */
const ENTIDADES = {
  '&middot;': '·', '&nbsp;': '\u00a0', '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&quot;': '"', '&apos;': "'", '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
  '&times;': '×', '&aacute;': 'á', '&eacute;': 'é', '&ccedil;': 'ç'
};

const limpar = (html) => html
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&[a-z]+;/gi, (e) => ENTIDADES[e.toLowerCase()] || ' ');

const ARQUIVOS = varrer(RAIZ);
if (!ARQUIVOS.length) {
  console.error('Nenhum HTML encontrado. Rode `node build.mjs --preview` antes.');
  process.exit(1);
}

function caracteresDoSite() {
  const usados = new Set(BASE);
  for (const arquivo of ARQUIVOS) {
    for (const ch of limpar(readFileSync(arquivo, 'utf8'))) {
      if (ch > ' ') { usados.add(ch); }
    }
  }
  return [...usados].sort().join('');
}

/* O itálico serifado só aparece dentro de <em>, que no desenho deste site é
   sempre o acento de um título. Recortá-lo no conjunto do site inteiro seria
   carregar duzentos glifos para escrever vinte palavras. Aqui o conjunto sai
   exatamente do texto que está dentro de <em> no HTML gerado, mais os
   algarismos, que são o que pode entrar em título de unidade. */
function caracteresDoItalico() {
  const usados = new Set(' 0123456789.,–—');
  for (const arquivo of ARQUIVOS) {
    const html = readFileSync(arquivo, 'utf8');
    for (const achado of html.matchAll(/<em[^>]*>([\s\S]*?)<\/em>/g)) {
      for (const ch of limpar(achado[1])) {
        if (ch > ' ') { usados.add(ch); }
      }
    }
  }
  return [...usados].sort().join('');
}

const FONTES = [
  { origem: 'hanken-var.ttf', destino: 'hanken.woff2', conjunto: 'site' },
  { origem: 'cormorant-var.ttf', destino: 'cormorant.woff2', conjunto: 'site' },
  { origem: 'cormorant-italico-var.ttf', destino: 'cormorant-italico.woff2', conjunto: 'italico' }
];

const py = (codigo) => execFileSync('python', ['-c', codigo], { encoding: 'utf8' });

const CONJUNTOS = {
  site: caracteresDoSite(),
  italico: caracteresDoItalico()
};
console.log(`Recorte lido do HTML gerado: ${CONJUNTOS.site.length} caracteres no site, ` +
  `${CONJUNTOS.italico.length} dentro de <em>.`);

let total = 0;

for (const { origem, destino, conjunto } of FONTES) {
  const entrada = join(DIR, origem);
  const saida = join(DIR, destino);
  const TEXTO = CONJUNTOS[conjunto];

  if (!existsSync(entrada)) {
    console.log(`  ${origem}: ausente, pulando`);
    continue;
  }

  const antes = statSync(entrada).size;

  const codigo = [
    'from fontTools.ttLib import TTFont',
    'from fontTools import subset',
    `f = TTFont(r"${entrada}", lazy=False)`,
    'o = subset.Options()',
    'o.layout_features = ["kern","liga","clig","calt","ccmp","locl","mark","mkmk","rlig"]',
    'o.name_IDs = ["*"]',
    'o.drop_tables = ["DSIG"]',
    'o.retain_gids = False',
    /* Sem isto o recorte descarta as tabelas de variação e a fonte deixa de
       responder ao eixo de peso, virando um peso só. */
    'o.layout_closure = True',
    's = subset.Subsetter(options=o)',
    `s.populate(text=${JSON.stringify(TEXTO)})`,
    's.subset(f)',
    /* Confere que nenhum caractere pedido ficou de fora. */
    'cmap = f.getBestCmap()',
    `faltando = [c for c in ${JSON.stringify(TEXTO)} if ord(c) not in cmap]`,
    'print("FALTANDO:" + "".join(faltando)) if faltando else None',
    /* Confere que a fonte variável continua variável. */
    'print("EIXOS:" + ",".join("%s %g-%g" % (a.axisTag, a.minValue, a.maxValue) for a in f["fvar"].axes) if "fvar" in f else "EIXOS:nenhum")',
    'f.flavor = "woff2"',
    `f.save(r"${saida}")`
  ].join('\n');

  const resposta = py(codigo).trim();
  for (const linha of resposta.split('\n')) {
    if (linha.startsWith('FALTANDO:')) {
      console.log(`  ${destino}: a fonte não tem estes caracteres: ${linha.slice(9)}`);
    } else if (linha.startsWith('EIXOS:')) {
      console.log(`  ${destino.padEnd(26)} eixos: ${linha.slice(6)}`);
    }
  }

  const depois = statSync(saida).size;
  total += depois;
  console.log(`  ${destino.padEnd(26)} ${String(antes).padStart(8)} -> ${String(depois).padStart(6)} bytes  (-${Math.round((1 - depois / antes) * 100)}%)`);
}

console.log(`  ${'TOTAL SERVIDO'.padEnd(26)} ${String(total).padStart(8)} bytes`);
