/* =========================================================================
   Casca compartilhada por todas as páginas: <head>, cabeçalho, rodapé e as
   peças de interface que aparecem em mais de um lugar.

   Três regras que valem para tudo neste arquivo:

   1. NADA INLINE. A CSP do site é `default-src 'none'` e não abre exceção
      para estilo ou script embutido. Toda regra visual vive em
      assets/css/site.css e todo comportamento em assets/js/site.js.

   2. NADA DE TRAVESSÃO na copy. O verificador recusa a build se encontrar
      travessão ou meia-risca. Separe as frases com ponto ou vírgula.

   3. NADA DE CONTEÚDO ESSENCIAL ESCONDIDO por script. Nenhum bloco começa
      invisível esperando rolagem. Quem abre pelo celular, imprime, usa modo
      leitura ou vê uma miniatura recebe a página inteira.
   ========================================================================= */

import { CLINICA, MENU, UNIDADES } from './dados.mjs';

/* ------------------------------------------------------------------ */
/* Escapes                                                             */
/* ------------------------------------------------------------------ */

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ------------------------------------------------------------------ */
/* Contexto de build                                                   */
/* ------------------------------------------------------------------ */

/**
 * Monta o contexto que todas as páginas recebem.
 *
 * `ctx.dado(valor, rotulo)` é o coração do controle de qualidade: devolve o
 * valor quando ele existe e, quando é `null`, registra a pendência e devolve
 * uma marcação visível. A build de produção lê `ctx.pendencias` e se recusa a
 * gerar se a lista não estiver vazia.
 */
