/* =========================================================================
   O molar tridimensional, gerado no navegador.

   POR QUE NÃO É UM ARQUIVO DE MODELO
   Não há biblioteca, não há .glb, não há textura. A geometria nasce aqui, de
   um campo de distância com sinal, e é poligonizada por surface nets. Três
   motivos somados:
     1. a política de segurança deste site é `default-src 'none'` e não abre
        para terceiro; um modelo de banco de imagens exigiria licença e, na
        prática, uma requisição a outro domínio;
     2. o arquivo inteiro pesa menos que qualquer malha exportada;
     3. como a forma é uma fórmula, a região que cada tratamento toca é
        calculada, e não pintada à mão num mapa de textura.

   O QUE ELE FAZ ALÉM DE GIRAR
   Cada ficha de tratamento ao lado tem `data-regiao`. Passar o cursor ou o
   foco acende a parte correspondente: coroa, esmalte, colo, raiz, polpa ou
   gengiva. Sem este arquivo, as fichas continuam sendo links comuns para as
   páginas dos tratamentos, e a ilustração de reserva continua na tela.

   MEDIDAS EM MILÍMETROS, de um primeiro molar inferior: coroa de cerca de
   10,4 mm no sentido mésio-distal por 9,4 mm no vestíbulo-lingual, altura de
   coroa de 7,5 mm, duas raízes de cerca de 11 mm.
   ========================================================================= */

