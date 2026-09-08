/* =========================================================================
   As páginas. São três: a página única, a de privacidade e a de erro.

   POR QUE UMA PÁGINA SÓ
   Decisão do cliente, e ela tem custo. O diagnóstico apontava a página única
   do site atual como problema, e com ela vão embora as URLs por tratamento e
   por cidade, que são as que pegam busca de cauda longa. O que segura o
   prejuízo:

   - todo o conteúdo continua aqui, inclusive o detalhe de cada tratamento,
     que vive dentro de um `<details>` e portanto está no HTML, indexável e
     legível por assistente de IA;
   - cada seção e cada tratamento têm âncora própria, então dá para mandar
     alguém direto para `#implante-e-protese` ou `#garca`;
   - o JSON-LD descreve as duas unidades e os sete tratamentos como entidades
     com `@id` próprio, que é o que permite montar a entidade do negócio.

   O conteúdo continua separado por tratamento em `dados.mjs`. Se as páginas
   voltarem um dia, é só voltar a gerá-las.
   ========================================================================= */

import {
  CLINICA, UNIDADES, TRATAMENTOS, DUVIDAS, EQUIPE, EQUIPE_PENDENTE, MENU
} from './dados.mjs';
import { esc, ICO, botao, botoesUnidades, simbolo } from './chrome.mjs';

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

const secao = ({ id, eyebrow, titulo, intro, corpo, classe = '' }) => `
<section class="sec ${classe}"${id ? ` id="${id}"` : ''}>
  <div class="env">
    ${eyebrow || titulo ? `<header class="sec-cabeca">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      ${titulo ? `<h2>${titulo}</h2>` : ''}
      ${intro ? `<p class="sec-intro">${intro}</p>` : ''}
    </header>` : ''}
    ${corpo}
  </div>
</section>`;

const hora = (h) => h.replace(':', 'h');

const cartaoUnidade = (u) => `
<article class="unid" id="${esc(u.slug)}">
  <h3 class="unid-nome">${esc(u.cidade)}</h3>
  <p class="unid-ref">${esc(u.referencia)}</p>
  <address class="unid-end">
    <span class="unid-rua">${esc(u.enderecoLinha)}</span><br>
    ${esc(u.bairro)}, ${esc(u.cidade)} ${esc(u.uf)}<br>
    CEP ${esc(u.cep)}
  </address>
  <dl class="unid-horario">
    ${u.horarios.map(h => `<div><dt>${esc(h.dias)}</dt><dd>${esc(hora(h.abre))} às ${esc(hora(h.fecha))}</dd></div>`).join('')}
  </dl>
  <p class="unid-fechado">${esc(u.fechado)}</p>
  <p class="unid-tel">${ICO.whatsapp}<a href="tel:+${esc(u.e164)}">${esc(u.telefone)}</a></p>
  <div class="unid-acoes">
    ${botao({ href: u.whatsapp, texto: `Agendar em ${u.cidade}`, tipo: 'principal', icone: ICO.whatsapp, externo: true })}
    ${botao({ href: u.mapa, texto: 'Ver no mapa', tipo: 'discreto', icone: ICO.local, externo: true })}
  </div>
</article>`;

const listaDuvidas = (itens, { classe = 'faq' } = {}) => `
<div class="${classe}">
  ${itens.map((d, i) => `
  <details class="faq-item"${i === 0 ? ' open' : ''}>
    <summary><span>${esc(d.q)}</span></summary>
    <div class="faq-resp"><p>${esc(d.r)}</p></div>
  </details>`).join('')}
</div>`;

/* ------------------------------------------------------------------ */
/* Dado estruturado                                                    */
/* ------------------------------------------------------------------ */

const RAIZ = () => `${CLINICA.origem}/`;
const ID_CLINICA = () => `${CLINICA.origem}/#clinica`;
const ID_UNIDADE = (u) => `${CLINICA.origem}/#${u.slug}`;
const ID_TRAT = (t) => `${CLINICA.origem}/#${t.slug}`;

