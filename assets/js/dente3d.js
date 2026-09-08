/* =========================================================================
   O dente que gira, na página de tratamentos.

   POR QUE NÃO TEM BIBLIOTECA
   O caminho comum seria Three.js mais um modelo GLB. Isso custaria cerca de
   1,6 MB entre biblioteca, carregador e malha, contra os 182 KB do site
   inteiro. Numa clínica cujo tráfego vem de anúncio no celular, isso é o
   oposto do que se quer.

   Aqui a malha é GERADA em tempo de execução, por uma superfície
   paramétrica, e desenhada em WebGL 1 puro. Não há arquivo de modelo, não há
   biblioteca, não há licença de terceiro a respeitar, e o custo é este
   arquivo. A malha sai facetada de propósito: além de ser mais barata, é o
   que conversa com o símbolo da marca, que é um dente lapidado.

   O QUE ELE NÃO É
   Não é a navegação da página. Quem comanda são os botões da lista, que são
   HTML de verdade, focáveis pelo teclado e presentes mesmo sem script. A tela
   é `aria-hidden` e ilustra a escolha. Se não houver WebGL, ou se este
   arquivo não carregar, a seção continua sendo uma lista de tratamentos com
   links que funcionam.
   ========================================================================= */

(function () {
  'use strict';

  var raiz = document.querySelector('[data-dente]');
  if (!raiz) { return; }

  /* Nada abaixo roda no carregamento da página.

     Gerar a malha e montar o WebGL custa alguns milissegundos de linha
     principal, e a seção do dente fica bem abaixo da dobra. Num celular
     lento, esse custo no carregamento sai do orçamento de quem só quer o
     telefone da unidade. Com o observador, ele só acontece quando a pessoa
     chega perto da seção. */
  function iniciar() {
    var tela = raiz.querySelector('.dente-tela');
    var palco = raiz.querySelector('.dente-palco');
    var marcador = raiz.querySelector('.dente-marcador');
    /* Os botões vivem na SEÇÃO de tratamentos, não dentro do cartão do
       modelo: o cartão está no hero e a lista fica bem abaixo na página. Por
       isso a busca é no documento inteiro, e não dentro de `raiz`. */
    var botoes = [].slice.call(document.querySelectorAll('[data-parte]'));
    if (!tela || !botoes.length) { return; }

    var gl = null;
    try {
      gl = tela.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false })
        || tela.getContext('experimental-webgl', { antialias: true, alpha: true });
    } catch (e) { gl = null; }
    if (!gl) { return; }

    var reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ------------------------------------------------------------------ */
    /* 1. Geometria                                                        */
    /* ------------------------------------------------------------------ */

    /* Uma ARCADA, não um dente solto.

       O dente único lia como objeto de laboratório e não dizia nada sobre o
       tratamento: dava para pôr um ponto na raiz e outro na coroa, e acabava
       aí. A arcada resolve isso porque cada tratamento age numa REGIÃO dela,
       e a região dá para acender: as facetas nos quatro da frente, a
       ortodontia na arcada inteira, o implante numa falha, a periodontia na
       gengiva.

       Nada é arquivo de modelo. Cada coroa é uma superfície de varredura
       gerada em tempo de execução, e a gengiva é um perfil varrido ao longo
       da mesma curva. Doze dentes, cerca de 6 mil triângulos, zero bytes de
       malha baixados.

       AS PROPORÇÕES SÃO MEDIDAS, NÃO CHUTADAS. As larguras, espessuras e
       alturas de coroa abaixo estão em milímetros, na faixa média da
       dentição superior permanente adulta. Elas entram na curva por
       COMPRIMENTO DE ARCO: o meio-arco é medido, a soma das larguras é
       ajustada a ele, e cada dente é posto no seu ponto. É isso que faz os
       dentes se TOCAREM. Espalhados por ângulo, como estavam antes, sobrava
       vão entre eles e a peça lia como um colar de contas. */

    function suave(a, b, x) {
      var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }

    /* Potência que preserva o sinal: é o que leva o círculo à superelipse,
       e a superelipse é o que dá um molar com face de mastigação quadrada e
       um incisivo com face achatada, na mesma fórmula. */
    function pot(v, e) {
      var s = v < 0 ? -1 : 1;
      return s * Math.pow(Math.abs(v), e);
    }

    var pos = [], nor = [], reg = [];   /* reg: a que região cada vértice pertence */
    var regiaoAtual = 0;

    function triangulo(A, B, C) {
      var ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
      var wx = C[0] - A[0], wy = C[1] - A[1], wz = C[2] - A[2];
      var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      var m = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (m < 1e-7) { return; }
      nx /= m; ny /= m; nz /= m;
      pos.push(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
      nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
      reg.push(regiaoAtual, regiaoAtual, regiaoAtual);
    }

    function quadrilatero(A, B, C, D) { triangulo(A, B, C); triangulo(A, C, D); }

    /* --- a curva da arcada -------------------------------------------- */

    /* Meia-elipse, com `t` de -1 (último molar esquerdo) a 1 (direito) e 0
       no meio dos incisivos centrais. Medidas de arcada superior adulta:
       cerca de 55 mm entre os molares e 42 mm de fundo. */
    var MM = 0.0295;                       /* escala: milímetro para unidade de cena */
    /* Mais larga que funda: com a elipse ao contrário, o raio de
       curvatura na frente caía para 19 mm e a tangente virava 25 graus
       ao longo de UM incisivo, o que abria as coroas em leque. */
    var ARCO_L = 24.0 * MM, ARCO_P = 27.0 * MM, ABERTURA = 1.78;

    function naArcada(t) {
      var a = t * ABERTURA;
      return [ARCO_L * Math.sin(a), 0, -ARCO_P * Math.cos(a)];
    }
    function tangenteNaArcada(t) {
      var a = t * ABERTURA;
      return Math.atan2(ARCO_L * Math.cos(a), ARCO_P * Math.sin(a));
    }

    /* Comprimento do meio-arco, integrado. É o número que decide onde cada
       dente cai: sem ele não há como garantir que eles se toquem. */
    var PASSOS_ARCO = 400;
    var TABELA_S = [0];
    (function () {
      var ant = naArcada(0), soma = 0, i, p;
      for (i = 1; i <= PASSOS_ARCO; i++) {
        p = naArcada(i / PASSOS_ARCO);
        soma += Math.sqrt((p[0] - ant[0]) * (p[0] - ant[0]) + (p[2] - ant[2]) * (p[2] - ant[2]));
        TABELA_S.push(soma);
        ant = p;
      }
    })();
    var ARCO_TOTAL = TABELA_S[PASSOS_ARCO];

    /* Inverso da tabela: dado um comprimento, devolve o `t` correspondente. */
    function tEm(s) {
      if (s <= 0) { return 0; }
      if (s >= ARCO_TOTAL) { return 1; }
      var lo = 0, hi = PASSOS_ARCO, m;
      while (hi - lo > 1) { m = (lo + hi) >> 1; if (TABELA_S[m] < s) { lo = m; } else { hi = m; } }
      var f = (s - TABELA_S[lo]) / (TABELA_S[hi] - TABELA_S[lo] || 1);
      return (lo + f) / PASSOS_ARCO;
    }

    /* --- os dentes ------------------------------------------------------ */

    /* l: largura mésio-distal, e: espessura vestíbulo-lingual, h: altura de
       coroa, todas em milímetros. `q` é o quanto a face de mastigação é
       quadrada, `c` é a altura das cúspides e `n` quantas são. */
    var FILA = [
      { nome: 'central', l: 8.6, e: 7.1, h: 10.5, q: 0.34, c: 0.00, n: 0 },
      { nome: 'lateral', l: 6.6, e: 6.2, h: 9.0, q: 0.36, c: 0.00, n: 0 },
      { nome: 'canino', l: 7.6, e: 8.1, h: 10.0, q: 0.50, c: 0.16, n: 1 },
      { nome: 'premolar', l: 7.1, e: 9.2, h: 8.5, q: 0.62, c: 0.13, n: 2 },
      { nome: 'premolar', l: 6.8, e: 9.0, h: 8.2, q: 0.64, c: 0.13, n: 2 },
      { nome: 'molar', l: 10.4, e: 11.3, h: 7.6, q: 0.78, c: 0.07, n: 4 }
    ];

    /* A soma das larguras é encaixada no meio-arco medido. O fator abaixo de
       1 deixa um fio entre as coroas, para o contato aparecer como contato e
       não como fusão. */
    var LARG_TOTAL = 0;
    for (var iw = 0; iw < FILA.length; iw++) { LARG_TOTAL += FILA[iw].l; }
    var ESCALA = (ARCO_TOTAL * 0.985) / (LARG_TOTAL * MM);

    /* Centro de cada coroa, em comprimento de arco a partir da linha média. */
    var CENTROS = [], acumulado = 0;
    for (var ic = 0; ic < FILA.length; ic++) {
      var wmm = FILA[ic].l * MM * ESCALA;
      CENTROS.push(acumulado + wmm / 2);
      acumulado += wmm;
    }

    var NU = 10, NV = 20;

    /* Uma coroa, do colo à borda que corta ou mastiga.

       Duas correções em relação à primeira versão, as duas visíveis:

       O COLO. Antes a coroa era mais larga justamente na altura da gengiva,
       e o resultado era um dente APOIADO sobre a gengiva em vez de nascido
       dela. A cintura agora é estreita embaixo e cheia acima da linha, que
       é como a coroa sai do sulco de verdade.

       O TOPO. Antes o topo fechava num ponto, nos dois sentidos, e a
       superfície virava um leque de raios que lia como sujeira na malha —
       além de dar um incisivo pontudo, que não existe. Agora o incisivo
       fecha só na ESPESSURA e sobra a lâmina da borda incisal; o molar
       encolhe pouco e sobra a mesa oclusal com as cúspides. As duas
       terminam em tampa plana, de uma face só. */
    function umaCoroa(d, lado, indice) {
      var t = tEm(CENTROS[indice]) * lado;
      var base = naArcada(t);
      var giro = tangenteNaArcada(t) * lado;
      /* O par (cos, sen) tirado da tangente aponta para DENTRO da arcada.
         Sem o sinal trocado, a face vestibular da coroa fica virada para o
         palato: o tombamento inclina a coroa para dentro e a cunha alarga o
         lado errado, que é justamente o lado que se vê. Meia volta no
         referencial local resolve, e é rotação, não espelho — os dois eixos
         trocam de sinal juntos. */
      var cg = -Math.cos(giro), sg = -Math.sin(giro);

      var L = d.l * MM * ESCALA * 0.5;
      var E = d.e * MM * ESCALA * 0.5;
      var H = d.h * MM * ESCALA;
      var COLO = H * 0.34;                 /* o quanto a coroa entra na gengiva */
      /* Os de trás ficam mais baixos que os da frente: é a curva de Spee, e
         sem ela a arcada lê como uma cerca. */
      var afunda = H * 0.10 * suave(1, 5, indice);
      /* Inclinação para fora, crescente para trás. */
      var tomba = 0.10 + 0.10 * suave(0, 5, indice);

      /* OS DOIS EIXOS DA COROA, e eles já estiveram trocados.

         `base` mais `(cg, sg)` aponta para FORA da arcada, e `(-sg, cg)`
         corre AO LONGO dela. Na primeira versão a largura mésio-distal ia
         para o eixo de fora e a espessura ia para o eixo do arco: cada
         coroa ocupava, ao longo da curva, só a sua espessura. O incisivo
         central recebia 8,3 mm de arco e preenchia 7,1 — o milímetro e
         pouco que sobrava virava uma fenda preta entre um dente e o outro,
         em todos os doze. Levou três rodadas de captura para eu ver que o
         defeito não era a gengiva nem a papila: era isto. */
      function ponto(iu, iv) {
        var s = iu / NU;
        var v = (iv / NV) * Math.PI * 2;
        var alt = -COLO + s * (H + COLO);
        var sc = (alt + COLO) / (H + COLO);
        /* A coroa abre depressa acima do colo e daí para cima MANTÉM a
           largura, em vez de voltar a afinar. É o que faz duas vizinhas se
           encostarem ao longo de toda a metade de cima. */
        var cintura = 0.72 + 0.28 * suave(0.06, 0.50, sc);
        var k = suave(0.82, 1.0, sc);
        /* O topo fecha. Em quem corta (incisivo e canino) ele fecha só na
           ESPESSURA, e sobra a lâmina da borda incisal. Em quem mastiga ele
           encolhe pouco e sobra a mesa oclusal. */
        var rMd = cintura * (1 - (d.n ? 0.20 : 0.06) * k);
        var rBl = cintura * (1 - (d.n ? 0.20 : 0.62) * k);
        var md = L * rMd * pot(Math.cos(v), d.q);     /* ao longo da arcada */
        var bl = E * rBl * pot(Math.sin(v), d.q);     /* vestibular / lingual */
        /* Cunha: mais larga na face de fora que na de dentro. É o que
           permite doze coroas caberem numa curva sem abrir leque entre
           elas — e é a razão anatômica de o dente ser assim. */
        md *= 1 + 0.24 * Math.sin(v);
        /* Cúspides. Uma no canino, duas no pré-molar (vestibular e
           lingual), quatro no molar (nas diagonais, que é onde estão). */
        if (d.n && k > 0) {
          alt += d.c * H * k * (d.n === 1 ? 1
            : d.n === 4 ? (0.68 + 0.32 * Math.abs(Math.sin(2 * v)))
            : Math.abs(Math.sin(v)));
        }
        alt -= afunda;
        /* tombamento para fora, depois a posição na curva */
        var y2 = alt * Math.cos(tomba) - bl * Math.sin(tomba);
        var b2 = alt * Math.sin(tomba) + bl * Math.cos(tomba);
        return [base[0] + b2 * cg - md * sg, y2, base[2] + b2 * sg + md * cg];
      }

      var i, j;
      for (i = 0; i < NU; i++) {
        for (j = 0; j < NV; j++) {
          quadrilatero(ponto(i, j), ponto(i, j + 1), ponto(i + 1, j + 1), ponto(i + 1, j));
        }
      }

      /* Tampas: a de cima é a borda incisal ou a mesa oclusal, a de baixo
         some dentro da gengiva e existe só para a coroa ser sólida. */
      function tampa(iu) {
        var cx = 0, cy = 0, cz = 0, p, j;
        for (j = 0; j < NV; j++) { p = ponto(iu, j); cx += p[0]; cy += p[1]; cz += p[2]; }
        var c = [cx / NV, cy / NV, cz / NV];
        for (j = 0; j < NV; j++) { triangulo(c, ponto(iu, j), ponto(iu, j + 1)); }
      }
      tampa(NU); tampa(0);
    }

    /* --- a gengiva ----------------------------------------------------- */

    /* Um cordão varrido ao longo da mesma curva, de seção elíptica, que se
       fecha nas duas pontas porque o raio vai a zero.

       O detalhe que faz a peça parecer boca e não maquete é o RECORTE: a
       borda sobe em ponta entre um dente e outro (a papila) e desce no meio
       de cada dente. Sem ele o cordão vira um cano atrás dos dentes, que foi
       exatamente como a primeira versão leu. */
    function gengiva() {
      var VOLTAS = 132, ANEL = 12;
      var LIM = 1.06;                     /* passa um pouco dos molares */
      var FIM = CENTROS[FILA.length - 1] + FILA[FILA.length - 1].l * MM * ESCALA * 0.5;

      /* Altura da borda num ponto do arco: pico nos contatos, vale no meio
         de cada coroa. */
      function recorte(sArco) {
        var s = Math.abs(sArco);
        var melhor = 0;
        for (var k = 0; k < FILA.length; k++) {
          var meia = FILA[k].l * MM * ESCALA * 0.5;
          var d = (s - CENTROS[k]) / meia;      /* -1 .. 1 dentro da coroa */
          if (d >= -1 && d <= 1) { melhor = Math.abs(d); }
        }
        /* 0 no meio do dente, 1 no contato */
        return melhor * melhor;
      }

      function ponto(i, j) {
        var u = -LIM + (i / VOLTAS) * 2 * LIM;      /* -1.06 .. 1.06 */
        var sArco = u * FIM;
        var t = tEm(Math.abs(sArco)) * (u < 0 ? -1 : 1);
        var base = naArcada(t);
        var giro = tangenteNaArcada(t) * (u < 0 ? -1 : 1);
        var cg = Math.cos(giro), sg = Math.sin(giro);

        /* Engorda para trás: a gengiva dos molares é mais larga. */
        var grossura = 1 + 0.62 * suave(0.30, 1.0, Math.abs(u));
        var RX = 0.147 * grossura, RY = 0.166;
        /* Some nas pontas em vez de terminar num toco. */
        var fecha = 1 - suave(0.86, LIM, Math.abs(u));
        RX *= fecha; RY *= fecha;

        var a = (j / ANEL) * Math.PI * 2;
        var lx = RX * Math.cos(a);
        /* A metade de baixo é achatada. Com o anel elíptico inteiro a
           gengiva pendurava um bojo embaixo dos dentes e lia como uma
           fatia de carne; achatada, lê como a base de um modelo. */
        var ly = RY * Math.sin(a) * (Math.sin(a) < 0 ? 0.62 : 1);
        /* A papila levanta só o lado de cima do anel. */
        ly += 0.082 * recorte(sArco) * Math.pow(Math.max(0, Math.sin(a)), 0.45) * fecha;
        ly -= 0.058;

        var lado = (u < 0 ? -1 : 1);
        return [base[0] + lx * lado * cg, ly, base[2] + lx * lado * sg];
      }

      for (var i = 0; i < VOLTAS; i++) {
        for (var j = 0; j < ANEL; j++) {
          quadrilatero(ponto(i, j), ponto(i, j + 1), ponto(i + 1, j + 1), ponto(i + 1, j));
        }
      }
    }

    /* --- montagem -------------------------------------------------------
       As regiões são o que o site acende. Cada dente entra numa delas, e a
       gengiva na sua própria. O número vai por vértice até o shader. */
    var REG = { GENGIVA: 0, FRENTE: 1, LADO: 2, FUNDO: 3, FALHA: 4 };

    /* O implante mostra uma FALHA: o segundo pré-molar da direita não é
       desenhado, e no lugar entra um pino. É o que faz o tratamento aparecer
       em vez de ser só um rótulo. */
    var SEM_DENTE = { lado: 1, indice: 4 };

    regiaoAtual = REG.GENGIVA;
    gengiva();

    for (var lado = -1; lado <= 1; lado += 2) {
      for (var k = 0; k < FILA.length; k++) {
        var vazio = (lado === SEM_DENTE.lado && k === SEM_DENTE.indice);
        if (vazio) { continue; }
        regiaoAtual = k <= 2 ? REG.FRENTE : (k <= 4 ? REG.LADO : REG.FUNDO);
        umaCoroa(FILA[k], lado, k);
      }
    }

    var arcada = {
      pos: new Float32Array(pos), nor: new Float32Array(nor),
      reg: new Float32Array(reg), n: pos.length / 3
    };

    /* --- o implante que preenche a falha ------------------------------- */

    pos = []; nor = []; reg = [];
    regiaoAtual = REG.FALHA;
    (function () {
      var d = FILA[SEM_DENTE.indice];
      var t = tEm(CENTROS[SEM_DENTE.indice]) * SEM_DENTE.lado;
      var base = naArcada(t);
      var H = d.h * MM * ESCALA;
      var NUp = 14, NVp = 14;
      function ponto(i, j) {
        var v = (j / NVp) * Math.PI * 2;
        var s = i / NUp;
        var y = -0.34 + s * (0.34 + H * 0.30);
        /* Corpo roscado embaixo, colo liso, plataforma em cima. */
        var r = 0.062 * (1 + 0.20 * Math.sin(y * 52));
        if (y > -0.02) { r = 0.052; }
        if (y > H * 0.10) { r = 0.086 * (1 - suave(H * 0.10, H * 0.30, y) * 0.35); }
        return [base[0] + r * Math.cos(v), y, base[2] + r * Math.sin(v)];
      }
      for (var i = 0; i < NUp; i++) {
        for (var j = 0; j < NVp; j++) {
          quadrilatero(ponto(i, j), ponto(i + 1, j), ponto(i + 1, j + 1), ponto(i, j + 1));
        }
      }
      var topo = ponto(NUp, 0);
      for (var jt = 0; jt < NVp; jt++) {
        triangulo([base[0], topo[1], base[2]], ponto(NUp, jt), ponto(NUp, jt + 1));
      }
    })();
    var implante = {
      pos: new Float32Array(pos), nor: new Float32Array(nor),
      reg: new Float32Array(reg), n: pos.length / 3
    };

    /* --- assentar a peça -----------------------------------------------

       Duas correções de uma vez, as duas de sinal.

       A curva nasce com os incisivos em z negativo, e a câmera olha para
       -Z: do jeito que sai do gerador, o giro zero mostra a NUCA da arcada.
       Meia volta em Y resolve, e é uma rotação de verdade (x e z trocam de
       sinal juntos, nas posições e nas normais), não um espelho: espelhar
       inverteria o sentido das faces.

       E a peça nasce fora da origem, porque a curva se abre para trás. Girar
       assim faz a arcada bambear em vez de rodar no lugar. Centrar nos três
       eixos é o que dá o giro limpo, e é o que deixa a câmera ser calculada
       a partir do tamanho real. */
    var TAMANHO = (function () {
      var b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9], i, k;
      for (i = 0; i < arcada.pos.length; i += 3) {
        for (k = 0; k < 3; k++) {
          if (arcada.pos[i + k] < b[k]) { b[k] = arcada.pos[i + k]; }
          if (arcada.pos[i + k] > b[3 + k]) { b[3 + k] = arcada.pos[i + k]; }
        }
      }
      var c = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2];
      [arcada, implante].forEach(function (m) {
        for (var i = 0; i < m.pos.length; i += 3) {
          m.pos[i] = -(m.pos[i] - c[0]);
          m.pos[i + 1] = m.pos[i + 1] - c[1];
          m.pos[i + 2] = -(m.pos[i + 2] - c[2]);
          m.nor[i] = -m.nor[i];
          m.nor[i + 2] = -m.nor[i + 2];
        }
      });
      return [b[3] - b[0], b[4] - b[1], b[5] - b[2]];
    })();

    /* --- onde cada região mostra a cara ---------------------------------

       O rótulo não pode pousar no centro de massa da região: metade delas é
       simétrica (os dois lados, os dois fundos), e a média dos dois lados
       cai no meio da boca, que é onde não há nada para apontar.

       Então a DIREÇÃO é escolhida — de que lado da peça aquele tratamento
       vai ser mostrado — e o PONTO é medido: o vértice da região que vai
       mais longe naquela direção, suavizado pela vizinhança para não
       pendurar o rótulo num vértice solto. Escolha de projeto onde é
       escolha; conta onde é conta. Digitado à mão, o ponto descolava do
       modelo a cada ajuste de geometria e ninguém percebia. */
    function pontoNaDirecao(malha, r, dir) {
      var dl = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
      var dx = dir[0] / dl, dy = dir[1] / dl, dz = dir[2] / dl;
      var melhor = -1e9, b = [0, 0, 0], i, s;
      for (i = 0; i < malha.pos.length; i += 3) {
        if (Math.abs(malha.reg[i / 3] - r) > 0.3) { continue; }
        s = malha.pos[i] * dx + malha.pos[i + 1] * dy + malha.pos[i + 2] * dz;
        if (s > melhor) { melhor = s; b = [malha.pos[i], malha.pos[i + 1], malha.pos[i + 2]]; }
      }
      var sx = 0, sy = 0, sz = 0, n = 0, ax, ay, az;
      for (i = 0; i < malha.pos.length; i += 3) {
        if (Math.abs(malha.reg[i / 3] - r) > 0.3) { continue; }
        ax = malha.pos[i] - b[0]; ay = malha.pos[i + 1] - b[1]; az = malha.pos[i + 2] - b[2];
        if (ax * ax + ay * ay + az * az > 0.020) { continue; }
        sx += malha.pos[i]; sy += malha.pos[i + 1]; sz += malha.pos[i + 2]; n++;
      }
      return n ? [sx / n, sy / n, sz / n] : b;
    }

    /* O giro que traz um ponto para a frente da câmera. Vem da própria
       matriz de transformação: o eixo que aponta para quem olha é
       (-sen, cos), então alinhar o ponto a ele é atan2(-x, z). */
    function giroPara(p) { return Math.atan2(-p[0], p[2]); }

    /* ------------------------------------------------------------------ */
    /* 2. WebGL                                                            */
    /* ------------------------------------------------------------------ */

    var VS = [
      'attribute vec3 pos; attribute vec3 nor; attribute float regiao;',
      'uniform mat4 mvp; uniform mat4 mv; uniform vec4 acesas;',
      'varying vec3 vN; varying vec3 vP; varying float vAceso; varying float vGengiva;',
      'void main(){',
      '  vN = mat3(mv) * nor;',
      '  vP = (mv * vec4(pos,1.0)).xyz;',
      '  vGengiva = step(regiao, 0.5);',
      /* `acesas` traz ate quatro regioes de uma vez, e -1 significa
         "nenhuma". Antes era UMA regiao por chamada e a arcada era
         desenhada de novo para cada uma; com o teste de profundidade em
         MENOR, o segundo desenho tinha profundidade IGUAL e era descartado
         inteiro. Ou seja: a ortodontia, que acende a arcada toda, acendia
         so a gengiva, e em silencio. Uma chamada com quatro numeros nao tem
         esse jeito de errar. */
      '  float d = min(min(abs(regiao-acesas.x), abs(regiao-acesas.y)),',
      '                min(abs(regiao-acesas.z), abs(regiao-acesas.w)));',
      '  vAceso = step(d, 0.3);',
      '  gl_Position = mvp * vec4(pos,1.0);',
      '}'
    ].join('\n');

    var FS = [
      'precision mediump float;',
      'varying vec3 vN; varying vec3 vP; varying float vAceso; varying float vGengiva;',
      'uniform vec3 cor; uniform vec3 corGengiva; uniform vec3 corRim;',
      'uniform vec3 corAceso; uniform float alfa;',
      'void main(){',
      '  vec3 N = normalize(vN);',
      /* A malha tem partes que se atravessam (a coroa entra na gengiva), e
         nesse encontro ha faces viradas para dentro. Sem esta linha elas
         aparecem pretas. E por isso tambem que o recorte de faces esta
         desligado: e mais barato acertar a normal aqui do que garantir a
         mao o sentido de cada quadrilatero de duas superficies varridas. */
      '  if (!gl_FrontFacing) { N = -N; }',
      '  vec3 V = normalize(-vP);',
      /* luz principal, alta e a esquerda, mais um preenchimento frio embaixo */
      '  vec3 L = normalize(vec3(-0.42, 0.86, 0.58));',
      '  float dif = max(dot(N, L), 0.0);',
      '  float fill = max(dot(N, normalize(vec3(0.65,-0.35,0.30))), 0.0) * 0.16;',
      '  vec3 H = normalize(L + V);',
      '  vec3 corBase = mix(cor, corGengiva, vGengiva);',
      '  float brilho = mix(46.0, 16.0, vGengiva);',
      '  float esp = pow(max(dot(N, H), 0.0), brilho) * mix(0.42, 0.16, vGengiva);',
      /* Luz de contorno em ouro. Estava em 1,55 e lavava a peca inteira: as
         faces de perfil ficavam douradas e a arcada lia como uma joia, nao
         como dentes. Em 0,42 ela so desenha a silhueta contra o cartao. */
      '  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.4);',
      /* O realce nao TROCA a cor do dente: mistura. Trocando, a regiao
         escolhida virava um bloco de ouro macico, que numa clinica
         odontologica e exatamente a imagem que nao se quer. Misturado a
         menos da metade, com o contorno reforcado, le como luz em cima
         da regiao. */
      '  vec3 base = mix(corBase, corAceso, vAceso * 0.42);',
      '  vec3 c = base * (0.24 + 0.80 * dif + fill) + vec3(esp);',
      '  c += corRim * rim * (0.40 + 1.10 * vAceso);',
      '  c += corAceso * vAceso * 0.13;',
      '  gl_FragColor = vec4(c, alfa);',
      '}'
    ].join('\n');

    function compilar(tipo, fonte) {
      var s = gl.createShader(tipo);
      gl.shaderSource(s, fonte);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        /* Sem este aviso a falha e muda: o programa nao linka, iniciar()
           desiste em silencio, e o cartao fica preto sem nenhum sinal. */
        if (window.console) { console.warn('dente3d: shader nao compilou', gl.getShaderInfoLog(s)); }
        return null;
      }
      return s;
    }

    var vs = compilar(gl.VERTEX_SHADER, VS);
    var fs = compilar(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      if (window.console) { console.warn('dente3d: programa nao linkou', gl.getProgramInfoLog(prog)); }
      return;
    }
    gl.useProgram(prog);

    var aPos = gl.getAttribLocation(prog, 'pos');
    var aNor = gl.getAttribLocation(prog, 'nor');
    var aReg = gl.getAttribLocation(prog, 'regiao');
    var uMvp = gl.getUniformLocation(prog, 'mvp');
    var uMv = gl.getUniformLocation(prog, 'mv');
    var uCor = gl.getUniformLocation(prog, 'cor');
    var uRim = gl.getUniformLocation(prog, 'corRim');
    var uAlfa = gl.getUniformLocation(prog, 'alfa');
    var uAcesas = gl.getUniformLocation(prog, 'acesas');
    var uCorAceso = gl.getUniformLocation(prog, 'corAceso');
    var uCorGengiva = gl.getUniformLocation(prog, 'corGengiva');

    function enviar(m) {
      var bp = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bp);
      gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.STATIC_DRAW);
      var bn = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bn);
      gl.bufferData(gl.ARRAY_BUFFER, m.nor, gl.STATIC_DRAW);
      var br = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, br);
      gl.bufferData(gl.ARRAY_BUFFER, m.reg, gl.STATIC_DRAW);
      m.bp = bp; m.bn = bn; m.br = br;
      return m;
    }
    enviar(arcada); enviar(implante);

    function desenhar(m) {
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bp);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bn);
      gl.enableVertexAttribArray(aNor);
      gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.br);
      gl.enableVertexAttribArray(aReg);
      gl.vertexAttribPointer(aReg, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, m.n);
    }

    /* Inclinação da câmera: olhando de cima, o suficiente para a arcada
       ler como arcada e não como fileira de dentes. */
    var giroX = 0.80;

    /* ------------------------------------------------------------------ */
    /* 3. Matrizes                                                         */
    /* ------------------------------------------------------------------ */

    function multiplicar(a, b) {
      var o = new Float32Array(16), i, j, k, s;
      for (i = 0; i < 4; i++) {
        for (j = 0; j < 4; j++) {
          s = 0;
          for (k = 0; k < 4; k++) { s += a[k * 4 + j] * b[i * 4 + k]; }
          o[i * 4 + j] = s;
        }
      }
      return o;
    }

    function perspectiva(fov, aspecto, perto, longe) {
      var f = 1 / Math.tan(fov / 2);
      return new Float32Array([
        f / aspecto, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (longe + perto) / (perto - longe), -1,
        0, 0, (2 * longe * perto) / (perto - longe), 0
      ]);
    }

    function transformacao(giroY, giroX, dist) {
      var cy = Math.cos(giroY), sy = Math.sin(giroY);
      var cx = Math.cos(giroX), sx = Math.sin(giroX);
      /* rotação em Y, depois em X, depois afasta a câmera */
      return new Float32Array([
        cy, sy * sx, -sy * cx, 0,
        0, cx, sx, 0,
        sy, -cy * sx, cy * cx, 0,
        0, 0, -dist, 1
      ]);
    }

    /* --- a que distância a câmera cabe ---------------------------------

       Antes isto era uma altura e uma largura digitadas à mão, com uma
       folga estimada. Deu no que se vê: a arcada saía cortada na direita,
       porque a silhueta de uma peça que GIRA não é a caixa que a envolve, e
       porque a perspectiva engorda o que está mais perto.

       Aqui a distância é MEDIDA. A busca binária procura a menor distância
       em que todo vértice, em todo ângulo de giro, ainda cai dentro do
       quadro com uma margem. Roda uma vez por proporção de tela, sobre uma
       amostra dos vértices, e o resultado fica guardado. Não é possível
       cortar a peça sem que este teste falhe primeiro. */
    /* Campo de visão estreito, de foto de produto. Em 45 graus a
       perspectiva engordava os incisivos, que ficam na beirada mais
       próxima, e a arcada parecia tombar para a frente. */
    var FOV = 0.52;
    var MARGEM = 0.86;          /* fração do quadro que a peça pode ocupar */

    var AMOSTRA = (function () {
      var passo = Math.max(1, Math.floor(arcada.n / 900)) * 3;
      var a = [], i;
      for (i = 0; i < arcada.pos.length; i += passo) {
        a.push(arcada.pos[i], arcada.pos[i + 1], arcada.pos[i + 2]);
      }
      return a;
    })();

    /* Extremos da amostra depois de girar, por ângulo e por eixo. Como só há
       um giro (em Y) e uma inclinação fixa (em X), varrer 32 ângulos cobre a
       volta inteira com sobra. */
    var EXTREMOS = (function () {
      var lista = [], k, i, ang, cy, sy, cx, sx, x, y, z, x2, y2, z2, e;
      for (k = 0; k < 32; k++) {
        ang = (k / 32) * Math.PI * 2;
        cy = Math.cos(ang); sy = Math.sin(ang);
        cx = Math.cos(giroX); sx = Math.sin(giroX);
        e = [0, 0, 0];               /* |x| máximo, |y| máximo, z máximo */
        e[2] = -1e9;
        for (i = 0; i < AMOSTRA.length; i += 3) {
          x = AMOSTRA[i]; y = AMOSTRA[i + 1]; z = AMOSTRA[i + 2];
          x2 = cy * x + sy * z;
          y2 = sy * sx * x + cx * y - cy * sx * z;
          z2 = -sy * cx * x + sx * y + cy * cx * z;
          if (Math.abs(x2) > e[0]) { e[0] = Math.abs(x2); }
          if (Math.abs(y2) > e[1]) { e[1] = Math.abs(y2); }
          if (z2 > e[2]) { e[2] = z2; }
          lista.push(x2, y2, z2);
        }
      }
      return lista;
    })();

    var distCache = {};

    function cabe(dist, aspecto) {
      var tanV = Math.tan(FOV / 2), tanH = tanV * aspecto, i, w;
      for (i = 0; i < EXTREMOS.length; i += 3) {
        w = dist - EXTREMOS[i + 2];
        if (w < 0.25) { return false; }
        if (Math.abs(EXTREMOS[i]) > w * tanH * MARGEM) { return false; }
        if (Math.abs(EXTREMOS[i + 1]) > w * tanV * MARGEM) { return false; }
      }
      return true;
    }

    function distancia(aspecto) {
      var chave = aspecto.toFixed(2);
      if (distCache[chave]) { return distCache[chave]; }
      var lo = 0.5, hi = 24, m, i;
      for (i = 0; i < 26; i++) {
        m = (lo + hi) / 2;
        if (cabe(m, aspecto)) { hi = m; } else { lo = m; }
      }
      distCache[chave] = hi;
      return hi;
    }

    function projetar(p, mvp) {
      var x = p[0] * mvp[0] + p[1] * mvp[4] + p[2] * mvp[8] + mvp[12];
      var y = p[0] * mvp[1] + p[1] * mvp[5] + p[2] * mvp[9] + mvp[13];
      var w = p[0] * mvp[3] + p[1] * mvp[7] + p[2] * mvp[11] + mvp[15];
      if (w <= 0.0001) { return null; }
      return [(x / w * 0.5 + 0.5), (1 - (y / w * 0.5 + 0.5))];
    }

    /* ------------------------------------------------------------------ */
    /* 4. Âncoras: onde cada tratamento atua                               */
    /* ------------------------------------------------------------------ */

    /* Cada tratamento acende uma REGIÃO da arcada e a traz para a frente.
       `regiao` é o número que o shader compara, `dir` é de que lado da peça
       aquela região vai ser mostrada, e o resto — o ponto exato onde o
       rótulo pousa e o ângulo do giro — sai da malha.

       Dois números são códigos e não regiões: -2 acende a arcada inteira
       (ortodontia move tudo) e -3 acende os dentes sem a gengiva (o
       clareamento não age na gengiva). */
    var ANCORAS = {
      'lentes-e-facetas': { regiao: 1, dir: [0, 0.35, 1] },
      'ortodontia-e-alinhadores': { regiao: -2, dir: [0, 0.45, 1] },
      'implante-e-protese': { regiao: 4, dir: [-1, 0.3, 0] },
      'clareamento-dental': { regiao: -3, dir: [0.25, 0.45, 1] },
      'endodontia': { regiao: 1, dir: [-0.55, 0.3, 0.8] },
      'periodontia': { regiao: 0, dir: [0, 0.2, 1] },
      'avaliacao-com-camera-intraoral': { regiao: 3, dir: [0.85, 0.3, -0.45] }
    };

    Object.keys(ANCORAS).forEach(function (k) {
      var a = ANCORAS[k];
      var malha = a.regiao === 4 ? implante : arcada;
      var r = a.regiao === -2 || a.regiao === -3 ? 1 : a.regiao;
      a.p = pontoNaDirecao(malha, r, a.dir);
      a.giro = giroPara(a.p);
      /* Afasta o rótulo da peça. Pousado na superfície, ele cai em cima
         dos incisivos e tapa justamente o que está sendo apontado. */
      a.p = [a.p[0] * 1.34, a.p[1] + 0.20, a.p[2] * 1.34];
      a.acesas = a.regiao === -2 ? [0, 1, 2, 3]
        : a.regiao === -3 ? [1, 2, 3, -1]
        : [a.regiao, -1, -1, -1];
    });

    /* ------------------------------------------------------------------ */
    /* 5. Estado e laço                                                    */
    /* ------------------------------------------------------------------ */

    var giroY = 0.35, alvoY = 0.35;
    var girando = true;
    var arrastando = false, xAnterior = 0, movimento = 0;
    var selecionado = null;
    var visivel = true, pedido = 0;

    /* Esmalte quase branco, gengiva num rosa apagado e ouro só no realce.
       A versão anterior tinha creme nos dentes e um contorno dourado forte
       que os deixava com cara de dente de ouro — o oposto do que uma
       clínica quer mostrar. */
    var ESMALTE = [0.957, 0.937, 0.898];
    var GENGIVA = [0.671, 0.478, 0.478];
    var OURO = [0.824, 0.686, 0.341];
    var OURO_ACESO = [0.824, 0.686, 0.341];  /* a região escolhida vira ouro */
    var METAL = [0.66, 0.67, 0.70];          /* o pino do implante */

    function dimensionar() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = palco.getBoundingClientRect();
      var l = Math.max(1, Math.round(r.width * dpr));
      var a = Math.max(1, Math.round(r.height * dpr));
      if (tela.width !== l || tela.height !== a) {
        tela.width = l; tela.height = a;
      }
      return r;
    }

    function quadro() {
      var caixa = dimensionar();
      gl.viewport(0, 0, tela.width, tela.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);   /* ver o comentário no shader */
      gl.disable(gl.BLEND);

      if (girando && !arrastando && !reduzido) { alvoY += 0.0042; }
      giroY += (alvoY - giroY) * 0.12;

      var aspecto = tela.width / tela.height;
      var proj = perspectiva(FOV, aspecto, 0.1, 20);
      var mv = transformacao(giroY, giroX, distancia(aspecto));
      var mvp = multiplicar(proj, mv);

      gl.uniformMatrix4fv(uMv, false, mv);
      gl.uniformMatrix4fv(uMvp, false, mvp);

      var a = selecionado && ANCORAS[selecionado];
      var acesas = a ? a.acesas : [-1, -1, -1, -1];

      gl.uniform3fv(uRim, OURO);
      gl.uniform3fv(uCorAceso, OURO_ACESO);
      gl.uniform3fv(uCorGengiva, GENGIVA);
      gl.uniform1f(uAlfa, 1);
      gl.uniform4f(uAcesas, acesas[0], acesas[1], acesas[2], acesas[3]);
      gl.uniform3fv(uCor, ESMALTE);
      desenhar(arcada);

      /* O pino do implante só aparece quando o implante está escolhido: é o
         tratamento acontecendo, não um enfeite permanente. */
      if (a && a.regiao === 4) {
        gl.uniform3fv(uCor, METAL);
        gl.uniform3fv(uCorGengiva, METAL);
        desenhar(implante);
      }

      posicionarMarcador(mvp, caixa);

      var precisa = (girando && !reduzido) || Math.abs(alvoY - giroY) > 0.0005;
      if (precisa && visivel) { pedirQuadro(); }
    }

    /* O pedido guarda o identificador do quadro, e não um booleano.

       Com booleano havia um jeito de o laço morrer para sempre: numa aba aberta
       em segundo plano o navegador NÃO chama requestAnimationFrame, então o
       primeiro quadro nunca rodava, a marca ficava presa em "já pedi", e quando
       a pessoa voltava para a aba nada mais pedia desenho. A tela ficava em
       branco até recarregar. Com o identificador dá para cancelar e pedir de
       novo, que é o que o retorno à aba faz. */
    function pedirQuadro() {
      if (pedido) { return; }
      pedido = requestAnimationFrame(function () { pedido = 0; quadro(); });
    }

    function posicionarMarcador(mvp, caixa) {
      if (!marcador) { return; }
      var a = selecionado && ANCORAS[selecionado];
      if (!a) { marcador.classList.remove('on'); return; }
      var s = projetar(a.p, mvp);
      if (!s) { marcador.classList.remove('on'); return; }
      /* O rótulo é HTML, e o enquadramento só garante que a MALHA cabe.
         Preso ao ponto sem limite, ele saía pela borda do cartão em parte
         dos ângulos. Aqui ele para na borda. */
      var meia = marcador.offsetWidth / 2 + 10;
      var meiaA = marcador.offsetHeight / 2 + 10;
      var px = Math.min(Math.max(s[0] * caixa.width, meia), caixa.width - meia);
      var py = Math.min(Math.max(s[1] * caixa.height, meiaA), caixa.height - meiaA);
      marcador.style.left = px.toFixed(1) + 'px';
      marcador.style.top = py.toFixed(1) + 'px';
      /* Some quando a âncora dá a volta para trás da arcada. O eixo que
         aponta para quem olha é (-sen, cos), o mesmo de `giroPara`: com o
         sinal do x trocado, o rótulo sumia justamente quando a região
         estava de frente. */
      var n = Math.sqrt(a.p[0] * a.p[0] + a.p[2] * a.p[2]);
      var atras = false;
      if (n > 0.05) {
        var dx = a.p[0] / n, dz = a.p[2] / n;
        atras = (-dx * Math.sin(giroY) + dz * Math.cos(giroY)) < -0.25;
      }
      marcador.classList.toggle('on', !atras);
    }

    /* ------------------------------------------------------------------ */
    /* 6. Interação                                                        */
    /* ------------------------------------------------------------------ */

    function selecionar(parte, mover) {
      selecionado = parte;
      botoes.forEach(function (b) {
        var meu = b.getAttribute('data-parte') === parte;
        b.setAttribute('aria-pressed', meu ? 'true' : 'false');
        b.classList.toggle('on', meu);
      });
      /* Abre o tratamento correspondente e leva a pessoa até ele. Só quando
         a escolha foi um gesto: na carga inicial nada rola sozinho. */
      var alvo = document.getElementById(parte);
      if (alvo && mover) {
        document.querySelectorAll('details.trat[open]').forEach(function (d) {
          if (d !== alvo) { d.open = false; }
        });
        alvo.open = true;
      }
      if (marcador) {
        var rot = document.querySelector('[data-parte="' + parte + '"]');
        marcador.textContent = rot ? (rot.getAttribute('data-curto') || '') : '';
      }
      var a = ANCORAS[parte];
      if (a && mover) {
        girando = false;
        var atual = alvoY % (Math.PI * 2);
        var delta = a.giro - atual;
        while (delta > Math.PI) { delta -= Math.PI * 2; }
        while (delta < -Math.PI) { delta += Math.PI * 2; }
        alvoY += delta;
        /* Com movimento reduzido a virada é instantânea: quem pediu menos
           animação não quer nem esta. */
        if (reduzido) { giroY = alvoY; }
      }
      pedirQuadro();
    }

    botoes.forEach(function (b) {
      b.addEventListener('click', function () { selecionar(b.getAttribute('data-parte'), true); });
      b.addEventListener('focus', function () {
        if (b.getAttribute('aria-pressed') !== 'true') { selecionar(b.getAttribute('data-parte'), true); }
      });
    });

    /* Arrastar para girar. `touch-action: pan-y` na folha de estilo garante que
       o gesto vertical continua rolando a página: só o horizontal é nosso. */
    function comecar(x) { arrastando = true; xAnterior = x; movimento = 0; girando = false; pedirQuadro(); }
    function mover(x) {
      if (!arrastando) { return; }
      var d = x - xAnterior;
      xAnterior = x;
      movimento += Math.abs(d);
      alvoY += d * 0.011;
      giroY = alvoY;
      pedirQuadro();
    }
    function terminar() { arrastando = false; }

    palco.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) { return; }
      comecar(e.clientX);
      palco.setPointerCapture && palco.setPointerCapture(e.pointerId);
    });
    palco.addEventListener('pointermove', function (e) { mover(e.clientX); });
    palco.addEventListener('pointerup', terminar);
    palco.addEventListener('pointercancel', terminar);
    palco.addEventListener('pointerleave', terminar);

    /* Só desenha quando está na tela. Não esconde nada: apenas para o laço
       quando ninguém está vendo, que é o que poupa bateria no celular. */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visivel = es[0].isIntersecting;
        if (visivel) { pedirQuadro(); }
      }, { rootMargin: '120px' }).observe(raiz);
    }

    window.addEventListener('resize', pedirQuadro, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { return; }
      if (pedido) { cancelAnimationFrame(pedido); pedido = 0; }
      pedirQuadro();
    });

    /* A partir daqui a seção passa a ter o dente. Antes disso ela é, e continua
       sendo, uma lista de tratamentos que funciona sem nada disto. */
    raiz.classList.add('dente-pronto');
    var daUrl = (location.hash || '').replace('#', '');
    var inicial = ANCORAS[daUrl] ? daUrl : botoes[0].getAttribute('data-parte');
    selecionar(inicial, inicial !== botoes[0].getAttribute('data-parte'));
    girando = true;
    pedirQuadro();
  }

  /* Dispara pela PRIMEIRA das três coisas que acontecer: o observador de
     interseção, um evento de rolagem, ou a conferência direta feita agora.

     Depender só do observador não funciona. Ele não entrega interseção
     enquanto a aba está em segundo plano, porque a página não está sendo
     desenhada, e há ambientes de captura em que ele simplesmente não roda. O
     resultado era a seção ficar para sempre na versão sem dente, sem erro
     nenhum no console. A conferência direta é três linhas e não tem esse
     modo de falha. */
  var iniciado = false, espia = null;

  function talvezIniciar() {
    if (iniciado) { return; }
    var r = raiz.getBoundingClientRect();
    if (r.top > window.innerHeight + 500 || r.bottom < -500) { return; }
    iniciado = true;
    if (espia) { espia.disconnect(); }
    window.removeEventListener('scroll', talvezIniciar);
    window.removeEventListener('resize', talvezIniciar);
    iniciar();
  }

  if ('IntersectionObserver' in window) {
    espia = new IntersectionObserver(talvezIniciar, { rootMargin: '500px' });
    espia.observe(raiz);
  }
  window.addEventListener('scroll', talvezIniciar, { passive: true });
  window.addEventListener('resize', talvezIniciar, { passive: true });
  talvezIniciar();
})();
