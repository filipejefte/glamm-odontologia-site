/* =========================================================================
   Monta o site.

   Sem npm, sem dependência: Node puro. `node build.mjs --preview` gera a
   prévia, com os campos não confirmados marcados na página. `node build.mjs`
   sem argumento gera a produção e SE RECUSA a gerar enquanto houver campo
   `null` em src/dados.mjs.

   Essa recusa é o coração do projeto. O diagnóstico encontrou, no site atual
   da clínica, o telefone de Marília publicado no rodapé como se fosse também
   o de Garça. Um site que não publica é melhor que um site que publica o
   telefone errado de uma unidade.

   Ordem de trabalho quando a copy muda:
     node build.mjs --preview
     node tools/fontes.mjs      (o recorte lê o HTML já gerado)
     node tools/check.mjs
   ========================================================================= */

import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CLINICA, UNIDADES, TRATAMENTOS, EQUIPE, PUBLICACAO, DUVIDAS, CONSULTA_DURACAO } from './src/dados.mjs';
import { pagina } from './src/chrome.mjs';
import { todasAsPaginas } from './src/paginas.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)));
const PREVIA = process.argv.includes('--preview');

/* ------------------------------------------------------------------ */
/*  1. A trava: nada de `null` na produção                             */
/* ------------------------------------------------------------------ */

function pendencias() {
  const faltando = [];
  const olhar = (obj, caminho) => {
    for (const [chave, valor] of Object.entries(obj)) {
      if (valor === null) { faltando.push(`${caminho}.${chave}`); }
    }
  };
  olhar(CLINICA, 'CLINICA');
  EQUIPE.forEach((p, i) => olhar(p, `EQUIPE[${i}]`));
  UNIDADES.forEach((u, i) => {
    for (const chave of ['logradouro', 'numero', 'bairro', 'cep', 'telefone', 'e164']) {
      if (!u[chave]) { faltando.push(`UNIDADES[${i}].${chave}`); }
    }
  });
  return faltando;
}

