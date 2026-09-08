/* =========================================================================
   Comportamento do site. Três coisas, e só três.

   1. O menu no celular.
   2. A mensagem de agendamento, montada no aparelho de quem está lendo.
   3. Abrir as perguntas antes de imprimir.

   Nada aqui revela conteúdo. Nenhum bloco da página depende deste arquivo
   para aparecer: se o script não carregar, o site continua inteiro e o
   agendamento continua funcionando pelos botões de WhatsApp de cada unidade.

   Nada aqui envia dado para lugar nenhum. Não há fetch, não há XHR, não há
   armazenamento. A CSP da página bloqueia conexão de saída, envio de
   formulário e origem de terceiro, então essa promessa é verificável e não
   depende de confiança neste arquivo.
   ========================================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------------- */
  /* 1. Menu no celular                                               */
  /* ---------------------------------------------------------------- */

  var botao = document.getElementById('abrir-menu');
  var nav = document.getElementById('navegacao');

  if (botao && nav) {
    botao.addEventListener('click', function () {
      var aberto = nav.classList.toggle('aberto');
      botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });

    /* Esc fecha e devolve o foco ao botão, que é de onde a pessoa veio. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('aberto')) {
        nav.classList.remove('aberto');
        botao.setAttribute('aria-expanded', 'false');
        botao.focus();
      }
    });

    /* Ao voltar para a largura de mesa o menu não pode ficar preso aberto. */
    var largura = window.matchMedia('(min-width: 60.0625rem)');
    var aoMudar = function (m) {
      if (m.matches) {
        nav.classList.remove('aberto');
        botao.setAttribute('aria-expanded', 'false');
      }
    };
    if (largura.addEventListener) { largura.addEventListener('change', aoMudar); }
  }

  /* ---------------------------------------------------------------- */
  /* 2. Mensagem de agendamento                                       */
  /* ---------------------------------------------------------------- */

  var form = document.getElementById('form-agenda');

  if (form) {
    var previa = document.getElementById('previa-mensagem');
    var enviar = document.getElementById('enviar-whatsapp');

    /* Os dados das unidades vêm do próprio HTML já publicado, lidos dos
       botões de rádio, e não de uma cópia escrita aqui. Um telefone só
       existe em src/dados.mjs; se ele mudar lá, muda em todo lugar. */
    var unidades = {};
    Array.prototype.forEach.call(form.querySelectorAll('input[name="unidade"]'), function (input) {
      var corpo = input.closest('.radio');
      unidades[input.value] = {
        cidade: corpo.querySelector('.radio-cidade').textContent.trim()
      };
    });

    /* O número de cada unidade sai do link de WhatsApp que já está no
       rodapé desta mesma página, um por unidade, na mesma ordem dos rádios. */
    var linksZap = document.querySelectorAll('.rp-unidade .rp-links-unid a[href*="wa.me/"]');
    var ordem = Object.keys(unidades);
    Array.prototype.forEach.call(linksZap, function (a, i) {
      var casa = a.getAttribute('href').match(/wa\.me\/(\d+)/);
      if (casa && ordem[i]) { unidades[ordem[i]].numero = casa[1]; }
    });

    var valor = function (id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    var montar = function () {
      var escolhida = form.querySelector('input[name="unidade"]:checked');
      var id = escolhida ? escolhida.value : ordem[0];
      var u = unidades[id] || {};

      var nome = valor('ag-nome');
      var assunto = valor('ag-assunto');
      var periodo = valor('ag-periodo');
      var obs = valor('ag-obs');

      var linhas = [];
      linhas.push('Olá! Vim pelo site da Glamm Odontologia'
        + (u.cidade ? ' e gostaria de agendar uma avaliação na unidade de ' + u.cidade + '.' : '.'));
      if (nome) { linhas.push('Meu nome é ' + nome + '.'); }
      linhas.push(assunto
        ? 'O que me trouxe até aqui: ' + assunto + '.'
        : 'Ainda não sei do que preciso, queria começar por uma avaliação.');
      if (periodo) { linhas.push('Consigo ir melhor ' + periodo + '.'); }
      if (obs) { linhas.push(obs); }

      return { texto: linhas.join('\n'), numero: u.numero };
    };

    var atualizar = function () {
      var m = montar();
      if (previa) { previa.textContent = m.texto; }
      if (enviar && m.numero) {
        enviar.setAttribute('href', 'https://wa.me/' + m.numero + '?text=' + encodeURIComponent(m.texto));
      }
    };

    form.addEventListener('input', atualizar);
    form.addEventListener('change', atualizar);

    /* O formulário não envia nada. Se algum navegador tentar submeter por
       Enter, a submissão morre aqui, além de já morrer na CSP. */
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    atualizar();
  }

  /* ---------------------------------------------------------------- */
  /* 3. Imprimir com as perguntas abertas                             */
  /* ---------------------------------------------------------------- */

  var abrirTudo = function () {
    Array.prototype.forEach.call(document.querySelectorAll('details'), function (d) {
      if (!d.open) {
        d.open = true;
        d.setAttribute('data-reabrir', '');
      }
    });
  };
  var fecharDeVolta = function () {
    Array.prototype.forEach.call(document.querySelectorAll('details[data-reabrir]'), function (d) {
      d.open = false;
      d.removeAttribute('data-reabrir');
    });
  };

  if (window.addEventListener) {
    window.addEventListener('beforeprint', abrirTudo);
    window.addEventListener('afterprint', fecharDeVolta);
  }
})();
