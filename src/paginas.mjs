/* =========================================================================
   O corpo de cada página.

   Cada função devolve `{ rota, titulo, descricao, trilha, corpo, ldExtra }`.
   O build.mjs embrulha isso no chrome e escreve o arquivo.

   O site é MULTIPÁGINA de propósito. O diagnóstico apontou que o site atual
   concentra tudo numa página só e por isso não tem nada para o buscador
   ranquear por tratamento nem por cidade. Aqui cada tratamento e cada
   unidade têm URL, título, descrição, trilha e dado estruturado próprios.

   REGRA DE REDAÇÃO, para busca e para assistente de IA ao mesmo tempo:
   toda página abre respondendo à pergunta implícita do título, em uma ou
   duas frases que se sustentam sozinhas fora do contexto. É o trecho que o
   assistente cita e é o que a pessoa lê antes de decidir rolar.
   ========================================================================= */

import {
  CLINICA, UNIDADES, POR_ID, TRATAMENTOS, TRATAMENTO_POR_SLUG,
  EQUIPE, EQUIPE_PENDENTE, DUVIDAS, CONSULTA, CONSULTA_DURACAO,
  COMPROMISSOS, PUBLICACAO
} from './dados.mjs';
import { esc, conf, raizDe, urlCanonica, faqLd, chamada, acordeao, botaoAgendar, icone, idTratamento } from './chrome.mjs';
import { denteEstatico, simbolo } from './marca.mjs';

const MARILIA = POR_ID.marilia;
const GARCA = POR_ID.garca;
const CIDADES = UNIDADES.map(u => u.cidade).join(' e ');

/* ------------------------------------------------------------------ */
/*  Peças                                                              */
/* ------------------------------------------------------------------ */

function cartaoTratamento(t, r, { grande = false } = {}) {
  return `<a class="cartao cartao-tratamento${grande ? ' e-grande' : ''}" href="${r}tratamentos/${t.slug}/">
      <span class="cartao-ico"><img src="${r}assets/img/ico-${t.icone}.webp" width="192" height="192" alt="" loading="lazy" decoding="async"></span>
      <span class="cartao-corpo">
        <span class="cartao-titulo">${esc(t.nome)}</span>
        <span class="cartao-texto">${esc(t.resumo)}</span>
      </span>
      <span class="cartao-seta" aria-hidden="true">${icone('seta', { tamanho: 18 })}</span>
    </a>`;
}

function tabelaHorario(u) {
  return `<table class="horario">
      <caption class="so-leitor">Horário de atendimento da unidade de ${esc(u.cidade)}</caption>
      <tbody>
        ${u.horarios.map(h => `<tr><th scope="row">${esc(h.dias)}</th><td>${esc(h.abre)} às ${esc(h.fecha)}</td></tr>`).join('\n        ')}
        <tr><th scope="row">Fim de semana</th><td>${esc(u.fechado.replace('Não atende ', 'Não atende '))}</td></tr>
      </tbody>
    </table>`;
}

function cartaoUnidade(u, r, { assunto = null, tratamento = null } = {}) {
  return `<div class="cartao cartao-unidade">
      <p class="rotulo rotulo-ouro">${esc(u.cidade)} &middot; ${esc(u.uf)}</p>
      <h3 class="cartao-titulo">${esc(u.nome)}</h3>

      <address class="unidade-endereco">
        <span class="unidade-rua">${esc(u.enderecoLinha)}</span>
        <span class="unidade-bairro">${esc(u.bairro)} &middot; CEP ${esc(u.cep)}</span>
        <span class="unidade-referencia">${icone('pin', { tamanho: 15 })} ${esc(u.referencia)}</span>
      </address>

      <table class="unidade-horario">
        <caption class="so-leitor">Horário da unidade de ${esc(u.cidade)}</caption>
        <tbody>
          ${u.horarios.map(h => `<tr><th scope="row">${esc(h.dias)}</th><td>${esc(h.abre)} às ${esc(h.fecha)}</td></tr>`).join('\n          ')}
        </tbody>
      </table>
      <p class="unidade-fechado">${esc(u.fechado)}</p>

      <div class="cartao-acoes">
        <a class="unidade-telefone" href="tel:+${u.e164}">
          ${icone('telefone', { tamanho: 17 })}<span>${esc(u.telefone)}</span>
        </a>
        ${botaoAgendar(u, { assunto })}
        <a class="elo elo-seta" href="${r}unidades/${u.slug}/">${tratamento
          ? `${esc(tratamento.nome)} em ${esc(u.cidade)}`
          : `Sobre a unidade de ${esc(u.cidade)}`} ${icone('seta', { tamanho: 15 })}</a>
      </div>
    </div>`;
}

/* O modelo tridimensional e o índice anatômico.

   Cada ficha é UM LINK para a página do tratamento, com `data-regiao`. Sem
   JavaScript continua sendo uma lista de links, que é o que o buscador lê.
   Com JavaScript, passar o cursor ou o foco acende a região correspondente
   do modelo. O modelo é enfeite só quando não faz nada; aqui ele é o índice. */
function modelo(r, fixa = null) {
  /* O ÚNICO CONTROLE É INVISÍVEL, e o motivo é uma norma.
     O modelo gira sozinho e não tem botão na tela, como o desenho pede. Mas
     movimento que começa sozinho e dura mais de cinco segundos precisa de um
     jeito de parar (WCAG 2.2.2), e `prefers-reduced-motion` cobre só quem já
     marcou a preferência no sistema. A saída é o mesmo padrão do atalho "Ir
     para o conteúdo": um botão que fica fora da tela e aparece quando recebe
     o foco do teclado. Custo visual zero, norma cumprida. */
  const parada = `<button class="modelo-parar" type="button" data-modelo-parar aria-pressed="false">
          <span data-modelo-parar-texto>Pausar a rotação do modelo</span>
        </button>`;

  const palco = `<div class="modelo-palco">
        <div class="modelo-halo" aria-hidden="true"></div>
        <canvas class="modelo-tela" data-modelo-tela width="1" height="1" hidden
          role="img" tabindex="-1"
          aria-label="Modelo tridimensional de um molar dentro da gengiva${fixa ? `, com ${esc(fixa.parte.toLowerCase())} em destaque` : ''}, girando devagar."></canvas>
        <div class="modelo-reserva${fixa ? ` regiao-${esc(fixa.regiao)}` : ''}" data-modelo-reserva>${denteEstatico()}</div>
        ${parada}
      </div>`;

  /* Na página de um tratamento o modelo nasce com a região daquele tratamento
     acesa, e a legenda diz qual é. */
  if (fixa) {
    return `<div class="modelo modelo-fixo" data-modelo data-regiao-fixa="${esc(fixa.regiao)}">
      ${palco}
      <p class="modelo-legenda"><strong>${esc(fixa.parte)}.</strong> <span>${esc(fixa.parteTexto)}</span></p>
    </div>`;
  }

  return `<div class="modelo" data-modelo>
      ${palco}
    </div>`;
}

/* A coluna da direita não é enfeite de preenchimento: é o resumo que a pessoa
   procura enquanto lê as dúvidas (particular, quanto dura, onde é) e o caminho
   para perguntar o que não está na lista. Ela acompanha a rolagem. */
