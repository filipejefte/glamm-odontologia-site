/* =========================================================================
   O que envolve toda página: cabeça, topo, rodapé e dado estruturado.

   Três regras que valem para o arquivo inteiro:

   1. NENHUM SCRIPT NEM ESTILO EM LINHA. A política de segurança é
      `default-src 'none'` e não abre exceção para `unsafe-inline`. Todo CSS
      vem de assets/css e todo JS de assets/js. O único <script> em linha é
      o de tipo `application/ld+json`, que o navegador não executa e a
      política não bloqueia.
   2. NENHUM TERCEIRO. Sem CDN, sem fonte de serviço externo, sem mapa
      embutido, sem pixel. A página de privacidade promete que nenhuma
      requisição sai deste domínio, e promessa que depende de CDN não é
      promessa.
   3. `frame-ancestors`, `sandbox` e `report-uri` NÃO entram na política em
      <meta>: o navegador as ignora e ainda registra erro no console. Em
      hospedagem própria elas voltam, como cabeçalho HTTP. Está no README.
   ========================================================================= */

import { CLINICA, UNIDADES, MENU, PUBLICACAO, EQUIPE, TRATAMENTOS, DUVIDAS } from './dados.mjs';
import { simbolo, icone, filete } from './marca.mjs';

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Campo que ninguém confirmou. Na prévia vira marcação visível; na build de
   produção o build.mjs já derrubou o processo antes de chegar aqui. */
export function conf(valor, rotulo) {
  if (valor) { return esc(valor); }
  return `<mark class="pendente" title="Dado não confirmado com a clínica">${esc(rotulo)} a confirmar</mark>`;
}

/* Prefixo para voltar à raiz, a partir da profundidade da rota. */
export function raizDe(rota) {
  const niveis = rota.split('/').filter(Boolean).length;
  return niveis === 0 ? '' : '../'.repeat(niveis);
}

export function urlCanonica(rota) {
  return rota ? `${CLINICA.origem}/${rota}` : `${CLINICA.origem}/`;
}

const jsonLd = (objeto) =>
  `<script type="application/ld+json">${JSON.stringify(objeto)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')}</script>`;

/* ------------------------------------------------------------------ */
/*  Dado estruturado: o grafo da clínica                               */
/*                                                                     */
/*  Um grafo só, repetido em toda página, com @id estável. É assim que  */
/*  buscador e assistente de IA entendem que as duas unidades, o site e */
/*  a marca são a mesma entidade, em vez de três coisas soltas.         */
/* ------------------------------------------------------------------ */

const ID_ORG = `${CLINICA.origem}/#organizacao`;
const ID_SITE = `${CLINICA.origem}/#site`;
const idUnidade = (u) => `${CLINICA.origem}/unidades/${u.slug}/#clinica`;

function horarioLd(u) {
  return u.horarios.map(h => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.diasIso,
    opens: h.abre,
    closes: h.fecha
  }));
}

/* Um nó por tratamento, com @id estável, referenciado pelas duas unidades e
   pela página do próprio tratamento. Sem o @id seriam quinze cópias soltas da
   mesma coisa em vez de uma entidade citada quinze vezes. */
export const idTratamento = (t) => `${CLINICA.origem}/tratamentos/${t.slug}/#procedimento`;

function tratamentoLd(t) {
  return {
    '@type': 'MedicalProcedure',
    '@id': idTratamento(t),
    name: t.nomeLongo,
    alternateName: t.nome,
    description: t.resposta,
    url: `${CLINICA.origem}/tratamentos/${t.slug}/`,
    /* SEM `procedureType`: o schema.org só oferece `NoninvasiveProcedure` e
       `PercutaneousProcedure`, e nenhum dos dois descreve honestamente o
       conjunto. Instalar um pino de titânio no osso não é procedimento não
       invasivo, e declarar o valor errado é pior que não declarar. */
    provider: { '@id': ID_ORG }
  };
}