const enderecoLd = (u) => ({
  '@type': 'PostalAddress',
  streetAddress: `${u.logradouro}, ${u.numero}`,
  addressLocality: u.cidade,
  addressRegion: u.uf,
  postalCode: u.cep,
  addressCountry: 'BR'
});

const unidadeLd = (u) => ({
  '@type': 'Dentist',
  '@id': ID_UNIDADE(u),
  name: u.nome,
  alternateName: `${CLINICA.nome} ${u.cidade}`,
  description: u.resumo,
  url: `${CLINICA.origem}/#${u.slug}`,
  telephone: `+${u.e164}`,
  address: enderecoLd(u),
  openingHoursSpecification: u.horarios.map(h => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.diasIso, opens: h.abre, closes: h.fecha
  })),
  areaServed: { '@type': 'City', name: `${u.cidade}, ${u.uf}` },
  parentOrganization: { '@id': ID_CLINICA() },
  isAcceptingNewPatients: true,
  currenciesAccepted: 'BRL',
  image: `${CLINICA.origem}/assets/img/og.png`
});

const clinicaLd = () => ({
  '@type': ['Dentist', 'Organization'],
  '@id': ID_CLINICA(),
  name: CLINICA.nome,
  alternateName: [CLINICA.razaoSocial, CLINICA.nomeAnterior],
  legalName: CLINICA.razaoSocial,
  url: RAIZ(),
  logo: `${CLINICA.origem}/assets/img/marca-glamm.webp`,
  image: `${CLINICA.origem}/assets/img/og.png`,
  description: 'Clínica odontológica com unidades em Marília e Garça, no interior de São Paulo. Atendimento particular em lentes e facetas, ortodontia, implante e prótese, clareamento, endodontia e periodontia.',
  taxID: CLINICA.cnpjMatriz,
  foundingDate: String(CLINICA.desde),
  areaServed: UNIDADES.map(u => ({ '@type': 'City', name: `${u.cidade}, ${u.uf}` })),
  sameAs: [CLINICA.instagramUrl],
  department: UNIDADES.map(u => ({ '@id': ID_UNIDADE(u) })),
  availableService: TRATAMENTOS.map(t => ({ '@id': ID_TRAT(t) }))
});

/* Cada tratamento continua sendo uma entidade com identificador próprio,
   mesmo sem página própria. É o que permite a um assistente responder "a
   Glamm faz lente de contato dental?" sem depender de uma URL dedicada. */
const tratamentoLd = (t) => ({
  '@type': 'MedicalProcedure',
  '@id': ID_TRAT(t),
  name: t.nomeLongo,
  alternateName: t.nome,
  description: t.descricao,
  url: `${CLINICA.origem}/#${t.slug}`,
  bodyLocation: t.parte,
  howPerformed: t.conteudo[0].p,
  provider: { '@id': ID_CLINICA() }
});

const faqLd = (itens) => ({
  '@type': 'FAQPage',
  '@id': `${CLINICA.origem}/#perguntas`,
  mainEntity: itens.map(d => ({
    '@type': 'Question',
    name: d.q,
    acceptedAnswer: { '@type': 'Answer', text: d.r }
  }))
});

const grafo = (nos) => ({ '@context': 'https://schema.org', '@graph': nos });

/* ------------------------------------------------------------------ */
/* A página                                                            */
/* ------------------------------------------------------------------ */