function secaoDuvidas(lista, r, { titulo = 'Dúvidas frequentes', id = 'duvidas', ver = true } = {}) {
  return `<section class="secao" id="${id}" aria-labelledby="${id}-titulo">
  <div class="faixa duvidas-grade">
    <div class="duvidas-coluna">
      <p class="rotulo rotulo-ouro">Antes de agendar</p>
      <h2 class="titulo-2" id="${id}-titulo">${esc(titulo)}</h2>
      ${acordeao(lista)}
      ${ver ? `<p class="mais"><a class="elo elo-seta" href="${r}duvidas/">Ver todas as dúvidas ${icone('seta', { tamanho: 15 })}</a></p>` : ''}
    </div>

    <aside class="duvidas-lado" aria-labelledby="${id}-lado">
      <div class="lado-cartao">
        <span class="lado-simbolo" aria-hidden="true">${simbolo({ tamanho: 34, cor: 'currentColor' })}</span>
        <h3 class="lado-titulo" id="${id}-lado">Em resumo</h3>
        <dl class="lado-fatos">
          <div><dt>Atendimento</dt><dd>Particular, sem convênio</dd></div>
          <div><dt>Primeira consulta</dt><dd>Avaliação, ${esc(CONSULTA_DURACAO)}</dd></div>
          <div><dt>Sai com</dt><dd>Plano de tratamento por escrito</dd></div>
          <div><dt>Unidades</dt><dd>${UNIDADES.map(x => `${esc(x.cidade)}, ${esc(x.destaqueHorario.toLowerCase())}`).join('<br>')}</dd></div>
        </dl>
        <p class="lado-nota">Não achou a sua pergunta? Escreva no WhatsApp da unidade mais perto de você.</p>
        <div class="lado-acoes">
          ${UNIDADES.map(x => `<a class="botao botao-vazado botao-pequeno" href="${x.whatsapp}" rel="noopener noreferrer" target="_blank">${icone('conversa', { tamanho: 16 })}<span>${esc(x.cidade)}</span></a>`).join('\n          ')}
        </div>
        <p class="lado-urgencia">
          ${icone('escudo', { tamanho: 15 })}
          <span>Dor forte, inchaço ou trauma não esperam por agenda.
            <a class="elo" href="${r}urgencia/">O que fazer numa urgência</a>.</span>
        </p>
      </div>
    </aside>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ */
/*  Início                                                             */
/* ------------------------------------------------------------------ */

export function inicio() {
  const rota = '';
  const r = raizDe(rota);
  const f = EQUIPE[0];

  const corpo = `
<section class="capa" aria-labelledby="capa-titulo">
  <div class="faixa capa-grade">
    <div class="capa-texto">
      <p class="rotulo rotulo-ouro">${esc(CIDADES)} &middot; SP</p>
      <h1 class="titulo-1" id="capa-titulo">Dentista em <em>Marília e Garça</em></h1>
      <p class="capa-linha">
        A Glamm Odontologia atende nas duas cidades com o mesmo padrão: uma avaliação
        que mostra na tela o que foi encontrado e termina com o plano de tratamento
        por escrito, com o que é urgente separado do que pode esperar.
      </p>
      <div class="capa-acoes">
        ${botaoAgendar(MARILIA)}
        ${botaoAgendar(GARCA, { solido: false })}
      </div>
      <ul class="capa-provas">
        <li>${icone('documento', { tamanho: 17 })} Plano por escrito na primeira consulta</li>
        <li>${icone('olho', { tamanho: 17 })} Você vê a imagem do que está sendo explicado</li>
        <li>${icone('relogio', { tamanho: 17 })} Avaliação ${esc(CONSULTA_DURACAO)}</li>
      </ul>
    </div>
    <div class="capa-modelo">
      ${modelo(r)}
    </div>
  </div>
</section>

<section class="secao secao-clara" id="tratamentos" aria-labelledby="tratamentos-titulo">
  <div class="faixa">
    <div class="secao-cabeca">
      <div>
        <p class="rotulo rotulo-ouro">Tratamentos</p>
        <h2 class="titulo-2" id="tratamentos-titulo">Seja qual for a sua necessidade, <em class="titulo-quebra">há um caminho para ela</em></h2>
      </div>
      <p class="secao-texto">
        Cada tratamento tem uma página que explica o que é, quando é indicado e o que a
        avaliação precisa checar antes. Nenhuma delas substitui a consulta: elas existem
        para você chegar sabendo do que se trata.
      </p>
    </div>
    <div class="grade-tratamentos">
      ${TRATAMENTOS.map(t => cartaoTratamento(t, r)).join('\n      ')}
    </div>
    <p class="mais"><a class="elo elo-seta" href="${r}tratamentos/">Ver todos os tratamentos ${icone('seta', { tamanho: 15 })}</a></p>
  </div>
</section>

<section class="secao secao-escura" id="a-consulta" aria-labelledby="consulta-titulo">
  <div class="faixa">
    <div class="secao-cabeca">
      <div>
        <p class="rotulo rotulo-ouro-claro">A primeira consulta</p>
        <h2 class="titulo-2" id="consulta-titulo">O que acontece <em>na avaliação</em></h2>
      </div>
      <p class="secao-texto">
        Saber o que vai acontecer é o que tira o peso da primeira visita. A consulta de
        avaliação leva ${esc(CONSULTA_DURACAO)} e segue sempre a mesma ordem.
      </p>
    </div>
    <ol class="passos">
      ${CONSULTA.map(p => `<li class="passo">
        <span class="passo-n" aria-hidden="true">${esc(p.n)}</span>
        <h3 class="passo-titulo">${esc(p.h)}</h3>
        <p class="passo-texto">${esc(p.p)}</p>
      </li>`).join('\n      ')}
    </ol>
    <p class="mais"><a class="elo elo-seta" href="${r}primeira-consulta/">O que levar, e o que dizer ${icone('seta', { tamanho: 15 })}</a></p>
  </div>
</section>

<section class="secao" id="a-clinica" aria-labelledby="clinica-titulo">
  <div class="faixa retrato-grade">
    <div class="retrato-figura">
      <figure>
        <img class="retrato" src="${r}${esc(f.retrato)}" width="${f.retratoLargura}" height="${f.retratoAltura}"
             alt="${esc(f.retratoAlt)}" loading="lazy" decoding="async">
        <figcaption class="retrato-legenda">
          <strong>${esc(f.nome)}</strong>
          <span>${esc(f.papel)}</span>
          <span class="retrato-cro">${conf(f.cro && `CRO-SP ${f.cro}`, 'inscrição no CRO')}</span>
        </figcaption>
      </figure>
    </div>
    <div class="retrato-texto">
      <p class="rotulo rotulo-ouro">A clínica</p>
      <h2 class="titulo-2" id="clinica-titulo">Uma clínica, <em>duas cidades</em>, o mesmo padrão</h2>
      <p class="prosa">
        A Glamm Odontologia nasceu em ${esc(String(CLINICA.desde))} e hoje atende em ${esc(CIDADES)}.
        A fundadora e responsável técnica é a ${esc(f.nome)}. ${esc(f.formacao)}
      </p>
      <p class="prosa">
        O que organiza o atendimento é uma decisão simples: nada é executado antes de estar
        explicado. A avaliação mostra o que foi encontrado, com a imagem à vista, e o plano
        sai por escrito com a sequência do que precisa ser feito.
      </p>
      <ul class="compromissos">
        ${COMPROMISSOS.map(c => `<li>
          <span class="compromisso-ico" aria-hidden="true">${icone('check', { tamanho: 15 })}</span>
          <strong>${esc(c.h)}</strong>
          <span>${esc(c.p)}</span>
        </li>`).join('\n        ')}
      </ul>
      <p class="mais"><a class="elo elo-seta" href="${r}a-clinica/">Sobre a clínica ${icone('seta', { tamanho: 15 })}</a></p>
    </div>
  </div>
</section>

<section class="secao secao-clara" id="unidades" aria-labelledby="unidades-titulo">
  <div class="faixa">
    <div class="secao-cabeca">
      <div>
        <p class="rotulo rotulo-ouro">Unidades</p>
        <h2 class="titulo-2" id="unidades-titulo">Onde <em>encontrar a gente</em></h2>
      </div>
      <p class="secao-texto">
        Cada unidade tem o seu próprio número de WhatsApp e o seu próprio horário.
        O botão já abre a conversa com a unidade escolhida.
      </p>
    </div>
    <div class="grade-unidades">
      ${UNIDADES.map(u => cartaoUnidade(u, r)).join('\n      ')}
    </div>
  </div>
</section>

${secaoDuvidas(DUVIDAS.slice(0, 6), r)}

${chamada(rota)}
`;

  return {
    rota,
    titulo: `Glamm Odontologia | Dentista em ${CIDADES}, SP`,
    descricao: `Clínica odontológica em ${CIDADES}, SP. Avaliação com plano de tratamento por escrito. Facetas, ortodontia, implante, clareamento, canal e periodontia.`,
    trilha: [],
    corpo,
    ldExtra: [faqLd(rota, DUVIDAS.slice(0, 6))],
    script: 'dente3d.js'
  };
}

/* ------------------------------------------------------------------ */
/*  Hub de tratamentos                                                 */
/* ------------------------------------------------------------------ */

export function hubTratamentos() {
  const rota = 'tratamentos/';
  const r = raizDe(rota);

  const corpo = `
<header class="cabecalho">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Tratamentos</p>
    <h1 class="titulo-1">Tratamentos odontológicos em <em>${esc(CIDADES)}</em></h1>
    <p class="resposta">
      A Glamm Odontologia realiza ${TRATAMENTOS.length} grupos de tratamento nas duas unidades:
      ${esc(TRATAMENTOS.map(t => t.nome.toLowerCase()).join(', '))}.
      Todos começam pela mesma consulta de avaliação, que termina com um plano por escrito.
    </p>
  </div>
</header>

<section class="secao secao-topo" aria-labelledby="lista-titulo">
  <div class="faixa">
    <h2 class="so-leitor" id="lista-titulo">Lista de tratamentos</h2>
    <div class="grade-tratamentos grade-tratamentos-hub">
      ${TRATAMENTOS.map(t => cartaoTratamento(t, r, { grande: true })).join('\n      ')}
    </div>
  </div>
</section>

<section class="secao secao-clara" aria-labelledby="ordem-titulo">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Como a ordem é definida</p>
    <h2 class="titulo-2" id="ordem-titulo">Estética se apoia em <em>saúde</em></h2>
    <p class="prosa">
      A sequência do tratamento raramente começa pelo que se vê. Gengiva inflamada, cárie
      ativa, dente com dor e mordida desalinhada mudam o resultado de qualquer procedimento
      estético feito por cima, e por isso costumam vir antes na ordem.
    </p>
    <p class="prosa">
      É por isso que a primeira consulta é de avaliação, e não de execução: é ela que
      define o que precisa ser resolvido primeiro. O plano sai por escrito, com o que é
      urgente separado do que pode esperar, e com as alternativas quando existe mais de um
      caminho para o mesmo problema.
    </p>
    <p class="mais"><a class="elo elo-seta" href="${r}a-clinica/">Como a clínica trabalha ${icone('seta', { tamanho: 15 })}</a></p>
  </div>
</section>

${chamada(rota, { titulo: 'Comece pela avaliação' })}
`;

  return {
    rota,
    titulo: `Tratamentos odontológicos em ${CIDADES} | Glamm Odontologia`,
    descricao: `Lentes e facetas, ortodontia e alinhadores, implante e prótese, clareamento, endodontia, periodontia e avaliação com câmera intraoral, em ${CIDADES}, SP.`,
    trilha: [{ nome: 'Tratamentos', rota: 'tratamentos/' }],
    corpo,
    ldExtra: [{
      '@type': 'CollectionPage',
      '@id': `${urlCanonica(rota)}#pagina`,
      name: `Tratamentos odontológicos em ${CIDADES}`,
      url: urlCanonica(rota),
      isPartOf: { '@id': `${CLINICA.origem}/#site` },
      about: { '@id': `${CLINICA.origem}/#organizacao` },
      hasPart: TRATAMENTOS.map(t => ({
        '@type': 'MedicalWebPage',
        name: t.nomeLongo,
        url: `${CLINICA.origem}/tratamentos/${t.slug}/`
      }))
    }]
  };
}

