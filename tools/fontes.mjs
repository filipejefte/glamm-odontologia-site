/* =========================================================================
   Reduz as fontes ao que este site realmente escreve.

   O conjunto de caracteres não é chutado: é lido do HTML já gerado. O script
   varre as páginas, tira as marcações, junta os caracteres que sobraram com
   um conjunto base do português e recorta as fontes exatamente nisso. Se
   amanhã a copy ganhar um caractere novo, basta rodar de novo.

   A Karla é variável e continua variável depois do recorte: o eixo de peso
   é o que dá 400 a 700 sem carregar dois arquivos. A Spectral é estática e
   entra em dois pesos, 400 para texto de display e 600 onde o título precisa
   de mais presença.

   Fonte hospedada aqui, e não em serviço externo, por dois motivos somados:
   a CSP do site não abre para terceiro, e a página de privacidade promete
   que nenhuma requisição sai deste domínio. Promessa que depende de CDN não
   é promessa.

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
  ' .,;:!?()[]{}\'"/\\|@#$%&*+-=_<>~^`' + ' ‘’“”…ºª°©®';

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

function caracteresDoSite() {
  const usados = new Set(BASE);
  for (const arquivo of varrer(RAIZ)) {
    const html = readFileSync(arquivo, 'utf8')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;|&#\d+;/gi, ' ');
    for (const ch of html) {
      if (ch > ' ') { usados.add(ch); }
    }
  }
  return [...usados].sort().join('');
}

const FONTES = [
  { origem: 'karla-var.ttf', destino: 'karla.woff2', variavel: true },
  { origem: 'spectral-400.ttf', destino: 'spectral-400.woff2' },
  { origem: 'spectral-600.ttf', destino: 'spectral-600.woff2' }
];

const py = (codigo) => execFileSync('python', ['-c', codigo], { encoding: 'utf8' });

const TEXTO = caracteresDoSite();
console.log(`Conjunto de recorte: ${TEXTO.length} caracteres, lidos do HTML gerado.`);

for (const { origem, destino, variavel } of FONTES) {
  const entrada = join(DIR, origem);
  const saida = join(DIR, destino);

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
    'o.layout_features = ["kern","liga","clig","calt","ccmp","locl","mark","mkmk","rlig","onum","tnum"]',
    'o.name_IDs = ["*"]',
    'o.drop_tables = ["DSIG"]',
    'o.retain_gids = False',
    /* Sem isto o recorte descarta as tabelas de variação e a Karla deixa de
       responder ao eixo de peso, virando um peso só. */
    variavel ? 'o.layout_closure = True' : '',
    's = subset.Subsetter(options=o)',
    `s.populate(text=${JSON.stringify(TEXTO)})`,
    's.subset(f)',
    /* Confere que nenhum caractere pedido ficou de fora. */
    'cmap = f.getBestCmap()',
    `faltando = [c for c in ${JSON.stringify(TEXTO)} if ord(c) not in cmap]`,
    'print("FALTANDO:" + "".join(faltando)) if faltando else None',
    /* Confere que a fonte variável continua variável. */
    variavel ? 'print("EIXOS:" + ",".join(a.axisTag for a in f["fvar"].axes) if "fvar" in f else "EIXOS:nenhum")' : '',
    'f.flavor = "woff2"',
    `f.save(r"${saida}")`
  ].filter(Boolean).join('\n');

  const resposta = py(codigo).trim();
  for (const linha of resposta.split('\n')) {
    if (linha.startsWith('FALTANDO:')) {
      console.log(`  ${destino}: a fonte não tem estes caracteres: ${linha.slice(9)}`);
    } else if (linha.startsWith('EIXOS:')) {
      console.log(`  ${destino}: eixos variáveis preservados: ${linha.slice(6)}`);
    }
  }

  const depois = statSync(saida).size;
  console.log(`  ${destino.padEnd(20)} ${String(antes).padStart(7)} -> ${String(depois).padStart(6)} bytes  (-${Math.round((1 - depois / antes) * 100)}%)`);
}