export function inicio(ctx) {
  /* Divergências publicadas que parecem prontas e cuja fonte não aguenta o
     peso. Não têm onde aparecer e precisam travar a produção do mesmo jeito. */
  ctx.pendencia('Horário de sexta em Marília: o site diz 8h, o Google diz 8h30');
  ctx.pendencia('Bairro e CEP da unidade de Garça: Receita e site dizem Williams e 17402-000, o Google diz Centro e 17400-000');
  ctx.pendencia('Lista completa dos tratamentos oferecidos, para conferir se falta algum');
  ctx.pendencia('Materiais de faceta oferecidos: a copy atual da clínica cita só resina, e a página explica também a porcelana');
  ctx.pendencia(EQUIPE_PENDENTE);

  const etapas = [
    { n: '01', h: 'Você manda uma mensagem', p: 'Pelo WhatsApp da unidade que fica melhor para você. A equipe responde e vocês escolhem o horário juntos.' },
    { n: '02', h: 'A avaliação', p: 'Na primeira consulta o exame é completo, com tempo para você contar o que incomoda e perguntar o que quiser. É aqui que se descobre o que precisa ser feito.' },
    { n: '03', h: 'O plano, por escrito', p: 'Você recebe a sequência do tratamento: o que fazer, em qual ordem, o que cada etapa envolve e o que ela custa. Antes de começar, não durante.' },
    { n: '04', h: 'O tratamento', p: 'Com a sequência combinada, retorno marcado e lembrete antes de cada consulta.' }
  ];

  const razoes = [
    { h: 'Duas unidades, o mesmo padrão', p: 'Marília e Garça atendem os mesmos tratamentos, com o mesmo processo de avaliação. Garça abre até as 20h e atende aos sábados.' },
    { h: 'A conta antes do tratamento', p: 'O plano de tratamento é apresentado por escrito na consulta de avaliação, com a sequência e o valor de cada etapa. Você decide com a informação na mão.' },
    { h: 'Atendimento particular', p: 'A clínica não trabalha com convênio. Está dito aqui, e não descoberto na recepção.' },
    { h: 'Quem atende tem nome', p: 'Cada profissional que atende você é identificado, com registro no Conselho Regional de Odontologia.' }
  ];

  const body = `
<section class="hero" id="topo">
  <div class="hero-fundo" aria-hidden="true">
    <span class="hero-halo"></span>
    ${simbolo('simbolo simbolo-fundo')}
  </div>
  <div class="env hero-conteudo">
    <p class="eyebrow">Marília e Garça, São Paulo</p>
    <h1><span class="ouro">Odontologia que explica</span><br>antes de tratar.</h1>
    <p class="hero-sub">Avaliação completa, plano de tratamento por escrito e sete áreas de tratamento na mesma clínica.</p>
    ${botoesUnidades('hero-acoes')}
    <p class="hero-nota">Atendimento particular, sem convênio. A primeira consulta é de avaliação e leva de 40 a 60 minutos.</p>
  </div>
</section>

<section class="faixa-unid">
  <div class="env faixa-unid-grade">
    ${UNIDADES.map(u => `
    <a class="faixa-unid-item" href="#${esc(u.slug)}">
      <span class="faixa-unid-cidade">${esc(u.cidade)}</span>
      <span class="faixa-unid-end">${esc(u.enderecoLinha)}, ${esc(u.bairro)}</span>
      <span class="faixa-unid-tel">${esc(u.telefone)}</span>
      <span class="faixa-unid-mais">Ver a unidade ${ICO.seta}</span>
    </a>`).join('')}
  </div>
</section>

${secao({
  id: 'tratamentos',
  eyebrow: 'Onde cada tratamento atua',
  titulo: 'Um dente,<br>sete lugares',
  intro: 'Quase todo tratamento odontológico age numa parte específica do dente. Gire o dente, escolha uma parte, e o tratamento correspondente abre logo abaixo.',
  classe: 'sec-dente',
  corpo: `
  <div class="dente-grade" data-dente>
    <div class="dente-palco">
      <canvas class="dente-tela" aria-hidden="true"></canvas>
      <span class="dente-marcador" aria-hidden="true"></span>
      <p class="dente-dica" aria-hidden="true">Arraste para girar</p>
    </div>
    <ul class="dente-partes">
      ${TRATAMENTOS.map(t => `
      <li>
        <button type="button" class="dente-parte" data-parte="${esc(t.slug)}" data-curto="${esc(t.parte)}">
          <span class="dente-parte-ico">${ICO[t.icone]}</span>
          <span class="dente-parte-txt">
            <span class="dente-parte-nome">${esc(t.parte)}</span>
            <span class="dente-parte-trat">${esc(t.nome)}</span>
          </span>
        </button>
      </li>`).join('')}
    </ul>
  </div>

  <div class="trat-lista">
    ${TRATAMENTOS.map(t => `
    <details class="trat" id="${esc(t.slug)}">
      <summary>
        <span class="trat-ico">${ICO[t.icone]}</span>
        <span class="trat-cabeca">
          <span class="trat-nome">${esc(t.nomeLongo)}</span>
          <span class="trat-resumo">${esc(t.resumo)}</span>
        </span>
      </summary>
      <div class="trat-corpo">
        <p class="trat-descricao">${esc(t.descricao)}</p>
        <div class="prosa">
          ${t.conteudo.map(c => `<h3>${esc(c.h)}</h3><p>${esc(c.p)}</p>`).join('')}
        </div>
        <div class="trat-duvidas">
          <h3 class="trat-duvidas-tit">Dúvidas sobre ${esc(t.nome.toLowerCase())}</h3>
          ${listaDuvidas(t.duvidas, { classe: 'faq faq-aninhada' })}
        </div>
        <aside class="aviso-clinico">
          ${ICO.alerta}
          <p>Este texto explica o que o tratamento é, em termos gerais. Ele não avalia o seu caso, não indica procedimento e não substitui consulta. O que serve para você depende de exame presencial por cirurgião-dentista.</p>
        </aside>
      </div>
    </details>`).join('')}
  </div>

  <p class="trat-extra">A clínica realiza outros procedimentos odontológicos além destes sete. Se o que você procura não estiver aqui, pergunte no WhatsApp da unidade.</p>`
})}

${secao({
  id: 'como-funciona',
  eyebrow: 'Como funciona',
  titulo: 'Do primeiro contato<br>ao plano na sua mão',
  classe: 'sec-etapas sec-clara',
  corpo: `
  <ol class="etapas">
    ${etapas.map(e => `
    <li class="etapa">
      <span class="etapa-n">${e.n}</span>
      <h3>${esc(e.h)}</h3>
      <p>${esc(e.p)}</p>
    </li>`).join('')}
  </ol>`
})}

${secao({
  id: 'a-clinica',
  eyebrow: 'A clínica',
  titulo: 'Uma clínica,<br>duas cidades',
  classe: 'sec-clinica',
  corpo: `
  <ul class="razoes">
    ${razoes.map(r => `
    <li class="razao">
      <span class="razao-marca" aria-hidden="true">${simbolo()}</span>
      <h3>${esc(r.h)}</h3>
      <p>${esc(r.p)}</p>
    </li>`).join('')}
  </ul>

  <div class="prosa prosa-larga clinica-prosa">
    <h3>Como o atendimento é organizado</h3>
    <p>A clínica trabalha com uma consulta de avaliação antes de qualquer procedimento. Ela leva de quarenta a sessenta minutos e existe para três coisas: examinar, entender o que levou você até lá e apresentar um plano de tratamento por escrito, com a sequência do que precisa ser feito e o que cada etapa envolve.</p>
    <p>Esse plano é o documento da conversa. Ele diz o que é urgente, o que pode esperar, o que é opcional e em que ordem as coisas fazem sentido. Você leva o plano e decide fora da cadeira.</p>

    <h3>A ordem importa</h3>
    <p>É comum chegar à clínica com um tratamento já escolhido, em geral estético. Isso não é problema. Mas a ordem em que as coisas são feitas muda o resultado: gengiva inflamada, cárie ativa e mordida desalinhada interferem em quase tudo que vem depois. Uma faceta assentada sobre gengiva doente muda de aparência quando a gengiva desincha. Um clareamento feito depois das restaurações deixa a cor desencontrada.</p>

    <h3>Sobre este site e o que ele não faz</h3>
    <p>Este site não publica imagem de diagnóstico nem de resultado de tratamento, não reproduz avaliação de paciente e não faz publicidade de caráter comercial. Não é uma escolha de estilo: o Código de Ética Odontológica trata dessas três coisas nos artigos 43 e 44, e a Resolução CFO 196 de 2019 é expressa ao dizer que pessoa jurídica não divulga imagem de resultado de tratamento.</p>
  </div>`
})}

${secao({
  id: 'equipe',
  eyebrow: 'Equipe',
  titulo: 'Quem vai te atender',
  intro: 'Toda pessoa que atende na Glamm é cirurgiã-dentista ou cirurgião-dentista com inscrição no Conselho Regional de Odontologia. Esta seção existe para você conferir isso antes de sentar na cadeira.',
  classe: 'sec-equipe sec-clara',
  corpo: `
  <div class="equipe-grade">
    ${EQUIPE.map(m => `
    <article class="pessoa">
      <span class="pessoa-marca" aria-hidden="true">${simbolo()}</span>
      <h3>${esc(m.nome)}</h3>
      <p class="pessoa-papel">${esc(m.papel)}</p>
      <dl class="pessoa-dados">
        <div><dt>Inscrição no CRO-SP</dt><dd>${ctx.dado(m.cro, 'Número de inscrição da responsável técnica no CRO-SP')}</dd></div>
        <div><dt>Formação</dt><dd>${esc(m.formacao)}</dd></div>
        <div><dt>${esc(m.especialidadeRotulo)}</dt><dd>${ctx.dado(m.especialidade, 'Especialidade registrada no CRO da responsável técnica')}</dd></div>
      </dl>
    </article>`).join('')}

    <article class="pessoa pessoa-vaga">
      <h3>Os demais profissionais da equipe</h3>
      <p>A clínica atende com mais profissionais além da fundadora, nas duas unidades. Os nomes, as inscrições no CRO e as especialidades registradas de cada um entram aqui assim que a clínica confirmar os dados e autorizar a publicação.</p>
      <p class="pessoa-nota">Enquanto isso, este site não anuncia especialidade em nome da clínica. O artigo 43, parágrafo segundo, do Código de Ética Odontológica só permite que a pessoa jurídica anuncie especialidades se tiver profissional inscrito naquela especialidade e disponibilizar ao público a relação desses profissionais com as respectivas qualificações. Publicar a lista é o que destrava a afirmação.</p>
      <p><a class="link-seta" href="https://website.cfo.org.br/consulta-de-profissionais-e-entidades/" target="_blank" rel="noopener noreferrer">Conferir qualquer inscrição no Conselho Federal ${ICO.seta}</a></p>
    </article>
  </div>

  <p class="equipe-nome">A clínica se chama <strong>Glamm Odontologia</strong>. Parte das pessoas conhece o atendimento pelo nome da fundadora, ${esc(CLINICA.nomeAnterior)}, que é como as unidades ainda aparecem em alguns lugares. É a mesma clínica, nos mesmos endereços, com a mesma equipe.</p>`
})}

${secao({
  id: 'unidades',
  eyebrow: 'Unidades',
  titulo: 'Marília e Garça',
  intro: 'Duas unidades da mesma clínica, com os mesmos tratamentos. O que muda é o endereço, o horário e o telefone. Cada unidade tem o seu próprio número de WhatsApp.',
  classe: 'sec-unidades',
  corpo: `
  <div class="unid-grade">${UNIDADES.map(cartaoUnidade).join('')}</div>

  <div class="tabela-rolagem">
    <table class="tabela">
      <caption class="sr">Comparação entre as unidades de Marília e Garça</caption>
      <thead>
        <tr><th scope="col">&nbsp;</th>${UNIDADES.map(u => `<th scope="col">${esc(u.cidade)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        <tr><th scope="row">Endereço</th>${UNIDADES.map(u => `<td>${esc(u.enderecoLinha)}<br>${esc(u.bairro)}</td>`).join('')}</tr>
        <tr><th scope="row">Referência</th>${UNIDADES.map(u => `<td>${esc(u.referencia)}</td>`).join('')}</tr>
        <tr><th scope="row">Telefone e WhatsApp</th>${UNIDADES.map(u => `<td><a href="tel:+${esc(u.e164)}">${esc(u.telefone)}</a></td>`).join('')}</tr>
        <tr><th scope="row">Dias de semana</th>${UNIDADES.map(u => `<td>${u.horarios.filter(h => h.dias !== 'Sábado').map(h => `${esc(h.dias)}, ${esc(hora(h.abre))} às ${esc(hora(h.fecha))}`).join('<br>')}</td>`).join('')}</tr>
        <tr><th scope="row">Sábado</th>${UNIDADES.map(u => {
          const s = u.horarios.find(h => h.dias === 'Sábado');
          return `<td>${s ? `${esc(hora(s.abre))} às ${esc(hora(s.fecha))}` : 'Não atende'}</td>`;
        }).join('')}</tr>
        <tr><th scope="row">Tratamentos</th>${UNIDADES.map(() => '<td>Todos os sete</td>').join('')}</tr>
      </tbody>
    </table>
  </div>`
})}

