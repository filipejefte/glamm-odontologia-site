/* =========================================================================
   A marca em SVG, e os ícones da interface.

   O SÍMBOLO NÃO FOI DESENHADO A OLHO. O caminho abaixo saiu da vetorização
   da arte oficial da clínica (o favicon de 512 px servido pelo site atual):
   marching squares no nível 0,5 do campo de alfa, simplificado por
   Douglas-Peucker a 0,45 px e conferido por rasterização própria, pixel a
   pixel, contra a arte original. Zero pixel divergindo acima de 0,5 de alfa.
   A prova está em interno/prova-sobreposicao.png.

   Regra de preenchimento: `evenodd`. São oito subcaminhos fechados, o
   contorno externo mais sete vazios das facetas.

   O LOGOTIPO MANUSCRITO não é vetor: não existe versão vetorial pública, e a
   maior resolução disponível é 800 × 262. Ele entra como imagem, gerada por
   tools/imagens.py a partir da arte original, em duas variantes. Pedir o
   vetor à clínica é item da lista de pendências.

   ARMADILHA REGISTRADA: um ícone guardado como dado de caminho e concatenado
   como se fosse elemento vira texto solto dentro do <svg>. O navegador não
   reclama, não desenha e não deixa rastro. Por isso tudo aqui devolve
   ELEMENTO pronto, nunca dado de caminho cru, e tools/check.mjs recusa texto
   solto dentro de <svg>.
   ========================================================================= */

/* Contorno da marca, em caixa 0 0 100 100. */
export const SIMBOLO_D =
  'M26.74 0.01L28.12 0.02L28.68 0.27L49.96 13.98L71.25 0.32L72.08 0.00L73.46 0.07L75.19 1.49' +
  'L89.93 16.14L90.84 17.24L91.03 19.18L89.94 40.74L88.89 42.95L68.49 94.49L67.10 98.35' +
  'L66.55 99.34L65.72 99.94L64.06 99.96L63.47 99.63L62.80 98.80L62.57 97.97L51.57 73.64' +
  'L50.30 70.87L49.96 70.67L49.69 70.89L37.45 97.97L37.25 98.72L36.53 99.63L35.86 99.99' +
  'L34.48 100.00L33.50 99.35L32.96 98.52L32.82 97.76L30.40 91.61L10.80 42.12L10.10 40.74' +
  'L8.97 18.07L9.29 16.97L26.01 0.38L26.74 0.01Z' +
  'M69.87 31.88L52.62 65.35L52.98 66.45L64.62 91.93L65.06 91.61L65.84 89.67L84.98 41.02' +
  'L84.80 40.73L70.42 31.82L69.87 31.88Z' +
  'M29.23 32.01L15.24 40.74L15.03 41.29L35.04 91.84L35.31 91.97L35.66 91.61L46.68 67.28' +
  'L47.24 65.62L29.95 32.45L29.51 31.97L29.23 32.01Z' +
  'M49.41 19.44L33.65 29.26L33.38 29.68L49.68 60.92L49.96 60.96L66.25 29.41L50.42 19.45' +
  'L49.96 19.26L49.41 19.44Z' +
  'M72.08 4.94L63.39 10.61L63.61 11.44L70.09 25.54L70.97 27.10L85.63 36.16L85.87 35.77' +
  'L86.68 19.45L86.31 18.63L81.33 13.65L72.65 5.08L72.36 4.86L72.08 4.94Z' +
  'M27.57 4.97L13.39 18.90L13.81 29.68L14.09 32.45L14.15 35.77L14.30 36.14L15.96 35.26' +
  'L28.68 27.20L36.55 10.88L36.56 10.61L36.14 10.24L27.85 4.88L27.57 4.97Z' +
  'M40.29 13.17L35.83 22.22L35.86 22.71L45.61 16.69L45.54 16.36L44.82 15.86L40.56 13.10L40.29 13.17Z' +
  'M59.09 13.28L54.39 16.29L54.25 16.69L63.79 22.63L63.90 22.22L59.80 13.37L59.64 13.10L59.09 13.28Z';

