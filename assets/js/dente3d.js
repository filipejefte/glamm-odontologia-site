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
    var botoes = [].slice.call(raiz.querySelectorAll('[data-parte]'));
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

    /* O dente é a UNIÃO de três sólidos de revolução: a coroa com o tronco, e
       duas raízes inclinadas que saem dele. Não é uma superfície só.

       Tentei antes com uma superfície única, abrindo a fenda entre as raízes
       por um degrau na base de cada ângulo. A fenda saía, mas a ponta de cada
       raiz não fechava: no ápice, a união de dois círculos afastados vira dois
       pontos, e um anel fechado não representa dois pontos. O resultado era um
       par de tocos quadrados.

       Com três sólidos, cada um é um torno simples, fechado nas duas pontas, e
       quem resolve a união é o buffer de profundidade. Custa alguns triângulos
       a mais e elimina a classe inteira de defeito. */

    function suave(a, b, x) {
      var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }

    /* Interpola o perfil, que é uma lista de pares altura e raio. */
    function doPerfil(perfil, y) {
      var n = perfil.length;
      if (y <= perfil[0][0]) { return perfil[0][1]; }
      if (y >= perfil[n - 1][0]) { return perfil[n - 1][1]; }
      for (var i = 0; i < n - 1; i++) {
        if (y <= perfil[i + 1][0]) {
          var a = perfil[i], b = perfil[i + 1];
          var t = (y - a[0]) / (b[0] - a[0]);
          t = t * t * (3 - 2 * t);
          return a[1] + (b[1] - a[1]) * t;
        }
      }
      return perfil[n - 1][1];
    }

    var pos = [], nor = [];

    function triangulo(A, B, C) {
      var ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
      var wx = C[0] - A[0], wy = C[1] - A[1], wz = C[2] - A[2];
      var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      var m = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (m < 1e-7) { return; }                    /* face degenerada: descarta */
      nx /= m; ny /= m; nz /= m;
      pos.push(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
      nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    }

    /* Sólido de revolução. `mod` deforma cada ponto e é por onde entram as
       cúspides e o achatamento do dente no sentido de frente para trás. */
    function torno(perfil, aneis, voltas, mod) {
      var y0 = perfil[0][0], y1 = perfil[perfil.length - 1][0];
      var malha = [], i, j;
      for (i = 0; i <= aneis; i++) {
        var f = i / aneis;
        var y = y0 + f * (y1 - y0);
        var r = doPerfil(perfil, y);
        var anel = [];
        for (j = 0; j < voltas; j++) {
          var v = (j / voltas) * Math.PI * 2;
          var pt = [r * Math.cos(v), y, r * Math.sin(v)];
          if (mod) { pt = mod(pt, v, f); }
          anel.push(pt);
        }
        malha.push(anel);
      }
      for (i = 0; i < aneis; i++) {
        for (j = 0; j < voltas; j++) {
          var k = (j + 1) % voltas;
          triangulo(malha[i][j], malha[i + 1][j], malha[i + 1][k]);
          triangulo(malha[i][j], malha[i + 1][k], malha[i][k]);
        }
      }
      /* Tampas: sem elas o sólido é oco e se vê o avesso. */
      function tampa(anel, paraCima) {
        var c = [0, 0, 0], t;
        for (t = 0; t < voltas; t++) { c[0] += anel[t][0]; c[1] += anel[t][1]; c[2] += anel[t][2]; }
        c[0] /= voltas; c[1] /= voltas; c[2] /= voltas;
        for (t = 0; t < voltas; t++) {
          var a = anel[t], b = anel[(t + 1) % voltas];
          if (paraCima) { triangulo(c, a, b); } else { triangulo(c, b, a); }
        }
      }
      tampa(malha[0], false);
      tampa(malha[aneis], true);
    }

    /* Coroa com o tronco por baixo. A parte de baixo fica enterrada nas raízes
       e nunca aparece. Mesa oclusal larga, não cúpula: dente termina numa face
       de mastigação. */
    var P_COROA = [
      [-0.40, 0.150], [-0.26, 0.196], [-0.14, 0.226], [-0.04, 0.252],
      [0.06, 0.336], [0.18, 0.428], [0.32, 0.478], [0.50, 0.494],
      [0.68, 0.492], [0.82, 0.478], [0.92, 0.446], [1.00, 0.348]
    ];

    /* Raiz em coordenada local: y de 0 no colo a -0.92 no ápice. */
    var P_RAIZ = [
      [-0.92, 0.006], [-0.84, 0.040], [-0.72, 0.072], [-0.56, 0.098],
      [-0.38, 0.118], [-0.20, 0.136], [-0.08, 0.152], [0.00, 0.168]
    ];
    var P_CANAL = [
      [-0.82, 0.008], [-0.60, 0.024], [-0.34, 0.038], [-0.10, 0.052], [0.10, 0.070]
    ];

    var INCLINACAO = 0.20;   /* radianos que cada raiz abre para fora */
    var DESLOCA = 0.105;     /* meia distância entre as raízes, no colo */

    /* Achata o dente no sentido de frente para trás e põe duas cúspides. */
    function modCoroa(pt, v, f) {
      var cusp = suave(0.80, 1.0, f) * 0.040 * (0.5 + 0.5 * Math.cos(2 * v));
      return [pt[0] * 1.06, pt[1] + cusp, pt[2] * 0.84];
    }

    function modRaiz(lado) {
      var c = Math.cos(INCLINACAO * lado), sn = Math.sin(INCLINACAO * lado);
      return function (pt) {
        var x = pt[0] * 1.0, y = pt[1], z = pt[2] * 0.86;
        return [x * c - y * sn + DESLOCA * lado, x * sn + y * c - 0.02, z];
      };
    }

    torno(P_COROA, 16, 26, modCoroa);
    torno(P_RAIZ, 12, 18, modRaiz(1));
    torno(P_RAIZ, 12, 18, modRaiz(-1));
    var casca = { pos: new Float32Array(pos), nor: new Float32Array(nor), n: pos.length / 3 };

    pos = []; nor = [];
    torno(P_CANAL, 10, 12, modRaiz(1));
    torno(P_CANAL, 10, 12, modRaiz(-1));
    /* Câmara pulpar, ligando os dois canais sob a coroa. */
    torno([[-0.06, 0.070], [0.10, 0.105], [0.26, 0.088], [0.34, 0.030]], 6, 14,
      function (pt) { return [pt[0] * 1.7, pt[1], pt[2] * 0.9]; });
    var canal = { pos: new Float32Array(pos), nor: new Float32Array(nor), n: pos.length / 3 };

    /* ------------------------------------------------------------------ */
    /* 2. WebGL                                                            */
    /* ------------------------------------------------------------------ */

    var VS = [
      'attribute vec3 pos; attribute vec3 nor;',
      'uniform mat4 mvp; uniform mat4 mv;',
      'varying vec3 vN; varying vec3 vP;',
      'void main(){',
      '  vN = mat3(mv) * nor;',
      '  vP = (mv * vec4(pos,1.0)).xyz;',
      '  gl_Position = mvp * vec4(pos,1.0);',
      '}'
    ].join('\n');

    var FS = [
      'precision mediump float;',
      'varying vec3 vN; varying vec3 vP;',
      'uniform vec3 cor; uniform vec3 corRim; uniform float alfa;',
      'void main(){',
      '  vec3 N = normalize(vN);',
      '  if (!gl_FrontFacing) { N = -N; }',
      '  vec3 V = normalize(-vP);',
      /* luz principal, alta e à esquerda, mais um preenchimento frio embaixo */
      '  vec3 L = normalize(vec3(-0.45, 0.80, 0.62));',
      '  float dif = max(dot(N, L), 0.0);',
      '  float fill = max(dot(N, normalize(vec3(0.60,-0.45,0.20))), 0.0) * 0.14;',
      '  vec3 H = normalize(L + V);',
      '  float esp = pow(max(dot(N, H), 0.0), 34.0) * 0.38;',
      /* luz de contorno em ouro: é ela que amarra o objeto à marca */
      '  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);',
      '  vec3 c = cor * (0.30 + 0.80 * dif + fill) + vec3(esp) + corRim * rim * 1.25;',
      '  gl_FragColor = vec4(c, alfa);',
      '}'
    ].join('\n');

    function compilar(tipo, fonte) {
      var s = gl.createShader(tipo);
      gl.shaderSource(s, fonte);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
      return s;
    }

    var vs = compilar(gl.VERTEX_SHADER, VS);
    var fs = compilar(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { return; }
    gl.useProgram(prog);

    var aPos = gl.getAttribLocation(prog, 'pos');
    var aNor = gl.getAttribLocation(prog, 'nor');
    var uMvp = gl.getUniformLocation(prog, 'mvp');
    var uMv = gl.getUniformLocation(prog, 'mv');
    var uCor = gl.getUniformLocation(prog, 'cor');
    var uRim = gl.getUniformLocation(prog, 'corRim');
    var uAlfa = gl.getUniformLocation(prog, 'alfa');

    function enviar(m) {
      var bp = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bp);
      gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.STATIC_DRAW);
      var bn = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bn);
      gl.bufferData(gl.ARRAY_BUFFER, m.nor, gl.STATIC_DRAW);
      m.bp = bp; m.bn = bn;
      return m;
    }
    enviar(casca); enviar(canal);

    function desenhar(m) {
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bp);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bn);
      gl.enableVertexAttribArray(aNor);
      gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, m.n);
    }

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
        0, -0.05, -dist, 1
      ]);
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

    /* Cada ponto fica na parte do dente que aquele tratamento trata. Não é
       enfeite: é o motivo de a peça existir. O ângulo é o giro que traz a
       âncora para a frente. */
    var ANCORAS = {
      'lentes-e-facetas': { p: [0.02, 0.54, 0.42], giro: 0 },
      'ortodontia-e-alinhadores': { p: [0.02, 0.22, 0.40], giro: 0 },
      'implante-e-protese': { p: [0.33, -0.68, 0.04], giro: -0.35 },
      'clareamento-dental': { p: [0.06, 1.00, 0.14], giro: 0.15 },
      'endodontia': { p: [0.0, -0.05, 0.0], giro: 0, dentro: true },
      'periodontia': { p: [0.05, -0.02, 0.24], giro: 0.1 },
      'avaliacao-com-camera-intraoral': { p: [0.44, 0.50, 0.24], giro: -0.55 }
    };

    /* ------------------------------------------------------------------ */
    /* 5. Estado e laço                                                    */
    /* ------------------------------------------------------------------ */

    var giroY = 0.6, giroX = 0.20, alvoY = 0.6;
    var girando = true;
    var arrastando = false, xAnterior = 0, movimento = 0;
    var selecionado = null, transparencia = 0;
    var visivel = true, pedido = 0;

    var CREME = [0.957, 0.933, 0.894];
    var OURO = [0.824, 0.686, 0.341];
    var CANAL = [0.878, 0.741, 0.404];   /* mais claro que o ouro do contorno: precisa atravessar a casca translucida */

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
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.disable(gl.BLEND);

      if (girando && !arrastando && !reduzido) { alvoY += 0.0042; }
      giroY += (alvoY - giroY) * 0.12;

      var aspecto = tela.width / tela.height;
      /* Distância da câmera calculada, não escolhida por faixa de proporção.
         O objeto tem meia-altura de cerca de 1,0 e meia-largura de 0,52; com a
         inclinação em x a silhueta cresce um pouco, e a perspectiva aumenta o
         que está mais perto. Os valores abaixo já embutem essa folga. Fazendo
         por faixa, o quadro largo e baixo do celular cortava a coroa. */
      var ALTURA = 1.30, LARGURA = 0.78;
      var tanF = Math.tan(0.36);
      var dist = Math.max(ALTURA / tanF, LARGURA / (tanF * aspecto));
      var proj = perspectiva(0.72, aspecto, 0.1, 20);
      var mv = transformacao(giroY, giroX, dist);
      var mvp = multiplicar(proj, mv);

      gl.uniformMatrix4fv(uMv, false, mv);
      gl.uniformMatrix4fv(uMvp, false, mvp);

      var querTransp = selecionado === 'endodontia';
      transparencia += ((querTransp ? 1 : 0) - transparencia) * 0.14;

      if (transparencia > 0.02) {
        gl.uniform3fv(uCor, CANAL);
        gl.uniform3fv(uRim, OURO);
        gl.uniform1f(uAlfa, 1);
        desenhar(canal);
      }

      gl.uniform3fv(uCor, CREME);
      gl.uniform3fv(uRim, OURO);
      var alfa = 1 - transparencia * 0.62;
      gl.uniform1f(uAlfa, alfa);
      if (alfa < 0.999) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.cullFace(gl.FRONT); desenhar(casca);
        gl.cullFace(gl.BACK); desenhar(casca);
        gl.depthMask(true);
      } else {
        desenhar(casca);
      }

      posicionarMarcador(mvp, caixa);

      var precisa = (girando && !reduzido) || Math.abs(alvoY - giroY) > 0.0005
        || Math.abs((querTransp ? 1 : 0) - transparencia) > 0.01;
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
      marcador.style.left = (s[0] * caixa.width).toFixed(1) + 'px';
      marcador.style.top = (s[1] * caixa.height).toFixed(1) + 'px';
      /* Some quando a âncora vai para trás do dente, exceto a do canal, que é
         interna e some junto com a transparência. */
      var atras = false;
      if (!a.dentro) {
        var n = Math.sqrt(a.p[0] * a.p[0] + a.p[2] * a.p[2]) || 1;
        var dx = a.p[0] / n, dz = a.p[2] / n;
        atras = (dx * Math.sin(giroY) + dz * Math.cos(giroY)) < -0.1;
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
      raiz.querySelectorAll('[data-painel]').forEach(function (p) {
        p.hidden = p.getAttribute('data-painel') !== parte;
      });
      if (marcador) {
        var rot = raiz.querySelector('[data-parte="' + parte + '"]');
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