${secao({
  id: 'duvidas',
  eyebrow: 'Dúvidas frequentes',
  titulo: 'Perguntas que<br>todo mundo faz',
  intro: 'O que mais se pergunta antes da primeira consulta. As dúvidas sobre cada procedimento estão dentro do tratamento correspondente, mais acima.',
  classe: 'sec-clara',
  corpo: listaDuvidas(DUVIDAS)
})}

<section class="sec sec-agendar" id="agendar">
  <div class="env">
    <header class="sec-cabeca">
      <p class="eyebrow">Agendar</p>
      <h2>Agende sua avaliação</h2>
      <p class="sec-intro">Escolha a unidade, diga o que te levou até aqui e o site monta a mensagem. Você revisa e envia pelo seu próprio WhatsApp.</p>
    </header>

    <form class="form" id="form-agenda" novalidate>
      <fieldset class="campo campo-radio">
        <legend>Em qual unidade?</legend>
        <div class="radios">
          ${UNIDADES.map((u, i) => `
          <label class="radio">
            <input type="radio" name="unidade" value="${esc(u.id)}"${i === 0 ? ' checked' : ''}>
            <span class="radio-corpo">
              <span class="radio-cidade">${esc(u.cidade)}</span>
              <span class="radio-end">${esc(u.enderecoLinha)}, ${esc(u.bairro)}</span>
              <span class="radio-tel">${esc(u.telefone)}</span>
            </span>
          </label>`).join('')}
        </div>
      </fieldset>

      <div class="campo">
        <label for="ag-nome">Seu nome</label>
        <input type="text" id="ag-nome" name="nome" autocomplete="name" placeholder="Como podemos te chamar">
      </div>

      <div class="campo">
        <label for="ag-assunto">O que você procura</label>
        <select id="ag-assunto" name="assunto">
          <option value="">Ainda não sei, quero uma avaliação</option>
          ${TRATAMENTOS.map(t => `<option value="${esc(t.nome)}">${esc(t.nome)}</option>`).join('')}
          <option value="Outro assunto">Outro assunto</option>
        </select>
      </div>

      <div class="campo">
        <label for="ag-periodo">Melhor período</label>
        <select id="ag-periodo" name="periodo">
          <option value="">Tanto faz</option>
          <option value="de manhã">De manhã</option>
          <option value="à tarde">À tarde</option>
          <option value="no fim da tarde">No fim da tarde</option>
        </select>
      </div>

      <div class="campo">
        <label for="ag-obs">Quer contar mais alguma coisa? <span class="opcional">Opcional</span></label>
        <textarea id="ag-obs" name="obs" rows="3" placeholder="Por exemplo: tenho medo de dentista, ou já fiz um orçamento em outro lugar"></textarea>
      </div>

      <div class="form-previa">
        <h3 id="rotulo-previa">A mensagem que vai ser enviada</h3>
        <p class="form-previa-texto" id="previa-mensagem" role="status" aria-live="polite"></p>
      </div>

      <div class="form-acoes">
        <a class="btn btn-principal" id="enviar-whatsapp" href="${esc(UNIDADES[0].whatsapp)}" target="_blank" rel="noopener noreferrer">${ICO.whatsapp}<span>Abrir no WhatsApp</span></a>
      </div>

      <p class="form-nota">
        ${ICO.check}
        <span><strong>Nada é enviado por este site.</strong> A mensagem é montada no seu aparelho e só sai quando você tocar em enviar, dentro do seu WhatsApp. Este site não tem servidor, não guarda o que você digita e não usa rastreador. A política de segurança da página bloqueia qualquer envio, e isso pode ser conferido no código.</span>
      </p>
    </form>
  </div>
