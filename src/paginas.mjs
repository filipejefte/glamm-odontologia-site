/* =========================================================================
   As páginas do site. Cada função devolve `{ p, body, ld }`:
     p     metadados da página (caminho, título, descrição, base relativa)
     body  o HTML do <main>
     ld    o objeto que vira JSON-LD

   ARQUITETURA DE URL
   O site atual é página única: todo o conteúdo mora em `/`, sem rota por
   cidade nem por tratamento. Isso deixa o buscador com uma única página para
   ranquear e nenhuma âncora por intenção de busca. Aqui cada tratamento e
   cada unidade têm URL própria, título próprio, descrição própria e dado
   estruturado próprio.

   DADO ESTRUTURADO
   Assistente de IA não visita um site como uma pessoa: monta uma entidade a
   partir de sinais consistentes espalhados por várias fontes. O JSON-LD
   daqui existe para essa leitura, e repete deliberadamente o mesmo nome, o
   mesmo endereço e o mesmo telefone em todo lugar.
   ========================================================================= */

import {
  CLINICA, UNIDADES, TRATAMENTOS, DUVIDAS, EQUIPE, EQUIPE_PENDENTE, MENU
} from './dados.mjs';
import { esc, ICO, botao, botoesUnidades, simbolo } from './chrome.mjs';

/* ------------------------------------------------------------------ */
/* Peças reaproveitadas                                                */
/* ------------------------------------------------------------------ */

const secao = ({ id, eyebrow, titulo, intro, corpo, classe = '' }) => `
<section class="sec ${classe}"${id ? ` id="${id}"` : ''}>
  <div class="env">
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
    ${titulo ? `<h2>${titulo}</h2>` : ''}
    ${intro ? `<p class="sec-intro">${intro}</p>` : ''}
    ${corpo}
  </div>
</section>`;

const migalhas = (b, trilha) => `
<nav class="migalhas" aria-label="Você está aqui">
  <ol>
    <li><a href="${b}index.html">Início</a></li>
    ${trilha.map((t, i) => i === trilha.length - 1
      ? `<li><span aria-current="page">${esc(t.rotulo)}</span></li>`
      : `<li><a href="${b}${t.path}">${esc(t.rotulo)}</a></li>`).join('\n    ')}
  </ol>
</nav>`;

/* Cartão de unidade. O telefone e o WhatsApp saem sempre de dados.mjs, um
   por unidade. Nunca escrito na mão: é a correção do achado mais caro do
   diagnóstico. */
const cartaoUnidade = (u, b, { compacto = false } = {}) => `
<article class="unid">
  <h3 class="unid-nome"><a href="${b}unidades/${u.slug}.html">${esc(u.cidade)}</a></h3>
  <p class="unid-ref">${esc(u.referencia)}</p>
  <address class="unid-end">
    <span class="unid-rua">${esc(u.enderecoLinha)}</span><br>
    ${esc(u.bairro)}, ${esc(u.cidade)} ${esc(u.uf)}<br>
    CEP ${esc(u.cep)}
  </address>
  <dl class="unid-horario">
    ${u.horarios.map(h => `<div><dt>${esc(h.dias)}</dt><dd>${esc(h.abre.replace(':', 'h'))} às ${esc(h.fecha.replace(':', 'h'))}</dd></div>`).join('\n    ')}
  </dl>
  <p class="unid-fechado">${esc(u.fechado)}</p>
  <p class="unid-tel">${ICO.whatsapp}<a href="tel:+${esc(u.e164)}">${esc(u.telefone)}</a></p>
  ${compacto ? '' : `<div class="unid-acoes">
    ${botao({ href: u.whatsapp, texto: `Agendar em ${u.cidade}`, tipo: 'principal', icone: ICO.whatsapp, externo: true })}
    ${botao({ href: u.mapa, texto: 'Ver no mapa', tipo: 'discreto', icone: ICO.local, externo: true })}
  </div>`}
</article>`;

const gradeTratamentos = (b, { atual = null } = {}) => `
<ul class="trat-grade">
  ${TRATAMENTOS.filter(t => t.slug !== atual).map(t => `
  <li class="trat-item">
    <a href="${b}tratamentos/${t.slug}.html">
      <span class="trat-ico">${ICO[t.icone]}</span>
      <span class="trat-nome">${esc(t.nome)}</span>
      <span class="trat-resumo">${esc(t.resumo)}</span>
      <span class="trat-mais">Ver o tratamento ${ICO.seta}</span>
    </a>
  </li>`).join('')}
</ul>`;

const listaDuvidas = (itens, { classe = 'faq' } = {}) => `
<div class="${classe}">
  ${itens.map((d, i) => `
  <details class="faq-item"${i === 0 ? ' open' : ''}>
    <summary><span>${esc(d.q)}</span></summary>
    <div class="faq-resp"><p>${esc(d.r)}</p></div>
  </details>`).join('')}
</div>`;

/* Aviso que fecha toda página de tratamento. Não é rodapé decorativo: é a
   linha que separa esclarecimento de indicação clínica, que é o que o
   art. 44, V preserva. */
const avisoClinico = `
<aside class="aviso-clinico">
  ${ICO.alerta}
  <p>Esta página explica o que o tratamento é, em termos gerais. Ela não avalia o seu caso, não indica procedimento e não substitui consulta. O que serve para você depende de exame presencial por cirurgião-dentista.</p>
</aside>`;

/* ------------------------------------------------------------------ */
/* Dado estruturado                                                    */
/* ------------------------------------------------------------------ */

const ID_CLINICA = () => `${CLINICA.origem}/#clinica`;
const ID_UNIDADE = (u) => `${CLINICA.origem}/unidades/${u.slug}.html#unidade`;