function unidadeLd(u) {
  /* Dias fechados entram como especificação própria. Sem isso o grafo diz
     "desconhecido", e não "fechado": ninguém consegue responder por máquina
     se abre no domingo. */
  const abertos = new Set(u.horarios.flatMap(h => h.diasIso));
  const TODOS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const fechados = TODOS.filter(d => !abertos.has(d));

  const no = {
    /* `MedicalClinic` junto de `Dentist` porque `availableService` tem domínio
       em MedicalClinic, e não em Dentist. */
    '@type': ['Dentist', 'MedicalClinic'],
    '@id': idUnidade(u),
    name: u.nome,
    alternateName: `${CLINICA.nome} — ${u.cidade}`,
    url: `${CLINICA.origem}/unidades/${u.slug}/`,
    /* E.164, que é o formato que o buscador pede. A forma legível para gente
       fica na página; a legível por máquina, aqui. */
    telephone: `+${u.e164}`,
    image: `${CLINICA.origem}/assets/img/og.png`,
    logo: `${CLINICA.origem}/assets/img/marca-glamm.webp`,
    parentOrganization: { '@id': ID_ORG },
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${u.logradouro}, ${u.numero}`,
      addressLocality: u.cidade,
      addressRegion: u.uf,
      postalCode: u.cep,
      addressCountry: 'BR'
    },
    hasMap: u.mapa,
    areaServed: { '@type': 'City', name: `${u.cidade}, ${u.uf}` },
    openingHoursSpecification: [
      ...horarioLd(u),
      ...(fechados.length
        ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: fechados, opens: '00:00', closes: '00:00' }]
        : [])
    ],
    currenciesAccepted: 'BRL',
    isAcceptingNewPatients: true,
    availableService: TRATAMENTOS.map(t => ({ '@id': idTratamento(t) }))
  };
  /* Só publica o registro quando ele estiver confirmado. */
  if (CLINICA.croClinica) { no.identifier = `CRO-SP ${CLINICA.croClinica}`; }
  return no;
}

function organizacaoLd() {
  const org = {
    '@type': ['Organization', 'MedicalOrganization'],
    '@id': ID_ORG,
    name: CLINICA.nome,
    alternateName: [CLINICA.razaoSocial, CLINICA.nomeAnterior],
    legalName: CLINICA.razaoSocial,
    url: `${CLINICA.origem}/`,
    logo: {
      '@type': 'ImageObject',
      url: `${CLINICA.origem}/assets/img/marca-glamm.webp`,
      width: 480,
      height: 157
    },
    image: `${CLINICA.origem}/assets/img/og.png`,
    description: `Clínica odontológica com unidades em ${UNIDADES.map(u => u.cidade).join(' e ')}, interior de São Paulo.`,
    foundingDate: String(CLINICA.desde),
    taxID: CLINICA.cnpjMatriz,
    /* Endereço da matriz, que é dado de cadastro. O telefone NÃO entra aqui:
       a marca tem dois, um por unidade, e um telefone único no nó da marca é
       exatamente o que produz a troca de número entre as cidades. Cada um
       aparece no seu `contactPoint`, com a cidade que ele atende. */
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${UNIDADES[0].logradouro}, ${UNIDADES[0].numero}`,
      addressLocality: UNIDADES[0].cidade,
      addressRegion: UNIDADES[0].uf,
      postalCode: UNIDADES[0].cep,
      addressCountry: 'BR'
    },
    contactPoint: UNIDADES.map(u => ({
      '@type': 'ContactPoint',
      contactType: 'reservations',
      telephone: `+${u.e164}`,
      areaServed: { '@type': 'City', name: `${u.cidade}, ${u.uf}` },
      availableLanguage: 'pt-BR'
    })),
    sameAs: [
      CLINICA.instagramUrl,
      CLINICA.instagramPessoalUrl,
      `https://${CLINICA.dominioAnterior}/`,
      `https://${CLINICA.dominioProprio}/`
    ],
    department: UNIDADES.map(u => ({ '@id': idUnidade(u) })),
    makesOffer: TRATAMENTOS.map(t => ({ '@id': idTratamento(t) })),
    knowsLanguage: 'pt-BR',
    medicalSpecialty: 'Dentistry'
  };
  /* Referência, e não um segundo nó: um `Person` solto aqui criaria duas
     entidades para a mesma pessoa em toda página. */
  if (CLINICA.croResponsavel) {
    org.employee = { '@id': `${CLINICA.origem}/equipe/#fundadora` };
  }
  return org;
}

function siteLd() {
  return {
    '@type': 'WebSite',
    '@id': ID_SITE,
    url: `${CLINICA.origem}/`,
    name: CLINICA.nome,
    inLanguage: CLINICA.lang,
    publisher: { '@id': ID_ORG }
  };
}