/* O símbolo como elemento. `cor` é literal ou `currentColor`. */
export function simbolo({ tamanho = 28, cor = 'currentColor', classe = '', titulo = '' } = {}) {
  const rotulo = titulo
    ? `<title>${titulo}</title>`
    : '';
  return `<svg class="${classe}" width="${tamanho}" height="${tamanho}" viewBox="0 0 100 100" ` +
    `fill="${cor}" ${titulo ? 'role="img"' : 'aria-hidden="true" focusable="false"'} ` +
    `xmlns="http://www.w3.org/2000/svg">${rotulo}<path fill-rule="evenodd" clip-rule="evenodd" d="${SIMBOLO_D}"/></svg>`;
}

/* -------------------------------------------------------------------------
   Ícones da interface.

   Traço, nunca preenchimento, para acompanharem o peso do texto ao lado.
   Caixa 24 × 24, traço 1.5, pontas e junções arredondadas. Todos decorativos:
   quem carrega o significado é o texto ao lado, então todos saem com
   aria-hidden.
   ------------------------------------------------------------------------- */

const TRACOS = {
  seta: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
  setaEsquerda: '<path d="M20 12H5"/><path d="M11 6l-6 6 6 6"/>',
  pausa: '<path d="M9.5 5.5v13"/><path d="M14.5 5.5v13"/>',
  toca: '<path d="M7.5 5.2l11 6.8-11 6.8z"/>',
  setaBaixo: '<path d="M12 4v15"/><path d="M6 13l6 6 6-6"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>',
  conversa: '<path d="M20 11.6c0 3.9-3.6 7-8 7a9 9 0 0 1-2.6-.4L4.6 20l1.2-3.6A6.6 6.6 0 0 1 4 11.6c0-3.9 3.6-7 8-7s8 3.1 8 7z"/><path d="M9.2 11.4h.01"/><path d="M12 11.4h.01"/><path d="M14.8 11.4h.01"/>',
  telefone: '<path d="M6.3 4h3l1.5 3.7-1.9 1.4a11 11 0 0 0 5 5l1.4-1.9L19 13.7v3a1.6 1.6 0 0 1-1.8 1.6C10.4 17.6 6.4 13.6 4.7 5.8A1.6 1.6 0 0 1 6.3 4z"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="4.6"/><circle cx="12" cy="12" r="3.6"/><path d="M16.9 7.2h.01"/>',
  mais: '<path d="M12 5.5v13"/><path d="M5.5 12h13"/>',
  check: '<path d="M5 12.6l4.6 4.4L19 7"/>',
  girar: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20.4 4.4v4.2h-4.2"/>',
  bussola: '<circle cx="12" cy="12" r="8.5"/><path d="M15.3 8.7l-2 4.6-4.6 2 2-4.6z"/>',
  documento: '<path d="M6.5 3.5h7L18 8v12.5H6.5z"/><path d="M13.2 3.6V8.2H17.8"/><path d="M9.4 12.6h5.2"/><path d="M9.4 16h5.2"/>',
  escudo: '<path d="M12 3.6l6.6 2.6v5.2c0 4-2.8 7.4-6.6 9-3.8-1.6-6.6-5-6.6-9V6.2z"/><path d="M9.2 12.2l2 2 3.6-3.8"/>',
  olho: '<path d="M2.8 12S6.3 6 12 6s9.2 6 9.2 6-3.5 6-9.2 6-9.2-6-9.2-6z"/><circle cx="12" cy="12" r="2.8"/>',
  balao: '<path d="M4.5 6.2A1.7 1.7 0 0 1 6.2 4.5h11.6a1.7 1.7 0 0 1 1.7 1.7v8.1a1.7 1.7 0 0 1-1.7 1.7H9.6L5.6 19.5v-3.5h-.9a.2.2 0 0 1-.2-.2z"/>'
};

export function icone(nome, { tamanho = 20, classe = '' } = {}) {
  const tracos = TRACOS[nome];
  if (!tracos) { throw new Error(`Ícone desconhecido: ${nome}`); }
  return `<svg class="ico ${classe}" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" ` +
    'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ' +
    `stroke-linejoin="round" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${tracos}</svg>`;
}

/* Filete de ouro que separa seções. Gradiente que nasce e morre transparente,
   para a linha não bater nas bordas. */