/* ------------------------------------------------------------------ */
/*  Página de tratamento                                               */
/* ------------------------------------------------------------------ */

export function paginaTratamento(t) {
  const rota = `tratamentos/${t.slug}/`;
  const r = raizDe(rota);
  const relacionados = (t.relacionados || []).map(s => TRATAMENTO_POR_SLUG[s]).filter(Boolean);

  const corpo = `
<header class="cabecalho cabecalho-tratamento">
  <div class="faixa cabecalho-grade">
    <div>
      <p class="rotulo rotulo-ouro">${esc(t.parte)}</p>
      <h1 class="titulo-1">${esc(t.nomeLongo)} <em class="titulo-lugar titulo-quebra">em ${esc(CIDADES)}</em></h1>
      <p class="resposta">${esc(t.resposta)}</p>
      <div class="capa-acoes">
        ${botaoAgendar(MARILIA, { assunto: t.nome.toLowerCase() })}
        ${botaoAgendar(GARCA, { assunto: t.nome.toLowerCase(), solido: false })}
      </div>
    </div>
    ${modelo(r, { regiao: t.regiao, parte: t.parte, parteTexto: t.parteTexto })}
  </div>
</header>

<section class="secao secao-topo" aria-labelledby="sobre-titulo">
  <div class="faixa faixa-estreita">
    <h2 class="so-leitor" id="sobre-titulo">Sobre ${esc(t.nome.toLowerCase())}</h2>
    <div class="artigo">
      ${t.conteudo.map(c => `<h3 class="titulo-3">${esc(c.h)}</h3>\n      <p class="prosa">${esc(c.p)}</p>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="secao secao-clara" aria-labelledby="onde-titulo">
  <div class="faixa">
    <div class="secao-cabeca">
      <div>
        <p class="rotulo rotulo-ouro">Onde fazer</p>
        <h2 class="titulo-2" id="onde-titulo">${esc(t.nome)} em <em>${esc(CIDADES)}</em></h2>
      </div>
      <p class="secao-texto">
        As duas unidades realizam ${esc(t.nome.toLowerCase())} com o mesmo padrão de
        atendimento. O que muda é o endereço e o horário.
        <a class="elo" href="${r}equipe/">Quem atende</a>.
      </p>
    </div>
    <div class="grade-unidades">
      ${UNIDADES.map(u => cartaoUnidade(u, r, { assunto: t.nome.toLowerCase(), tratamento: t })).join('\n      ')}
    </div>
  </div>
</section>

${secaoDuvidas(t.duvidas, r, { titulo: `Dúvidas sobre ${t.nome.toLowerCase()}`, id: 'duvidas', ver: false })}

<section class="secao secao-clara" aria-labelledby="relacionados-titulo">
  <div class="faixa">
    <p class="rotulo rotulo-ouro">Veja também</p>
    <h2 class="titulo-2" id="relacionados-titulo">Tratamentos <em>relacionados</em></h2>
    <div class="grade-tratamentos">
      ${relacionados.map(x => cartaoTratamento(x, r)).join('\n      ')}
    </div>
    <p class="mais"><a class="elo elo-seta" href="${r}tratamentos/">Ver todos os tratamentos ${icone('seta', { tamanho: 15 })}</a></p>
  </div>
</section>

${chamada(rota, { titulo: `Agende uma avaliação`, assunto: t.nome.toLowerCase() })}
`;

  return {
    rota,
    titulo: `${t.titulo} | Glamm Odontologia`,
    descricao: t.descricao,
    trilha: [
      { nome: 'Tratamentos', rota: 'tratamentos/' },
      { nome: t.nome, rota }
    ],
    corpo,
    script: 'dente3d.js',
    tipoOg: 'article',
    ldExtra: [
      {
        '@type': 'MedicalWebPage',
        '@id': `${urlCanonica(rota)}#pagina`,
        name: t.nomeLongo,
        url: urlCanonica(rota),
        description: t.descricao,
        inLanguage: CLINICA.lang,
        isPartOf: { '@id': `${CLINICA.origem}/#site` },
        dateModified: PUBLICACAO.revisadoEm,
        /* SEM `procedureType`. O schema.org só oferece `NoninvasiveProcedure`
           e `PercutaneousProcedure`, e nenhum dos dois descreve honestamente o
           conjunto: instalar um pino de titânio no osso não é procedimento não
           invasivo. Declarar o valor errado é pior que não declarar, porque é
           conteúdo legível por máquina e um assistente de IA o repetiria como
           afirmação da clínica. */
        /* Referência ao nó do procedimento, que já está no grafo com @id
           estável. Repetir o nó aqui criaria uma segunda entidade para a mesma
           coisa em cada página. */
        about: { '@id': idTratamento(t) },
        provider: { '@id': `${CLINICA.origem}/#organizacao` },
        audience: { '@type': 'Patient' },
        lastReviewed: PUBLICACAO.revisadoEm
      },
      faqLd(rota, t.duvidas)
    ]
  };
}

/* ------------------------------------------------------------------ */
/*  Hub de unidades                                                    */
/* ------------------------------------------------------------------ */