const enderecoLd = (u) => ({
  '@type': 'PostalAddress',
  streetAddress: `${u.logradouro}, ${u.numero}`,
  addressLocality: u.cidade,
  addressRegion: u.uf,
  postalCode: u.cep,
  addressCountry: 'BR'
});

const horariosLd = (u) => u.horarios.map(h => ({
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: h.diasIso,
  opens: h.abre,
  closes: h.fecha
}));

/* A entidade da unidade. `Dentist` é subtipo de MedicalBusiness e de
   LocalBusiness, que é o que o buscador espera de uma clínica com endereço.
   `parentOrganization` liga as duas unidades à mesma marca: sem isso elas
   seriam lidas como dois negócios sem relação, que é exatamente o problema
   que o site tem hoje. */
const unidadeLd = (u) => ({
  '@type': 'Dentist',
  '@id': ID_UNIDADE(u),
  name: u.nome,
  alternateName: `${CLINICA.nome} ${u.cidade}`,
  description: u.resumo,
  url: `${CLINICA.origem}/unidades/${u.slug}.html`,
  telephone: `+${u.e164}`,
  address: enderecoLd(u),
  openingHoursSpecification: horariosLd(u),
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
  url: `${CLINICA.origem}/`,
  logo: `${CLINICA.origem}/assets/img/marca-glamm.webp`,
  image: `${CLINICA.origem}/assets/img/og.png`,
  description: 'Clínica odontológica com unidades em Marília e Garça, no interior de São Paulo. Atendimento particular em lentes e facetas, ortodontia, implante e prótese, clareamento, endodontia e periodontia.',
  taxID: CLINICA.cnpjMatriz,
  foundingDate: String(CLINICA.desde),
  areaServed: UNIDADES.map(u => ({ '@type': 'City', name: `${u.cidade}, ${u.uf}` })),
  sameAs: [CLINICA.instagramUrl],
  department: UNIDADES.map(u => ({ '@id': ID_UNIDADE(u) })),
  availableService: TRATAMENTOS.map(t => ({
    '@type': 'MedicalProcedure',
    name: t.nomeLongo,
    url: `${CLINICA.origem}/tratamentos/${t.slug}.html`
  }))
});

const faqLd = (itens) => ({
  '@type': 'FAQPage',
  mainEntity: itens.map(d => ({
    '@type': 'Question',
    name: d.q,
    acceptedAnswer: { '@type': 'Answer', text: d.r }
  }))
});

const migalhasLd = (trilha) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Início', item: `${CLINICA.origem}/` }]
    .concat(trilha.map((t, i) => ({
      '@type': 'ListItem', position: i + 2, name: t.rotulo, item: `${CLINICA.origem}/${t.path}`
    })))
});

const grafo = (nos) => ({ '@context': 'https://schema.org', '@graph': nos });

/* ------------------------------------------------------------------ */
/* Início                                                              */
/* ------------------------------------------------------------------ */