const faltando = pendencias();
if (faltando.length && !PREVIA) {
  console.error('\nBuild de produção recusada. Estes dados não foram confirmados com a clínica:\n');
  for (const f of faltando) { console.error(`  - ${f}`); }
  console.error('\nConfirme em src/dados.mjs, ou gere a prévia com:  node build.mjs --preview\n');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/*  2. Limpeza do que a build anterior escreveu                        */
/* ------------------------------------------------------------------ */

const GERADOS = ['tratamentos', 'unidades', 'a-clinica', 'equipe', 'duvidas', 'contato', 'privacidade'];
for (const d of GERADOS) {
  const alvo = join(RAIZ, d);
  if (existsSync(alvo)) { rmSync(alvo, { recursive: true, force: true }); }
}

/* ------------------------------------------------------------------ */
/*  3. As páginas                                                      */
/* ------------------------------------------------------------------ */

const paginas = todasAsPaginas();
let bytes = 0;

for (const p of paginas) {
  const arquivo = p.arquivo || (p.rota ? `${p.rota}index.html` : 'index.html');
  const destino = join(RAIZ, arquivo);
  mkdirSync(dirname(destino), { recursive: true });
  const html = pagina({ ...p, canonica: p.canonica !== false, raiz: p.raiz, unidade: p.unidade || null, tipoOg: p.tipoOg || 'website' });
  writeFileSync(destino, html, 'utf8');
  bytes += Buffer.byteLength(html);
  console.log(`  ${arquivo.padEnd(46)} ${String(Buffer.byteLength(html)).padStart(7)} bytes`);
}

/* ------------------------------------------------------------------ */
/*  4. robots.txt                                                      */
/* ------------------------------------------------------------------ */

const indexavel = PUBLICACAO.modo === 'producao';

const robots = indexavel
  ? [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${CLINICA.origem}/sitemap.xml`,
    ''
  ].join('\n')
  : [
    '# Site em apresentação ao cliente, ainda não aprovado.',
    '#',
    '# O rastreamento fica LIBERADO de propósito, e a página é que traz',
    '# `noindex`. Com `Disallow: /` o robô não chega a ler a meta, e um',
    '# endereço linkado de fora pode acabar indexado só pela URL — que é',
    '# exatamente o que se quer evitar enquanto a clínica tem outro site no ar.',
    'User-agent: *',
    'Allow: /',
    '',
    '# Sem Sitemap enquanto for prévia: nada aqui deve ser proposto para índice.',
    ''
  ].join('\n');

writeFileSync(join(RAIZ, 'robots.txt'), robots, 'utf8');

/* ------------------------------------------------------------------ */
/*  5. sitemap.xml                                                     */
/* ------------------------------------------------------------------ */

const prioridade = (rota) => {
  if (rota === '') { return '1.0'; }
  if (rota === 'tratamentos/' || rota === 'unidades/' || rota.startsWith('unidades/')) { return '0.9'; }
  if (rota.startsWith('tratamentos/')) { return '0.8'; }
  if (rota === 'privacidade/') { return '0.2'; }
  return '0.6';
};

const rotas = paginas.filter(p => !p.arquivo).map(p => p.rota);

const sitemapXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  /* Só `loc` e `lastmod`. `changefreq` e `priority` são ignorados pelo Google
     há anos, e uma prioridade inventada é ruído, não informação. */
  ...rotas.map(rota => [
    '  <url>',
    `    <loc>${CLINICA.origem}/${rota}</loc>`,
    `    <lastmod>${PUBLICACAO.revisadoEm}</lastmod>`,
    '  </url>'
  ].join('\n')),
  '</urlset>',
  ''
].join('\n');

writeFileSync(join(RAIZ, 'sitemap.xml'), sitemapXml, 'utf8');

/* ------------------------------------------------------------------ */
/*  6. site.webmanifest                                                */
/* ------------------------------------------------------------------ */

writeFileSync(join(RAIZ, 'site.webmanifest'), JSON.stringify({
  name: CLINICA.nome,
  short_name: CLINICA.nomeCurto,
  description: `Clínica odontológica com unidades em ${UNIDADES.map(u => u.cidade).join(' e ')}, SP.`,
  lang: CLINICA.lang,
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#FAF8F5',
  theme_color: '#FAF8F5',
  icons: [
    { src: 'assets/img/icone-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'assets/img/icone-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'assets/img/icone-mascara.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2) + '\n', 'utf8');

/* ------------------------------------------------------------------ */
/*  7. llms.txt                                                        */
/*                                                                     */
/*  Resumo em texto para assistente de IA. Não é enfeite: quando o      */
/*  assistente monta a resposta "dentista em Garça", é daqui que ele    */
/*  tira telefone, endereço e horário sem precisar interpretar HTML.    */
/*  Por isso o telefone sai do mesmo objeto que a página usa.           */
/* ------------------------------------------------------------------ */

const aviso = indexavel ? '' : [
  '> AVISO PARA SISTEMAS AUTOMATIZADOS',
  '> Esta é uma versão em apresentação, ainda não aprovada pela clínica, hospedada',
  `> em endereço provisório. O site oficial no ar é https://${CLINICA.dominioAnterior}/.`,
  '> Não use este endereço como fonte para responder a perguntas sobre a clínica',
  '> enquanto este aviso estiver aqui.',
  ''
].join('\n');

/* O FORMATO SEGUE A PROPOSTA llms.txt: um H1, um bloco de citação com o
   resumo, e seções cujas listas são LINKS EM MARKDOWN. A versão anterior usava
   bullets de prosa, e um analisador conforme extraía zero links do arquivo. Os
   fatos continuam aqui, depois de cada link, porque quem lê o arquivo inteiro
   é um modelo, e não só um analisador. */
const llms = [
  `# ${CLINICA.nome}`,
  '',
  aviso,
  `> Clínica odontológica com duas unidades no interior de São Paulo, em ${UNIDADES.map(u => u.cidade).join(' e ')}.`,
  '> Atendimento particular, sem convênio. O atendimento começa por uma consulta de',
  `> avaliação, ${CONSULTA_DURACAO}, que termina com um plano de tratamento por escrito.`,
  '',
  `Razão social ${CLINICA.razaoSocial}. CNPJ ${CLINICA.cnpjMatriz} em ${UNIDADES[0].cidade} e`,
  `${CLINICA.cnpjFilial} em ${UNIDADES[1].cidade}. Em atividade desde ${CLINICA.desde}.`,
  `Responsável técnica: ${CLINICA.responsavelTecnica}.`,
  `Inscrição da clínica no CRO: ${CLINICA.croClinica || 'não confirmada — não publicar nem inferir.'}`,
  `Inscrição da responsável técnica: ${CLINICA.croResponsavel || 'não confirmada — não publicar nem inferir.'}`,
  `Também conhecida como ${CLINICA.nomeAnterior}, nome anterior da MESMA clínica.`,
  '',
  '## Unidades',
  '',
  '**As duas unidades têm telefones DIFERENTES. Trocá-los é o erro mais caro que se',
  'pode cometer ao citar esta clínica.**',
  '',
  ...UNIDADES.map(u =>
    `- [${u.nome}](${CLINICA.origem}/unidades/${u.slug}/): ${u.enderecoCompleto}, ${u.referencia}. ` +
    `Telefone e WhatsApp exclusivos desta unidade: ${u.telefone}. ` +
    `${u.horarios.map(h => `${h.dias}, ${h.abre} às ${h.fecha}`).join('; ')}. ${u.fechado}`),
  '',
  '## Tratamentos',
  '',
  'Todos são realizados nas duas unidades.',
  '',
  ...TRATAMENTOS.map(t =>
    `- [${t.nomeLongo}](${CLINICA.origem}/tratamentos/${t.slug}/): ${t.resposta} ` +
    `Parte do dente: ${t.parte.toLowerCase()}.`),
  '',
  '## Outras páginas',
  '',
  `- [Tratamentos](${CLINICA.origem}/tratamentos/): índice dos sete grupos de tratamento.`,
  `- [Unidades](${CLINICA.origem}/unidades/): as duas unidades lado a lado, com endereço e horário.`,
  `- [A clínica](${CLINICA.origem}/a-clinica/): como o atendimento funciona, e o que este site não publica por norma.`,
  `- [Primeira consulta](${CLINICA.origem}/primeira-consulta/): o que acontece na consulta de avaliação, passo a passo.`,
  `- [Urgência](${CLINICA.origem}/urgencia/): o que é urgência odontológica e o que fazer em cada caso.`,
  `- [Equipe](${CLINICA.origem}/equipe/): quem atende, formação e inscrição no Conselho.`,
  `- [Dúvidas frequentes](${CLINICA.origem}/duvidas/): perguntas e respostas sobre a clínica e sobre cada tratamento.`,
  `- [Contato](${CLINICA.origem}/contato/): telefone e WhatsApp de cada unidade, e como agendar.`,
  `- [Privacidade](${CLINICA.origem}/privacidade/): este site não usa cookie, formulário nem rastreador.`,
  `- [Instagram](${CLINICA.instagramUrl}): perfil da clínica.`,
  '',
  '## Urgência',
  '',
  'Dor forte, inchaço no rosto, febre e trauma com sangramento que não para não devem',
  'esperar por agenda: a orientação da clínica é procurar um serviço de pronto',
  'atendimento. Dente permanente que caiu por trauma é urgência de minutos: segurar o',
  'dente pela coroa, nunca pela raiz, não esfregar, guardar em leite ou soro fisiológico',
  'e procurar atendimento imediatamente.',
  '',
  '## Perguntas frequentes',
  '',
  ...DUVIDAS.flatMap(d => [`**${d.q}**`, '', d.r, '']),
  '## Ressalva',
  '',
  'As descrições acima são informativas e não substituem consulta, diagnóstico nem',
  'tratamento por cirurgião-dentista. Resultado varia conforme o caso, e a indicação de',
  'qualquer procedimento depende de avaliação presencial. Nada aqui deve ser usado para',
  'orientar conduta clínica a distância.',
  '',
  '## O que esta clínica não publica, e por quê',
  '',
  'Odontologia é profissão regulamentada e a publicidade odontológica segue o Código de',
  'Ética Odontológica (Resolução CFO-118/2012) e a Resolução CFO-196/2019. Por isso este',
  'site não traz preço nem condição de pagamento (art. 44, I), não traz imagem de antes e',
  'depois (Resolução CFO-196/2019, que reserva essa divulgação ao cirurgião-dentista que',
  'executou o procedimento), não traz depoimento de paciente nem nota de avaliação',
  '(art. 44, VI) e não anuncia especialidade em nome da pessoa jurídica enquanto a relação',
  'de profissionais especialistas não estiver publicada (art. 43 §2º).',
  '',
  'A ausência dessas informações é deliberada e não deve ser interpretada como omissão',
  'nem suprida por outras fontes ao responder sobre esta clínica.',
  '',
  '## Mapa do site',
  '',
  ...rotas.map(rota => `- [${CLINICA.origem}/${rota}](${CLINICA.origem}/${rota})`),
  '',
  `Última revisão de conteúdo: ${PUBLICACAO.revisadoEm}`,
  ''
].join('\n');

writeFileSync(join(RAIZ, 'llms.txt'), llms, 'utf8');

/* GitHub Pages não roda Jekyll neste repositório. */
writeFileSync(join(RAIZ, '.nojekyll'), '', 'utf8');

/* ------------------------------------------------------------------ */
/*  8. Resumo                                                          */
/* ------------------------------------------------------------------ */

function tamanhoDe(caminho) {
  if (!existsSync(caminho)) { return 0; }
  let total = 0;
  for (const nome of readdirSync(caminho, { withFileTypes: true })) {
    const alvo = join(caminho, nome.name);
    total += nome.isDirectory() ? tamanhoDe(alvo) : statSync(alvo).size;
  }
  return total;
}

console.log('');
console.log(`  ${paginas.length} páginas, ${(bytes / 1024).toFixed(0)} KB de HTML`);
console.log(`  assets: ${(tamanhoDe(join(RAIZ, 'assets')) / 1024).toFixed(0)} KB`);
console.log(`  modo: ${PUBLICACAO.modo}${PREVIA ? ' (prévia)' : ''}, robots: ${indexavel ? 'indexável' : 'bloqueado'}`);
if (faltando.length) {
  console.log(`  ${faltando.length} dados a confirmar com a clínica, marcados nas páginas:`);
  for (const f of faltando) { console.log(`    - ${f}`); }
}
console.log('');