export function hubUnidades() {
  const rota = 'unidades/';
  const r = raizDe(rota);

  const corpo = `
<header class="cabecalho">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Unidades</p>
    <h1 class="titulo-1">Glamm Odontologia em <em>${esc(CIDADES)}</em></h1>
    <p class="resposta">
      São duas unidades, a mesma clínica. Marília fica na Rua Marrei Júnior, 49, no Fragata,
      e atende de segunda a sexta. Garça fica na Rua Voluntários de 32, 147, no Williams,
      abre até as 20h e atende também aos sábados. Cada unidade tem o seu próprio telefone
      e o seu próprio WhatsApp.
    </p>
  </div>
</header>

<section class="secao secao-topo" aria-labelledby="comparar-titulo">
  <div class="faixa">
    <h2 class="so-leitor" id="comparar-titulo">As duas unidades lado a lado</h2>
    <div class="grade-unidades">
      ${UNIDADES.map(u => cartaoUnidade(u, r)).join('\n      ')}
    </div>
  </div>
</section>

<section class="secao secao-clara" aria-labelledby="tabela-titulo">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Lado a lado</p>
    <h2 class="titulo-2" id="tabela-titulo">O que muda de <em>uma para a outra</em></h2>
    <div class="tabela-rolagem">
      <table class="comparativo">
        <caption class="so-leitor">Comparação entre as unidades de Marília e Garça</caption>
        <thead>
          <tr><th scope="col">&nbsp;</th>${UNIDADES.map(u => `<th scope="col">${esc(u.cidade)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          <tr><th scope="row">Endereço</th>${UNIDADES.map(u => `<td>${esc(u.enderecoLinha)}, ${esc(u.bairro)}</td>`).join('')}</tr>
          <tr><th scope="row">Referência</th>${UNIDADES.map(u => `<td>${esc(u.referencia)}</td>`).join('')}</tr>
          <tr><th scope="row">Dias</th>${UNIDADES.map(u => `<td>${esc(u.destaqueHorario)}</td>`).join('')}</tr>
          <tr><th scope="row">Horário</th>${UNIDADES.map(u => `<td>${u.horarios.map(h => `${esc(h.dias)}, ${esc(h.abre)}–${esc(h.fecha)}`).join('<br>')}</td>`).join('')}</tr>
          <tr><th scope="row">Telefone</th>${UNIDADES.map(u => `<td><a class="elo" href="tel:+${u.e164}">${esc(u.telefone)}</a></td>`).join('')}</tr>
          <tr><th scope="row">Tratamentos</th>${UNIDADES.map(() => '<td>Todos os da clínica</td>').join('')}</tr>
        </tbody>
      </table>
    </div>
    <p class="nota">
      As duas unidades realizam os mesmos tratamentos e seguem o mesmo protocolo de
      avaliação. Se a agenda de uma estiver mais cheia, a equipe informa a alternativa
      na conversa de agendamento.
    </p>
  </div>
</section>

${chamada(rota)}
`;

  return {
    rota,
    titulo: `Unidades em ${CIDADES} | Glamm Odontologia`,
    descricao: `Endereço, horário e telefone das unidades da Glamm Odontologia em ${CIDADES}, SP. Cada unidade tem WhatsApp próprio para agendamento.`,
    trilha: [{ nome: 'Unidades', rota: 'unidades/' }],
    corpo
  };
}

/* ------------------------------------------------------------------ */
/*  Página de unidade                                                  */
/* ------------------------------------------------------------------ */

export function paginaUnidade(u) {
  const rota = `unidades/${u.slug}/`;
  const r = raizDe(rota);
  const outra = UNIDADES.find(x => x.id !== u.id);

  /* Perguntas com resposta específica desta unidade. Existem para a busca
     local e para o assistente de IA responder "que horas abre em Garça" sem
     misturar as duas unidades, que é o erro do site atual. */
  const duvidasLocais = [
    {
      q: `Qual é o endereço da Glamm Odontologia em ${u.cidade}?`,
      r: `${u.enderecoCompleto}, ${u.referencia}.`
    },
    {
      q: `Que horas a unidade de ${u.cidade} abre?`,
      r: `${u.horarios.map(h => `${h.dias}, das ${h.abre} às ${h.fecha}`).join('. ')}. ${u.fechado}`
    },
    {
      q: `Qual é o telefone da unidade de ${u.cidade}?`,
      r: `${u.telefone}. O mesmo número atende por WhatsApp, e é por ele que o agendamento é feito. A unidade de ${outra.cidade} tem número próprio, diferente deste.`
    },
    {
      q: `A unidade de ${u.cidade} atende por convênio?`,
      r: 'Não. O atendimento nas duas unidades é particular.'
    }
  ];

  const corpo = `
<header class="cabecalho cabecalho-unidade">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">${esc(u.cidade)} &middot; ${esc(u.uf)}</p>
    <h1 class="titulo-1">Dentista em <em>${esc(u.cidade)}</em></h1>
    <p class="resposta">
      A Glamm Odontologia em ${esc(u.cidade)} fica na ${esc(u.enderecoLinha)}, no bairro
      ${esc(u.bairro)}, ${esc(u.referencia)}. Atende ${esc(u.destaqueHorario.toLowerCase())}
      e o agendamento é feito pelo WhatsApp ${esc(u.telefone)}.
    </p>
    <div class="capa-acoes">
      ${botaoAgendar(u)}
      <a class="botao botao-vazado" href="${u.mapa}" rel="noopener noreferrer nofollow" target="_blank">
        ${icone('bussola', { tamanho: 18 })}<span>Abrir no mapa</span>
      </a>
    </div>
  </div>
</header>

<section class="secao secao-topo" aria-labelledby="ficha-titulo">
  <div class="faixa faixa-estreita">
    <h2 class="so-leitor" id="ficha-titulo">Ficha da unidade</h2>
    <div class="ficha">
      <div class="ficha-bloco">
        <h3 class="titulo-3">${icone('pin', { tamanho: 18 })} Endereço</h3>
        <address class="prosa">${esc(u.logradouro)}, ${esc(u.numero)}<br>
          ${esc(u.bairro)}, ${esc(u.cidade)} ${esc(u.uf)}<br>
          CEP ${esc(u.cep)}</address>
        <p class="nota">${esc(u.comoChegar)}</p>
      </div>
      <div class="ficha-bloco">
        <h3 class="titulo-3">${icone('relogio', { tamanho: 18 })} Horário</h3>
        ${tabelaHorario(u)}
      </div>
      <div class="ficha-bloco">
        <h3 class="titulo-3">${icone('telefone', { tamanho: 18 })} Contato</h3>
        <p class="prosa"><a class="elo" href="tel:+${u.e164}">${esc(u.telefone)}</a><br>
          <span class="nota">O mesmo número atende por WhatsApp.</span></p>
        <p class="prosa"><a class="elo" href="${u.whatsapp}" rel="noopener noreferrer" target="_blank">Abrir a conversa no WhatsApp</a></p>
        <p class="nota">A unidade de ${esc(outra.cidade)} tem número próprio,
          ${esc(outra.telefone)}. <a class="elo" href="${r}unidades/${outra.slug}/">Ver a unidade de ${esc(outra.cidade)}</a>.</p>
      </div>
    </div>
  </div>
</section>

<section class="secao secao-clara" aria-labelledby="trat-unidade-titulo">
  <div class="faixa">
    <div class="secao-cabeca">
      <div>
        <p class="rotulo rotulo-ouro">Nesta unidade</p>
        <h2 class="titulo-2" id="trat-unidade-titulo">Tratamentos em <em>${esc(u.cidade)}</em></h2>
      </div>
      <p class="secao-texto">
        Todos os tratamentos da clínica são realizados nas duas unidades. A avaliação
        define o que se aplica ao seu caso e em que ordem.
      </p>
    </div>
    <div class="grade-tratamentos">
      ${TRATAMENTOS.map(t => cartaoTratamento(t, r)).join('\n      ')}
    </div>
  </div>
</section>

${secaoDuvidas(duvidasLocais, r, { titulo: `Dúvidas sobre a unidade de ${u.cidade}`, id: 'duvidas' })}

<section class="secao secao-clara" aria-labelledby="outra-titulo">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">A outra unidade</p>
    <h2 class="titulo-2" id="outra-titulo">Também atendemos em <em>${esc(outra.cidade)}</em></h2>
    <div class="grade-unidades grade-unidades-1">
      ${cartaoUnidade(outra, r)}
    </div>
  </div>
</section>

${chamada(rota, { titulo: `Agende em ${u.cidade}` })}
`;

  return {
    rota,
    titulo: `Dentista em ${u.cidade} | Glamm Odontologia ${u.cidade} SP`,
    descricao: `Clínica odontológica em ${u.cidade}, SP: ${u.enderecoLinha}, ${u.bairro}. ${u.horarios.map(h => `${h.dias}, ${h.abre} às ${h.fecha}`).join('. ')}. Agendamento por WhatsApp.`,
    trilha: [
      { nome: 'Unidades', rota: 'unidades/' },
      { nome: u.cidade, rota }
    ],
    corpo,
    /* Faz o botão do topo desta página ser o WhatsApp DESTA unidade. */
    unidade: u,
    ldExtra: [
      {
        '@type': ['MedicalWebPage', 'WebPage'],
        '@id': `${urlCanonica(rota)}#pagina`,
        name: u.nome,
        url: urlCanonica(rota),
        description: `Endereço, horário e telefone da Glamm Odontologia em ${u.cidade}, ${u.uf}.`,
        inLanguage: CLINICA.lang,
        isPartOf: { '@id': `${CLINICA.origem}/#site` },
        /* Sem isto, os dois nós de unidade aparecem iguais nas dezoito páginas
           e nada diz qual delas é o assunto DESTA URL. */
        mainEntity: { '@id': `${CLINICA.origem}/unidades/${u.slug}/#clinica` },
        about: { '@id': `${CLINICA.origem}/unidades/${u.slug}/#clinica` },
        dateModified: PUBLICACAO.revisadoEm
      },
      faqLd(rota, duvidasLocais)
    ]
  };
}

/* ------------------------------------------------------------------ */
/*  A clínica                                                          */
/* ------------------------------------------------------------------ */

