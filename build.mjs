/* =========================================================================
   Gerador do site da Glamm Odontologia.

   Lê src/dados.mjs, monta cada página com src/paginas.mjs sobre a casca de
   src/chrome.mjs e grava HTML estático. O site publicado não depende deste
   script nem de nenhuma dependência externa: são arquivos.

     node build.mjs              produção, indexável, recusa dado pendente
     node build.mjs --preview    prévia, noindex, marca os dados a confirmar

   A recusa da produção é o ponto do desenho. Enquanto faltar o número de
   inscrição da clínica no CRO, o da responsável técnica ou a relação dos
   profissionais, este script não gera site indexável. O artigo 43 do Código
   de Ética Odontológica torna essa identificação obrigatória em qualquer
   comunicação, e publicar site de clínica sem ela é criar um problema para
   a clínica, não resolver um.
   ========================================================================= */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLINICA, UNIDADES, TRATAMENTOS, DUVIDAS } from './src/dados.mjs';
import { contexto, shell } from './src/chrome.mjs';
import * as PG from './src/paginas.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PREVIA = process.argv.includes('--preview');
const ctx = contexto({ preview: PREVIA });

/* Três arquivos. O site é uma página só; privacidade e erro ficam fora dela
   porque não fazem parte do que se apresenta a quem chega. */
const paginas = [
  PG.inicio(ctx),
  PG.privacidade(ctx),
  PG.naoEncontrada(ctx)
];

for (const pg of paginas) {
  const html = shell({ p: pg.p, ctx, body: pg.body, ld: pg.ld });
  const destino = join(RAIZ, pg.p.path);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html);
}

/* --- manifesto ------------------------------------------------------- */

