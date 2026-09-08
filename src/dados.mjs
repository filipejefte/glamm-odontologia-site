/* =========================================================================
   FONTE ÚNICA DE VERDADE do site da Glamm Odontologia.

   Nada de conteúdo factual é escrito direto no HTML: tudo sai daqui. Para
   corrigir um telefone, um endereço ou um horário, mexa neste arquivo e rode
   `node build.mjs --preview` de novo.

   REGRA DOS CAMPOS `null`
   Campo com valor `null` é dado que ninguém confirmou com a clínica. Na
   prévia ele vira uma marcação visível "a confirmar"; na build de produção
   ele derruba o processo. É de propósito: um site que não publica é melhor
   que um site que publica o telefone errado de uma unidade. Foi exatamente
   isso que o diagnóstico encontrou no site atual.

   PROCEDÊNCIA
   Cada bloco diz de onde veio o dado, com as marcas usadas no dossiê:
     [receita]  Receita Federal, fichas da matriz e da filial
     [site]     dragabrielatukasan.com.br, site atual da clínica
     [maps]     fichas do Google Maps das duas unidades
     [meta]     Biblioteca de Anúncios da Meta
     [insta]    perfis @glammodontologia e @dragabrielatukasan
     [rdap]     consulta RDAP no Registro.br
   Onde as fontes divergem, está escrito qual venceu e por quê. O detalhamento
   está em interno/NOTAS-INTERNAS.md.
   ========================================================================= */

/* -------------------------------------------------------------------------
   1. Identidade

   A decisão que organiza o site inteiro: o negócio se chama GLAMM
   ODONTOLOGIA, em todo lugar, sem exceção. O diagnóstico encontrou três
   nomes públicos disputando a mesma identidade (Glamm no CNPJ e nos
   anúncios, Dra. Gabriela Tukasan no Google e no domínio, os dois no
   Instagram). Escolher um nome e repeti-lo é o conserto mais barato e o de
   maior efeito, tanto para busca comum quanto para assistente de IA.
   ------------------------------------------------------------------------- */

export const CLINICA = {
  nome: 'Glamm Odontologia',
  nomeCurto: 'Glamm',
  assinatura: 'Clínica odontológica',

  /* Nome sob o qual a profissional é conhecida hoje no Google e no
     Instagram. Aparece no site UMA vez, na página da equipe, para ligar as
     duas identidades sem competir com a marca. `[maps]` `[insta]` */
  nomeAnterior: 'Dra. Gabriela Tukasan',

  /* `[receita]` matriz e filial, situação ativa nas duas. */
  razaoSocial: 'Glamm Odontologia LTDA',
  cnpjMatriz: '58.268.637/0001-43',
  cnpjFilial: '58.268.637/0002-24',
  naturezaJuridica: 'Sociedade empresária limitada',
  cnae: '86.30-5-04',
  cnaeDescricao: 'Atividade odontológica',

  /* IDENTIFICAÇÃO OBRIGATÓRIA (art. 43 do Código de Ética Odontológica,
     Resolução CFO-118/2012): em qualquer comunicação é obrigatório constar o
     nome e o número de inscrição da pessoa jurídica e, também, o nome e o
     número de inscrição do responsável técnico.

     Os dois números existem e estão publicados pela própria clínica, mas em
     canais diferentes e colados a entidades diferentes:
       site       "registrada sobre o CRO-SP nº 125.985"  (pessoa física)
       Instagram  "CROCL 033836 RT: @dragabrielatukasanreis"
       anúncios   "RT: Gabriela Vera Tukasan dos Reis / CRO: 033836"
     A leitura provável é que 033836 seja o registro da CLÍNICA (o prefixo
     CROCL na bio do Instagram indica pessoa jurídica) e 125.985 o da
     PROFISSIONAL. Provável não basta para publicar identificação obrigatória
     em nome de terceiro: os dois campos ficam `null` até ela confirmar.
     `[site]` `[insta]` `[meta]` */
  croClinica: null,
  responsavelTecnica: 'Gabriela Vera Tukasan dos Reis',
  croResponsavel: null,

  /* Sócia-administradora única, sem segundo sócio no quadro. `[receita]` */
  socia: 'Gabriela Vera Tukasan dos Reis',

  /* Onde este site vai morar enquanto for proposta. O domínio da marca já é
     dela: glammodontologia.com.br, registrado em 27/02/2026, pago até
     27/02/2027, apontando para o DNS automático do Registro.br e sem
     resolver (NXDOMAIN). Ela é titular E contato técnico dos dois domínios,
     então não há nada a comprar nem a negociar para publicar. `[rdap]` */
  origem: 'https://filipejefte.github.io/glamm-odontologia-site',
  dominioProprio: 'glammodontologia.com.br',
  dominioAnterior: 'dragabrielatukasan.com.br',

  /* Nenhum e-mail de atendimento foi localizado em fonte pública. */
  email: null,

  /* Perfis públicos, usados em `sameAs` do JSON-LD para o buscador e o
     assistente de IA ligarem as superfícies à mesma entidade. `[insta]` */
  instagram: 'glammodontologia',
  instagramUrl: 'https://www.instagram.com/glammodontologia/',
  instagramPessoal: 'dragabrielatukasan',
  instagramPessoalUrl: 'https://www.instagram.com/dragabrielatukasan/',

  /* Política de atendimento, publicada pela própria clínica na FAQ. Dizer que
     não há convênio é permitido e é informação de serviço (art. 43 §1º IV).
     Condição de pagamento NÃO entra: art. 44, I veda expressamente anunciar
     preços, gratuidade e modalidades de pagamento. O site atual anuncia
     parcelamento na FAQ. Aqui não entra. `[site]` */
  convenios: false,

  /* A afirmação "1.000+ pacientes atendidos" do site atual não entra: não há
     como conferir, e número de atendimento usado como argumento comercial é
     terreno do art. 44. Nota e contagem de avaliação também não entram, por
     duas razões somadas: o material de origem veda expressamente reproduzir,
     e o art. 44 trata de publicidade que comercializa a Odontologia. */

  /* Ano de abertura da matriz. `[receita]` */
  desde: 2024
};