export function aClinica() {
  const rota = 'a-clinica/';
  const r = raizDe(rota);
  const f = EQUIPE[0];

  const corpo = `
<header class="cabecalho">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">A clínica</p>
    <h1 class="titulo-1">Como a Glamm Odontologia <em>trabalha</em></h1>
    <p class="resposta">
      A Glamm Odontologia é uma clínica odontológica com unidades em ${esc(CIDADES)},
      no interior de São Paulo, aberta em ${esc(String(CLINICA.desde))}. O atendimento é
      particular e começa sempre por uma consulta de avaliação, que termina com um plano
      de tratamento por escrito.
    </p>
  </div>
</header>

<section class="secao secao-topo" aria-labelledby="metodo-titulo">
  <div class="faixa retrato-grade">
    <div class="retrato-figura">
      <figure>
        <img class="retrato" src="${r}${esc(f.retrato)}" width="${f.retratoLargura}" height="${f.retratoAltura}"
             alt="${esc(f.retratoAlt)}" loading="lazy" decoding="async">
        <figcaption class="retrato-legenda">
          <strong>${esc(f.nome)}</strong>
          <span>${esc(f.papel)}</span>
          <span class="retrato-cro">${conf(f.cro && `CRO-SP ${f.cro}`, 'inscrição no CRO')}</span>
        </figcaption>
      </figure>
    </div>
    <div class="retrato-texto">
      <h2 class="titulo-2" id="metodo-titulo">Nada é executado <em>antes de estar explicado</em></h2>
      <p class="prosa">
        A maior parte do medo de dentista não vem da dor: vem de não saber o que vai
        acontecer, nem por quê. É por isso que a consulta de avaliação existe como etapa
        própria, separada da execução, e é por isso que ela termina com um documento em
        vez de terminar com um orçamento verbal.
      </p>
      <p class="prosa">
        Quando ajuda a entender, a câmera intraoral mostra na tela o que está sendo
        examinado. Ver a imagem muda a natureza da conversa: o plano deixa de ser uma
        lista de procedimentos e passa a ser uma sequência com motivo visível para cada
        item.
      </p>
      <ul class="compromissos">
        ${COMPROMISSOS.map(c => `<li>
          <span class="compromisso-ico" aria-hidden="true">${icone('check', { tamanho: 15 })}</span>
          <strong>${esc(c.h)}</strong>
          <span>${esc(c.p)}</span>
        </li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</section>

<section class="secao secao-escura" aria-labelledby="consulta-titulo">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro-claro">A avaliação</p>
    <h2 class="titulo-2" id="consulta-titulo">A consulta que <em>vem antes de tudo</em></h2>
    <p class="prosa">
      Leva ${esc(CONSULTA_DURACAO)} e segue sempre a mesma ordem: conversa sobre o que
      levou você até lá, exame clínico com imagem quando ajuda, explicação com a imagem à
      vista e um plano de tratamento por escrito. Nada é executado nessa consulta, e é de
      propósito: executar antes de examinar é o que produz retrabalho.
    </p>
    <p class="mais"><a class="elo elo-seta" href="${r}primeira-consulta/">A primeira consulta, passo a passo ${icone('seta', { tamanho: 15 })}</a></p>
  </div>
</section>

<section class="secao" aria-labelledby="etica-titulo">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Transparência</p>
    <h2 class="titulo-2" id="etica-titulo">O que este site <em>não faz</em>, e por quê</h2>
    <p class="prosa">
      Odontologia é profissão regulamentada, e a publicidade odontológica tem regras
      próprias, no Código de Ética Odontológica. Algumas coisas que se espera encontrar
      no site de uma clínica não estão aqui, e a ausência é deliberada.
    </p>
    <dl class="regras">
      <div>
        <dt>Não há foto de antes e depois</dt>
        <dd>A Resolução CFO-196/2019 reserva a divulgação de imagem de resultado ao
          cirurgião-dentista que executou o procedimento, com consentimento do paciente.
          Uma clínica, como pessoa jurídica, não pode publicar esse tipo de imagem.</dd>
      </div>
      <div>
        <dt>Não há preço nem condição de pagamento</dt>
        <dd>O art. 44 do Código de Ética veda anunciar preços, serviços gratuitos e
          modalidades de pagamento. O valor do tratamento é apresentado na avaliação,
          junto com o plano, porque depende do que o exame encontra.</dd>
      </div>
      <div>
        <dt>Não há depoimento nem nota de avaliação</dt>
        <dd>Reproduzir depoimento de paciente e nota de avaliação em peça publicitária
          também é vedado. O que está no lugar disso são os compromissos acima, que são
          verificáveis na própria consulta.</dd>
      </div>
      <div>
        <dt>Não há promessa de resultado</dt>
        <dd>Resultado depende do caso, do organismo e do acompanhamento. O que este site
          descreve é o que cada procedimento é e o que a avaliação precisa checar antes.</dd>
      </div>
    </dl>
    <p class="nota">
      Referências: Código de Ética Odontológica (Resolução CFO-118/2012), artigos 43 e 44,
      e Resolução CFO-196/2019.
    </p>
  </div>
</section>

${chamada(rota)}
`;

  return {
    rota,
    titulo: `A clínica | Glamm Odontologia em ${CIDADES}`,
    descricao: `Como a Glamm Odontologia trabalha: avaliação com plano de tratamento por escrito, imagem à vista na explicação e alternativas apresentadas. Unidades em ${CIDADES}, SP.`,
    trilha: [{ nome: 'A clínica', rota }],
    corpo,
    ldExtra: [{
      '@type': 'AboutPage',
      '@id': `${urlCanonica(rota)}#pagina`,
      name: 'A clínica',
      url: urlCanonica(rota),
      isPartOf: { '@id': `${CLINICA.origem}/#site` },
      about: { '@id': `${CLINICA.origem}/#organizacao` }
    }]
  };
}

/* ------------------------------------------------------------------ */
/*  Equipe                                                             */
/* ------------------------------------------------------------------ */

export function equipe() {
  const rota = 'equipe/';
  const r = raizDe(rota);
  const f = EQUIPE[0];

  /* A condição é o TAMANHO DA RELAÇÃO, e não o modo de publicação. Se
     dependesse do modo, a virada para produção apagaria este bloco e deixaria
     vazia justamente a seção que existe por causa do art. 43 §2º. */
  const pendencia = EQUIPE.length === 1
    ? `<div class="aviso">
        <h3 class="titulo-3">Esta página está incompleta de propósito</h3>
        <p>A clínica tem mais profissionais em atendimento. Falta aqui o que não se
          inventa: ${esc(EQUIPE_PENDENTE)}</p>
        <p>Isso não é detalhe de apresentação. O art. 43 §2º do Código de Ética Odontológica
          só permite que uma clínica anuncie especialidades se tiver profissional inscrito
          naquela especialidade <strong>e</strong> publicar a relação desses profissionais com
          as respectivas qualificações. Publicar esta lista é o que devolve à clínica o
          direito de dizer que cada área é conduzida por quem se especializou nela.</p>
      </div>`
    : '';

  const corpo = `
<header class="cabecalho">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Equipe</p>
    <h1 class="titulo-1">Quem <em>atende você</em></h1>
    <p class="resposta">
      A responsável técnica da Glamm Odontologia é a ${esc(f.nome)}, cirurgiã-dentista
      e fundadora da clínica. ${esc(f.formacao)}
    </p>
  </div>
</header>

<section class="secao secao-topo" aria-labelledby="fundadora-titulo">
  <div class="faixa retrato-grade">
    <div class="retrato-figura">
      <figure>
        <img class="retrato" src="${r}${esc(f.retrato)}" width="${f.retratoLargura}" height="${f.retratoAltura}"
             alt="${esc(f.retratoAlt)}" loading="lazy" decoding="async">
      </figure>
    </div>
    <div class="retrato-texto">
      <h2 class="titulo-2" id="fundadora-titulo">${esc(f.nome)}</h2>
      <p class="papel">${esc(f.papel)}</p>
      <dl class="dados dados-largo">
        <div><dt>Nome completo</dt><dd>${esc(f.nomeCompleto)}</dd></div>
        <div><dt>Inscrição no Conselho</dt><dd>${conf(f.cro && `CRO-SP ${f.cro}`, 'CRO-SP')}</dd></div>
        <div><dt>Formação</dt><dd>${esc(f.formacao)}</dd></div>
        <div><dt>${esc(f.especialidadeRotulo)}</dt><dd>${conf(f.especialidade, 'especialidade')}</dd></div>
      </dl>
      <p class="prosa">
        A clínica aparecia no Google e no domínio anterior sob o nome
        ${esc(CLINICA.nomeAnterior)}. É a mesma clínica: hoje o nome público é
        ${esc(CLINICA.nome)}, nas duas unidades.
      </p>
    </div>
  </div>
</section>

<section class="secao secao-clara" aria-labelledby="equipe-titulo">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Demais profissionais</p>
    <h2 class="titulo-2" id="equipe-titulo">A relação completa <em>está em construção</em></h2>
    ${pendencia}
  </div>
</section>

${chamada(rota)}
`;

  const person = {
    '@type': 'Person',
    '@id': `${urlCanonica(rota)}#fundadora`,
    name: f.nome,
    alternateName: f.nomeCompleto,
    jobTitle: f.papel,
    worksFor: { '@id': `${CLINICA.origem}/#organizacao` },
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Universidade de Marília (UNIMAR)' },
    image: `${CLINICA.origem}/assets/img/fundadora.webp`
  };
  if (f.cro) { person.identifier = `CRO-SP ${f.cro}`; }

  return {
    rota,
    titulo: `Equipe | Glamm Odontologia em ${CIDADES}`,
    descricao: `Quem atende na Glamm Odontologia: a cirurgiã-dentista fundadora e responsável técnica, com formação e inscrição no Conselho Regional de Odontologia.`,
    trilha: [{ nome: 'Equipe', rota }],
    corpo,
    ldExtra: [person]
  };
}

/* ------------------------------------------------------------------ */
/*  Dúvidas                                                            */
/* ------------------------------------------------------------------ */

export function duvidas() {
  const rota = 'duvidas/';
  const r = raizDe(rota);

  /* Todas as perguntas do site num lugar só: as gerais e as de cada
     tratamento, agrupadas. É a página que assistente de IA lê melhor,
     porque cada bloco é pergunta e resposta em texto corrido. */
  const porTratamento = TRATAMENTOS.map(t => `
    <section class="grupo-duvidas" aria-labelledby="d-${esc(t.slug)}">
      <h3 class="titulo-3" id="d-${esc(t.slug)}">${esc(t.nome)}</h3>
      ${acordeao(t.duvidas, { nivel: 'h4' })}
      <p class="mais"><a class="elo elo-seta" href="${r}tratamentos/${t.slug}/">Sobre ${esc(t.nome.toLowerCase())} ${icone('seta', { tamanho: 15 })}</a></p>
    </section>`).join('');

  /* O FAQPage desta página traz SÓ as perguntas gerais. As de tratamento já
     são FAQPage na página de cada tratamento, e repetir a mesma marcação em
     duas URLs é o que a orientação do Google veda expressamente. Aqui elas
     continuam em texto, indexáveis e legíveis, com link para a origem. */
  const todas = DUVIDAS;

  const corpo = `
<header class="cabecalho">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Dúvidas frequentes</p>
    <h1 class="titulo-1">Perguntas que <em>chegam antes da consulta</em></h1>
    <p class="resposta">
      As respostas abaixo valem para as duas unidades. O atendimento é particular, a
      consulta de avaliação leva ${esc(CONSULTA_DURACAO)} e o agendamento é feito pelo
      WhatsApp da unidade escolhida.
    </p>
  </div>
</header>

<section class="secao secao-topo" aria-labelledby="gerais-titulo">
  <div class="faixa faixa-estreita">
    <h2 class="titulo-2" id="gerais-titulo">Sobre a clínica <em>e o atendimento</em></h2>
    ${acordeao(DUVIDAS)}
  </div>
</section>

<section class="secao secao-clara" aria-labelledby="portrat-titulo">
  <div class="faixa faixa-estreita">
    <h2 class="titulo-2" id="portrat-titulo">Sobre <em>cada tratamento</em></h2>
    ${porTratamento}
  </div>
</section>

${chamada(rota, { titulo: 'Ficou uma pergunta de fora?', texto: 'Escreva no WhatsApp da unidade mais perto de você. A equipe responde e, se o caso pedir avaliação presencial, já agenda.' })}
`;

  return {
    rota,
    titulo: `Dúvidas frequentes | Glamm Odontologia em ${CIDADES}`,
    descricao: `Convênio, duração da primeira consulta, medo de dentista, diferença entre as unidades e dúvidas sobre cada tratamento na Glamm Odontologia, ${CIDADES}, SP.`,
    trilha: [{ nome: 'Dúvidas', rota }],
    corpo,
    ldExtra: [faqLd(rota, todas)]
  };
}