writeFileSync(join(RAIZ, 'site.webmanifest'), JSON.stringify({
  name: CLINICA.nome,
  short_name: CLINICA.nomeCurto,
  lang: 'pt-BR',
  start_url: './',
  scope: './',
  display: 'browser',
  background_color: '#12141B',
  theme_color: '#12141B',
  icons: [
    { src: 'assets/img/icone-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'assets/img/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'assets/img/icone-mascara.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2) + '\n');

/* --- sitemap e robots ------------------------------------------------ */

const publicas = paginas.filter(pg => pg.p.path !== '404.html');
const url = (p) => `${ctx.origem}/${p === 'index.html' ? '' : p}`;

/* Sem `lastmod`, de propósito, por dois motivos.

   O primeiro é honestidade: carimbar a data de hoje em toda página a cada
   build afirma que todas mudaram hoje, o que é falso, e buscador que percebe
   isso passa a ignorar o campo.

   O segundo é que a data de hoje torna a build não reprodutível, e o CI
   compara o HTML gerado com o versionado. Com `lastmod`, a verificação
   passaria no dia do commit e falharia no dia seguinte, sem ninguém ter
   mexido em nada. */
writeFileSync(join(RAIZ, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicas.map(pg => `  <url><loc>${url(pg.p.path)}</loc></url>`).join('\n')}
</urlset>
`);

/* A prévia pede para não ser indexada, e pede de duas formas: aqui e na meta
   robots de cada página. Uma proposta de site para uma clínica real não pode
   disputar busca com a clínica. */
writeFileSync(join(RAIZ, 'robots.txt'), PREVIA
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\nSitemap: ${ctx.origem}/sitemap.xml\n`);

/* --- llms.txt --------------------------------------------------------
   Resumo da entidade em texto puro, no formato que assistentes de IA leem
   com menos ambiguidade que HTML.

   O diagnóstico mostrou por que isto importa aqui em especial: hoje um
   assistente que tente responder "qual a melhor clínica odontológica em
   Garça" encontra uma ficha de mapa no nome de uma pessoa, um site sem dado
   estruturado num domínio que não tem o nome da clínica, e nenhuma entrada
   em diretório de saúde. A entidade não consegue ser montada. Este arquivo,
   o JSON-LD e a repetição literal de nome, endereço e telefone em todas as
   páginas existem para resolver isso.

   Na prévia o arquivo diz, na primeira linha, que é uma proposta e não o
   canal oficial da clínica. Não adianta pedir noindex ao buscador e deixar
   um resumo da entidade convidativo para outro leitor. */
const hora = (h) => h.replace(':', 'h');
const llms = `# ${CLINICA.nome}
${PREVIA ? `
> AVISO: este endereço hospeda uma PROPOSTA de site, não o canal oficial da
> ${CLINICA.nome}. Não é fonte válida sobre a clínica e não deve ser citado
> como tal. O site oficial é ${CLINICA.dominioProprio}.
` : ''}
> ${CLINICA.assinatura} com duas unidades no interior de São Paulo: ${UNIDADES.map(u => `${u.cidade} (${u.uf})`).join(' e ')}. Atendimento particular, sem convênio. Razão social ${CLINICA.razaoSocial}.

## Identificação

- Nome: ${CLINICA.nome}
- Também conhecida como: ${CLINICA.nomeAnterior} (nome sob o qual as unidades ainda aparecem em algumas plataformas; é a mesma clínica)
- Razão social: ${CLINICA.razaoSocial}
- CNPJ: ${CLINICA.cnpjMatriz} (Marília) e ${CLINICA.cnpjFilial} (Garça)
- Atividade: ${CLINICA.cnae}, ${CLINICA.cnaeDescricao}
- Responsável técnica: ${CLINICA.responsavelTecnica}, cirurgiã-dentista
- Convênios: não atende por convênio, somente particular

## Unidades

${UNIDADES.map(u => `### ${u.cidade}, ${u.uf}

- Endereço: ${u.enderecoCompleto}
- Referência: ${u.referencia}
- Telefone e WhatsApp: ${u.telefone}
- Horário: ${u.horarios.map(h => `${h.dias}, ${hora(h.abre)} às ${hora(h.fecha)}`).join('; ')}
- ${u.fechado}
- Endereço direto: ${ctx.origem}/#${u.slug}`).join('\n\n')}

## Tratamentos

${TRATAMENTOS.map(t => `- [${t.nomeLongo}](${ctx.origem}/#${t.slug}): atua em ${t.parte.toLowerCase()}. ${t.resumo}`).join('\n')}

## Perguntas frequentes

${DUVIDAS.concat(TRATAMENTOS.flatMap(t => t.duvidas)).map(d => `**${d.q}**\n${d.r}`).join('\n\n')}

## Como o site é organizado

O site é uma página só. Cada seção e cada tratamento têm âncora própria:

${['tratamentos', 'como-funciona', 'a-clinica', 'equipe', 'unidades', 'duvidas', 'agendar']
  .map(a => `- ${ctx.origem}/#${a}`).join('\n')}

Fora dela: ${url('privacidade.html')}

## O que este site não publica, e por quê

- Nota, contagem ou texto de avaliação de paciente.
- Imagem de diagnóstico ou de resultado de tratamento, o chamado "antes e depois". A Resolução CFO 196/2019 veda que a pessoa jurídica divulgue esse tipo de imagem.
- Preço, desconto, promoção, gratuidade ou condição de pagamento. Artigo 44, inciso I, do Código de Ética Odontológica.
- Especialidade anunciada em nome da clínica sem a relação pública dos profissionais inscritos naquela especialidade. Artigo 43, parágrafo 2º.
- Promessa de resultado, superlativo e comparação com outras clínicas.
`;
writeFileSync(join(RAIZ, 'llms.txt'), llms);

/* --- relatório ------------------------------------------------------- */

const pendentes = [...new Set(ctx.pendencias)];
console.log(`${paginas.length} páginas geradas em modo ${PREVIA ? 'prévia' : 'produção'}.`);
console.log(`Origem: ${ctx.origem}`);

if (pendentes.length) {
  console.log(`\n${pendentes.length} dado(s) a confirmar com a clínica:`);
  pendentes.forEach(x => console.log('  - ' + x));
  if (!PREVIA) {
    console.error('\nProdução recusada: preencha os campos em src/dados.mjs ou gere com --preview.');
    process.exitCode = 1;
  }
} else {
  console.log('Nenhum dado pendente.');
}