function trilhaLd(rota, trilha) {
  if (!trilha || !trilha.length) { return null; }
  const itens = [{ nome: 'Início', rota: '' }, ...trilha];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${urlCanonica(rota)}#trilha`,
    itemListElement: itens.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.nome,
      item: urlCanonica(it.rota)
    }))
  };
}

export function faqLd(rota, lista) {
  return {
    '@type': 'FAQPage',
    '@id': `${urlCanonica(rota)}#duvidas`,
    mainEntity: lista.map(d => ({
      '@type': 'Question',
      name: d.q,
      acceptedAnswer: { '@type': 'Answer', text: d.r }
    }))
  };
}

/* ------------------------------------------------------------------ */
/*  Cabeça                                                             */
/* ------------------------------------------------------------------ */

/* Sem `frame-ancestors`, `sandbox` e `report-uri`: em <meta> o navegador as
   ignora e registra erro no console. Ver README, seção de hospedagem. */
const CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "img-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "script-src 'self'",
  "manifest-src 'self'",
  "connect-src 'none'",
  "media-src 'none'",
  "worker-src 'none'",
  'upgrade-insecure-requests'
].join('; ');

function cabeca({ rota, titulo, descricao, trilha, ldExtra = [], og = 'og.png', canonica: temCanonica = true, raiz, tipoOg = 'website' }) {
  const r = raiz !== undefined ? raiz : raizDe(rota);
  const canonica = urlCanonica(rota);
  const grafo = [
    organizacaoLd(),
    siteLd(),
    ...UNIDADES.map(unidadeLd),
    ...TRATAMENTOS.map(tratamentoLd),
    trilhaLd(rota, trilha),
    ...ldExtra
  ].filter(Boolean);

  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
    '<meta name="referrer" content="no-referrer">',
    '<meta name="color-scheme" content="light">',
    '<meta name="theme-color" content="#FAF8F5">',
    `<title>${esc(titulo)}</title>`,
    `<meta name="description" content="${esc(descricao)}">`,
    temCanonica ? `<link rel="canonical" href="${esc(canonica)}">` : '',
    `<meta name="robots" content="${PUBLICACAO.robots}">`,
    `<meta name="author" content="${esc(CLINICA.nome)}">`,
    '<meta name="format-detection" content="telephone=no">',

    /* Open Graph e Twitter: o card que aparece quando o link é colado no
       WhatsApp, que é por onde a clínica divulga. */
    `<meta property="og:type" content="${tipoOg}">`,
    `<meta property="og:site_name" content="${esc(CLINICA.nome)}">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:title" content="${esc(titulo)}">`,
    `<meta property="og:description" content="${esc(descricao)}">`,
    temCanonica ? `<meta property="og:url" content="${esc(canonica)}">` : '',  /* na 404 nao ha URL propria */
    `<meta property="og:image" content="${CLINICA.origem}/assets/img/${og}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(CLINICA.nome)}, clínica odontológica em ${UNIDADES.map(u => u.cidade).join(' e ')}.">`,
    '<meta name="twitter:card" content="summary_large_image">',

    /* Duas fontes pre-carregadas, e so duas: a de texto, que pinta o corpo
       inteiro, e a serifada, que desenha o H1, elemento que vira o maior
       conteudo pintado em toda pagina. Sem o pre-carregamento da serifada o H1
       pinta em Georgia, troca de fonte e requebra a linha, o que estraga a
       metrica e move o texto. O italico NAO entra: desenha poucas palavras e
       pode chegar depois. */
    `<link rel="preload" href="${r}assets/fonts/hanken.woff2" as="font" type="font/woff2" crossorigin>`,
    `<link rel="preload" href="${r}assets/fonts/cormorant.woff2" as="font" type="font/woff2" crossorigin>`,
    `<link rel="stylesheet" href="${r}assets/css/site.css">`,

    `<link rel="icon" href="${r}assets/img/icone-32.png" sizes="32x32" type="image/png">`,
    `<link rel="icon" href="${r}assets/img/icone-512.png" sizes="512x512" type="image/png">`,
    `<link rel="apple-touch-icon" href="${r}assets/img/icone-180.png">`,
    `<link rel="manifest" href="${r}site.webmanifest">`,

    jsonLd({ '@context': 'https://schema.org', '@graph': grafo })
  ].join('\n  ');
}