/* ------------------------------------------------------------------ */
/*  Contato                                                            */
/* ------------------------------------------------------------------ */

export function contato() {
  const rota = 'contato/';
  const r = raizDe(rota);

  const corpo = `
<header class="cabecalho">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Contato</p>
    <h1 class="titulo-1">Falar com a <em>Glamm Odontologia</em></h1>
    <p class="resposta">
      O agendamento é feito pelo WhatsApp da unidade em que você quer ser atendido.
      Marília atende no ${esc(MARILIA.telefone)} e Garça no ${esc(GARCA.telefone)}.
      São números diferentes, um para cada endereço.
    </p>
  </div>
</header>

<section class="secao secao-topo" aria-labelledby="canais-titulo">
  <div class="faixa">
    <h2 class="so-leitor" id="canais-titulo">Canais de atendimento</h2>
    <div class="grade-unidades">
      ${UNIDADES.map(u => cartaoUnidade(u, r)).join('\n      ')}
    </div>
  </div>
</section>

<section class="secao secao-clara" aria-labelledby="como-titulo">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Como agendar</p>
    <h2 class="titulo-2" id="como-titulo">Três coisas que <em>agilizam a conversa</em></h2>
    <ol class="passos passos-claros">
      <li class="passo">
        <span class="passo-n" aria-hidden="true">01</span>
        <h3 class="passo-titulo">Diga a cidade</h3>
        <p class="passo-texto">Se você usar o botão de agendamento deste site, a mensagem
          já vai escrita com a unidade escolhida.</p>
      </li>
      <li class="passo">
        <span class="passo-n" aria-hidden="true">02</span>
        <h3 class="passo-titulo">Descreva o que incomoda</h3>
        <p class="passo-texto">Uma frase basta. Dor, estética, revisão, algo que outro
          profissional apontou: isso já orienta o tempo reservado para a consulta.</p>
      </li>
      <li class="passo">
        <span class="passo-n" aria-hidden="true">03</span>
        <h3 class="passo-titulo">Avise se tem medo de dentista</h3>
        <p class="passo-texto">Não é detalhe. A equipe reserva a consulta sabendo disso
          e conduz o atendimento no seu ritmo.</p>
      </li>
    </ol>
    <div class="aviso aviso-urgencia">
      <h3 class="titulo-3">Urgência não espera por agenda</h3>
      <p>Dor forte, inchaço no rosto, febre e trauma com sangramento que não para:
        procure um serviço de pronto atendimento, e não a agenda da clínica.</p>
      <p>Dente permanente que caiu por trauma é urgência de minutos. Segure o dente pela
        coroa, nunca pela raiz, não esfregue, guarde em leite ou soro fisiológico e procure
        atendimento imediatamente. O tempo até o reimplante é o que decide o resultado.</p>
    </div>
  </div>
</section>

<section class="secao" aria-labelledby="dados-titulo">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Dados da empresa</p>
    <h2 class="titulo-2" id="dados-titulo">Identificação</h2>
    <dl class="dados dados-largo">
      <div><dt>Razão social</dt><dd>${esc(CLINICA.razaoSocial)}</dd></div>
      <div><dt>Nome fantasia</dt><dd>${esc(CLINICA.nome)}</dd></div>
      <div><dt>CNPJ, unidade de Marília</dt><dd>${esc(CLINICA.cnpjMatriz)}</dd></div>
      <div><dt>CNPJ, unidade de Garça</dt><dd>${esc(CLINICA.cnpjFilial)}</dd></div>
      <div><dt>Inscrição da clínica no CRO</dt><dd>${conf(CLINICA.croClinica && `CRO-SP ${CLINICA.croClinica}`, 'CRO-SP')}</dd></div>
      <div><dt>Responsável técnica</dt><dd>${esc(CLINICA.responsavelTecnica)}</dd></div>
      <div><dt>Inscrição da responsável técnica</dt><dd>${conf(CLINICA.croResponsavel && `CRO-SP ${CLINICA.croResponsavel}`, 'CRO-SP')}</dd></div>
      <div><dt>Atividade</dt><dd>${esc(CLINICA.cnae)} — ${esc(CLINICA.cnaeDescricao)}</dd></div>
      <div><dt>Instagram</dt><dd><a class="elo" href="${CLINICA.instagramUrl}" rel="noopener noreferrer nofollow" target="_blank">@${esc(CLINICA.instagram)}</a></dd></div>
    </dl>
  </div>
</section>
`;

  return {
    rota,
    titulo: `Contato e agendamento | Glamm Odontologia ${CIDADES}`,
    descricao: `Telefone e WhatsApp de cada unidade da Glamm Odontologia: ${MARILIA.telefone} em Marília e ${GARCA.telefone} em Garça. Endereços, horários e como agendar.`,
    trilha: [{ nome: 'Contato', rota }],
    corpo,
    ldExtra: [{
      '@type': 'ContactPage',
      '@id': `${urlCanonica(rota)}#pagina`,
      name: 'Contato',
      url: urlCanonica(rota),
      isPartOf: { '@id': `${CLINICA.origem}/#site` },
      about: { '@id': `${CLINICA.origem}/#organizacao` }
    }]
  };
}


/* ------------------------------------------------------------------ */
/*  Primeira consulta                                                  */
/*                                                                     */
/*  Existia como seção da home e de /a-clinica/. Virou URL porque é a   */
/*  resposta mais citável do site: "o que acontece na primeira consulta */
/*  no dentista" é pergunta inteira, e conteúdo que responde uma        */
/*  pergunta inteira é o que assistente de IA cita e o que a busca de   */
/*  cauda longa procura. Em /a-clinica/ ficou o resumo e o link.        */
/* ------------------------------------------------------------------ */