export function filete(id) {
  return `<svg class="filete" viewBox="0 0 400 2" preserveAspectRatio="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">` +
    '<stop offset="0" stop-color="#A38434" stop-opacity="0"/>' +
    '<stop offset="0.5" stop-color="#A38434" stop-opacity="0.85"/>' +
    '<stop offset="1" stop-color="#A38434" stop-opacity="0"/>' +
    `</linearGradient></defs><rect width="400" height="2" fill="url(#${id})"/></svg>`;
}

/* -------------------------------------------------------------------------
   Ilustração de reserva do modelo tridimensional.

   Aparece antes de o modelo montar, quando o navegador não tem WebGL e
   quando o JavaScript está desligado. É um corte do mesmo dente que o modelo
   desenha: coroa, colo, duas raízes, câmara pulpar e o bloco de gengiva.
   ------------------------------------------------------------------------- */

export function denteEstatico() {
  return [
    '<svg class="dente-reserva" viewBox="0 0 300 340" role="img" aria-labelledby="dente-reserva-titulo" xmlns="http://www.w3.org/2000/svg">',
    '<title id="dente-reserva-titulo">Esquema de um molar: coroa com duas cúspides, colo, duas raízes e a câmara pulpar, envolvidos pelo bloco de gengiva.</title>',
    '<defs>',
    '<linearGradient id="gengiva-g" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#F0BEC1"/><stop offset="0.42" stop-color="#DE9186"/><stop offset="1" stop-color="#C2603F"/>',
    '</linearGradient>',
    '<linearGradient id="esmalte-g" x1="0.15" y1="0" x2="0.85" y2="1">',
    '<stop offset="0" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="#F6F3EC"/><stop offset="1" stop-color="#DAD2C3"/>',
    '</linearGradient>',
    '<linearGradient id="raiz-g" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#F1EBE0"/><stop offset="1" stop-color="#D8CDBB"/>',
    '</linearGradient>',
    '</defs>',

    /* sombra de contato */
    '<ellipse cx="150" cy="322" rx="88" ry="9" fill="#5A3E22" opacity="0.10"/>',

    /* bloco de gengiva */
    '<rect class="d-parte d-gengiva" x="30" y="140" width="240" height="176" rx="46" fill="url(#gengiva-g)"/>',

    /* colar gengival: o segundo lábio, em volta do colo */
    '<path class="d-parte d-colar" d="M78 158C96 142 122 136 150 136C178 136 204 142 222 158C204 172 178 178 150 178C122 178 96 172 78 158Z" fill="#F3C9C9" opacity="0.9"/>',

    /* duas raízes, dentro do alvéolo */
    '<path class="d-parte d-raiz" d="M96 166L132 166C128 205 118 248 110 274C107 283 97 283 95 274C90 240 90 200 96 166Z" fill="url(#raiz-g)" opacity="0.94"/>',
    '<path class="d-parte d-raiz" d="M204 166L168 166C172 205 182 248 190 274C193 283 203 283 205 274C210 240 210 200 204 166Z" fill="url(#raiz-g)" opacity="0.94"/>',

    /* coroa, com duas cúspides e o sulco central */
    '<path class="d-parte d-coroa" d="M82 108C82 78 92 54 112 44C128 36 140 46 150 62C160 46 172 36 188 44C208 54 218 78 218 108C218 140 208 164 188 170L112 170C92 164 82 140 82 108Z" fill="url(#esmalte-g)"/>',
    '<path class="d-parte d-sulco" d="M102 62C124 82 176 82 198 62" fill="none" stroke="#D6CDBB" stroke-width="3.5" stroke-linecap="round"/>',

    /* câmara pulpar e os dois canais, vistos por transparência */
    '<g class="d-parte d-polpa" fill="#DF8A80" opacity="0.34">',
    '<path d="M150 96C165 96 176 103 177 114C178 126 174 136 170 142L130 142C126 136 122 126 123 114C124 103 135 96 150 96Z"/>',
    '<path d="M108 140L128 140C122 186 112 232 106 252C104 259 99 258 99 250C100 212 104 174 108 140Z"/>',
    '<path d="M192 140L172 140C178 186 188 232 194 252C196 259 201 258 201 250C200 212 196 174 192 140Z"/>',
    '</g>',
    '</svg>'
  ].join('');
}
