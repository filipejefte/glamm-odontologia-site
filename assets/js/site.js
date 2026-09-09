/* =========================================================================
   Melhorias progressivas. A página funciona inteira sem este arquivo.

   Duas regras:
   1. Nada de conteúdo depende daqui. Nenhum texto é escrito, nenhum bloco é
      revelado ao rolar. Se este arquivo não carregar, o site continua
      completo e navegável — inclusive o menu, que só passa a ser recolhível
      DEPOIS que a classe `js` entra no documento.
   2. Nenhuma requisição de rede. A política de segurança bloqueia `connect-src`
      e a página de privacidade promete que nada sai deste domínio.
   ========================================================================= */

(function () {
  'use strict';

  var raiz = document.documentElement;
  raiz.classList.remove('sem-js');
  raiz.classList.add('js');

  /* ---------------------------------------------------------------- */
  /*  Menu no celular                                                  */
  /*                                                                   */
  /*  O painel só é fechado aqui, depois que a classe `js` já está no   */
  /*  documento. Assim, sem JavaScript, o menu fica aberto e empilhado  */
  /*  em vez de sumir.                                                 */
  /* ---------------------------------------------------------------- */

  var botao = document.querySelector('[data-menu]');
  var menu = document.getElementById('menu');
  var acoes = document.querySelector('[data-topo-acoes]');
  var faixa = menu && menu.parentNode;
  var estreito = window.matchMedia('(max-width: 860px)');

  /* A ORDEM DO DOM MUDA COM O LAYOUT, e muda de propósito.
     Na tela larga a barra é [marca] [menu] [agendar], e o DOM segue essa
     ordem. Na estreita a barra vira [marca] [agendar] [abrir menu] e o painel
     abre embaixo — se o DOM continuasse o mesmo, quem navega por teclado
     sairia do último item do menu e voltaria para um botão que está ACIMA
     dele. Mover o elemento é o que mantém foco e leitura na ordem que se vê. */
  function ordenar() {
    if (!menu || !faixa || !acoes) { return; }
    if (estreito.matches) {
      if (menu.nextElementSibling !== null) { faixa.appendChild(menu); }
    } else if (menu.nextElementSibling !== acoes) {
      faixa.insertBefore(menu, acoes);
    }
  }

  function ajustar() {
    if (!botao || !menu) { return; }
    ordenar();
    menu.hidden = estreito.matches;
    botao.setAttribute('aria-expanded', 'false');
  }

  if (botao && menu) {
    ajustar();
    if (estreito.addEventListener) {
      estreito.addEventListener('change', ajustar);
    } else if (estreito.addListener) {
      estreito.addListener(ajustar);
    }

    botao.addEventListener('click', function () {
      var aberto = botao.getAttribute('aria-expanded') === 'true';
      botao.setAttribute('aria-expanded', aberto ? 'false' : 'true');
      menu.hidden = aberto;
      var texto = botao.querySelector('.so-leitor');
      if (texto) { texto.textContent = aberto ? 'Abrir o menu' : 'Fechar o menu'; }
      if (!aberto) {
        var primeiro = menu.querySelector('a');
        if (primeiro) { primeiro.focus(); }
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') { return; }
      if (!estreito.matches || menu.hidden) { return; }
      menu.hidden = true;
      botao.setAttribute('aria-expanded', 'false');
      botao.focus();
    });

    menu.addEventListener('click', function (ev) {
      if (!estreito.matches) { return; }
      var alvo = ev.target;
      while (alvo && alvo !== menu && alvo.tagName !== 'A') { alvo = alvo.parentNode; }
      if (alvo && alvo.tagName === 'A') {
        menu.hidden = true;
        botao.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Âncora dentro de uma pergunta fechada                            */
  /*                                                                   */
  /*  Se alguém chegar por um link direto para uma resposta, abre o     */
  /*  <details> em vez de rolar até um bloco fechado.                   */
  /* ---------------------------------------------------------------- */

  function abrirAlvo() {
    var id = location.hash.slice(1);
    if (!id) { return; }
    var alvo = null;
    try { alvo = document.getElementById(decodeURIComponent(id)); } catch (e) { alvo = null; }
    if (!alvo) { return; }
    var det = alvo;
    while (det && det.tagName !== 'DETAILS') { det = det.parentNode; }
    if (det && det.tagName === 'DETAILS') {
      det.open = true;
      /* O navegador já rolou até o elemento FECHADO antes deste código rodar.
         Depois de abrir, a posição mudou, e é preciso rolar de novo. */
      if (det.scrollIntoView) { det.scrollIntoView({ block: 'center' }); }
    }
  }

  abrirAlvo();
  window.addEventListener('hashchange', abrirAlvo);
}());