/* ------------------------------------------------------------------ */
/*  Topo                                                               */
/* ------------------------------------------------------------------ */

function topo(rota, raiz, unidade) {
  const r = raiz !== undefined ? raiz : raizDe(rota);

  /* O BOTAO DO TOPO NAO PODE SER SEMPRE O DE MARILIA.
     Ele aparece em toda pagina, inclusive na de Garca, e e o primeiro `wa.me`
     do documento: o que um extrator ou um assistente escolhe como "o link de
     agendamento desta pagina". Fixar uma unidade aqui reintroduz, pelo
     cabecalho, exatamente o erro que o site inteiro existe para consertar.
     Na pagina de uma unidade ele e o WhatsApp DAQUELA unidade; em qualquer
     outra pagina ele leva para o contato, onde as duas estao lado a lado. */
  const agendar = unidade
    ? { href: unidade.whatsapp, cidade: unidade.cidade, externo: true }
    : { href: `${r}contato/`, cidade: null, externo: false };

  const itens = MENU.map(m => {
    const ativo = rota === m.path || (m.path !== '' && rota.startsWith(m.path));
    return `<li><a class="menu-link${ativo ? ' e-aqui' : ''}"${ativo ? ' aria-current="page"' : ''} href="${r}${m.path}">${esc(m.rotulo)}</a></li>`;
  }).join('');

  return `<a class="pular" href="#conteudo">Ir para o conteúdo</a>
<header class="topo" data-topo>
  <div class="topo-faixa">
    <a class="marca" href="${r || './'}" aria-label="${esc(CLINICA.nome)}, início">
      <img class="marca-img" src="${r}assets/img/marca-glamm.webp" width="480" height="157" alt="${esc(CLINICA.nome)}" decoding="async">
    </a>

    <nav class="menu" id="menu" aria-label="Principal">
      <ul class="menu-lista">${itens}</ul>
    </nav>

    <div class="topo-acoes" data-topo-acoes>
      <a class="botao botao-solido botao-pequeno" href="${agendar.href}"${agendar.externo ? ' rel="noopener noreferrer" target="_blank"' : ''}>
        ${icone('conversa', { tamanho: 17 })}<span>Agendar${agendar.cidade
          ? `<span class="topo-cidade"> em ${esc(agendar.cidade)}</span>`
          : ''}</span>
      </a>
      <button class="menu-botao" type="button" data-menu aria-expanded="false" aria-controls="menu">
        <span class="menu-barras" aria-hidden="true"><span></span><span></span></span>
        <span class="so-leitor">Abrir o menu</span>
      </button>
    </div>
  </div>
</header>`;
}

/* ------------------------------------------------------------------ */
/*  Rodapé                                                             */
/* ------------------------------------------------------------------ */