export function primeiraConsulta() {
  const rota = 'primeira-consulta/';
  const r = raizDe(rota);

  const duvidasLocais = [
    {
      q: 'O que levar na primeira consulta ao dentista?',
      r: 'Um documento com foto. Se você já tem radiografias, documentação ortodôntica ou um plano de tratamento feito em outro lugar, leve também: pode evitar a repetição de exames e ajuda a entender o histórico. Leve também a lista de medicamentos que você usa.'
    },
    {
      q: 'A primeira consulta já resolve o problema?',
      r: 'Em geral não, e isso é de propósito. A primeira consulta é de avaliação: ela existe para descobrir o que está acontecendo, em que ordem tratar e o que é urgente. Executar antes de examinar é o que produz retrabalho. A exceção é a urgência, em que o alívio vem primeiro.'
    },
    {
      q: 'Quanto tempo dura a consulta de avaliação?',
      r: `Em média, ${CONSULTA_DURACAO}. É o tempo de examinar, entender o que levou você até lá, responder o que você quiser perguntar e apresentar um plano com a sequência do que precisa ser feito.`
    },
    {
      q: 'Tenho medo de dentista. O que muda na consulta?',
      r: 'Diga isso já na mensagem de agendamento. A equipe reserva a consulta sabendo disso, o que vai acontecer é dito antes de acontecer, e o atendimento para quando você pede para parar.'
    }
  ];

  const corpo = `
<header class="cabecalho">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Primeira consulta</p>
    <h1 class="titulo-1">O que acontece na <em class="titulo-quebra">consulta de avaliação</em></h1>
    <p class="resposta">
      A primeira consulta na Glamm Odontologia é de avaliação, não de execução. Leva
      ${esc(CONSULTA_DURACAO)} e segue sempre a mesma ordem: conversa, exame, explicação
      com a imagem à vista e um plano de tratamento por escrito, com o que é urgente
      separado do que pode esperar.
    </p>
    <div class="capa-acoes">
      ${botaoAgendar(MARILIA)}
      ${botaoAgendar(GARCA, { solido: false })}
    </div>
  </div>
</header>

<section class="secao secao-escura secao-topo" aria-labelledby="passos-titulo">
  <div class="faixa">
    <h2 class="so-leitor" id="passos-titulo">Os quatro passos da avaliação</h2>
    <ol class="passos">
      ${CONSULTA.map(pa => `<li class="passo">
        <span class="passo-n" aria-hidden="true">${esc(pa.n)}</span>
        <h3 class="passo-titulo">${esc(pa.h)}</h3>
        <p class="passo-texto">${esc(pa.p)}</p>
      </li>`).join('\n      ')}
    </ol>
  </div>
</section>

<section class="secao" aria-labelledby="levar-titulo">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Antes de ir</p>
    <h2 class="titulo-2" id="levar-titulo">O que levar, e o que <em>dizer</em></h2>
    <div class="artigo">
      <h3 class="titulo-3">Documento e histórico</h3>
      <p class="prosa">Leve um documento com foto. Se existirem radiografias, documentação
        ortodôntica ou um plano feito em outro consultório, leve também: repetir exame que
        já existe custa tempo e, às vezes, radiação à toa.</p>

      <h3 class="titulo-3">Medicamentos e condições de saúde</h3>
      <p class="prosa">Anticoagulante, bifosfonato, imunossupressor, diabetes, hipertensão,
        gravidez e alergia a medicamento mudam a condução do atendimento e, em alguns
        casos, a ordem do tratamento. Não é burocracia: é o que evita intercorrência.</p>

      <h3 class="titulo-3">O que incomoda, em uma frase</h3>
      <p class="prosa">Dor, estética, revisão, algo que outro profissional apontou. Uma
        frase basta, e ela já orienta o tempo reservado para a consulta.</p>

      <h3 class="titulo-3">Medo de dentista</h3>
      <p class="prosa">Avise na mensagem de agendamento. O atendimento é conduzido no seu
        ritmo, com o que vai acontecer dito antes de acontecer, e para quando você pede
        para parar.</p>
    </div>
    <p class="mais"><a class="elo elo-seta" href="${r}a-clinica/">Como a clínica trabalha ${icone('seta', { tamanho: 15 })}</a></p>
  </div>
</section>

${secaoDuvidas(duvidasLocais, r, { titulo: 'Dúvidas sobre a primeira consulta', id: 'duvidas' })}

${chamada(rota, { titulo: 'Agende a avaliação' })}
`;

  return {
    rota,
    titulo: 'Como é a primeira consulta | Glamm Odontologia',
    descricao: `A consulta de avaliação na Glamm Odontologia, em ${CIDADES}: quanto tempo leva, o que levar, o que é examinado e por que ela termina com um plano por escrito.`,
    trilha: [{ nome: 'Primeira consulta', rota }],
    corpo,
    ldExtra: [
      {
        '@type': ['MedicalWebPage', 'WebPage'],
        '@id': `${urlCanonica(rota)}#pagina`,
        name: 'A primeira consulta',
        url: urlCanonica(rota),
        inLanguage: CLINICA.lang,
        isPartOf: { '@id': `${CLINICA.origem}/#site` },
        about: { '@id': `${CLINICA.origem}/#organizacao` },
        dateModified: PUBLICACAO.revisadoEm
      },
      faqLd(rota, duvidasLocais)
    ]
  };
}

/* ------------------------------------------------------------------ */
/*  Urgência                                                           */
/*                                                                     */
/*  Página de utilidade, e é o que ela é: informação de serviço e       */
/*  primeiros socorros, sem diagnóstico e sem indicação a distância.    */
/*  Também é a consulta de maior intenção e menor concorrência que a    */
/*  clínica pode disputar honestamente — e Garça abre aos sábados.      */
/* ------------------------------------------------------------------ */

export function urgencia() {
  const rota = 'urgencia/';
  const r = raizDe(rota);

  const duvidasLocais = [
    {
      q: 'O que é urgência odontológica?',
      r: 'É a situação que não pode esperar por agenda: dor forte que não cede, inchaço no rosto, febre junto com dor de dente, sangramento que não para depois de um trauma e dente permanente que foi arrancado por pancada. Nesses casos a orientação é procurar um serviço de pronto atendimento imediatamente.'
    },
    {
      q: 'Meu dente caiu inteiro depois de uma pancada. O que faço?',
      r: 'É urgência de minutos, e o tempo até o reimplante é o que decide o resultado. Segure o dente pela coroa, nunca pela raiz. Não esfregue nem tente limpar com escova. Se estiver sujo, lave rapidamente em água corrente ou soro. Guarde em leite ou soro fisiológico, ou na saliva, e procure atendimento imediatamente. Dente de leite não é reimplantado: leve a criança para avaliação mesmo assim.'
    },
    {
      q: 'Estou com o rosto inchado. Posso esperar até amanhã?',
      r: 'Não. Inchaço no rosto, ainda mais com febre ou dificuldade para abrir a boca ou engolir, é sinal de infecção que pode progredir rápido. Procure um serviço de pronto atendimento no mesmo dia, mesmo que a dor tenha diminuído.'
    },
    {
      q: 'A clínica encaixa urgência na agenda?',
      r: 'Descreva a situação no WhatsApp da unidade mais próxima e a equipe orienta o encaixe. Isso vale para o que pode ser atendido em consultório, e não substitui pronto atendimento nos casos acima.'
    },
    {
      q: 'Quebrei parte do dente e não está doendo. É urgência?',
      r: 'Fratura sem dor não costuma ser urgência de minutos, mas é motivo para consulta rápida: a estrutura exposta pode evoluir para sensibilidade, infiltração ou comprometimento da polpa. Guarde o pedaço quebrado, se houver, e agende.'
    }
  ];

  const corpo = `
<header class="cabecalho">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Urgência</p>
    <h1 class="titulo-1">Urgência odontológica em <em>${esc(CIDADES)}</em></h1>
    <p class="resposta">
      Dor forte que não cede, inchaço no rosto, febre junto com dor de dente, sangramento
      que não para e dente permanente arrancado por trauma <strong>não devem esperar por
      agenda</strong>: procure um serviço de pronto atendimento. Para o que pode ser
      atendido em consultório, descreva a situação no WhatsApp da unidade mais próxima e a
      equipe orienta o encaixe.
    </p>
    <div class="capa-acoes">
      ${botaoAgendar(MARILIA, { assunto: 'uma urgência' })}
      ${botaoAgendar(GARCA, { assunto: 'uma urgência', solido: false })}
    </div>
  </div>
</header>

<section class="secao secao-topo" aria-labelledby="agora-titulo">
  <div class="faixa faixa-estreita">
    <div class="aviso aviso-urgencia">
      <h2 class="titulo-3" id="agora-titulo">Procure pronto atendimento agora se houver</h2>
      <ul class="lista-alerta">
        <li>dor forte que não cede com o analgésico de sempre;</li>
        <li>inchaço no rosto, no pescoço ou embaixo do queixo;</li>
        <li>febre junto com dor de dente;</li>
        <li>dificuldade para abrir a boca, engolir ou respirar;</li>
        <li>sangramento que não para depois de dez minutos de compressão;</li>
        <li>trauma na face com corte, dente deslocado ou dente arrancado.</li>
      </ul>
    </div>
  </div>
</section>

<section class="secao secao-clara" aria-labelledby="casos-titulo">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Caso a caso</p>
    <h2 class="titulo-2" id="casos-titulo">O que fazer <em>enquanto chega o atendimento</em></h2>
    <div class="artigo">
      <h3 class="titulo-3">Dente permanente arrancado por pancada</h3>
      <p class="prosa">É a única situação odontológica em que os minutos contam de verdade.
        Segure o dente pela coroa, <strong>nunca pela raiz</strong>. Não esfregue e não use
        escova: a superfície da raiz precisa continuar viva. Se estiver sujo, lave rápido em
        água corrente ou soro. Guarde em leite, soro fisiológico ou na própria saliva e
        procure atendimento imediatamente. Dente de leite não é reimplantado, mas a criança
        precisa ser avaliada do mesmo jeito.</p>

      <h3 class="titulo-3">Dor de dente forte</h3>
      <p class="prosa">Compressa fria por fora, cabeça mais alta ao deitar, e o analgésico
        que você já usa por orientação médica. Não coloque comprimido, álcool nem qualquer
        substância sobre a gengiva: isso queima o tecido e piora o quadro. Dor que acorda à
        noite ou que não cede pede avaliação sem esperar.</p>

      <h3 class="titulo-3">Inchaço no rosto</h3>
      <p class="prosa">Inchaço é sinal de infecção, e infecção na face progride rápido.
        Procure pronto atendimento no mesmo dia, mesmo que a dor tenha diminuído — a dor
        que some depois de um período muito forte pode significar que a polpa morreu, e não
        que o problema passou.</p>

      <h3 class="titulo-3">Fratura de dente</h3>
      <p class="prosa">Guarde o pedaço quebrado em água ou leite: às vezes ele volta ao
        lugar. Se houver borda cortante, um pedaço de cera ortodôntica ou de goma de mascar
        sem açúcar protege a língua e a bochecha até a consulta.</p>

      <h3 class="titulo-3">Sangramento depois de extração</h3>
      <p class="prosa">Morda uma gaze limpa, dobrada, sobre o local, com força constante,
        por dez minutos sem verificar no meio. Se depois disso o sangramento continuar em
        fluxo, procure atendimento.</p>
    </div>
    <p class="nota">
      Esta página é informativa e não substitui avaliação profissional. Ela não permite
      diagnóstico a distância: descreve o que fazer no caminho até o atendimento.
    </p>
  </div>
</section>

<section class="secao" aria-labelledby="horario-titulo">
  <div class="faixa">
    <div class="secao-cabeca">
      <div>
        <p class="rotulo rotulo-ouro">Horário das unidades</p>
        <h2 class="titulo-2" id="horario-titulo">Quando a clínica <em>está aberta</em></h2>
      </div>
      <p class="secao-texto">
        Garça abre até as 20h de segunda a sexta e atende aos sábados até as 14h. Marília
        atende de segunda a sexta. Fora desses horários, a orientação é pronto atendimento.
      </p>
    </div>
    <div class="grade-unidades">
      ${UNIDADES.map(u => cartaoUnidade(u, r, { assunto: 'uma urgência' })).join('\n      ')}
    </div>
  </div>
</section>

${secaoDuvidas(duvidasLocais, r, { titulo: 'Dúvidas sobre urgência', id: 'duvidas' })}

${chamada(rota, { titulo: 'Falar com a clínica', texto: 'Se o caso pode ser atendido em consultório, descreva a situação no WhatsApp da unidade mais próxima. A equipe orienta o encaixe na agenda.' })}
`;

  return {
    rota,
    titulo: `Urgência odontológica em ${CIDADES} | Glamm Odontologia`,
    descricao: `O que é urgência odontológica, o que fazer com dente arrancado, dor forte, inchaço no rosto e fratura, e o horário das unidades em ${CIDADES}, SP.`,
    trilha: [{ nome: 'Urgência', rota }],
    corpo,
    ldExtra: [
      {
        '@type': ['MedicalWebPage', 'WebPage'],
        '@id': `${urlCanonica(rota)}#pagina`,
        name: 'Urgência odontológica',
        url: urlCanonica(rota),
        inLanguage: CLINICA.lang,
        isPartOf: { '@id': `${CLINICA.origem}/#site` },
        about: { '@id': `${CLINICA.origem}/#organizacao` },
        audience: { '@type': 'Patient' },
        dateModified: PUBLICACAO.revisadoEm
      },
      faqLd(rota, duvidasLocais)
    ]
  };
}