</section>`;

  const todasDuvidas = DUVIDAS.concat(TRATAMENTOS.flatMap(t => t.duvidas));

  return {
    p: {
      path: 'index.html', base: '', classe: 'pg-inicio',
      scripts: ['assets/js/dente3d.js'],
      titulo: 'Início',
      tituloCompleto: `${CLINICA.nome} | Dentista em Marília e Garça SP`,
      descricao: 'Clínica odontológica em Marília e Garça, São Paulo. Lentes e facetas, ortodontia, implante e prótese, clareamento, endodontia e periodontia. Atendimento particular, com avaliação completa e plano de tratamento por escrito.'
    },
    ld: grafo([
      clinicaLd(),
      ...UNIDADES.map(unidadeLd),
      ...TRATAMENTOS.map(tratamentoLd),
      {
        '@type': 'WebSite',
        '@id': `${CLINICA.origem}/#site`,
        url: RAIZ(),
        name: CLINICA.nome,
        inLanguage: 'pt-BR',
        publisher: { '@id': ID_CLINICA() }
      },
      faqLd(todasDuvidas)
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* Privacidade                                                         */
/* ------------------------------------------------------------------ */

export function privacidade(ctx) {
  const body = `
<section class="cabeca">
  <div class="env">
    <p class="eyebrow">Privacidade</p>
    <h1>O que este site faz<br>com os seus dados</h1>
    <p class="cabeca-sub">A resposta curta é: nada. A resposta longa está abaixo, e pode ser conferida no código da página.</p>
  </div>
</section>

${secao({
  classe: 'sec-clara',
  corpo: `
  <div class="prosa prosa-larga">
    <h2>Este site não coleta dados</h2>
    <p>Não há formulário que envie informação para lugar nenhum, não há cadastro, não há login e não há comentário. O agendamento monta um texto dentro do seu próprio aparelho e abre o WhatsApp com ele escrito. Enquanto você não tocar em enviar, dentro do WhatsApp, nada saiu de onde estava.</p>

    <h2>Não há rastreador, pixel nem cookie</h2>
    <p>O site não carrega pixel de rede social, ferramenta de análise, mapa de calor, gravador de sessão nem publicidade. Não usa cookie, nem próprio nem de terceiro. Por isso não existe aviso de cookie aqui: não haveria o que consentir.</p>

    <h2>Nada é carregado de fora</h2>
    <p>Toda imagem, fonte, folha de estilo e script deste site vem do próprio endereço. Não há requisição para servidor de terceiro, o que significa que nenhuma outra empresa fica sabendo que você abriu esta página. As fontes usadas no texto estão hospedadas aqui, e não em serviço externo.</p>
    <p>Isso é imposto pela política de segurança de conteúdo declarada em cada página, que bloqueia por padrão qualquer origem que não seja este site, e bloqueia envio de formulário e conexão de dados de qualquer tipo.</p>

    <h2>Links para fora</h2>
    <p>Há links para o WhatsApp, para o Google Maps e para o Instagram da clínica. Ao seguir um desses links você passa a estar no serviço daquela empresa, sob a política dela. O site envia esses links sem identificar de onde você veio.</p>

    <h2>O que a clínica faz com os seus dados</h2>
    <p>Quando você manda uma mensagem de WhatsApp, quem recebe é a clínica, e o tratamento desses dados passa a ser responsabilidade dela, sob a Lei Geral de Proteção de Dados. Prontuário odontológico tem regra própria de guarda e sigilo, prevista no Código de Ética Odontológica.</p>
    <p>Para pedir acesso, correção ou exclusão dos seus dados junto à clínica, fale com a unidade em que você é atendido.</p>

    <h2>Hospedagem</h2>
    <p>Esta versão do site está hospedada em serviço de páginas estáticas. O provedor pode registrar dados técnicos de acesso, como endereço de rede e horário, para operar o serviço. Isso independe do site e vale para qualquer página na internet.</p>
  </div>`
})}`;

  return {
    p: {
      path: 'privacidade.html', base: '', classe: 'pg-privacidade pg-interna',
      titulo: 'Privacidade',
      descricao: 'Este site não coleta dados, não usa cookie, não carrega rastreador e não envia formulário. Como a página impede isso, e o que acontece quando você fala com a clínica pelo WhatsApp.'
    },
    /* Os tratamentos entram aqui também: `clinicaLd()` os referencia por
       `@id` em `availableService`, e um `@id` apontando para nó que não
       existe no grafo é referência solta. */
    ld: grafo([clinicaLd(), ...UNIDADES.map(unidadeLd), ...TRATAMENTOS.map(tratamentoLd)]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* 404                                                                 */
/* ------------------------------------------------------------------ */

export function naoEncontrada(ctx) {
  const body = `
<section class="cabeca cabeca-404">
  <div class="env">
    <span class="cabeca-marca" aria-hidden="true">${simbolo('simbolo simbolo-grande')}</span>
    <p class="eyebrow">Erro 404</p>
    <h1>Esta página não existe</h1>
    <p class="cabeca-sub">O site da Glamm é uma página só. O endereço que você tentou não faz parte dela. Abaixo estão as seções.</p>
  </div>
</section>

${secao({
  classe: 'sec-clara',
  corpo: `
  <ul class="mapa-site">
    <li><a href="index.html">Início</a></li>
    ${MENU.map(m => `<li><a href="index.html${m.path}">${esc(m.rotulo)}</a></li>`).join('')}
    <li><a href="index.html#agendar">Agendar avaliação</a></li>
    ${UNIDADES.map(u => `<li><a href="index.html#${u.slug}">Unidade de ${esc(u.cidade)}</a></li>`).join('')}
    ${TRATAMENTOS.map(t => `<li><a href="index.html#${t.slug}">${esc(t.nome)}</a></li>`).join('')}
    <li><a href="privacidade.html">Privacidade</a></li>
  </ul>`
})}`;

  return {
    p: {
      path: '404.html', base: '', classe: 'pg-404 pg-interna',
      titulo: 'Página não encontrada',
      descricao: 'A página procurada não existe neste site. Veja abaixo a lista completa de seções da Glamm Odontologia, com as unidades de Marília e Garça e todos os tratamentos.'
    },
    ld: null,
    body
  };
}