function rodape(rota, raiz) {
  const r = raiz !== undefined ? raiz : raizDe(rota);

  /* O telefone NUNCA é escrito à mão neste projeto: sai sempre do objeto da
     unidade. Foi exatamente esse o erro mais caro encontrado no site atual,
     onde o rodapé publica o número de Marília para as duas unidades. */
  const unidades = UNIDADES.map(u => `
      <div class="pe-unidade">
        <h3 class="pe-titulo">${esc(u.cidade)}</h3>
        <address class="pe-endereco">
          ${esc(u.enderecoLinha)}<br>
          ${esc(u.bairro)}, ${esc(u.cidade)} ${esc(u.uf)}<br>
          CEP ${esc(u.cep)}
        </address>
        <p class="pe-linha">${u.horarios.map(h => `${esc(h.dias)}, ${esc(h.abre)} às ${esc(h.fecha)}`).join('<br>')}</p>
        <p class="pe-linha"><a class="elo" href="tel:+${u.e164}">${esc(u.telefone)}</a></p>
        <p class="pe-linha"><a class="elo" href="${u.whatsapp}" rel="noopener noreferrer" target="_blank">Agendar pelo WhatsApp</a></p>
        <p class="pe-linha"><a class="elo" href="${r}unidades/${u.slug}/">Ver a unidade de ${esc(u.cidade)}</a></p>
      </div>`).join('');

  /* O rodapé lista mais que o menu do topo: as páginas de serviço não cabem
     na barra sem virar sopa, mas precisam de link interno para existirem para
     a busca. */
  const extras = [
    { path: 'primeira-consulta/', rotulo: 'Primeira consulta' },
    { path: 'urgencia/', rotulo: 'Urgência' }
  ];
  const links = [...MENU, ...extras]
    .map(m => `<li><a class="elo" href="${r}${m.path}">${esc(m.rotulo)}</a></li>`).join('');
  const tratamentos = TRATAMENTOS.map(t =>
    `<li><a class="elo" href="${r}tratamentos/${t.slug}/">${esc(t.nome)}</a></li>`).join('');

  return `<footer class="pe">
  <div class="faixa">
    <div class="pe-grade">
      <div class="pe-marca">
        <img class="pe-marca-img" src="${r}assets/img/marca-glamm-clara.webp" width="480" height="157" alt="${esc(CLINICA.nome)}" loading="lazy" decoding="async">
        <p class="pe-resumo">Clínica odontológica com unidades em ${esc(UNIDADES.map(u => u.cidade).join(' e '))}, no interior de São Paulo.</p>
        <p class="pe-linha">
          <a class="elo" href="${CLINICA.instagramUrl}" rel="noopener noreferrer nofollow" target="_blank">${icone('instagram', { tamanho: 17 })} @${esc(CLINICA.instagram)}</a>
        </p>
      </div>
${unidades}
      <nav class="pe-navegacao" aria-label="Rodapé">
        <div class="pe-coluna">
          <h3 class="pe-titulo">Navegar</h3>
          <ul class="pe-lista">${links}</ul>
        </div>
        <div class="pe-coluna">
          <h3 class="pe-titulo">Tratamentos</h3>
          <ul class="pe-lista">${tratamentos}</ul>
        </div>
      </nav>
    </div>

    <div class="pe-legal">
      <p>
        ${esc(CLINICA.razaoSocial)} &middot; CNPJ ${esc(CLINICA.cnpjMatriz)} (Marília) e ${esc(CLINICA.cnpjFilial)} (Garça)
        &middot; ${conf(CLINICA.croClinica && `CRO-SP ${CLINICA.croClinica}`, 'inscrição da clínica no CRO')}
      </p>
      <p>
        Responsável técnica: ${esc(CLINICA.responsavelTecnica)}
        &middot; ${conf(CLINICA.croResponsavel && `CRO-SP ${CLINICA.croResponsavel}`, 'inscrição da responsável técnica')}
      </p>
      <p class="pe-aviso">
        O conteúdo deste site é informativo e não substitui consulta, diagnóstico
        nem tratamento por cirurgião-dentista. Resultados variam conforme o caso,
        e a indicação de qualquer procedimento depende de avaliação presencial.
      </p>
      <p class="pe-fim">
        <a class="elo" href="${r}privacidade/">Privacidade</a>
        <span aria-hidden="true">&middot;</span>
        <a class="elo" href="${r}duvidas/">Dúvidas frequentes</a>
        <span aria-hidden="true">&middot;</span>
        <a class="elo" href="${r}contato/">Contato</a>
      </p>
    </div>
  </div>
</footer>`;
}

/* ------------------------------------------------------------------ */
/*  A página inteira                                                   */
/* ------------------------------------------------------------------ */