/* ------------------------------------------------------------------ */
/*  Privacidade                                                        */
/* ------------------------------------------------------------------ */

export function privacidade() {
  const rota = 'privacidade/';

  const corpo = `
<header class="cabecalho">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Privacidade</p>
    <h1 class="titulo-1">O que este site <em>faz com os seus dados</em></h1>
    <p class="resposta">
      Nada. Este site não usa cookies, não tem formulário, não roda rastreador e não
      carrega nenhum arquivo de outro domínio. Enquanto você lê estas páginas, nenhum
      dado seu sai do seu aparelho.
    </p>
  </div>
</header>

<section class="secao secao-topo">
  <div class="faixa faixa-estreita">
    <div class="artigo">
      <h2 class="titulo-3">Cookies e armazenamento</h2>
      <p class="prosa">O site não grava cookie algum. Também não usa armazenamento local
        do navegador para identificar quem visita.</p>

      <h2 class="titulo-3">Medição de audiência</h2>
      <p class="prosa">Não há Google Analytics, pixel do Facebook, pixel do Meta, mapa de
        calor nem qualquer outro rastreador. A política de segurança de conteúdo declarada
        nesta página bloqueia conexão com qualquer outro domínio: um rastreador hospedado
        em serviço externo seria recusado pelo navegador antes de rodar. Contra código
        acrescentado ao próprio site, a proteção é outra: a verificação automática do
        repositório recusa a publicação se encontrar rastreador.</p>

      <h2 class="titulo-3">Fontes, imagens e scripts</h2>
      <p class="prosa">Tudo é servido deste mesmo domínio. Não há fonte de serviço externo,
        biblioteca de CDN nem mapa embutido. O modelo tridimensional do dente é gerado no
        seu navegador, por código próprio, sem baixar arquivo de modelo.</p>

      <h2 class="titulo-3">Registros do servidor</h2>
      <p class="prosa">As páginas são hospedadas em serviço de site estático. Como todo
        servidor da internet, ele registra endereço IP e horário de acesso para entregar o
        conteúdo e se defender de abuso. Hoje esse registro fica com o provedor de
        hospedagem, e a clínica não o acessa nem o utiliza. Se isso mudar, esta página é
        atualizada antes.</p>

      <h2 class="titulo-3">Quando você clica em agendar</h2>
      <p class="prosa">Os botões de agendamento abrem uma conversa no WhatsApp, que é
        serviço de terceiro. A partir daí valem os termos e a política de privacidade do
        WhatsApp, e a conversa passa a ser tratada pela clínica como qualquer outro contato
        de paciente. O mesmo vale para os links para o Google Maps e para o Instagram.</p>
      <p class="prosa">Dois detalhes que você deve saber antes de clicar. Primeiro: nas
        páginas de tratamento, o botão já abre o WhatsApp com uma mensagem escrita que cita
        o nome do tratamento daquela página — é comodidade, mas significa que o assunto vai
        junto. <strong>Apague ou troque o texto antes de enviar, se preferir não adiantá-lo.</strong>
        Segundo: este site envia o cabeçalho <code>no-referrer</code>, então o WhatsApp não
        recebe de qual página você veio.</p>

      <h2 class="titulo-3">Dados de saúde</h2>
      <p class="prosa">Nenhum dado de saúde é coletado por este site. Informações clínicas
        só existem no prontuário, que é mantido pela clínica sob sigilo profissional, nos
        termos do Código de Ética Odontológica e da Lei Geral de Proteção de Dados.</p>

      <h2 class="titulo-3">Seus direitos</h2>
      <p class="prosa">A Lei Geral de Proteção de Dados garante a você confirmar a
        existência de tratamento dos seus dados, acessá-los, corrigi-los, pedir anonimização
        ou eliminação, e revogar consentimento. Para exercer qualquer um deles, fale com a
        clínica pelo telefone de uma das unidades, que estão no rodapé desta página.</p>

      <h2 class="titulo-3">Controlador</h2>
      <p class="prosa">${esc(CLINICA.razaoSocial)}, CNPJ ${esc(CLINICA.cnpjMatriz)},
        com unidades em ${esc(CIDADES)}, São Paulo.</p>

      <h2 class="titulo-3">Mudanças nesta página</h2>
      <p class="prosa">Se o site passar a usar qualquer recurso que colete dado, esta
        página é atualizada antes de o recurso entrar no ar. Última revisão em
        ${esc(PUBLICACAO.revisadoEm.split('-').reverse().join('/'))}.</p>
    </div>
  </div>
</section>
`;

  return {
    rota,
    titulo: 'Privacidade | Glamm Odontologia',
    descricao: 'Este site não usa cookies, não tem formulário, não roda rastreador e não carrega arquivo de outro domínio. O que acontece quando você clica em agendar.',
    trilha: [{ nome: 'Privacidade', rota }],
    corpo
  };
}

/* ------------------------------------------------------------------ */
/*  404                                                                */
/* ------------------------------------------------------------------ */

export function naoEncontrada() {
  /* A 404 é servida para QUALQUER caminho, e o navegador resolve link
     relativo contra o caminho pedido, não contra o arquivo. Um link relativo
     aqui quebra em `/qualquer/coisa/errada`. Por isso, e só aqui, os caminhos
     são absolutos, tirados do próprio endereço de publicação: no GitHub Pages
     isso vira `/glamm-odontologia-site/`, e num domínio próprio vira `/`. */
  const rota = '';
  const r = new URL(CLINICA.origem).pathname.replace(/\/*$/, '/');

  const corpo = `
<header class="cabecalho">
  <div class="faixa faixa-estreita">
    <p class="rotulo rotulo-ouro">Erro 404</p>
    <h1 class="titulo-1">Esta página <em>não existe</em></h1>
    <p class="resposta">
      O endereço pode ter mudado, ou o link pode ter vindo com um erro de digitação.
      Abaixo estão os caminhos mais procurados.
    </p>
  </div>
</header>

<section class="secao secao-topo">
  <div class="faixa">
    <div class="grade-tratamentos">
      ${TRATAMENTOS.map(t => cartaoTratamento(t, r)).join('\n      ')}
    </div>
  </div>
</section>

${chamada(rota, { titulo: 'Ou fale direto com a clínica', raiz: r })}
`;

  return {
    rota,
    raiz: r,
    arquivo: '404.html',
    /* Sem canonical: a 404 é servida em qualquer caminho, e apontar todas
       elas para a raiz faria a raiz ser indexada como página de erro. */
    canonica: false,
    titulo: 'Página não encontrada | Glamm Odontologia',
    descricao: 'A página procurada não existe neste site. Veja os tratamentos e as unidades da Glamm Odontologia em Marília e Garça.',
    trilha: [],
    corpo
  };
}

/* ------------------------------------------------------------------ */
/*  Todas as páginas                                                   */
/* ------------------------------------------------------------------ */

export function todasAsPaginas() {
  return [
    inicio(),
    hubTratamentos(),
    ...TRATAMENTOS.map(paginaTratamento),
    hubUnidades(),
    ...UNIDADES.map(paginaUnidade),
    aClinica(),
    primeiraConsulta(),
    urgencia(),
    equipe(),
    duvidas(),
    contato(),
    privacidade(),
    naoEncontrada()
  ];
}