export function inicio(ctx) {
  const b = '';

  /* Registra as duas divergências que estão publicadas e parecem prontas,
     mas cuja fonte não aguenta o peso. Elas não têm onde aparecer na página
     e precisam travar a produção do mesmo jeito. */
  ctx.pendencia('Horário de sexta em Marília: o site diz 8h, o Google diz 8h30');
  ctx.pendencia('Bairro e CEP da unidade de Garça: Receita e site dizem Williams e 17402-000, o Google diz Centro e 17400-000');
  ctx.pendencia('Lista completa dos tratamentos oferecidos, para conferir se falta algum');

  const etapas = [
    { n: '01', h: 'Você manda uma mensagem', p: 'Pelo WhatsApp da unidade que fica melhor para você. A equipe responde e vocês escolhem o horário juntos.' },
    { n: '02', h: 'A avaliação', p: 'Na primeira consulta o exame é completo, com tempo para você contar o que incomoda e perguntar o que quiser. É aqui que se descobre o que precisa ser feito.' },
    { n: '03', h: 'O plano, por escrito', p: 'Você recebe a sequência do tratamento: o que fazer, em qual ordem, o que cada etapa envolve e o que ela custa. Antes de começar, não durante.' },
    { n: '04', h: 'O tratamento', p: 'Com a sequência combinada, retorno marcado e lembrete antes de cada consulta.' }
  ];

  const razoes = [
    { h: 'Duas unidades, o mesmo padrão', p: `Marília e Garça atendem os mesmos tratamentos, com a mesma equipe de referência. Garça abre até as 20h e atende aos sábados.` },
    { h: 'A conta antes do tratamento', p: 'O plano de tratamento é apresentado por escrito na consulta de avaliação, com a sequência e o valor de cada etapa. Você decide com a informação na mão.' },
    { h: 'Atendimento particular', p: 'A clínica não trabalha com convênio. Está dito aqui, e não descoberto na recepção.' },
    { h: 'Quem atende tem nome', p: 'Cada profissional que atende você é identificado, com registro no Conselho Regional de Odontologia. A página de equipe existe para isso.' }
  ];

  const body = `
<section class="hero">
  <div class="env hero-grade">
    <div class="hero-texto">
      <p class="eyebrow">Marília e Garça, São Paulo</p>
      <h1>Odontologia que explica antes de tratar.</h1>
      <p class="hero-sub">A Glamm Odontologia atende nas duas cidades com avaliação completa, plano de tratamento por escrito e sete áreas de tratamento sob o mesmo teto.</p>
      ${botoesUnidades('hero-acoes')}
      <p class="hero-nota">Atendimento particular, sem convênio. A primeira consulta é de avaliação e leva de 40 a 60 minutos.</p>
    </div>
    <div class="hero-marca" aria-hidden="true">${simbolo('simbolo simbolo-hero')}</div>
  </div>
</section>

<section class="faixa-unid">
  <div class="env faixa-unid-grade">
    ${UNIDADES.map(u => `
    <a class="faixa-unid-item" href="${b}unidades/${u.slug}.html">
      <span class="faixa-unid-cidade">${esc(u.cidade)}</span>
      <span class="faixa-unid-end">${esc(u.enderecoLinha)}, ${esc(u.bairro)}</span>
      <span class="faixa-unid-tel">${esc(u.telefone)}</span>
      <span class="faixa-unid-mais">Ver a unidade ${ICO.seta}</span>
    </a>`).join('')}
  </div>
</section>

${secao({
  id: 'tratamentos',
  eyebrow: 'Tratamentos',
  titulo: 'O que a clínica trata',
  intro: 'Cada tratamento tem uma página com o que ele é, o que a avaliação precisa checar antes e as dúvidas que aparecem com mais frequência.',
  corpo: gradeTratamentos(b) + `
    <p class="trat-extra">A lista acima é a dos tratamentos com página própria. A clínica realiza outros procedimentos odontológicos. Se o que você procura não estiver aqui, pergunte no WhatsApp da unidade.</p>
    <p class="sec-mais"><a class="link-seta" href="${b}tratamentos.html">Ver todos os tratamentos ${ICO.seta}</a></p>`
})}

${secao({
  id: 'como-funciona',
  eyebrow: 'Como funciona',
  titulo: 'Do primeiro contato ao plano na sua mão',
  intro: 'Quatro etapas, na ordem em que acontecem.',
  classe: 'sec-etapas',
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
  id: 'por-que',
  eyebrow: 'Por que a Glamm',
  titulo: 'Quatro coisas ditas antes de você perguntar',
  classe: 'sec-razoes',
  corpo: `
  <ul class="razoes">
    ${razoes.map(r => `
    <li class="razao">
      <span class="razao-marca" aria-hidden="true">${simbolo()}</span>
      <h3>${esc(r.h)}</h3>
      <p>${esc(r.p)}</p>
    </li>`).join('')}
  </ul>`
})}

${secao({
  id: 'unidades',
  eyebrow: 'Unidades',
  titulo: 'Onde ficamos',
  intro: 'Duas unidades, dois telefones. Cada botão abre a conversa com a unidade certa.',
  classe: 'sec-unidades',
  corpo: `<div class="unid-grade">${UNIDADES.map(u => cartaoUnidade(u, b)).join('')}</div>`
})}

${secao({
  id: 'duvidas',
  eyebrow: 'Dúvidas frequentes',
  titulo: 'Perguntas que todo mundo faz',
  corpo: listaDuvidas(DUVIDAS.slice(0, 5)) + `
    <p class="sec-mais"><a class="link-seta" href="${b}duvidas.html">Ver todas as dúvidas ${ICO.seta}</a></p>`
})}

<section class="cta">
  <div class="env cta-conteudo">
    <span class="cta-marca" aria-hidden="true">${simbolo()}</span>
    <h2>A avaliação é o começo de tudo</h2>
    <p>Quarenta a sessenta minutos para examinar, ouvir e explicar. Você sai com o plano na mão e decide depois.</p>
    ${botoesUnidades('cta-acoes')}
  </div>
</section>`;

  return {
    p: {
      path: 'index.html', base: '', classe: 'pg-inicio',
      titulo: 'Início',
      tituloCompleto: `${CLINICA.nome} | Dentista em Marília e Garça SP`,
      descricao: 'Clínica odontológica em Marília e Garça, São Paulo. Lentes e facetas, ortodontia, implante e prótese, clareamento, endodontia e periodontia. Atendimento particular, com avaliação completa e plano de tratamento por escrito.'
    },
    ld: grafo([
      clinicaLd(),
      ...UNIDADES.map(unidadeLd),
      {
        '@type': 'WebSite',
        '@id': `${CLINICA.origem}/#site`,
        url: `${CLINICA.origem}/`,
        name: CLINICA.nome,
        inLanguage: 'pt-BR',
        publisher: { '@id': ID_CLINICA() }
      },
      faqLd(DUVIDAS.slice(0, 5))
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* Tratamentos, página índice                                          */
/* ------------------------------------------------------------------ */

export function tratamentos(ctx) {
  const b = '';
  const body = `
${migalhas(b, [{ path: 'tratamentos.html', rotulo: 'Tratamentos' }])}
<section class="cabeca">
  <div class="env">
    <p class="eyebrow">Tratamentos</p>
    <h1>O que a Glamm trata</h1>
    <p class="cabeca-sub">Sete tratamentos com página própria, explicados sem promessa de resultado. Cada página diz o que o procedimento é, o que a avaliação precisa checar antes e o que costuma gerar dúvida.</p>
  </div>
</section>

${secao({
  corpo: gradeTratamentos(b) + `
  <div class="bloco-nota">
    <h2>E se o que eu preciso não estiver na lista?</h2>
    <p>A clínica realiza outros procedimentos odontológicos além dos sete acima. A lista com página própria é a dos tratamentos mais procurados. Se o seu caso for outro, descreva no WhatsApp da unidade mais perto de você e a equipe responde se é algo feito na clínica.</p>
    ${botoesUnidades('bloco-acoes')}
  </div>`
})}

${secao({
  eyebrow: 'Antes de escolher',
  titulo: 'A ordem importa',
  classe: 'sec-ordem',
  corpo: `
  <div class="prosa">
    <p>É comum chegar à clínica com um tratamento já escolhido, em geral estético. Isso não é problema: é um bom ponto de partida para a conversa. Mas a ordem em que as coisas são feitas muda o resultado, e às vezes muda o custo.</p>
    <p>Gengiva inflamada, cárie ativa e mordida desalinhada interferem em quase tudo que vem depois. Uma faceta assentada sobre gengiva doente muda de aparência quando a gengiva desincha. Um clareamento feito depois das restaurações deixa a cor desencontrada. Um implante planejado sem avaliar o osso vira uma etapa a mais.</p>
    <p>Por isso a primeira consulta é de avaliação, e por isso o plano de tratamento vem antes de qualquer procedimento. Você continua decidindo o que fazer. Só decide sabendo a sequência.</p>
  </div>`
})}`;

  return {
    p: {
      path: 'tratamentos.html', base: '', classe: 'pg-tratamentos',
      titulo: 'Tratamentos',
      descricao: 'Lentes e facetas, ortodontia e alinhadores, implante e prótese, clareamento, endodontia, periodontia e avaliação com câmera intraoral, na Glamm Odontologia de Marília e Garça.'
    },
    ld: grafo([
      clinicaLd(),
      migalhasLd([{ path: 'tratamentos.html', rotulo: 'Tratamentos' }]),
      {
        '@type': 'ItemList',
        name: 'Tratamentos da Glamm Odontologia',
        itemListElement: TRATAMENTOS.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: t.nomeLongo,
          url: `${CLINICA.origem}/tratamentos/${t.slug}.html`
        }))
      }
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* Tratamento, uma página por item                                     */
/* ------------------------------------------------------------------ */

export function tratamento(ctx, t) {
  const b = '../';
  const body = `
${migalhas(b, [{ path: 'tratamentos.html', rotulo: 'Tratamentos' }, { rotulo: t.nome }])}
<section class="cabeca cabeca-trat">
  <div class="env">
    <span class="cabeca-ico" aria-hidden="true">${ICO[t.icone]}</span>
    <p class="eyebrow">Tratamento</p>
    <h1>${esc(t.nomeLongo)}</h1>
    <p class="cabeca-sub">${esc(t.descricao)}</p>
  </div>
</section>

<section class="sec">
  <div class="env">
    <div class="prosa prosa-larga">
      ${t.conteudo.map(c => `
      <h2>${esc(c.h)}</h2>
      <p>${esc(c.p)}</p>`).join('')}
    </div>
    ${avisoClinico}
  </div>
</section>

${secao({
  eyebrow: 'Dúvidas',
  titulo: `Sobre ${esc(t.nome.toLowerCase())}`,
  corpo: listaDuvidas(t.duvidas)
})}

<section class="cta">
  <div class="env cta-conteudo">
    <span class="cta-marca" aria-hidden="true">${simbolo()}</span>
    <h2>Saber se serve para o seu caso leva uma consulta</h2>
    <p>Na avaliação o exame é feito com você vendo, e o plano sai por escrito. Agende na unidade mais perto.</p>
    ${botoesUnidades('cta-acoes')}
  </div>
</section>

${secao({
  eyebrow: 'Outros tratamentos',
  titulo: 'Veja também',
  classe: 'sec-relacionados',
  corpo: gradeTratamentos(b, { atual: t.slug })
})}`;

  return {
    p: {
      path: `tratamentos/${t.slug}.html`, base: b, classe: 'pg-tratamento',
      pai: 'tratamentos.html',
      titulo: t.nomeLongo,
      descricao: `${t.descricao} Na Glamm Odontologia, com unidades em Marília e Garça, São Paulo.`.slice(0, 300)
    },
    ld: grafo([
      clinicaLd(),
      migalhasLd([{ path: 'tratamentos.html', rotulo: 'Tratamentos' }, { path: `tratamentos/${t.slug}.html`, rotulo: t.nome }]),
      {
        '@type': 'MedicalWebPage',
        '@id': `${CLINICA.origem}/tratamentos/${t.slug}.html#pagina`,
        name: t.nomeLongo,
        description: t.descricao,
        inLanguage: 'pt-BR',
        about: {
          '@type': 'MedicalProcedure',
          name: t.nomeLongo,
          description: t.descricao,
          procedureType: 'https://schema.org/NoninvasiveProcedure',
          howPerformed: t.conteudo[0].p
        },
        provider: { '@id': ID_CLINICA() },
        audience: { '@type': 'Patient' }
      },
      faqLd(t.duvidas)
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* Unidades, página índice                                             */
/* ------------------------------------------------------------------ */

export function unidades(ctx) {
  const b = '';
  const body = `
${migalhas(b, [{ path: 'unidades.html', rotulo: 'Unidades' }])}
<section class="cabeca">
  <div class="env">
    <p class="eyebrow">Unidades</p>
    <h1>Marília e Garça</h1>
    <p class="cabeca-sub">Duas unidades da mesma clínica, com os mesmos tratamentos. O que muda é o endereço, o horário e o telefone. Cada unidade tem o seu próprio número de WhatsApp.</p>
  </div>
</section>

${secao({
  classe: 'sec-unidades',
  corpo: `<div class="unid-grade">${UNIDADES.map(u => cartaoUnidade(u, b)).join('')}</div>`
})}

${secao({
  eyebrow: 'Comparação',
  titulo: 'As duas lado a lado',
  corpo: `
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
        <tr><th scope="row">Dias de semana</th>${UNIDADES.map(u => `<td>${u.horarios.filter(h => h.dias !== 'Sábado').map(h => `${esc(h.dias)}, ${esc(h.abre.replace(':', 'h'))} às ${esc(h.fecha.replace(':', 'h'))}`).join('<br>')}</td>`).join('')}</tr>
        <tr><th scope="row">Sábado</th>${UNIDADES.map(u => {
          const s = u.horarios.find(h => h.dias === 'Sábado');
          return `<td>${s ? `${esc(s.abre.replace(':', 'h'))} às ${esc(s.fecha.replace(':', 'h'))}` : 'Não atende'}</td>`;
        }).join('')}</tr>
        <tr><th scope="row">Tratamentos</th>${UNIDADES.map(() => '<td>Todos os sete</td>').join('')}</tr>
      </tbody>
    </table>
  </div>`
})}`;

  return {
    p: {
      path: 'unidades.html', base: '', classe: 'pg-unidades',
      titulo: 'Unidades em Marília e Garça',
      descricao: 'Endereço, horário e telefone das duas unidades da Glamm Odontologia: Marília, no bairro Fragata, e Garça, no bairro Williams. Cada unidade com o seu próprio WhatsApp.'
    },
    ld: grafo([
      clinicaLd(),
      ...UNIDADES.map(unidadeLd),
      migalhasLd([{ path: 'unidades.html', rotulo: 'Unidades' }])
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* Unidade, uma página por cidade                                      */
/* ------------------------------------------------------------------ */

export function unidade(ctx, u) {
  const b = '../';
  const outra = UNIDADES.find(x => x.id !== u.id);

  const duvidasUnidade = [
    {
      q: `Qual é o endereço da Glamm Odontologia em ${u.cidade}?`,
      r: `${u.enderecoCompleto}. A unidade fica ${u.referencia}.`
    },
    {
      q: `Qual é o telefone da unidade de ${u.cidade}?`,
      r: `${u.telefone}. É o número da unidade de ${u.cidade} e atende também por WhatsApp. A unidade de ${outra.cidade} tem outro número, ${outra.telefone}.`
    },
    {
      q: `Que horas a unidade de ${u.cidade} abre?`,
      r: u.horarios.map(h => `${h.dias}, das ${h.abre.replace(':', 'h')} às ${h.fecha.replace(':', 'h')}`).join('. ') + '. ' + u.fechado
    },
    ...DUVIDAS.filter(d => d.q.includes('convênio') || d.q.includes('primeira consulta'))
  ];

  const body = `
${migalhas(b, [{ path: 'unidades.html', rotulo: 'Unidades' }, { rotulo: u.cidade }])}
<section class="cabeca cabeca-unid">
  <div class="env">
    <p class="eyebrow">Unidade</p>
    <h1>Glamm Odontologia em ${esc(u.cidade)}</h1>
    <p class="cabeca-sub">${esc(u.resumo)}</p>
    <div class="cabeca-acoes">
      ${botao({ href: u.whatsapp, texto: `Agendar em ${u.cidade}`, tipo: 'principal', icone: ICO.whatsapp, externo: true })}
      ${botao({ href: u.mapa, texto: 'Abrir no mapa', tipo: 'discreto', icone: ICO.local, externo: true })}
    </div>
  </div>
</section>

<section class="sec sec-ficha">
  <div class="env ficha-grade">
    <div class="ficha-bloco">
      <h2>Endereço</h2>
      <address class="ficha-end">
        ${esc(u.logradouro)}, ${esc(u.numero)}<br>
        ${esc(u.bairro)}<br>
        ${esc(u.cidade)}, ${esc(u.uf)}<br>
        CEP ${esc(u.cep)}
      </address>
      <p class="ficha-ref">${ICO.local}<span>${esc(u.referencia.charAt(0).toUpperCase() + u.referencia.slice(1))}.</span></p>
      <p><a class="link-seta" href="${esc(u.mapa)}" target="_blank" rel="noopener noreferrer">Ver no Google Maps ${ICO.seta}</a></p>
    </div>

    <div class="ficha-bloco">
      <h2>Horário</h2>
      <dl class="ficha-horario">
        ${u.horarios.map(h => `<div><dt>${esc(h.dias)}</dt><dd>${esc(h.abre.replace(':', 'h'))} às ${esc(h.fecha.replace(':', 'h'))}</dd></div>`).join('')}
      </dl>
      <p class="ficha-fechado">${ICO.relogio}<span>${esc(u.fechado)}</span></p>
    </div>

    <div class="ficha-bloco">
      <h2>Contato</h2>
      <p class="ficha-tel"><a href="tel:+${esc(u.e164)}">${esc(u.telefone)}</a></p>
      <p class="ficha-nota">Este número é só da unidade de ${esc(u.cidade)}. A unidade de ${esc(outra.cidade)} atende no ${esc(outra.telefone)}.</p>
      <p><a class="link-seta" href="${esc(u.whatsapp)}" target="_blank" rel="noopener noreferrer">Abrir conversa no WhatsApp ${ICO.seta}</a></p>
    </div>
  </div>
</section>

${secao({
  eyebrow: 'Tratamentos',
  titulo: `O que é atendido em ${esc(u.cidade)}`,
  intro: 'Os sete tratamentos com página própria são atendidos nas duas unidades.',
  corpo: gradeTratamentos(b)
})}

${secao({
  eyebrow: 'Dúvidas',
  titulo: `Sobre a unidade de ${esc(u.cidade)}`,
  corpo: listaDuvidas(duvidasUnidade)
})}

${secao({
  classe: 'sec-outra',
  corpo: `
  <div class="bloco-nota">
    <h2>A outra unidade</h2>
    <p>A Glamm também atende em ${esc(outra.cidade)}, ${esc(outra.referencia)}, com os mesmos tratamentos e outro telefone.</p>
    ${cartaoUnidade(outra, b, { compacto: true })}
    <p><a class="link-seta" href="${b}unidades/${outra.slug}.html">Ver a unidade de ${esc(outra.cidade)} ${ICO.seta}</a></p>
  </div>`
})}`;

  return {
    p: {
      path: `unidades/${u.slug}.html`, base: b, classe: 'pg-unidade',
      pai: 'unidades.html',
      titulo: `Dentista em ${u.cidade} SP`,
      tituloCompleto: `Dentista em ${u.cidade} SP | ${CLINICA.nome}`,
      descricao: `Glamm Odontologia em ${u.cidade}, ${u.enderecoLinha}, ${u.bairro}, ${u.referencia}. Telefone e WhatsApp ${u.telefone}. ${u.horarios.map(h => `${h.dias} das ${h.abre.replace(':', 'h')} às ${h.fecha.replace(':', 'h')}`).join('. ')}.`
    },
    ld: grafo([
      clinicaLd(),
      unidadeLd(u),
      migalhasLd([{ path: 'unidades.html', rotulo: 'Unidades' }, { path: `unidades/${u.slug}.html`, rotulo: u.cidade }]),
      faqLd(duvidasUnidade)
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* A clínica                                                           */
/* ------------------------------------------------------------------ */

export function aClinica(ctx) {
  const b = '';
  const body = `
${migalhas(b, [{ path: 'a-clinica.html', rotulo: 'A clínica' }])}
<section class="cabeca">
  <div class="env">
    <p class="eyebrow">A clínica</p>
    <h1>Uma clínica, duas cidades</h1>
    <p class="cabeca-sub">A Glamm Odontologia atende em Marília e em Garça, no interior de São Paulo, com atendimento particular e uma primeira consulta dedicada à avaliação.</p>
  </div>
</section>

${secao({
  corpo: `
  <div class="prosa prosa-larga">
    <h2>Como o atendimento é organizado</h2>
    <p>A clínica trabalha com uma consulta de avaliação antes de qualquer procedimento. Ela leva de quarenta a sessenta minutos e existe para três coisas: examinar, entender o que levou você até lá e apresentar um plano de tratamento por escrito, com a sequência do que precisa ser feito e o que cada etapa envolve.</p>
    <p>Esse plano é o documento da conversa. Ele diz o que é urgente, o que pode esperar, o que é opcional e em que ordem as coisas fazem sentido. Você leva o plano e decide fora da cadeira.</p>

    <h2>Atendimento particular</h2>
    <p>A Glamm não trabalha com convênio odontológico. Está escrito aqui, na página inicial e na página de dúvidas, porque descobrir isso na recepção é uma perda de tempo evitável.</p>

    <h2>Duas unidades com o mesmo padrão</h2>
    <p>Marília e Garça atendem os mesmos tratamentos. A diferença entre elas é de endereço, telefone e horário: a unidade de Garça abre até as vinte horas de segunda a sexta e atende aos sábados até as quatorze horas, enquanto a de Marília atende de segunda a sexta.</p>
    <p>Cada unidade tem o seu próprio número de WhatsApp, e todo botão de agendamento deste site já abre a conversa com a unidade escolhida. Isso parece detalhe e não é: publicar um número só para duas unidades faz o paciente de uma cidade ligar para a outra.</p>

    <h2>Sobre esta página e o que ela não faz</h2>
    <p>Este site não publica imagem de diagnóstico nem de resultado de tratamento, não reproduz avaliação de paciente e não faz publicidade de caráter comercial. Não é uma escolha de estilo: o Código de Ética Odontológica trata dessas três coisas nos artigos 43 e 44, e a Resolução CFO 196 de 2019 é expressa ao dizer que pessoa jurídica não divulga imagem de resultado de tratamento.</p>
    <p>O que este site publica é o que a clínica é, onde ela fica, o que ela trata e como funciona chegar lá.</p>
  </div>`
})}

${secao({
  eyebrow: 'Identificação',
  titulo: 'Quem responde por este atendimento',
  classe: 'sec-ident',
  corpo: `
  <div class="ident">
    <dl class="ident-lista">
      <div><dt>Razão social</dt><dd>${esc(CLINICA.razaoSocial)}</dd></div>
      <div><dt>Inscrição da clínica no CRO-SP</dt><dd>${ctx.dado(CLINICA.croClinica, 'Número de inscrição da clínica no CRO-SP')}</dd></div>
      <div><dt>Responsável técnica</dt><dd>${esc(CLINICA.responsavelTecnica)}, cirurgiã-dentista</dd></div>
      <div><dt>Inscrição da responsável técnica</dt><dd>${ctx.dado(CLINICA.croResponsavel, 'Número de inscrição da responsável técnica no CRO-SP')}</dd></div>
      <div><dt>CNPJ, unidade de Marília</dt><dd>${esc(CLINICA.cnpjMatriz)}</dd></div>
      <div><dt>CNPJ, unidade de Garça</dt><dd>${esc(CLINICA.cnpjFilial)}</dd></div>
      <div><dt>Atividade registrada</dt><dd>${esc(CLINICA.cnae)}, ${esc(CLINICA.cnaeDescricao)}</dd></div>
    </dl>
    <p class="ident-nota">O artigo 43 do Código de Ética Odontológica torna obrigatório informar, em qualquer comunicação, o nome e o número de inscrição da pessoa jurídica e também o nome e o número de inscrição do responsável técnico. Por isso esses dados aparecem no rodapé de todas as páginas.</p>
  </div>`
})}

<section class="cta">
  <div class="env cta-conteudo">
    <span class="cta-marca" aria-hidden="true">${simbolo()}</span>
    <h2>Comece pela avaliação</h2>
    <p>Escolha a unidade que fica melhor para você e mande uma mensagem.</p>
    ${botoesUnidades('cta-acoes')}
  </div>
</section>`;

  return {
    p: {
      path: 'a-clinica.html', base: '', classe: 'pg-clinica',
      titulo: 'A clínica',
      descricao: 'Como funciona o atendimento na Glamm Odontologia: consulta de avaliação, plano de tratamento por escrito e atendimento particular, nas unidades de Marília e Garça, São Paulo.'
    },
    ld: grafo([
      clinicaLd(),
      ...UNIDADES.map(unidadeLd),
      migalhasLd([{ path: 'a-clinica.html', rotulo: 'A clínica' }])
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* Equipe                                                              */
/* ------------------------------------------------------------------ */

export function equipe(ctx) {
  const b = '';

  /* Pendência estrutural: sem esta relação, a clínica não pode anunciar
     especialidade (art. 43 §2º). É a pendência mais importante do projeto e
     precisa travar a produção mesmo que ninguém a veja na página. */
  ctx.pendencia(EQUIPE_PENDENTE);

  const body = `
${migalhas(b, [{ path: 'equipe.html', rotulo: 'Equipe' }])}
<section class="cabeca">
  <div class="env">
    <p class="eyebrow">Equipe</p>
    <h1>Quem vai te atender</h1>
    <p class="cabeca-sub">Toda pessoa que atende na Glamm é cirurgiã-dentista ou cirurgião-dentista com inscrição no Conselho Regional de Odontologia. Esta página existe para você conferir isso antes de sentar na cadeira.</p>
  </div>
</section>

${secao({
  classe: 'sec-equipe',
  corpo: `
  <div class="equipe-grade">
    ${EQUIPE.map(m => `
    <article class="pessoa">
      <span class="pessoa-marca" aria-hidden="true">${simbolo()}</span>
      <h2>${esc(m.nome)}</h2>
      <p class="pessoa-papel">${esc(m.papel)}</p>
      <dl class="pessoa-dados">
        <div><dt>Inscrição no CRO-SP</dt><dd>${ctx.dado(m.cro, 'Número de inscrição da responsável técnica no CRO-SP')}</dd></div>
        <div><dt>Formação</dt><dd>${esc(m.formacao)}</dd></div>
        <div><dt>${esc(m.especialidadeRotulo)}</dt><dd>${ctx.dado(m.especialidade, 'Especialidade registrada no CRO da responsável técnica')}</dd></div>
      </dl>
    </article>`).join('')}

    <article class="pessoa pessoa-vaga">
      <h2>Os demais profissionais da equipe</h2>
      <p>A clínica atende com mais profissionais além da fundadora, nas duas unidades. Os nomes, as inscrições no CRO e as especialidades registradas de cada um entram aqui assim que a clínica confirmar os dados e autorizar a publicação.</p>
      <p class="pessoa-nota">Enquanto isso, este site não anuncia especialidade em nome da clínica. O artigo 43, parágrafo segundo, do Código de Ética Odontológica só permite que a pessoa jurídica anuncie especialidades se tiver profissional inscrito naquela especialidade e disponibilizar ao público a relação desses profissionais com as respectivas qualificações. Publicar a lista é o que destrava a afirmação.</p>
    </article>
  </div>`
})}

${secao({
  eyebrow: 'Como conferir',
  titulo: 'Você pode checar qualquer inscrição',
  corpo: `
  <div class="prosa">
    <p>O Conselho Federal de Odontologia mantém consulta pública de inscrição. Com o número do CRO ou o nome do profissional é possível conferir se a inscrição existe, se está ativa e quais especialidades estão registradas.</p>
    <p>Isso vale para qualquer clínica, não só para esta. Uma clínica que publica a inscrição de quem atende é uma clínica que espera ser conferida.</p>
    <p><a class="link-seta" href="https://website.cfo.org.br/consulta-de-profissionais-e-entidades/" target="_blank" rel="noopener noreferrer">Consulta pública do Conselho Federal de Odontologia ${ICO.seta}</a></p>
  </div>`
})}

${secao({
  classe: 'sec-nome',
  corpo: `
  <div class="bloco-nota">
    <h2>Sobre o nome</h2>
    <p>A clínica se chama <strong>Glamm Odontologia</strong>. Parte das pessoas conhece o atendimento pelo nome da fundadora, ${esc(CLINICA.nomeAnterior)}, que é como as unidades ainda aparecem em alguns lugares. É a mesma clínica, nos mesmos endereços, com a mesma equipe.</p>
  </div>`
})}`;

  return {
    p: {
      path: 'equipe.html', base: '', classe: 'pg-equipe',
      titulo: 'Equipe',
      descricao: 'A equipe da Glamm Odontologia, com nome, inscrição no CRO-SP e formação de cada profissional. Atendimento nas unidades de Marília e Garça, São Paulo.'
    },
    ld: grafo([
      clinicaLd(),
      migalhasLd([{ path: 'equipe.html', rotulo: 'Equipe' }])
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* Agendamento                                                         */
/* ------------------------------------------------------------------ */

export function agendamento(ctx) {
  const b = '';
  const body = `
${migalhas(b, [{ path: 'agendamento.html', rotulo: 'Agendar' }])}
<section class="cabeca">
  <div class="env">
    <p class="eyebrow">Agendar</p>
    <h1>Agende sua avaliação</h1>
    <p class="cabeca-sub">Escolha a unidade, diga o que te levou até aqui e o site monta a mensagem. Você revisa e envia pelo seu próprio WhatsApp.</p>
  </div>
</section>

<section class="sec">
  <div class="env">
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
        <h2 id="rotulo-previa">A mensagem que vai ser enviada</h2>
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
</section>

${secao({
  eyebrow: 'Prefere ligar',
  titulo: 'Os números, por unidade',
  corpo: `<div class="unid-grade">${UNIDADES.map(u => cartaoUnidade(u, b)).join('')}</div>`
})}`;

  return {
    p: {
      path: 'agendamento.html', base: '', classe: 'pg-agendamento',
      titulo: 'Agendar avaliação',
      descricao: 'Agende sua consulta de avaliação na Glamm Odontologia, em Marília ou em Garça. Escolha a unidade e o site monta a mensagem de WhatsApp para você revisar e enviar.'
    },
    ld: grafo([
      clinicaLd(),
      ...UNIDADES.map(unidadeLd),
      migalhasLd([{ path: 'agendamento.html', rotulo: 'Agendar' }])
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* Dúvidas                                                             */
/* ------------------------------------------------------------------ */

export function duvidas(ctx) {
  const b = '';
  const porTratamento = TRATAMENTOS.flatMap(t => t.duvidas.map(d => ({ ...d, t })));

  const body = `
${migalhas(b, [{ path: 'duvidas.html', rotulo: 'Dúvidas' }])}
<section class="cabeca">
  <div class="env">
    <p class="eyebrow">Dúvidas frequentes</p>
    <h1>Perguntas e respostas</h1>
    <p class="cabeca-sub">O que mais se pergunta antes da primeira consulta, respondido sem rodeio. Se ficar faltando alguma coisa, pergunte no WhatsApp da unidade.</p>
  </div>
</section>

${secao({
  eyebrow: 'Atendimento',
  titulo: 'Sobre a clínica e as consultas',
  corpo: listaDuvidas(DUVIDAS)
})}

${secao({
  eyebrow: 'Tratamentos',
  titulo: 'Sobre os procedimentos',
  intro: 'Cada tratamento tem uma página própria com mais detalhe.',
  corpo: `
  <div class="faq-por-trat">
    ${TRATAMENTOS.map(t => `
    <div class="faq-grupo">
      <h3><a href="${b}tratamentos/${t.slug}.html">${esc(t.nomeLongo)}</a></h3>
      ${listaDuvidas(t.duvidas, { classe: 'faq faq-aninhada' })}
    </div>`).join('')}
  </div>`
})}

<section class="cta">
  <div class="env cta-conteudo">
    <span class="cta-marca" aria-hidden="true">${simbolo()}</span>
    <h2>Ficou alguma pergunta</h2>
    <p>Mande no WhatsApp da unidade mais perto de você. A resposta vem de quem atende.</p>
    ${botoesUnidades('cta-acoes')}
  </div>
</section>`;

  return {
    p: {
      path: 'duvidas.html', base: '', classe: 'pg-duvidas',
      titulo: 'Dúvidas frequentes',
      descricao: 'Convênio, duração da primeira consulta, medo de dentista, diferença entre as unidades de Marília e Garça e dúvidas sobre cada tratamento da Glamm Odontologia.'
    },
    ld: grafo([
      clinicaLd(),
      migalhasLd([{ path: 'duvidas.html', rotulo: 'Dúvidas' }]),
      faqLd(DUVIDAS.concat(porTratamento.map(d => ({ q: d.q, r: d.r }))))
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* Privacidade                                                         */
/* ------------------------------------------------------------------ */

export function privacidade(ctx) {
  const b = '';
  const body = `
${migalhas(b, [{ path: 'privacidade.html', rotulo: 'Privacidade' }])}
<section class="cabeca">
  <div class="env">
    <p class="eyebrow">Privacidade</p>
    <h1>O que este site faz com os seus dados</h1>
    <p class="cabeca-sub">A resposta curta é: nada. A resposta longa está abaixo, e pode ser conferida no código da página.</p>
  </div>
</section>

${secao({
  corpo: `
  <div class="prosa prosa-larga">
    <h2>Este site não coleta dados</h2>
    <p>Não há formulário que envie informação para lugar nenhum, não há cadastro, não há login e não há comentário. A página de agendamento monta um texto dentro do seu próprio aparelho e abre o WhatsApp com ele escrito. Enquanto você não tocar em enviar, dentro do WhatsApp, nada saiu de onde estava.</p>

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
      path: 'privacidade.html', base: '', classe: 'pg-privacidade',
      titulo: 'Privacidade',
      descricao: 'Este site não coleta dados, não usa cookie, não carrega rastreador e não envia formulário. Como a página impede isso, e o que acontece quando você fala com a clínica pelo WhatsApp.'
    },
    ld: grafo([
      clinicaLd(),
      migalhasLd([{ path: 'privacidade.html', rotulo: 'Privacidade' }])
    ]),
    body
  };
}

/* ------------------------------------------------------------------ */
/* 404                                                                 */
/* ------------------------------------------------------------------ */

export function naoEncontrada(ctx) {
  const b = '';
  const body = `
<section class="cabeca cabeca-404">
  <div class="env">
    <span class="cabeca-marca" aria-hidden="true">${simbolo('simbolo simbolo-grande')}</span>
    <p class="eyebrow">Erro 404</p>
    <h1>Esta página não existe</h1>
    <p class="cabeca-sub">O endereço pode ter mudado, ou o link pode ter vindo com um caractere a mais. Abaixo está tudo que o site tem.</p>
  </div>
</section>

${secao({
  corpo: `
  <ul class="mapa-site">
    <li><a href="${b}index.html">Início</a></li>
    ${MENU.map(m => `<li><a href="${b}${m.path}">${esc(m.rotulo)}</a></li>`).join('')}
    <li><a href="${b}agendamento.html">Agendar avaliação</a></li>
    ${UNIDADES.map(u => `<li><a href="${b}unidades/${u.slug}.html">Unidade de ${esc(u.cidade)}</a></li>`).join('')}
    ${TRATAMENTOS.map(t => `<li><a href="${b}tratamentos/${t.slug}.html">${esc(t.nome)}</a></li>`).join('')}
    <li><a href="${b}privacidade.html">Privacidade</a></li>
  </ul>`
})}`;

  return {
    p: {
      path: '404.html', base: '', classe: 'pg-404',
      titulo: 'Página não encontrada',
      descricao: 'A página procurada não existe neste site. Veja abaixo a lista completa de páginas da Glamm Odontologia, com as unidades de Marília e Garça e todos os tratamentos.'
    },
    ld: null,
    body
  };
}