(function () {
  'use strict';

  var caixa = document.querySelector('[data-modelo]');
  if (!caixa) { return; }

  var tela = caixa.querySelector('[data-modelo-tela]');
  var reserva = caixa.querySelector('[data-modelo-reserva]');
  var legenda = caixa.querySelector('[data-modelo-legenda-texto]');
  var parar = caixa.querySelector('[data-modelo-parar]');
  var fichas = [].slice.call(caixa.querySelectorAll('[data-regiao]'));

  var legendaPadrao = legenda ? legenda.textContent : '';
  var consultaMovimento = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  var pouco = consultaMovimento ? consultaMovimento.matches : false;
  if (consultaMovimento && consultaMovimento.addEventListener) {
    /* Ligar a preferencia no meio da sessao para a deriva na hora, sem
       recarregar. */
    consultaMovimento.addEventListener('change', function (ev) { pouco = ev.matches; });
  }

  /* Na página de um tratamento não há fichas: a região vem fixa no HTML, e a
     ilustração de reserva já chega com a classe certa do servidor. */
  var regiaoFixa = caixa.getAttribute('data-regiao-fixa') || '';

  /* ================================================================== */
  /*  1. Fichas: funcionam com ou sem WebGL                              */
  /* ================================================================== */

  var aoDestacar = null;   /* preenchido pelo motor, se ele subir */
  var regiaoAtiva = '';

  function destacar(ficha) {
    var reg = ficha ? ficha.getAttribute('data-regiao') : '';
    if (reg === regiaoAtiva) { return; }
    regiaoAtiva = reg;

    fichas.forEach(function (f) { f.classList.toggle('e-ativa', f === ficha); });

    if (legenda) {
      legenda.textContent = ficha
        ? ficha.getAttribute('data-parte') + '. ' + ficha.getAttribute('data-parte-texto')
        : legendaPadrao;
    }

    /* A ilustração de reserva também responde, por classe. */
    if (reserva) {
      reserva.className = 'modelo-reserva' + (reg ? ' regiao-' + reg : '');
    }

    if (aoDestacar) { aoDestacar(reg); }
  }

  fichas.forEach(function (f) {
    f.addEventListener('mouseenter', function () { destacar(f); });
    f.addEventListener('focus', function () { destacar(f); });
    f.addEventListener('mouseleave', function () { destacar(null); });
    f.addEventListener('blur', function () { destacar(null); });
  });

  /* ================================================================== */
  /*  2. Álgebra                                                         */
  /* ================================================================== */

  function perspectiva(saida, fovy, aspecto, perto, longe) {
    var f = 1 / Math.tan(fovy / 2);
    saida[0] = f / aspecto; saida[1] = 0; saida[2] = 0; saida[3] = 0;
    saida[4] = 0; saida[5] = f; saida[6] = 0; saida[7] = 0;
    saida[8] = 0; saida[9] = 0; saida[10] = (longe + perto) / (perto - longe); saida[11] = -1;
    saida[12] = 0; saida[13] = 0; saida[14] = (2 * longe * perto) / (perto - longe); saida[15] = 0;
    return saida;
  }

  /* Câmera fixa olhando para a origem deslocada: basta uma translação. */
  function vista(saida, x, y, z) {
    saida[0] = 1; saida[1] = 0; saida[2] = 0; saida[3] = 0;
    saida[4] = 0; saida[5] = 1; saida[6] = 0; saida[7] = 0;
    saida[8] = 0; saida[9] = 0; saida[10] = 1; saida[11] = 0;
    saida[12] = -x; saida[13] = -y; saida[14] = -z; saida[15] = 1;
    return saida;
  }

  /* Giro em Y depois em X, sem alocar. Devolve também a parte 3x3, que é a
     matriz de normais: como só há rotação, ela é a própria submatriz. */
  function girar(m4, m3, guinada, inclinacao) {
    var cy = Math.cos(guinada), sy = Math.sin(guinada);
    var cx = Math.cos(inclinacao), sx = Math.sin(inclinacao);

    /* Rx * Ry, coluna a coluna. */
    var a = cy, b = 0, c = -sy;
    var d = sx * sy, e = cx, f = sx * cy;
    var g = cx * sy, h = -sx, i = cx * cy;

    m4[0] = a; m4[1] = d; m4[2] = g; m4[3] = 0;
    m4[4] = b; m4[5] = e; m4[6] = h; m4[7] = 0;
    m4[8] = c; m4[9] = f; m4[10] = i; m4[11] = 0;
    m4[12] = 0; m4[13] = 0; m4[14] = 0; m4[15] = 1;

    m3[0] = a; m3[1] = d; m3[2] = g;
    m3[3] = b; m3[4] = e; m3[5] = h;
    m3[6] = c; m3[7] = f; m3[8] = i;
  }

  /* ================================================================== */
  /*  3. Campos de distância com sinal                                   */
  /* ================================================================== */

  function suave(a, b, k) {
    var h = 0.5 + 0.5 * (b - a) / k;
    h = h < 0 ? 0 : (h > 1 ? 1 : h);
    return b + (a - b) * h - k * h * (1 - h);
  }

  function caixaRedonda(x, y, z, bx, by, bz, r) {
    var qx = Math.abs(x) - bx, qy = Math.abs(y) - by, qz = Math.abs(z) - bz;
    var mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0, mz = qz > 0 ? qz : 0;
    var dentro = Math.max(qx, qy, qz);
    return Math.sqrt(mx * mx + my * my + mz * mz) + (dentro < 0 ? dentro : 0) - r;
  }

  function esfera(x, y, z, cx, cy, cz, r) {
    var dx = x - cx, dy = y - cy, dz = z - cz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  }

  /* Cone de pontas arredondadas entre A e B, com raios r1 e r2. */
  function coneRedondo(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
    var bax = bx - ax, bay = by - ay, baz = bz - az;
    var l2 = bax * bax + bay * bay + baz * baz;
    var rr = r1 - r2;
    var a2 = l2 - rr * rr;
    /* Degenerado: extremos coincidentes, ou raios que se abrem mais que o
       comprimento. Sem a guarda, 1/l2 vira infinito, a raiz devolve NaN e o
       NaN contamina a malha inteira em silencio. */
    if (l2 <= 1e-9 || a2 <= 1e-9) {
      return esfera(px, py, pz, ax, ay, az, Math.max(r1, r2));
    }
    var il2 = 1 / l2;

    var pax = px - ax, pay = py - ay, paz = pz - az;
    var y = pax * bax + pay * bay + paz * baz;
    var z = y - l2;

    var cx = pax * l2 - bax * y;
    var cy = pay * l2 - bay * y;
    var cz = paz * l2 - baz * y;
    var x2 = cx * cx + cy * cy + cz * cz;

    var y2 = y * y * l2;
    var z2 = z * z * l2;

    var sinal = rr < 0 ? -1 : (rr > 0 ? 1 : 0);
    var k = sinal * rr * rr * x2;

    if ((z < 0 ? -1 : 1) * a2 * z2 > k) { return Math.sqrt(x2 + z2) * il2 - r2; }
    if ((y < 0 ? -1 : 1) * a2 * y2 < k) { return Math.sqrt(x2 + y2) * il2 - r1; }
    return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
  }

  function toro(x, y, z, cy, R, r) {
    var q = Math.sqrt(x * x + z * z) - R;
    var dy = y - cy;
    return Math.sqrt(q * q + dy * dy) - r;
  }

  /* -- o dente ------------------------------------------------------- */
  /* Colo em y = 0. Coroa acima, duas raízes abaixo. */
  function fDente(x, y, z) {
    var d = caixaRedonda(x, y - 3.9, z, 3.4, 1.45, 2.9, 1.8);

    /* quatro cúspides */
    d = suave(d, esfera(x, y, z, 2.30, 6.35, 1.95, 1.90), 1.30);
    d = suave(d, esfera(x, y, z, -2.30, 6.35, 1.95, 1.90), 1.30);
    d = suave(d, esfera(x, y, z, 2.30, 6.35, -1.95, 1.90), 1.30);
    d = suave(d, esfera(x, y, z, -2.30, 6.35, -1.95, 1.90), 1.30);

    /* tronco cervical: é ele que estreita a coroa até o colo */
    d = suave(d, coneRedondo(x, y, z, 0, 1.9, 0, 0, -1.4, 0, 3.55, 2.85), 1.85);

    /* duas raízes, abrindo para fora */
    d = suave(d, coneRedondo(x, y, z, 1.30, -0.8, 0, 3.15, -10.3, 0.10, 2.05, 0.48), 1.70);
    d = suave(d, coneRedondo(x, y, z, -1.30, -0.8, 0, -3.15, -10.3, 0.10, 2.05, 0.48), 1.70);

    return d;
  }

  /* -- a câmara pulpar e os canais ----------------------------------- */
  function fPolpa(x, y, z) {
    /* Câmara larga e baixa, como a de um molar, e não um pino: alta e
       estreita ela lia como parafuso dentro do dente. */
    var d = caixaRedonda(x, y - 3.55, z, 1.75, 0.42, 1.35, 0.55);
    d = suave(d, coneRedondo(x, y, z, 1.05, 3.0, 0, 2.55, -9.3, 0.08, 0.52, 0.14), 0.80);
    d = suave(d, coneRedondo(x, y, z, -1.05, 3.0, 0, -2.55, -9.3, 0.08, 0.52, 0.14), 0.80);
    return d;
  }

  /* -- o bloco de gengiva -------------------------------------------- */
  /* Bloco de cantos arredondados, com um colar erguido em volta do colo:
     é o segundo lábio que aparece na referência. */
  function fGengiva(x, y, z) {
    var d = caixaRedonda(x, y + 5.9, z, 5.75, 4.05, 4.30, 2.60);
    d = suave(d, toro(x, y, z, 0.05, 4.10, 1.22), 1.45);
    return d;
  }

  /* ================================================================== */
  /*  4. Surface nets                                                    */
  /*                                                                     */
  /*  Um vértice por célula que cruza a superfície, posto na média dos    */
  /*  cruzamentos das arestas, e um quadrilátero por aresta que troca de  */
  /*  sinal. Malha regular, sem os triângulos finos do marching cubes e   */
  /*  sem a tabela de 256 casos.                                          */
  /* ================================================================== */

  var arestas = new Int32Array(24);
  (function () {
    var k = 0;
    for (var i = 0; i < 8; i++) {
      for (var j = 1; j <= 4; j <<= 1) {
        var p = i ^ j;
        if (i <= p) { arestas[k++] = i; arestas[k++] = p; }
      }
    }
  }());

  var tabela = new Int32Array(256);
  (function () {
    for (var i = 0; i < 256; i++) {
      var m = 0;
      for (var j = 0; j < 24; j += 2) {
        var a = (i & (1 << arestas[j])) !== 0;
        var b = (i & (1 << arestas[j + 1])) !== 0;
        if (a !== b) { m |= 1 << (j >> 1); }
      }
      tabela[i] = m;
    }
  }());

  function poligonizar(campo, min, max, passo, regiaoDe) {
    var nx = Math.ceil((max[0] - min[0]) / passo) + 1;
    var ny = Math.ceil((max[1] - min[1]) / passo) + 1;
    var nz = Math.ceil((max[2] - min[2]) / passo) + 1;

    var vals = new Float32Array(nx * ny * nz);
    var i = 0;
    for (var z = 0; z < nz; z++) {
      var wz = min[2] + z * passo;
      for (var y = 0; y < ny; y++) {
        var wy = min[1] + y * passo;
        for (var x = 0; x < nx; x++) {
          vals[i++] = campo(min[0] + x * passo, wy, wz);
        }
      }
    }

    var cx = nx - 1, cy = ny - 1, cz = nz - 1;
    var indiceCelula = new Int32Array(cx * cy * cz).fill(-1);

    var pos = [];
    var tris = [];
    var v = new Float32Array(8);

    var sx = 1, sy = nx, sz = nx * ny;            /* passos no campo   */
    var qx = 1, qy = cx, qz = cx * cy;            /* passos nas células */

    for (var zc = 0; zc < cz; zc++) {
      for (var yc = 0; yc < cy; yc++) {
        for (var xc = 0; xc < cx; xc++) {
          var base = xc * sx + yc * sy + zc * sz;

          v[0] = vals[base];
          v[1] = vals[base + sx];
          v[2] = vals[base + sy];
          v[3] = vals[base + sx + sy];
          v[4] = vals[base + sz];
          v[5] = vals[base + sx + sz];
          v[6] = vals[base + sy + sz];
          v[7] = vals[base + sx + sy + sz];

          var mascara = 0;
          for (var c = 0; c < 8; c++) { if (v[c] < 0) { mascara |= 1 << c; } }
          if (mascara === 0 || mascara === 255) { continue; }

          var cruzes = tabela[mascara];
          var px = 0, py = 0, pz = 0, n = 0;
          for (var e = 0; e < 12; e++) {
            if (!(cruzes & (1 << e))) { continue; }
            var ca = arestas[e * 2], cb = arestas[e * 2 + 1];
            var va = v[ca], vb = v[cb];
            var t = va / (va - vb);
            var ax = ca & 1, ay = (ca >> 1) & 1, az = (ca >> 2) & 1;
            var bx = cb & 1, by = (cb >> 1) & 1, bz = (cb >> 2) & 1;
            px += ax + t * (bx - ax);
            py += ay + t * (by - ay);
            pz += az + t * (bz - az);
            n++;
          }
          px /= n; py /= n; pz /= n;

          var vi = pos.length / 3;
          pos.push(min[0] + (xc + px) * passo,
                   min[1] + (yc + py) * passo,
                   min[2] + (zc + pz) * passo);

          var cel = xc * qx + yc * qy + zc * qz;
          indiceCelula[cel] = vi;

          /* As três arestas que saem do canto 0 são, nesta ordem, as de
             índice 0 (x), 1 (y) e 2 (z). Cada uma que troca de sinal fecha
             um quadrilátero com as três células vizinhas. */
          for (var eixo = 0; eixo < 3; eixo++) {
            if (!(cruzes & (1 << eixo))) { continue; }
            var iu = (eixo + 1) % 3, iv = (eixo + 2) % 3;
            var cu = iu === 0 ? xc : (iu === 1 ? yc : zc);
            var cv = iv === 0 ? xc : (iv === 1 ? yc : zc);
            if (cu === 0 || cv === 0) { continue; }
            var du = iu === 0 ? qx : (iu === 1 ? qy : qz);
            var dv = iv === 0 ? qx : (iv === 1 ? qy : qz);

            var a0 = indiceCelula[cel];
            var a1 = indiceCelula[cel - du];
            var a2 = indiceCelula[cel - du - dv];
            var a3 = indiceCelula[cel - dv];
            if (a1 < 0 || a2 < 0 || a3 < 0) { continue; }

            if (mascara & 1) {
              tris.push(a0, a1, a2, a0, a2, a3);
            } else {
              tris.push(a0, a3, a2, a0, a2, a1);
            }
          }
        }
      }
    }

    /* Normais pelo gradiente do próprio campo: mais lisas que a média das
       faces e sem custo de vizinhança. */
    var qtd = pos.length / 3;
    var vertices = new Float32Array(qtd * 7);
    var h = passo * 0.5;
    for (var k = 0; k < qtd; k++) {
      var X = pos[k * 3], Y = pos[k * 3 + 1], Z = pos[k * 3 + 2];
      var gx = campo(X + h, Y, Z) - campo(X - h, Y, Z);
      var gy = campo(X, Y + h, Z) - campo(X, Y - h, Z);
      var gz = campo(X, Y, Z + h) - campo(X, Y, Z - h);
      var comp = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
      var o = k * 7;
      vertices[o] = X; vertices[o + 1] = Y; vertices[o + 2] = Z;
      vertices[o + 3] = gx / comp; vertices[o + 4] = gy / comp; vertices[o + 5] = gz / comp;
      vertices[o + 6] = regiaoDe ? regiaoDe(X, Y, Z) : 0;
    }

    var indices = qtd > 65535 ? new Uint32Array(tris) : new Uint16Array(tris);

    /* Confere a orientação pelo volume assinado. Se der negativo, a malha
       está do avesso e a ordem dos índices é invertida. Assim o descarte de
       faces nunca depende de eu ter acertado o sentido na mão. */
    var vol = 0;
    for (var f = 0; f < indices.length; f += 3) {
      var i0 = indices[f] * 7, i1 = indices[f + 1] * 7, i2 = indices[f + 2] * 7;
      var x0 = vertices[i0], y0 = vertices[i0 + 1], z0 = vertices[i0 + 2];
      var x1 = vertices[i1], y1 = vertices[i1 + 1], z1 = vertices[i1 + 2];
      var x2 = vertices[i2], y2 = vertices[i2 + 1], z2 = vertices[i2 + 2];
      vol += x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2);
    }
    if (vol < 0) {
      for (var g = 0; g < indices.length; g += 3) {
        var tmp = indices[g + 1];
        indices[g + 1] = indices[g + 2];
        indices[g + 2] = tmp;
      }
    }

    return { vertices: vertices, indices: indices, quantidade: indices.length, grandes: qtd > 65535 };
  }

  /* Região de cada vértice do dente: 0 oclusal, 1 face, 2 colo, 3 raiz. */
  function regiaoDente(x, y) {
    if (y > 5.35) { return 0; }
    if (y > 0.75) { return 1; }
    if (y > -1.70) { return 2; }
    return 3;
  }

  /* ================================================================== */
  /*  5. WebGL                                                           */
  /* ================================================================== */

  var VS = [
    'attribute vec3 aPos;',
    'attribute vec3 aNor;',
    'attribute float aReg;',
    'uniform mat4 uProj;',
    'uniform mat4 uVista;',
    'uniform mat4 uModelo;',
    'uniform mat3 uNormal;',
    'varying vec3 vN;',
    'varying vec3 vP;',
    'varying vec3 vL;',
    'varying float vR;',
    'void main() {',
    '  vec4 mundo = uModelo * vec4(aPos, 1.0);',
    '  vP = mundo.xyz;',
    '  vN = normalize(uNormal * aNor);',
    '  vL = aPos;',
    '  vR = aReg;',
    '  gl_Position = uProj * uVista * mundo;',
    '}'
  ].join('\n');

  var FS = [
    'precision highp float;',
    'varying vec3 vN;',
    'varying vec3 vP;',
    'varying vec3 vL;',
    'varying float vR;',
    'uniform vec3 uCorTopo;',
    'uniform vec3 uCorBase;',
    'uniform vec2 uFaixa;',
    'uniform float uAlfa;',
    'uniform float uBrilho;',
    'uniform float uEspec;',
    'uniform float uFresnel;',
    'uniform vec4 uDestaque;',
    'uniform vec3 uCorDestaque;',
    'uniform vec3 uCamera;',
    'uniform float uAlveolo;',
    'void main() {',
    '  vec3 N = normalize(vN);',
    '  vec3 V = normalize(uCamera - vP);',
    '  vec3 L1 = normalize(vec3(-0.40, 0.80, 0.62));',
    '  vec3 L2 = normalize(vec3( 0.78, 0.06, 0.42));',
    '  vec3 L3 = normalize(vec3( 0.05,-0.30,-0.90));',
    '  float t = clamp((vL.y - uFaixa.x) / max(0.001, uFaixa.y - uFaixa.x), 0.0, 1.0);',
    '  vec3 base = mix(uCorBase, uCorTopo, t);',
    '  float peso = vR < 0.5 ? uDestaque.x : (vR < 1.5 ? uDestaque.y : (vR < 2.5 ? uDestaque.z : uDestaque.w));',
    '  base = mix(base, uCorDestaque, peso * 0.62);',
    '  float d1 = max(dot(N, L1), 0.0);',
    '  float d2 = max(dot(N, L2), 0.0);',
    '  float env = max(0.0, (dot(N, L1) + 0.42) / 1.42);',
    '  float ceu = 0.5 + 0.5 * N.y;',
    '  vec3 dif = base * (0.26 + 0.66 * mix(d1, env, 0.55) + 0.18 * d2 + 0.15 * ceu);',
    /* A parte que fica dentro do alvéolo recebe menos luz, porque a gengiva
       a encobre. Sem isto a raiz flutua em vez de entrar no bloco. */
    '  float fora = smoothstep(-1.0, 2.6, vL.y);',
    '  dif *= mix(1.0, mix(0.72, 1.0, fora), uAlveolo);',
    '  vec3 H = normalize(L1 + V);',
    '  float esp = pow(max(dot(N, H), 0.0), uBrilho) * uEspec;',
    '  float borda = pow(1.0 - max(dot(N, V), 0.0), 3.0) * uFresnel;',
    '  float tras = pow(max(dot(N, L3), 0.0), 2.5) * 0.14;',
    '  vec3 cor = dif + vec3(esp) * vec3(1.0, 0.985, 0.95) + vec3(borda) * vec3(1.0, 0.95, 0.88) + base * tras;',
    '  cor = min(cor, vec3(1.0));',
    '  float a = uAlfa;',
    '  if (uAlfa < 0.999) {',
    '    a = clamp(uAlfa + pow(1.0 - max(dot(N, V), 0.0), 1.7) * 0.86, 0.0, 1.0);',
    '  }',
    '  gl_FragColor = vec4(cor * a, a);',
    '}'
  ].join('\n');

  function compilar(gl, tipo, fonte) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fonte);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      /* Sem isto o erro some: o modelo simplesmente nao aparece e nao ha
         rastro nenhum de por que. */
      if (window.console && console.warn) {
        console.warn('dente3d: shader nao compilou.', gl.getShaderInfoLog(s));
      }
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function contexto() {
    try {
      return tela.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        depth: true,
        powerPreference: 'low-power'
      }) || tela.getContext('experimental-webgl');
    } catch (e) { return null; }
  }

  function iniciar(gl, malhas) {

    var vs = compilar(gl, gl.VERTEX_SHADER, VS);
    var fs = compilar(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { return false; }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.bindAttribLocation(prog, 1, 'aNor');
    gl.bindAttribLocation(prog, 2, 'aReg');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { return false; }
    gl.useProgram(prog);

    var u = {};
    ['uProj', 'uVista', 'uModelo', 'uNormal', 'uCorTopo', 'uCorBase', 'uFaixa',
     'uAlfa', 'uBrilho', 'uEspec', 'uFresnel', 'uDestaque', 'uCorDestaque', 'uCamera', 'uAlveolo']
      .forEach(function (nome) { u[nome] = gl.getUniformLocation(prog, nome); });

    var indiceGrande = gl.getExtension('OES_element_index_uint');

    /* As malhas chegam prontas: são construídas antes, uma por tarefa, para
       a conta não virar um bloqueio único de entrada. Ver `montar()`. */
    var dente = malhas.dente;
    var polpa = malhas.polpa;
    var gengiva = malhas.gengiva;

    if ((dente.grandes || polpa.grandes || gengiva.grandes) && !indiceGrande) { return false; }

    function enviar(malha) {
      var vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, malha.vertices, gl.STATIC_DRAW);
      var ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, malha.indices, gl.STATIC_DRAW);
      return {
        vb: vb, ib: ib,
        quantidade: malha.quantidade,
        tipo: malha.grandes ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT
      };
    }

    var gDente = enviar(dente);
    var gPolpa = enviar(polpa);
    var gGengiva = enviar(gengiva);

    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);

    function ligar(g) {
      gl.bindBuffer(gl.ARRAY_BUFFER, g.vb);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ib);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
    }

    /* --- estado --- */
    var proj = new Float32Array(16);
    var mVista = new Float32Array(16);
    var modelo = new Float32Array(16);
    var normal = new Float32Array(9);

    var CAM = [0, -2.6, 55];
    vista(mVista, CAM[0], CAM[1], CAM[2]);

    var guinada = -0.42, inclinacao = 0.12;
    var alvoGuinada = guinada, alvoInclinacao = inclinacao;
    var girando = false, ultimoX = 0, ultimoY = 0, impulso = 0;
    /* A DERIVA NUNCA PARA EM DEFINITIVO. Arrastar suspende a rotação enquanto
       o gesto acontece e por um instante depois, e então ela volta sozinha: o
       modelo gira sem exigir nada de quem chega. O único desligamento
       permanente é a preferência do sistema por menos movimento, e o botão
       invisível que existe para cumprir a 2.2.2. */
    var pausada = false;
    var esperaAte = 0;
    var perdido = false;
    var visivel = true;

    /* pesos das quatro regiões do dente, a gengiva e a polpa */
    var pesos = new Float32Array(4);
    var alvoPesos = new Float32Array(4);
    var pesoGengiva = 0, alvoGengivaP = 0;
    var pesoPolpa = 0, alvoPolpaP = 0;
    var transparencia = 0, alvoTransparencia = 0;

    aoDestacar = function (reg) {
      alvoPesos[0] = alvoPesos[1] = alvoPesos[2] = alvoPesos[3] = 0;
      alvoGengivaP = 0; alvoPolpaP = 0; alvoTransparencia = 0;
      switch (reg) {
        case 'face': alvoPesos[1] = 1; break;
        case 'esmalte': alvoPesos[0] = 1; alvoPesos[1] = 1; break;
        case 'raiz': alvoPesos[3] = 1; break;
        case 'polpa': alvoPolpaP = 1; alvoTransparencia = 1; break;
        case 'gengiva': alvoGengivaP = 1; alvoPesos[2] = 1; break;
        case 'visivel': alvoPesos[0] = 1; alvoPesos[1] = 1; alvoGengivaP = 0.55; break;
        case 'tudo':
          alvoPesos[0] = alvoPesos[1] = alvoPesos[2] = alvoPesos[3] = 0.85;
          break;
        default: break;
      }
    };

    /* --- tamanho --- */
    var largura = 0, altura = 0;
    function medir() {
      var caixaTela = tela.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(caixaTela.width * dpr));
      var h = Math.max(1, Math.round(caixaTela.height * dpr));
      if (w === largura && h === altura) { return; }
      largura = w; altura = h;
      tela.width = w; tela.height = h;
      gl.viewport(0, 0, w, h);
      perspectiva(proj, 0.46, w / h, 8, 140);
    }

    /* --- desenho --- */
    function pintar(g, corTopo, corBase, faixa, alfa, brilho, espec, fresnel, dest, corDest, alveolo) {
      ligar(g);
      gl.uniform3fv(u.uCorTopo, corTopo);
      gl.uniform3fv(u.uCorBase, corBase);
      gl.uniform2fv(u.uFaixa, faixa);
      gl.uniform1f(u.uAlfa, alfa);
      gl.uniform1f(u.uBrilho, brilho);
      gl.uniform1f(u.uEspec, espec);
      gl.uniform1f(u.uFresnel, fresnel);
      gl.uniform4fv(u.uDestaque, dest);
      gl.uniform3fv(u.uCorDestaque, corDest);
      gl.uniform1f(u.uAlveolo, alveolo || 0);
      gl.drawElements(gl.TRIANGLES, g.quantidade, g.tipo, 0);
    }

    var ESMALTE_TOPO = new Float32Array([1.00, 0.995, 0.975]);
    var ESMALTE_BASE = new Float32Array([0.905, 0.875, 0.815]);
    var GENGIVA_TOPO = new Float32Array([0.985, 0.735, 0.760]);
    var GENGIVA_BASE = new Float32Array([0.815, 0.345, 0.225]);
    var POLPA_TOPO = new Float32Array([0.925, 0.545, 0.505]);
    var POLPA_BASE = new Float32Array([0.760, 0.330, 0.320]);
    var DESTAQUE = new Float32Array([0.855, 0.700, 0.320]);
    var DESTAQUE_ROSA = new Float32Array([0.980, 0.560, 0.520]);
    var ZERO4 = new Float32Array([0, 0, 0, 0]);
    var UM4 = new Float32Array([1, 1, 1, 1]);
    var pesoGengivaV = new Float32Array(4);
    var pesoPolpaV = new Float32Array(4);

    var FAIXA_DENTE = new Float32Array([-9.5, 7.0]);
    var FAIXA_GENGIVA = new Float32Array([-11.0, 1.2]);
    var FAIXA_POLPA = new Float32Array([-9.0, 4.5]);

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var anterior = 0;

    function quadro(agora) {
      rodando = false;
      if (perdido) { return; }
      if (!visivel || document.hidden) { return; }
      var dt = anterior ? Math.min((agora - anterior) / 1000, 0.05) : 0.016;
      anterior = agora;

      medir();

      /* Giro por inércia; à toa, deriva devagar, e nunca quando a pessoa
         pediu menos movimento no sistema. */
      if (!girando) {
        if (Math.abs(impulso) > 0.0001) {
          alvoGuinada += impulso;
          impulso *= 0.93;
        } else if (!pouco && !pausada && agora > esperaAte) {
          alvoGuinada += dt * 0.20;
        }
      }
      guinada += (alvoGuinada - guinada) * Math.min(1, dt * 12);
      inclinacao += (alvoInclinacao - inclinacao) * Math.min(1, dt * 12);
      girar(modelo, normal, guinada, inclinacao);

      var v = Math.min(1, dt * 9);
      for (var i = 0; i < 4; i++) { pesos[i] += (alvoPesos[i] - pesos[i]) * v; }
      pesoGengiva += (alvoGengivaP - pesoGengiva) * v;
      pesoPolpa += (alvoPolpaP - pesoPolpa) * v;
      transparencia += (alvoTransparencia - transparencia) * v;

      pesoGengivaV[0] = pesoGengivaV[1] = pesoGengivaV[2] = pesoGengivaV[3] = pesoGengiva;
      pesoPolpaV[0] = pesoPolpaV[1] = pesoPolpaV[2] = pesoPolpaV[3] = pesoPolpa;

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(u.uProj, false, proj);
      gl.uniformMatrix4fv(u.uVista, false, mVista);
      gl.uniformMatrix4fv(u.uModelo, false, modelo);
      gl.uniformMatrix3fv(u.uNormal, false, normal);
      gl.uniform3f(u.uCamera, CAM[0], CAM[1], CAM[2]);

      var alfaDente = 1 - transparencia * 0.63;
      var alfaGengiva = 0.56 - transparencia * 0.22 - Math.max(0, pesos[3]) * 0.20 + pesoGengiva * 0.24;

      /* 1. opacos, com escrita de profundidade */
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);

      if (transparencia > 0.02) {
        pintar(gPolpa, POLPA_TOPO, POLPA_BASE, FAIXA_POLPA, 1, 22, 0.16, 0.10, pesoPolpaV, DESTAQUE_ROSA, 0.55);
      }
      if (alfaDente > 0.985) {
        pintar(gDente, ESMALTE_TOPO, ESMALTE_BASE, FAIXA_DENTE, 1, 34, 0.50, 0.15, pesos, DESTAQUE, 1);
      }

      /* 2. translúcidos, de trás para a frente */
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.enable(gl.CULL_FACE);

      gl.cullFace(gl.FRONT);
      pintar(gGengiva, GENGIVA_TOPO, GENGIVA_BASE, FAIXA_GENGIVA, alfaGengiva * 0.75, 14, 0.10, 0.30, pesoGengivaV, DESTAQUE_ROSA, 0);

      if (alfaDente <= 0.985) {
        /* Faces de tras e faces da frente em passadas separadas, como a
           gengiva. Misturadas na ordem dos indices, o esmalte translucido
           mostrava o interior por cima do exterior. */
        gl.cullFace(gl.FRONT);
        pintar(gDente, ESMALTE_TOPO, ESMALTE_BASE, FAIXA_DENTE, alfaDente * 0.8, 34, 0.30, 0.20, pesos, DESTAQUE, 1);
        gl.cullFace(gl.BACK);
        pintar(gDente, ESMALTE_TOPO, ESMALTE_BASE, FAIXA_DENTE, alfaDente, 34, 0.40, 0.24, pesos, DESTAQUE, 1);
      }

      gl.cullFace(gl.BACK);
      pintar(gGengiva, GENGIVA_TOPO, GENGIVA_BASE, FAIXA_GENGIVA, alfaGengiva, 14, 0.13, 0.34, pesoGengivaV, DESTAQUE_ROSA, 0);

      gl.disable(gl.CULL_FACE);
      gl.depthMask(true);

      rodando = true;
      requestAnimationFrame(quadro);
    }

    /* O laco so roda quando ha o que ver. Sem isto sao cinco chamadas de
       desenho por quadro, para sempre, mesmo com o modelo fora da tela. */
    var rodando = false;
    function acordar() {
      if (rodando || perdido || !visivel || document.hidden) { return; }
      anterior = 0;
      requestAnimationFrame(quadro);
    }

    if (window.IntersectionObserver) {
      /* NAO e revelacao ao rolar: o conteudo ja esta na tela. Isto so decide
         se vale gastar quadro desenhando algo que ninguem esta vendo. */
      new IntersectionObserver(function (entradas) {
        visivel = entradas[0].isIntersecting;
        if (visivel) { acordar(); }
      }, { rootMargin: '120px' }).observe(tela);
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { acordar(); }
    });

    /* A2: perda de contexto. Sem tratar, o canvas vira o icone de imagem
       quebrada, a ilustracao de reserva fica escondida e o laco continua
       rodando contra um contexto morto. `preventDefault` no evento de perda e
       o que permite a restauracao acontecer. */
    tela.addEventListener('webglcontextlost', function (ev) {
      ev.preventDefault();
      perdido = true;
      rodando = false;
      tela.hidden = true;
      if (reserva) { reserva.hidden = false; }
    }, false);

    /* NAO ha `webglcontextrestored`. Reinicializar aqui recriaria programa,
       malhas e todos os ouvintes de evento, e ouvinte duplicado e defeito pior
       que o que se conserta. Perdido o contexto, a ilustracao de reserva fica
       no lugar: e desenho completo, com a mesma regiao destacada, e nao um
       retangulo em branco. */

    /* --- gesto ---

       `pointerup` fica na JANELA, e nao so no canvas. A captura de ponteiro
       pode falhar, e falha dentro de um try que ignora: sem o ouvinte global,
       soltar o botao fora do canvas nunca entregaria o evento e o modelo
       passaria a seguir o cursor com o botao solto ate o proximo clique. */
    function comeco(ev) {
      girando = true;
      impulso = 0;
      ultimoX = ev.clientX;
      ultimoY = ev.clientY;
      if (tela.setPointerCapture && ev.pointerId !== undefined) {
        try { tela.setPointerCapture(ev.pointerId); } catch (e) { /* segue sem captura */ }
      }
    }
    function meio(ev) {
      if (!girando) { return; }
      var dx = ev.clientX - ultimoX;
      var dy = ev.clientY - ultimoY;
      ultimoX = ev.clientX;
      ultimoY = ev.clientY;
      /* Movimento de verdade, e nao qualquer toque: marcar no `pointerdown`
         fazia um deslize de rolagem sobre o modelo matar a deriva. */
      /* Um segundo e meio de trégua depois do último movimento, e a deriva
         retoma de onde a pessoa deixou. */
      if (Math.abs(dx) + Math.abs(dy) > 2) { esperaAte = performance.now() + 1500; }
      alvoGuinada += dx * 0.0088;
      alvoInclinacao = Math.max(-0.62, Math.min(0.62, alvoInclinacao + dy * 0.0060));
      impulso = dx * 0.0088;
    }
    function fim() { girando = false; }

    if (window.PointerEvent) {
      tela.addEventListener('pointerdown', comeco);
      tela.addEventListener('pointermove', meio);
      window.addEventListener('pointerup', fim);
      window.addEventListener('pointercancel', fim);
      tela.addEventListener('lostpointercapture', fim);
    } else {
      tela.addEventListener('mousedown', comeco);
      window.addEventListener('mousemove', meio);
      window.addEventListener('mouseup', fim);
      tela.addEventListener('touchstart', function (ev) {
        if (ev.touches.length === 1) { comeco(ev.touches[0]); }
      }, { passive: true });
      tela.addEventListener('touchmove', function (ev) {
        if (ev.touches.length === 1) { meio(ev.touches[0]); }
      }, { passive: true });
      window.addEventListener('touchend', fim);
    }

    /* O CANVAS NAO VIRA FOCAVEL, de proposito. Um `role="img"` que recebe foco
       nao anuncia que e operavel, e em modo de leitura as setas continuam
       navegando o documento: a operacao por teclado ficaria inalcancavel
       justamente para quem depende dela. Quem opera sao os botoes abaixo, que
       tambem resolvem a exigencia de alternativa ao gesto de arrasto e o
       controle de parada da rotacao automatica. */
    /* O botão de parada fica fora da tela e só aparece com o foco do teclado.
       É o que cumpre a 2.2.2 sem colocar controle nenhum no desenho. */
    if (parar) {
      var mostrarParada = function () {
        parar.setAttribute('aria-pressed', pausada ? 'true' : 'false');
        var texto = parar.querySelector('[data-modelo-parar-texto]');
        if (texto) {
          texto.textContent = pausada ? 'Retomar a rotação do modelo' : 'Pausar a rotação do modelo';
        }
      };
      mostrarParada();
      parar.addEventListener('click', function () {
        pausada = !pausada;
        impulso = 0;
        esperaAte = 0;
        mostrarParada();
      });
    }

    if (regiaoFixa) { aoDestacar(regiaoFixa); }

    /* --- troca a ilustração pelo modelo --- */
    tela.hidden = false;
    if (reserva) { reserva.hidden = true; }

    medir();
    acordar();
    return true;
  }

  function voltarAReserva() {
    if (!tela) { return; }
    tela.hidden = true;
    if (reserva) { reserva.hidden = false; }
    if (parar) { parar.hidden = true; }
  }

  /* A montagem custa cerca de 460 mil avaliacoes do campo de distancia. Num
     bloco unico isso trava a entrada por centenas de milissegundos num celular
     modesto, e trava justamente enquanto a pessoa tenta tocar em "Agendar".
     Por isso cada malha e uma TAREFA SEPARADA, com o navegador respirando
     entre elas. A ilustracao de reserva fica na tela o tempo todo, entao nada
     do que se ve depende dessa espera.

     O contexto e criado ANTES: sem WebGL nao ha por que gastar a conta. */
  function montar() {
    if (!tela) { return; }
    var gl = contexto();
    if (!gl) { voltarAReserva(); return; }

    var malhas = {};
    var passos = [
      function () { malhas.dente = poligonizar(fDente, [-6.4, -11.6, -5.6], [6.4, 8.4, 5.6], 0.26, regiaoDente); },
      function () { malhas.polpa = poligonizar(fPolpa, [-3.6, -10.4, -2.4], [3.6, 5.8, 2.4], 0.20, null); },
      function () { malhas.gengiva = poligonizar(fGengiva, [-9.0, -14.2, -9.0], [9.0, 2.9, 9.0], 0.40, null); },
      function () {
        var ok = false;
        try { ok = iniciar(gl, malhas); } catch (e) { ok = false; }
        if (!ok) { voltarAReserva(); }
      }
    ];

    var i = 0;
    function proximo() {
      try { passos[i++](); } catch (e) { voltarAReserva(); return; }
      if (i < passos.length) { setTimeout(proximo, 0); }
    }
    setTimeout(proximo, 0);
  }

  if (window.requestIdleCallback) {
    requestIdleCallback(montar, { timeout: 1600 });
  } else {
    setTimeout(montar, 220);
  }
}());