export function pagina({ rota, titulo, descricao, trilha = [], corpo, ldExtra = [], og, classe = '', script = false, canonica = true, raiz, unidade = null, tipoOg = 'website' }) {
  const r = raiz !== undefined ? raiz : raizDe(rota);
  const faixa = PUBLICACAO.modo === 'proposta'
    ? `<p class="faixa-previa" role="note">${esc(PUBLICACAO.faixa)}</p>`
    : '';

  const migalhas = trilha.length
    ? `<nav class="migalhas" aria-label="Trilha">
    <ol>
      <li><a href="${r || './'}">Início</a></li>
      ${trilha.map((t, i) => i === trilha.length - 1
        ? `<li><span aria-current="page">${esc(t.nome)}</span></li>`
        : `<li><a href="${r}${t.rota}">${esc(t.nome)}</a></li>`).join('\n      ')}
    </ol>
  </nav>`
    : '';

  return `<!doctype html>
<html lang="${CLINICA.lang}" class="sem-js">
<head>
  ${cabeca({ rota, titulo, descricao, trilha, ldExtra, og, canonica, raiz, tipoOg })}
</head>
<body class="${classe}">
${faixa}
${topo(rota, raiz, unidade)}
<main id="conteudo" class="conteudo" tabindex="-1">
${migalhas}
${corpo}
</main>
${rodape(rota, raiz)}
<script src="${r}assets/js/site.js" defer></script>
${script ? `<script src="${r}assets/js/${script}" defer></script>` : ''}
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/*  Peças reaproveitadas pelas páginas                                 */
/* ------------------------------------------------------------------ */

export function botaoAgendar(u, { assunto = null, solido = true, pequeno = false } = {}) {
  const href = assunto ? u.whatsappPara(assunto) : u.whatsapp;
  const classe = `botao ${solido ? 'botao-solido' : 'botao-vazado'}${pequeno ? ' botao-pequeno' : ''}`;
  return `<a class="${classe}" href="${href}" rel="noopener noreferrer" target="_blank">
      ${icone('conversa', { tamanho: 18 })}<span>Agendar em ${esc(u.cidade)}</span>
    </a>`;
}

/* Bloco de agendamento com as duas unidades, repetido no fim das páginas. */
export function chamada(rota, { titulo = 'Agende uma avaliação', texto = null, assunto = null, raiz } = {}) {
  const r = raiz !== undefined ? raiz : raizDe(rota);
  const corpo = texto || `A consulta de avaliação leva de quarenta a sessenta minutos e termina com um plano de tratamento por escrito. Escolha a unidade mais perto de você.`;
  const cartoes = UNIDADES.map(u => `
      <div class="chamada-unidade">
        <p class="rotulo">${esc(u.cidade)} &middot; ${esc(u.uf)}</p>
        <p class="chamada-endereco">${esc(u.enderecoLinha)}<br>${esc(u.bairro)}</p>
        <p class="chamada-horario">${icone('relogio', { tamanho: 16 })} ${esc(u.destaqueHorario)}</p>
        ${botaoAgendar(u, { assunto })}
        <p class="chamada-tel"><a class="elo" href="tel:+${u.e164}">${esc(u.telefone)}</a></p>
      </div>`).join('');

  return `<section class="secao chamada" aria-labelledby="chamada-titulo">
  <div class="faixa">
    <div class="chamada-caixa">
      <div class="chamada-texto">
        <p class="rotulo rotulo-ouro">Primeiro passo</p>
        <h2 class="titulo-2" id="chamada-titulo">${esc(titulo)}</h2>
        <p class="prosa">${esc(corpo)}</p>
        <p class="chamada-nota">Atendimento particular. A clínica não trabalha com convênios.${rota === 'duvidas/' ? ''
          : ` <a class="elo" href="${r}duvidas/">Ver as dúvidas frequentes</a>.`}</p>
        <p class="chamada-urgencia" role="note">
          <strong>Urgência não espera por agenda.</strong>
          Dor forte, inchaço no rosto, febre ou trauma com sangramento que não para:
          procure um serviço de pronto atendimento. Dente permanente que caiu por trauma
          é urgência de minutos.
        </p>
      </div>
      <div class="chamada-unidades">${cartoes}</div>
    </div>
  </div>
</section>`;
}

/* Lista de perguntas em <details>: abre sem JavaScript, é indexável com o
   conteúdo fechado e vira FAQPage no dado estruturado. */
/* Um id estável por pergunta, tirado do próprio texto. É o que faz o link
   direto para uma resposta existir — e é o que permite a um assistente de IA
   citar a resposta com endereço, em vez de citar a página inteira. O
   `assets/js/site.js` abre o <details> quando a página chega por uma dessas
   âncoras. */
export function idDaPergunta(q) {
  return 'p-' + q
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function acordeao(lista, { nivel = 'h3' } = {}) {
  return `<div class="duvidas">${lista.map((d, i) => `
    <details class="duvida" id="${idDaPergunta(d.q)}">
      <summary class="duvida-p">
        <${nivel} class="duvida-titulo">${esc(d.q)}</${nivel}>
        <span class="duvida-sinal" aria-hidden="true">${icone('mais', { tamanho: 18 })}</span>
      </summary>
      <div class="duvida-r"><p>${esc(d.r)}</p></div>
    </details>`).join('')}</div>`;
}

export { icone, simbolo, filete, DUVIDAS };