/* -------------------------------------------------------------------------
   2. Unidades

   A assimetria que define o caso: Garça tem a nota mais alta das duas
   unidades e o horário mais amplo, e estava fora de quase tudo. Zero
   anúncios, categoria trocada no mapa, telefone errado publicado no rodapé
   do site atual e nenhuma página própria.

   Por isso as duas unidades têm, aqui, exatamente o mesmo peso: página
   própria, endereço por extenso, telefone próprio e WhatsApp próprio. E o
   telefone de cada unidade é lido SEMPRE deste objeto, nunca escrito na mão.
   ------------------------------------------------------------------------- */

/* Mapa por busca de endereço, nunca por ponto salvo. As duas fichas do Google
   estão no nome da profissional, e a de Garça carrega bairro e CEP que não
   batem com a Receita nem com o site. Busca por endereço leva ao lugar certo
   independentemente do que a ficha diz. */
const mapa = (endereco) =>
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(endereco);

/* Mensagem já escrita, para a conversa começar com contexto. Quem recebe já
   sabe de qual unidade a pessoa veio, o que era um dos furos apontados no
   diagnóstico da jornada. */
const zap = (e164, texto) =>
  `https://wa.me/${e164}?text=` + encodeURIComponent(texto);

export const UNIDADES = [
  {
    id: 'marilia',
    slug: 'marilia',
    cidade: 'Marília',
    uf: 'SP',
    nome: 'Glamm Odontologia Marília',
    resumo: 'A unidade de Marília fica no Fragata, a poucos passos do Fórum Estadual.',

    /* `[receita]` grafa "Marrey Junior"; o site e o Google grafam "Marrei
       Júnior". Publicamos a grafia dos canais públicos, que é a que o
       paciente digita no mapa e a que o Google resolve. A divergência com o
       cadastro federal fica registrada como pendência: quem corrige é a
       clínica, no cadastro. */
    logradouro: 'Rua Marrei Júnior',
    numero: '49',
    bairro: 'Fragata',
    cep: '17519-010',
    referencia: 'próximo ao Fórum Estadual',

    /* `[maps]` `[site]` `[meta]`. Confirmado nas três superfícies. */
    telefone: '(14) 99618-1654',
    e164: '5514996181654',

    /* `[maps]`. O site atual publica "segunda a sexta, 8h às 19h"; a ficha do
       Google abre a sexta às 8h30. Publicamos a versão do Google porque, na
       dúvida entre dois horários de abertura, o mais tarde é o que não manda
       ninguém para uma porta fechada. Fica como pendência. */
    horarios: [
      { dias: 'Segunda a quinta', abre: '08:00', fecha: '19:00', diasIso: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
      { dias: 'Sexta', abre: '08:30', fecha: '19:00', diasIso: ['Friday'] }
    ],
    fechado: 'Não atende aos sábados e domingos.',

    get enderecoLinha() { return `${this.logradouro}, ${this.numero}`; },
    get enderecoCompleto() {
      return `${this.logradouro}, ${this.numero}, ${this.bairro}, ${this.cidade} ${this.uf}, CEP ${this.cep}`;
    },
    get mapa() { return mapa(`${this.logradouro}, ${this.numero}, ${this.bairro}, ${this.cidade}, ${this.uf}, ${this.cep}`); },
    get whatsapp() {
      return zap(this.e164, 'Olá! Vim pelo site da Glamm Odontologia e gostaria de agendar uma avaliação na unidade de Marília.');
    }
  },
  {
    id: 'garca',
    slug: 'garca',
    cidade: 'Garça',
    uf: 'SP',
    nome: 'Glamm Odontologia Garça',
    resumo: 'A unidade de Garça fica ao lado da Prefeitura Municipal e atende também aos sábados.',

    /* `[receita]` e `[site]` dizem bairro Williams, CEP 17402-000. `[maps]`
       diz Centro, CEP 17400-000, e ainda quebra o nome da rua como
       "Voluntários, de - 32". Publicamos a versão em que duas fontes
       independentes concordam, e registramos a pendência: o que precisa ser
       corrigido é a ficha do Google, não o site. */
    logradouro: 'Rua Voluntários de 32',
    numero: '147',
    bairro: 'Williams',
    cep: '17402-000',
    referencia: 'ao lado da Prefeitura Municipal',

    /* `[maps]` e o botão "agendar em Garça" do próprio site atual apontam
       este número. O RODAPÉ do site atual publica o de Marília para as duas
       unidades: quem lê o rodapé e liga para Garça cai em Marília. Este é o
       erro mais caro do diagnóstico e é o motivo de o telefone nunca ser
       escrito na mão neste projeto. */
    telefone: '(14) 99757-7764',
    e164: '5514997577764',

    /* `[maps]` e `[site]` concordam. */
    horarios: [
      { dias: 'Segunda a sexta', abre: '08:00', fecha: '20:00', diasIso: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
      { dias: 'Sábado', abre: '08:00', fecha: '14:00', diasIso: ['Saturday'] }
    ],
    fechado: 'Não atende aos domingos.',

    get enderecoLinha() { return `${this.logradouro}, ${this.numero}`; },
    get enderecoCompleto() {
      return `${this.logradouro}, ${this.numero}, ${this.bairro}, ${this.cidade} ${this.uf}, CEP ${this.cep}`;
    },
    get mapa() { return mapa(`${this.logradouro}, ${this.numero}, ${this.bairro}, ${this.cidade}, ${this.uf}, ${this.cep}`); },
    get whatsapp() {
      return zap(this.e164, 'Olá! Vim pelo site da Glamm Odontologia e gostaria de agendar uma avaliação na unidade de Garça.');
    }
  }
];

export const POR_ID = Object.fromEntries(UNIDADES.map(u => [u.id, u]));

/* -------------------------------------------------------------------------
   3. Tratamentos

   Os sete estão publicados na copy do site atual. Cada um ganha URL própria,
   que é o conserto do achado "página única, sem rota por cidade nem por
   tratamento": hoje todo o conteúdo vive em `/` e não há nada para o
   buscador ranquear por tratamento.

   O TEXTO FOI REESCRITO, não copiado. Três coisas saíram de propósito:

   1. Superlativo e promessa de resultado. "Elimina de vez a dor",
      "resultado visível já nas primeiras sessões" e "câmera intraoral de
      última geração" viram descrição do que o procedimento é. O art. 44, III
      veda anunciar equipamento e técnica como diferencial não comprovado.
   2. A palavra "especialista" como atributo da clínica. O art. 43 §2º só
      permite a pessoa jurídica anunciar especialidade se tiver profissional
      inscrito naquela especialidade no CRO E disponibilizar ao público a
      relação desses profissionais com suas qualificações. Enquanto a relação
      não existir, o site fala de TRATAMENTOS, não de especialistas.
   3. Preço, parcelamento e "antes e depois". Art. 44, I.

   `conteudo` é o que a página desenvolve. Nada aqui é diagnóstico nem
   indicação: é esclarecimento, que é justamente a finalidade que o art. 44,
   V preserva.
   ------------------------------------------------------------------------- */

export const TRATAMENTOS = [
  {
    slug: 'lentes-e-facetas',
    nome: 'Lentes e facetas',
    nomeLongo: 'Lentes e facetas de resina',
    icone: 'lente',
    resumo: 'Lâminas finas aplicadas sobre a face do dente para mudar formato, tamanho e cor.',
    descricao: 'Uma faceta é uma lâmina fina fixada sobre a superfície do dente para alterar formato, tamanho, alinhamento aparente ou cor. O material e a espessura mudam conforme o caso, e são definidos na avaliação.',
    conteudo: [
      {
        h: 'O que a faceta resolve',
        p: 'A faceta atua sobre a aparência da face visível do dente. Ela é usada quando o incômodo é de forma ou de cor: dentes desgastados na borda, espaços entre um dente e outro, manchas que não saem com clareamento, um dente menor ou girado em relação aos vizinhos.'
      },
      {
        h: 'Resina ou porcelana',
        p: 'A resina composta é esculpida na própria consulta, sobre o dente, e pode ser ajustada, reparada e repolida depois. A porcelana é fabricada em laboratório a partir de uma moldagem. As duas têm indicação, custo de manutenção e durabilidade diferentes, e a escolha depende do caso. Na avaliação a diferença é explicada com o seu dente na frente, não no abstrato.'
      },
      {
        h: 'O que a avaliação precisa checar antes',
        p: 'Faceta é procedimento estético apoiado em saúde. Gengiva inflamada, cárie ativa, apertamento dos dentes durante o sono e mordida desalinhada mudam a indicação e, às vezes, a ordem do tratamento. Por isso a primeira consulta é de avaliação, e não de execução.'
      }
    ],
    duvidas: [
      {
        q: 'Faceta de resina precisa desgastar o dente?',
        r: 'Depende do caso. Há situações em que a resina é aplicada sobre o dente com desgaste mínimo ou nenhum, e há situações em que algum preparo é necessário para o resultado não ficar volumoso. O que define é a posição e o formato do seu dente, e isso só se sabe na avaliação presencial.'
      },
      {
        q: 'Quanto tempo dura uma faceta de resina?',
        r: 'A durabilidade depende de manutenção, higiene, hábitos como roer unha ou ranger os dentes, e do consumo de café, chá e outros pigmentos. A resina pode ser repolida e reparada ao longo do tempo, o que faz parte do acompanhamento.'
      },
      {
        q: 'Faceta e lente de contato dental são a mesma coisa?',
        r: '"Lente de contato dental" é o nome comercial que se popularizou para a faceta muito fina. Tecnicamente as duas são facetas: lâminas aplicadas sobre a face do dente. O que muda de um caso para outro é a espessura, o material e o quanto de preparo o dente precisa, e isso se define no exame, não pelo nome.'
      }
    ]
  },
  {
    slug: 'ortodontia-e-alinhadores',
    nome: 'Ortodontia e alinhadores',
    nomeLongo: 'Ortodontia, aparelho fixo e alinhadores',
    icone: 'alinhador',
    resumo: 'Correção da posição dos dentes e da mordida, com aparelho fixo ou com alinhadores transparentes.',
    descricao: 'Ortodontia é a área que move dentes e corrige a mordida. O movimento pode ser conduzido por aparelho fixo, colado aos dentes, ou por alinhadores transparentes removíveis, trocados em sequência.',
    conteudo: [
      {
        h: 'Não é só estética',
        p: 'Dentes fora de posição mudam onde a força da mastigação cai. Isso aparece com o tempo em desgaste desigual, em pontos que acumulam placa porque a escova não alcança, e em sobrecarga da articulação. O alinhamento é o objetivo visível; a distribuição da força é o objetivo funcional.'
      },
      {
        h: 'Aparelho fixo e alinhador',
        p: 'O aparelho fixo fica colado e trabalha sem depender de lembrança. O alinhador é removível, discreto e sai para comer e escovar, e por isso depende de disciplina de uso, em geral por muitas horas do dia. Nem todo caso é resolvível por alinhador, e nem todo caso precisa de aparelho fixo.'
      },
      {
        h: 'O que define o tempo de tratamento',
        p: 'O tempo depende do quanto e de como os dentes precisam se mover, da resposta biológica de cada pessoa e do cumprimento das consultas de ajuste. Prazo só é possível estimar depois da documentação ortodôntica, que inclui radiografias e modelos.'
      }
    ],
    duvidas: [
      {
        q: 'Alinhador transparente serve para qualquer caso?',
        r: 'Não. Há movimentos que o alinhador executa bem e movimentos que pedem aparelho fixo. A definição vem do plano de tratamento, depois da documentação ortodôntica.'
      },
      {
        q: 'Adulto pode usar aparelho?',
        r: 'Pode. O movimento dentário acontece em qualquer idade, desde que a gengiva e o osso de sustentação estejam saudáveis. Em adulto a avaliação da gengiva antes de começar é ainda mais importante.'
      },
      {
        q: 'Preciso de documentação ortodôntica antes de começar?',
        r: 'Sim. A documentação reúne radiografias, fotografias e modelos dos seus dentes, e é ela que permite planejar o movimento e estimar o tempo. Sem documentação não há plano ortodôntico, apenas suposição.'
      }
    ]
  },
  {
    slug: 'implante-e-protese',
    nome: 'Implante e prótese',
    nomeLongo: 'Implante dentário e prótese',
    icone: 'implante',
    resumo: 'Reposição de dentes perdidos, de um único dente à arcada completa.',
    descricao: 'O implante é um pino de titânio instalado no osso, que passa a fazer o papel da raiz. Sobre ele se instala a prótese, que é a parte visível. Quando o implante não é indicado, a reposição pode ser feita por prótese fixa ou removível.',
    conteudo: [
      {
        h: 'Por que repor um dente que ninguém vê',
        p: 'Dente ausente não fica parado no lugar. Os vizinhos tendem a inclinar para o espaço, o antagonista tende a descer, a mordida muda e o osso da região, sem receber carga, tende a reduzir. Repor é tanto função quanto prevenção do que vem depois.'
      },
      {
        h: 'O que o planejamento precisa saber antes',
        p: 'Implante depende de volume e qualidade de osso, de saúde da gengiva e de condições gerais de saúde. Por isso o planejamento envolve exame de imagem e histórico clínico, e por isso existe caso em que a resposta honesta é preparar a região antes, ou escolher outra solução.'
      },
      {
        h: 'Prótese sobre implante e prótese convencional',
        p: 'A prótese pode se apoiar em implantes ou em dentes remanescentes, e pode ser fixa ou removível. Cada arranjo tem indicação, exigência de manutenção e forma de higiene diferente. A escolha é apresentada com as alternativas na mesa, e não como caminho único.'
      }
    ],
    duvidas: [
      {
        q: 'Implante dói?',
        r: 'A instalação é feita sob anestesia local. O pós-operatório envolve orientação de cuidado e acompanhamento, e o que esperar é explicado antes do procedimento, não depois.'
      },
      {
        q: 'Quanto tempo leva entre o implante e o dente definitivo?',
        r: 'O intervalo existe porque o osso precisa integrar ao implante, e varia conforme a região da boca e a resposta de cada pessoa. O plano de tratamento traz a sequência prevista para o seu caso.'
      },
      {
        q: 'Vou ficar sem dente aparente durante o tratamento?',
        r: 'Na maior parte dos casos existe solução provisória para a região visível durante a fase de integração. Se isso é possível no seu caso, e de que forma, é parte do que o plano de tratamento responde antes de começar.'
      }
    ]
  },
  {
    slug: 'clareamento-dental',
    nome: 'Clareamento dental',
    nomeLongo: 'Clareamento dental',
    icone: 'clareamento',
    resumo: 'Clareamento acompanhado por cirurgião-dentista, em consultório, caseiro supervisionado ou combinado.',
    descricao: 'O clareamento age por um gel à base de peróxido que atravessa o esmalte e quebra as moléculas responsáveis pela cor. Pode ser feito em consultório, em casa com moldeira sob supervisão, ou nos dois formatos combinados.',
    conteudo: [
      {
        h: 'Antes de clarear, avaliar',
        p: 'Nem toda alteração de cor responde a clareamento. Mancha de origem interna, restauração antiga escurecida, trinca e desgaste de esmalte se comportam de maneiras diferentes. Restaurações e facetas não clareiam junto com o dente, o que muda a ordem do tratamento: primeiro clareia, depois se ajusta a cor do que é artificial.'
      },
      {
        h: 'Sensibilidade',
        p: 'Sensibilidade durante o clareamento é comum e costuma ser passageira. Ela é gerenciável com protocolo, intervalo entre sessões e produtos dessensibilizantes, e é um dos motivos de o procedimento ser acompanhado por cirurgião-dentista em vez de resolvido por conta.'
      },
      {
        h: 'Manutenção do resultado',
        p: 'O dente volta a receber pigmento da alimentação com o tempo. Café, chá preto, vinho tinto, molhos escuros e cigarro aceleram o processo. Manutenção periódica faz parte do plano e é discutida desde o começo.'
      }
    ],
    duvidas: [
      {
        q: 'Clareamento estraga o esmalte?',
        r: 'O gel clareador age sobre os pigmentos, e não removendo estrutura do dente. O que exige cuidado é o uso sem avaliação, com produto de origem incerta ou por tempo maior que o orientado, situação em que a sensibilidade e a irritação da gengiva deixam de ser controladas.'
      },
      {
        q: 'Posso clarear se tenho restauração na frente?',
        r: 'Pode, mas é preciso saber que a restauração não muda de cor. Depois que o dente atinge a cor desejada e estabiliza, a restauração costuma precisar de troca para acompanhar.'
      },
      {
        q: 'Qual é a diferença entre o clareamento de consultório e o caseiro?',
        r: 'No de consultório o gel tem concentração mais alta e é aplicado pela equipe, em sessões. No caseiro supervisionado você usa uma moldeira feita para a sua boca, com gel de concentração menor, pelo tempo que o dentista orientar. Muitos casos combinam os dois. A escolha depende do grau de alteração de cor, da sensibilidade e da sua rotina.'
      }
    ]
  },
  {
    slug: 'endodontia',
    nome: 'Endodontia',
    nomeLongo: 'Endodontia, o tratamento de canal',
    icone: 'canal',
    resumo: 'Tratamento da polpa do dente, para manter o dente natural em boca.',
    descricao: 'Endodontia é o tratamento do interior do dente. Quando a polpa, o tecido que contém nervo e vasos, é atingida por cárie profunda, trauma ou trinca, o tratamento de canal remove esse tecido, limpa e sela o espaço interno.',
    conteudo: [
      {
        h: 'Para que serve',
        p: 'O objetivo do tratamento de canal é conservar o dente natural em função. A alternativa, quando não é possível tratar, costuma ser a extração, que abre a conversa sobre reposição. Manter o dente é quase sempre o caminho mais simples.'
      },
      {
        h: 'Dor não é o único sinal',
        p: 'Dor espontânea, dor que acorda à noite e sensibilidade prolongada ao quente são sinais frequentes, mas existem casos que evoluem em silêncio e aparecem só na radiografia, às vezes em consulta de rotina. Um dente que já doeu muito e parou de doer não é necessariamente um dente resolvido.'
      },
      {
        h: 'Depois do canal',
        p: 'Dente tratado endodonticamente perde estrutura e costuma precisar de uma restauração que o proteja da força da mastigação, com frequência uma coroa. O tratamento não termina no canal: termina quando o dente está reconstruído e voltou a mastigar.'
      }
    ],
    duvidas: [
      {
        q: 'Tratamento de canal dói?',
        r: 'O procedimento é feito sob anestesia local. Boa parte do medo associado ao canal vem da dor que leva a pessoa até a consulta, e não do tratamento em si.'
      },
      {
        q: 'Quantas sessões são necessárias?',
        r: 'Varia com o dente, o número de canais e a condição encontrada. Alguns casos se resolvem em sessão única e outros pedem mais de uma. A previsão entra no plano de tratamento.'
      },
      {
        q: 'Dente que fez canal escurece com o tempo?',
        r: 'Pode escurecer, principalmente quando o tratamento foi feito há muitos anos ou quando restou pigmento no interior do dente. Há tratamento para isso, e ele é diferente do clareamento comum, porque age de dentro para fora. A avaliação define qual se aplica.'
      }
    ]
  },
  {
    slug: 'periodontia',
    nome: 'Periodontia',
    nomeLongo: 'Periodontia, o cuidado com a gengiva',
    icone: 'gengiva',
    resumo: 'Tratamento da gengiva e do osso que sustentam os dentes, da limpeza profissional ao contorno estético.',
    descricao: 'Periodontia cuida do que segura o dente: gengiva, ligamento e osso. Vai da limpeza profissional e do tratamento da gengivite e da periodontite até procedimentos que ajustam o contorno gengival.',
    conteudo: [
      {
        h: 'Sangrar ao escovar não é normal',
        p: 'Gengiva saudável não sangra na escovação nem no fio dental. Sangramento é sinal de inflamação, e inflamação não tratada pode progredir para perda do osso que sustenta o dente. Quanto mais cedo se trata, mais simples é o tratamento.'
      },
      {
        h: 'A base de qualquer outro tratamento',
        p: 'Gengiva inflamada muda o resultado de quase tudo que vem depois. Faceta feita sobre gengiva doente muda de aparência quando a gengiva desincha; ortodontia sobre osso comprometido movimenta dente em terreno frágil; implante depende de tecido saudável ao redor. Por isso a periodontia costuma vir primeiro na ordem do plano.'
      },
      {
        h: 'Contorno da gengiva',
        p: 'Sorriso em que a gengiva aparece muito, ou em que ela cobre os dentes de forma desigual, pode ter tratamento periodontal com finalidade estética. A indicação depende da causa, que pode ser gengival, óssea, dentária ou do movimento do lábio.'
      }
    ],
    duvidas: [
      {
        q: 'De quanto em quanto tempo preciso fazer limpeza?',
        r: 'O intervalo é individual e depende do acúmulo de placa e tártaro, da anatomia dos dentes e do histórico de doença periodontal. Ele é definido na avaliação e revisado ao longo do acompanhamento.'
      },
      {
        q: 'Gengiva retraída volta ao lugar?',
        r: 'Depende da causa e da extensão. Há situações com indicação de procedimento de recobrimento e situações em que o objetivo passa a ser estabilizar a retração e tratar o que a provocou.'
      },
      {
        q: 'A limpeza profissional desgasta o esmalte?',
        r: 'A limpeza remove placa e tártaro, que são depósitos sobre o dente, e não a estrutura do dente. Sensibilidade nos dias seguintes pode acontecer, sobretudo quando havia muito tártaro cobrindo a raiz, e costuma passar. Se persistir, avise a equipe.'
      }
    ]
  },
  {
    slug: 'avaliacao-com-camera-intraoral',
    nome: 'Avaliação com câmera intraoral',
    nomeLongo: 'Avaliação com câmera intraoral',
    icone: 'camera',
    resumo: 'A câmera mostra na tela o que você não enxerga no espelho, durante a consulta de avaliação.',
    descricao: 'A câmera intraoral é uma câmera pequena que registra o interior da boca e projeta a imagem ampliada numa tela, durante a consulta. Ela é ferramenta de exame e de comunicação, e integra a avaliação.',
    conteudo: [
      {
        h: 'Para que serve na consulta',
        p: 'A câmera permite que você veja o mesmo que o dentista está vendo, no momento em que ele explica. Uma restauração com infiltração, uma trinca, um acúmulo em região de difícil acesso e uma retração de gengiva ficam visíveis na tela, em vez de ficarem só na descrição.'
      },
      {
        h: 'O que ela não é',
        p: 'A câmera intraoral registra superfície. Ela não substitui radiografia nem exame de imagem tridimensional, que mostram o que está sob o esmalte, entre os dentes e dentro do osso. Ela complementa o exame clínico, não o encerra.'
      },
      {
        h: 'Por que isso muda a conversa',
        p: 'Decidir um tratamento sem ver o problema é decidir só na confiança. Ver a imagem antes muda a natureza da conversa: o plano deixa de ser uma lista de procedimentos e passa a ser uma sequência com motivo visível para cada item.'
      }
    ],
    duvidas: [
      {
        q: 'A câmera intraoral substitui a radiografia?',
        r: 'Não. Ela registra o que está na superfície e ao alcance da luz. Cárie entre os dentes, condição da raiz e do osso e a maior parte do que interessa a um planejamento continuam dependendo de exame de imagem.'
      },
      {
        q: 'Posso levar as imagens comigo?',
        r: 'As imagens fazem parte do seu prontuário. Peça na consulta e a equipe orienta como o registro é disponibilizado.'
      },
      {
        q: 'Câmera intraoral e escaneamento digital são a mesma coisa?',
        r: 'Não. A câmera intraoral registra imagem, como uma foto ampliada de dentro da boca. O escaneamento digital captura a forma tridimensional dos dentes e substitui a moldagem com massa em vários procedimentos. Servem a finalidades diferentes e podem ser usados no mesmo caso.'
      }
    ]
  }
];

export const TRATAMENTO_POR_SLUG = Object.fromEntries(TRATAMENTOS.map(t => [t.slug, t]));

/* -------------------------------------------------------------------------
   4. Equipe

   Este bloco é curto de propósito, e o motivo precisa ficar registrado.

   O site atual vende a tese "cada área é conduzida por quem passou anos se
   especializando nela" e cita ortodontista, implantodontista, periodontista
   e endodontista, sem nome, CRO, foto ou biografia de nenhum deles. A única
   pessoa com credencial publicada é a fundadora.

   Isso não é só uma perda de confiança na etapa de decisão: o art. 43 §2º do
   Código de Ética Odontológica exige que a pessoa jurídica que ilustra
   especialidades tenha profissional inscrito naquela especialidade E
   disponibilize ao público a relação desses profissionais com as respectivas
   qualificações. Sem a relação, a afirmação não pode ser feita.

   Os pacientes, por outro lado, já nomeiam a equipe espontaneamente nas
   avaliações públicas das duas unidades. Os nomes existem e circulam. O que
   falta é sobrenome, CRO, especialidade registrada e autorização de uso de
   imagem e nome. Nada disso se inventa: fica `null` e trava a produção.
   ------------------------------------------------------------------------- */

export const EQUIPE = [
  {
    id: 'fundadora',
    nome: 'Dra. Gabriela Tukasan Reis',
    nomeCompleto: 'Gabriela Vera Tukasan dos Reis',
    papel: 'Cirurgiã-dentista, fundadora e responsável técnica',
    /* Mesmo campo de CLINICA.croResponsavel: um número só, uma pendência só. */
    cro: null,
    /* `[site]`, seção "A dentista fundadora". Formação confirmada em fonte
       única, a própria clínica. */
    formacao: 'Graduada em Odontologia pela Universidade de Marília, UNIMAR, em 2017.',
    /* O site atual anuncia "especialista em ortodontia". O art. 44, II veda
       anunciar especialidade sem registro no Conselho. O título só entra
       quando o número do registro de especialista for confirmado. */
    especialidade: null,
    especialidadeRotulo: 'Especialidade registrada no CRO'
  }
];

/* Profissionais além da fundadora: existem, atendem e são elogiados
   nominalmente pelos pacientes. Só não têm dado público suficiente para
   serem publicados com responsabilidade. */
export const EQUIPE_PENDENTE = 'Nome completo, número de inscrição no CRO, especialidade registrada e autorização de uso de nome e imagem dos demais profissionais.';

/* -------------------------------------------------------------------------
   5. Perguntas frequentes

   Bloco pensado para duas leituras ao mesmo tempo: a pessoa que quer a
   resposta, e o assistente de IA que monta a entidade a partir de pergunta e
   resposta em texto. Todas viram JSON-LD do tipo FAQPage.

   As quatro primeiras estão publicadas no site atual, reescritas. A pergunta
   sobre parcelamento saiu inteira: art. 44, I.
   ------------------------------------------------------------------------- */

export const DUVIDAS = [
  {
    q: 'A Glamm Odontologia atende por convênio?',
    r: 'Não. O atendimento nas duas unidades é particular. Isso está dito aqui para você não perder tempo procurando a informação em outro lugar nem descobrir na recepção.'
  },
  {
    q: 'Quanto tempo dura a primeira consulta?',
    r: 'A consulta de avaliação leva, em média, de quarenta a sessenta minutos. É o tempo de examinar, entender o que levou você até lá, responder o que você quiser perguntar e apresentar um plano de tratamento com a sequência do que precisa ser feito.'
  },
  {
    q: 'Tenho medo de dentista. Como vocês lidam com isso?',
    r: 'Dizendo antes o que vai acontecer, indo no seu ritmo e parando quando você pedir para parar. Se ajudar, diga isso já na mensagem de agendamento: a equipe reserva a consulta sabendo disso desde o começo.'
  },
  {
    q: 'Qual é a diferença entre a unidade de Marília e a de Garça?',
    r: 'As duas são a mesma clínica, com o mesmo padrão de atendimento e os mesmos tratamentos. O que muda é o endereço e o horário. Garça abre até as vinte horas de segunda a sexta e atende aos sábados até as quatorze horas. Marília atende de segunda a sexta e não abre aos sábados.'
  },
  {
    q: 'Como faço para agendar?',
    r: 'Pelo WhatsApp da unidade em que você quer ser atendido. Cada unidade tem o seu próprio número, e o botão de agendamento desta página já abre a conversa com a unidade escolhida.'
  },
  {
    q: 'Preciso levar exames ou documentos na primeira consulta?',
    r: 'Leve um documento com foto. Se você já tem radiografias, documentação ortodôntica ou um plano de tratamento feito em outro lugar, leve também: pode evitar a repetição de exames e ajuda a entender o histórico.'
  },
  {
    q: 'Onde ficam as unidades?',
    r: 'A unidade de Marília fica na Rua Marrei Júnior, 49, no bairro Fragata, próximo ao Fórum Estadual. A unidade de Garça fica na Rua Voluntários de 32, 147, no bairro Williams, ao lado da Prefeitura Municipal.'
  },
  {
    q: 'Vocês atendem urgência?',
    r: 'Descreva a situação na mensagem de WhatsApp da unidade mais próxima e a equipe orienta pelo caso. Dor forte, inchaço no rosto, febre e trauma com sangramento que não para são situações que não devem esperar por agenda: procure um serviço de pronto atendimento.'
  }
];

/* -------------------------------------------------------------------------
   6. Navegação
   ------------------------------------------------------------------------- */

export const MENU = [
  { path: 'tratamentos.html', rotulo: 'Tratamentos' },
  { path: 'unidades.html', rotulo: 'Unidades' },
  { path: 'a-clinica.html', rotulo: 'A clínica' },
  { path: 'equipe.html', rotulo: 'Equipe' },
  { path: 'duvidas.html', rotulo: 'Dúvidas' }
];