export function contexto({ preview }) {
  const pendencias = [];
  const ctx = {
    preview,
    origem: CLINICA.origem,
    pendencias,

    /* A marcação diz só "a confirmar" e não repete o rótulo: quem chama já
       escreveu o rótulo na frase. O rótulo continua no title, para quem passa
       o cursor, e em ctx.pendencias, que é quem trava a build. */
    dado(valor, rotulo) {
      if (valor !== null && valor !== undefined && valor !== '') { return esc(valor); }
      pendencias.push(rotulo);
      return `<span class="pendente" title="${esc(rotulo)}: a confirmar com a clínica">a confirmar</span>`;
    },

    /* Registra uma pendência que não tem onde aparecer na página, mas que
       precisa travar a produção do mesmo jeito. Serve para o dado que está
       publicado e parece pronto, e cuja fonte não aguenta o peso: o horário
       de sexta em Marília e o bairro de Garça são os casos. */
    pendencia(rotulo) {
      pendencias.push(rotulo);
      return '';
    },

    /* Igual a dado(), mas devolve texto puro para atributo e metadado. */
    dadoTexto(valor, alternativa, rotulo) {
      if (valor !== null && valor !== undefined && valor !== '') { return valor; }
      pendencias.push(rotulo);
      return alternativa;
    }
  };
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Marca                                                               */
/* ------------------------------------------------------------------ */

/* O símbolo da Glamm, vetorizado a partir do arquivo oficial de 512 px que a
   própria clínica publica como ícone do site.

   Não é desenho de observação. O contorno saiu de marching squares no nível
   0.5 do campo de alfa da arte, com precisão de subpixel, simplificado por
   Douglas-Peucker a 0.45 px, e foi conferido rasterizando o resultado no
   mesmo quadro da original: ZERO pixel diverge acima de 0.5 de alfa, e a
   interseção sobre a união é de 96,8%, sendo o resto borda suavizada. A
   prova está em interno/prova-sobreposicao.png e o procedimento em
   interno/NOTAS-INTERNAS.md.

   112 vértices em 8 subcaminhos, regra par-ímpar: o contorno externo mais os
   sete vazios das facetas. Herda a cor do texto, então serve em qualquer
   fundo sem precisar de segundo arquivo. */
const SIMBOLO_D = 'M26.74 0.01L28.12 0.02L28.68 0.27L49.96 13.98L71.25 0.32L72.08 0.00L73.46 0.07L75.19 1.49L89.93 16.14L90.84 17.24L91.03 19.18L89.94 40.74L88.89 42.95L68.49 94.49L67.10 98.35L66.55 99.34L65.72 99.94L64.06 99.96L63.47 99.63L62.80 98.80L62.57 97.97L51.57 73.64L50.30 70.87L49.96 70.67L49.69 70.89L37.45 97.97L37.25 98.72L36.53 99.63L35.86 99.99L34.48 100.00L33.50 99.35L32.96 98.52L32.82 97.76L30.40 91.61L10.80 42.12L10.10 40.74L8.97 18.07L9.29 16.97L26.01 0.38L26.74 0.01ZM69.87 31.88L52.62 65.35L52.98 66.45L64.62 91.93L65.06 91.61L65.84 89.67L84.98 41.02L84.80 40.73L70.42 31.82L69.87 31.88ZM29.23 32.01L15.24 40.74L15.03 41.29L35.04 91.84L35.31 91.97L35.66 91.61L46.68 67.28L47.24 65.62L29.95 32.45L29.51 31.97L29.23 32.01ZM49.41 19.44L33.65 29.26L33.38 29.68L49.68 60.92L49.96 60.96L66.25 29.41L50.42 19.45L49.96 19.26L49.41 19.44ZM72.08 4.94L63.39 10.61L63.61 11.44L70.09 25.54L70.97 27.10L85.63 36.16L85.87 35.77L86.68 19.45L86.31 18.63L81.33 13.65L72.65 5.08L72.36 4.86L72.08 4.94ZM27.57 4.97L13.39 18.90L13.81 29.68L14.09 32.45L14.15 35.77L14.30 36.14L15.96 35.26L28.68 27.20L36.55 10.88L36.56 10.61L36.14 10.24L27.85 4.88L27.57 4.97ZM40.29 13.17L35.83 22.22L35.86 22.71L45.61 16.69L45.54 16.36L44.82 15.86L40.56 13.10L40.29 13.17ZM59.09 13.28L54.39 16.29L54.25 16.69L63.79 22.63L63.90 22.22L59.80 13.37L59.64 13.10L59.09 13.28Z';

export const simbolo = (classe = 'simbolo') =>
  `<svg class="${classe}" viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${SIMBOLO_D}"/></svg>`;

/* O logotipo por extenso é o arquivo original da clínica, não uma recriação.
   Duas variantes do MESMO arquivo: a de fundo claro traz a palavra
   ODONTOLOGIA na ardósia da marca, a de fundo escuro é o arquivo como a
   clínica publica. O manuscrito em ouro é idêntico nas duas, pixel a pixel.
   Proporção 800 por 262. */
export const logo = ({ base = '', variante = 'escura', classe = 'logo', alt = CLINICA.nome, tardio = false } = {}) =>
  `<img class="${classe}" src="${base}assets/img/marca-glamm${variante === 'clara' ? '-clara' : ''}.webp" width="800" height="262" alt="${esc(alt)}" decoding="async"${tardio ? ' loading="lazy"' : ' fetchpriority="high"'}>`;

/* ------------------------------------------------------------------ */
/* Ícones. Traçado próprio, sem biblioteca externa.                    */
/* ------------------------------------------------------------------ */

/* Silhueta de dente usada como base de quatro ícones. Um contorno só,
   duas raízes, desenhado para ler a 30 px, que é o tamanho na grade. */
const DENTE = '<path d="M12 3.6C15.5 3.6 17.6 5.9 17.6 8.7c0 2.8-1 5.3-1.5 8.7-.2 1.4-.5 2.4-1.1 2.4-.6 0-.9-.9-1.3-2.6L12.6 12.9c-.1-.5-1.1-.5-1.2 0L10.3 17.2c-.4 1.7-.7 2.6-1.3 2.6-.6 0-.9-1-1.1-2.4C7.4 14 6.4 11.5 6.4 8.7C6.4 5.9 8.5 3.6 12 3.6Z"/>';

const svg = (corpo) =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;

export const ICO = {
  /* Traçado do glifo do WhatsApp, preenchido em vez de contornado. */
  whatsapp: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2A9.9 9.9 0 0 0 2.1 11.9a9.8 9.8 0 0 0 1.35 4.96L2 22l5.28-1.38a9.9 9.9 0 0 0 4.76 1.21h.01a9.9 9.9 0 0 0 9.93-9.9A9.9 9.9 0 0 0 12.04 2Zm0 18.09h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.2 8.2 0 1 1 6.98 3.87Zm4.5-6.14c-.24-.12-1.46-.72-1.69-.8-.22-.09-.39-.13-.55.12s-.63.8-.77.96c-.14.17-.28.19-.53.06a6.7 6.7 0 0 1-3.35-2.93c-.25-.43.25-.4.72-1.33.08-.17.04-.31-.02-.43s-.55-1.34-.76-1.83c-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.75 2.75 0 0 0-.86 2.05c0 1.2.88 2.37 1 2.53.12.17 1.72 2.63 4.18 3.69 1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.21-.58.21-1.07.15-1.18-.06-.1-.22-.17-.47-.29Z"/></svg>',

  local: svg('<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>'),
  relogio: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.3V12l3.1 1.9"/>'),
  seta: svg('<path d="M5 12h13m-5.5-5.5L18.5 12l-6 5.5"/>'),
  /* Seta na diagonal, para o disco de acento do hero. */
  setaDiag: svg('<path d="M7.5 7.5h9v9M7.5 16.5l9-9"/>'),
  check: svg('<path d="M4.5 12.6 9.5 17.5 19.5 6.5"/>'),
  alerta: svg('<path d="M12 3.7 21.2 19.4H2.8Z"/><path d="M12 10v4"/><circle cx="12" cy="16.9" r=".9" fill="currentColor" stroke="none"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  fechar: svg('<path d="M6 6l12 12M18 6 6 18"/>'),

  /* Um ícone por tratamento. Todos no mesmo traço e quase todos sobre a mesma
     silhueta de dente, para a grade ler como um conjunto. O que diferencia um
     do outro é o que se ACRESCENTA ao dente, e cada acréscimo tem uma massa
     visual distinta: contorno duplo, barra horizontal, roscas empilhadas,
     estrela, linhas verticais internas, faixa embaixo.

     As primeiras versões falhavam no teste do tamanho real: "implante" e
     "clareamento" saíam parecidos com o símbolo de Vênus, e "periodontia"
     lia como cabeça e ombros de uma pessoa. Foram conferidos a 30 px, que é
     o tamanho na grade, e não só ampliados. */

  /* Contorno duplo: a lâmina acompanhando a face do dente. */
  lente: svg(DENTE + '<path d="M8.6 3.75C6.1 4.75 4.5 6.6 4.5 8.8c0 2 .7 3.6 1.25 5.3"/>'),

  /* Bráquete e fio: os dois elementos horizontais que ninguém confunde. */
  alinhador: svg(DENTE + '<rect x="9.5" y="8.6" width="5" height="4.2" rx="1.1"/><path d="M4.85 10.7h4.65M14.5 10.7h4.65"/>'),

  /* Roscas empilhadas dentro da raiz. */
  implante: svg(DENTE + '<path d="M12 9.2v7.6"/><path d="M10.1 11.1h3.8M10.3 13.1h3.4M10.6 15.1h2.8"/>'),

  /* Estrela de quatro pontas, fora do dente. */
  clareamento: svg(DENTE + '<path d="M19.5 3.4l.7 1.95 1.95.7-1.95.7-.7 1.95-.7-1.95-1.95-.7 1.95-.7Z"/>'),

  /* Dois canais, verticais e internos. */
  canal: svg(DENTE + '<path d="M10.45 8.7c-.15 2.45.3 4.7.9 6.9M13.55 8.7c.15 2.45-.3 4.7-.9 6.9"/>'),

  /* Dente aberto embaixo, assentado numa faixa de gengiva. */
  gengiva: svg('<path d="M9.4 13.7C9 12 8.4 10.4 8.4 8.8c0-2.1 1.6-3.8 3.6-3.8s3.6 1.7 3.6 3.8c0 1.6-.6 3.2-1 4.9"/><path d="M5.7 13.5c-.3-1.3-.75-2.5-.75-3.7 0-1.4.85-2.6 2.15-3.05M18.3 13.5c.3-1.3.75-2.5.75-3.7 0-1.4-.85-2.6-2.15-3.05"/><path d="M3.5 15.5c2.6-1.05 5.5-1.6 8.5-1.6s5.9.55 8.5 1.6v1.9c0 1.35-1.15 2.5-2.55 2.5H6.05c-1.4 0-2.55-1.15-2.55-2.5Z"/>'),

  /* Câmera de haste: silhueta totalmente fora da família do dente. */
  camera: svg('<path d="M14.5 4.2h3.3a2.6 2.6 0 0 1 2.6 2.6v3.3a2.6 2.6 0 0 1-2.6 2.6h-3.3a2.6 2.6 0 0 1-2.6-2.6V6.8a2.6 2.6 0 0 1 2.6-2.6Z"/><circle cx="16.15" cy="8.45" r="1.6"/><path d="M11.9 10.5 4.7 17.7a2 2 0 0 0 2.8 2.8l7.2-7.2"/>')
};

/* ------------------------------------------------------------------ */
/* Botões                                                              */
/* ------------------------------------------------------------------ */

export const botao = ({ href, texto, tipo = 'principal', icone = '', externo = false, extra = '' }) =>
  `<a class="btn btn-${tipo}" href="${esc(href)}"${externo ? ' target="_blank" rel="noopener noreferrer"' : ''}${extra}>${icone}<span>${esc(texto)}</span></a>`;

/* O par de botões de WhatsApp, um por unidade. Aparece em todo fim de seção
   de conversão. Cada botão carrega o número da SUA unidade, lido de
   dados.mjs: é a correção direta do rodapé que publicava o número de Marília
   para as duas. */
export const botoesUnidades = (classe = 'acoes') => `
<div class="${classe}">
  ${UNIDADES.map(u => botao({
    href: u.whatsapp,
    texto: `Agendar em ${u.cidade}`,
    tipo: u.id === 'marilia' ? 'principal' : 'secundario',
    icone: ICO.whatsapp,
    externo: true
  })).join('\n  ')}
</div>`;

/* ------------------------------------------------------------------ */
/* Cabeçalho                                                           */
/* ------------------------------------------------------------------ */

function cabecalho(p, ctx) {
  const b = p.base;
  /* O menu aponta para seções da página única. Fora dela (privacidade, erro)
     a âncora sozinha não leva a lugar nenhum: precisa do arquivo na frente.
     Qual seção está na tela é marcado por site.js, não aqui. */
  const daPagina = p.path === 'index.html';
  const alvo = (caminho) => (daPagina ? '' : 'index.html') + caminho;
  const itens = MENU.map(m =>
    `<li><a href="${alvo(m.path)}">${esc(m.rotulo)}</a></li>`).join('');

  return `
<a class="pular" href="#conteudo">Ir direto ao conteúdo</a>
${ctx.preview ? faixaPrevia() : ''}
<header class="topo">
  <div class="env topo-linha">
    <a class="topo-marca" href="${b}index.html" aria-label="${esc(CLINICA.nome)}, ir para a página inicial">${logo({ base: b, alt: '' })}</a>
    <button class="topo-botao" type="button" id="abrir-menu" aria-expanded="false" aria-controls="navegacao">
      ${ICO.menu}<span>Menu</span>
    </button>
    <nav class="topo-nav" id="navegacao" aria-label="Navegação principal">
      <ul>${itens}</ul>
    </nav>
    <div class="topo-acao">
      ${botao({ href: alvo('#agendar'), texto: 'Agendar', tipo: 'principal' })}
    </div>
  </div>
</header>`;
}

function faixaPrevia() {
  return `
<div class="previa">
  <p><strong>Prévia de apresentação.</strong> Esta página é uma proposta de site preparada para a ${esc(CLINICA.nome)}. Ainda não é o site oficial da clínica e não está no ar para o público. Tudo que aparece marcado como "a confirmar" precisa ser conferido pela clínica antes de qualquer publicação.</p>
</div>`;
}

/* ------------------------------------------------------------------ */
/* Rodapé                                                             */
/* ------------------------------------------------------------------ */

function rodape(p, ctx) {
  const b = p.base;
  /* Mesma regra do cabeçalho: fora da página única, a âncora precisa do
     arquivo na frente. */
  const daPagina = p.path === 'index.html';
  const alvoRodape = (caminho) => (daPagina ? '' : 'index.html') + caminho;

  const unidades = UNIDADES.map(u => `
    <div class="rp-unidade">
      <h2><a href="${alvoRodape('#' + u.slug)}">${esc(u.nome)}</a></h2>
      <p class="rp-end">${esc(u.enderecoLinha)}<br>${esc(u.bairro)}, ${esc(u.cidade)} ${esc(u.uf)}<br>CEP ${esc(u.cep)}</p>
      <p class="rp-tel"><a href="tel:+${esc(u.e164)}">${esc(u.telefone)}</a></p>
      <p class="rp-links-unid">
        <a href="${esc(u.whatsapp)}" target="_blank" rel="noopener noreferrer">${ICO.whatsapp}<span>WhatsApp</span></a>
        <a href="${esc(u.mapa)}" target="_blank" rel="noopener noreferrer">${ICO.local}<span>Ver no mapa</span></a>
      </p>
    </div>`).join('');

  return `
<footer class="rodape">
  <div class="env">
    <div class="rp-grade">
      <div class="rp-marca">
        ${logo({ base: b, variante: 'clara', classe: 'logo logo-rodape', tardio: true })}
        <p class="rp-tagline">${esc(CLINICA.assinatura)} em Marília e Garça, interior de São Paulo.</p>
        <p class="rp-social">
          <a href="${esc(CLINICA.instagramUrl)}" target="_blank" rel="noopener noreferrer">Instagram @${esc(CLINICA.instagram)}</a>
        </p>
      </div>

      <div class="rp-col rp-unidades">${unidades}</div>

      <div class="rp-col">
        <h2>Navegar</h2>
        <ul class="rp-lista">
          ${MENU.map(m => `<li><a href="${alvoRodape(m.path)}">${esc(m.rotulo)}</a></li>`).join('')}
          <li><a href="${alvoRodape('#agendar')}">Agendar avaliação</a></li>
          <li><a href="${b}privacidade.html">Privacidade</a></li>
        </ul>
      </div>
    </div>

    <p class="rp-emergencia">
      ${ICO.alerta}
      <span><b>Urgência não se resolve por site.</b> Dor forte que não cede, inchaço no rosto, febre junto com dor de dente ou trauma com sangramento que não para são situações para procurar atendimento imediato, não para aguardar agenda.</span>
    </p>

    <div class="rp-legal">
      <p class="rp-ident">
        ${esc(CLINICA.razaoSocial)}, CRO-SP nº ${ctx.dado(CLINICA.croClinica, 'Número de inscrição da clínica no CRO-SP')}.
        Responsável técnica: ${esc(CLINICA.responsavelTecnica)}, cirurgiã-dentista, CRO-SP nº ${ctx.dado(CLINICA.croResponsavel, 'Número de inscrição da responsável técnica no CRO-SP')}.
        CNPJ ${esc(CLINICA.cnpjMatriz)} (Marília) e ${esc(CLINICA.cnpjFilial)} (Garça).
      </p>
      <p class="rp-aviso">
        O conteúdo deste site tem finalidade informativa e educativa. Ele não faz diagnóstico, não indica tratamento e não substitui a consulta com cirurgião-dentista. Indicação, alternativa e prognóstico dependem de avaliação presencial.
      </p>
      <p class="rp-fim">Conteúdo publicado sob responsabilidade da ${esc(CLINICA.razaoSocial)}.</p>
    </div>
  </div>
</footer>`;
}

/* ------------------------------------------------------------------ */
/* Casca completa                                                      */
/* ------------------------------------------------------------------ */

/* Uma CSP fechada. `default-src 'none'` derruba tudo que não estiver aberto
   abaixo, e nada aqui abre para terceiro: sem CDN, sem fonte remota, sem
   analytics, sem pixel, sem iframe. `form-action 'none'` e
   `connect-src 'none'` porque nenhum formulário deste site envia nada para
   lugar nenhum: o agendamento monta a mensagem no próprio aparelho e abre o
   WhatsApp.

   `frame-ancestors` NÃO entra aqui, de propósito. O navegador ignora essa
   diretiva quando ela vem por <meta>, e ainda registra erro no console. Ela
   só funciona como cabeçalho HTTP, e o GitHub Pages não deixa definir
   cabeçalho. Quando o site mudar para o domínio próprio, configurar lá.
   Está registrado no README. */
const CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "img-src 'self'",
  "style-src 'self'",
  "script-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "manifest-src 'self'",
  'upgrade-insecure-requests'
].join('; ');

export function shell({ p, ctx, body, ld }) {
  const b = p.base;
  const url = `${ctx.origem}/${p.path === 'index.html' ? '' : p.path}`;
  const titulo = p.tituloCompleto || (p.path === 'index.html'
    ? `${CLINICA.nome} | Dentista em Marília e Garça SP`
    : `${p.titulo} | ${CLINICA.nome}`);

  const jsonld = ld
    ? `<script type="application/ld+json">${JSON.stringify(ld, null, 0).replace(/</g, '\\u003c')}</script>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(p.descricao)}">
<meta name="robots" content="${ctx.preview ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(CLINICA.nome)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(p.descricao)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(ctx.origem)}/assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(CLINICA.nome)}, clínica odontológica em Marília e Garça, São Paulo">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#E7E2DA">
<link rel="icon" type="image/png" sizes="32x32" href="${b}assets/img/icone-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="${b}assets/img/icone-192.png">
<link rel="apple-touch-icon" href="${b}assets/img/icone-180.png">
<link rel="manifest" href="${b}site.webmanifest">
<link rel="preload" as="font" type="font/woff2" href="${b}assets/fonts/hanken.woff2" crossorigin>
<link rel="stylesheet" href="${b}assets/css/site.css">
${jsonld}
</head>
<body${p.classe ? ` class="${p.classe}"` : ''}>
${cabecalho(p, ctx)}
<main id="conteudo" tabindex="-1">
${body}
</main>
${rodape(p, ctx)}
<script src="${b}assets/js/site.js" defer></script>
${(p.scripts || []).map(x => `<script src="${b}${x}" defer></script>`).join('')}
</body>
</html>
`;
}
