import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import { ptBrBlog } from '@/lib/i18n/dictionaries/pt-BR.blog'

export const ptBR: Dictionary = {
  metadata: {
    title: 'Hunch',
    description:
      'Transforme uma landing page em um diagnóstico medido, com as correções priorizadas e a copy já escrita.',
    ogImageAlt: 'Hunch - diagnóstico medido de uma landing page',
    pages: {
      landing: {
        title: 'Descubra a nota da sua landing page',
        description:
          'Cole a URL da sua landing page e receba uma nota de 0 a 100, medida na página, mais correções priorizadas com a copy substituta já escrita.'
      },
      signin: {
        title: 'Entrar',
        description: 'Entre no Hunch com o Google.'
      },
      blog: {
        title: 'Blog',
        description:
          'O que uma máquina lê da sua landing page, por que a copy é a parte que argumenta e o que muda agora que as pessoas perguntam para um assistente em vez de buscar.'
      },
      dashboard: {
        title: 'Suas páginas',
        description:
          'Todas as landing pages que você já pontuou e o relatório que cada uma gerou.'
      },
      admin: {
        title: 'Créditos',
        description: 'Dar créditos na mão.'
      },
      privacy: {
        title: 'Política de privacidade',
        description:
          'O que o Hunch guarda da sua página e da sua conta, por quanto tempo, e com quem divide.'
      },
      report: {
        title: 'Diagnóstico de conversão de {host}',
        description:
          '{count} correções priorizadas para {host}, medidas na própria página, com o texto substituto e o raciocínio por trás de cada uma.'
      }
    }
  },

  common: {
    close: 'Fechar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    deleting: 'Excluindo',
    copy: 'Copiar',
    copied: 'Copiado',
    or: 'ou',
    none: '-',
    loading: 'Carregando'
  },

  errors: {
    crashed: {
      title: 'Esta página não carregou',
      body: 'Alguma coisa quebrou enquanto montávamos esta página. Não foi nada que você fez e nada foi perdido.',
      retry: 'Tentar de novo'
    },
    notFound: {
      title: 'Não tem nada neste link',
      body: 'O endereço pode estar incompleto, ou pode nunca ter apontado para lugar nenhum. Links de relatório são longos, então confira se ele foi copiado inteiro.',
      home: 'Ir para a página inicial'
    }
  },

  labels: {
    section: {
      headline: 'Título',
      subheadline: 'Subtítulo',
      cta: 'CTA',
      social_proof: 'Prova social',
      pricing: 'Preços',
      features: 'Funcionalidades',
      hero_image: 'Imagem principal',
      navigation: 'Navegação',
      other: 'Outro'
    },
    flowCategory: {
      signup_friction: 'Atrito no cadastro',
      cta_placement: 'Posição do CTA',
      decision_load: 'Carga de decisão',
      objections: 'Objeções',
      trust: 'Confiança',
      pricing_clarity: 'Clareza de preços',
      page_structure: 'Estrutura da página',
      mobile: 'Celular',
      performance: 'Performance',
      indexability: 'Indexação',
      metadata: 'Metadados',
      structured_data: 'Dados estruturados',
      ai_answerability: 'Legibilidade para IA'
    },
    market: {
      us: 'Estados Unidos',
      br: 'Brasil'
    }
  },

  nav: {
    homeAria: 'Início do Hunch',
    how: 'Como funciona',
    pricing: 'Preços',
    blog: 'Blog',
    dashboard: 'Minhas páginas',
    admin: 'Admin',
    signIn: 'Entrar',
    signOut: 'Sair',
    account: 'Conta',
    languageAria: 'Idioma',
    menuAria: 'Abrir menu',
    themeAria: 'Tema de cor',
    theme: {
      light: 'Claro',
      dark: 'Escuro'
    }
  },

  footer: {
    copyright: 'Copyright {year} Hunch. Todos os direitos reservados.',
    privacy: 'Privacidade',
    whatsapp: 'WhatsApp'
  },

  infoHint: {
    defaultLabel: 'Como esta etapa funciona'
  },

  score: {
    impact: 'Impacto',
    aria: '{label} {score} de 10',
    hintLabel: 'O que significa a nota de impacto',
    hint: 'O quanto esta mudança importa *em relação às outras desta análise*, de 1 a 10. É o que ordena a lista: comece de cima. Escrito por um modelo, não contado, e não prevê o que a mudança vai dar.',
    short: {
      impact: 'I'
    }
  },

  landing: {
    eyebrow: 'Grátis. Sem conta. Em menos de um minuto.',
    headlineTop: 'Você sabe que a sua landing page não converte.',
    headlineBottom: 'O que falta é saber o que tem nela.',
    lead: 'O Hunch abre a sua landing page do jeito que um visitante abre, conta o que tem nela de verdade e dá uma nota de 0 a 100, com as correções priorizadas e a copy substituta já escrita. Cole a URL. Ver a nota não custa nada e não pede cadastro.',
    cta: 'Ver minha nota agora, de graça',
    ctaNote: 'Só a sua URL. A gente não pede cadastro, nem cartão, nem instalar nada.',
    howItWorksLink: 'Como funciona',

    heroCard: {
      domain: 'sualandingpage.com',
      scoreLabel: 'Nota da página',
      score: '47',
      outOf: '/100',
      rows: [
        { label: 'Campos no formulário', value: '7', severity: 'alert' },
        { label: 'CTAs acima da dobra', value: '6', severity: 'warn' },
        { label: 'LCP', value: '4,2s', severity: 'alert' },
        { label: 'Meta description', value: 'Ausente', severity: 'alert' },
        { label: 'Depoimentos', value: 'Sim', severity: 'ok' }
      ]
    },

    reality: {
      eyebrow: 'A real',
      heading: 'Não dá para arrumar o que ninguém metrificou.'
    },
    pains: [
      {
        headline: 'Você sabe que não converte. Só não sabe qual parte.',
        reality: 'Chega gente, ninguém se cadastra, e cada palpite sobre o motivo custa mais uma semana.',
        answer: 'Uma nota de 0 a 100 e exatamente as linhas que puxaram ela para baixo. Contadas na sua página, nunca chutadas.'
      },
      {
        headline: 'Cada ferramenta diz uma coisa diferente.',
        reality: 'Uma diz que a sua velocidade está boa, a seguinte diz que está péssima, e nenhuma diz o que mudar.',
        answer: 'Um diagnóstico só, um número só, e cada linha é algo que você confere na sua própria página em um clique.'
      },
      {
        headline: 'Perguntar para uma IA devolve conselho genérico.',
        reality: 'Você cola a URL num chat e ele escreve dicas plausíveis sobre uma página que nunca abriu.',
        answer: 'A gente carrega a sua página de verdade, conta o que tem nela e reescreve as linhas que precisam.'
      }
    ],
    painsNav: {
      label: 'A real, um card por vez',
      previous: 'Anterior',
      next: 'Próximo',
      goTo: 'Ir para o card {index}'
    },

    demo: {
      body: 'As mesmas telas que você recebe depois de uma análise: o diagnóstico, as correções priorizadas e a copy nova renderizada sobre uma página real.',
      frameTitle: 'Demonstração interativa do produto',
      rotateHint: 'Vire o celular na horizontal para ver a demonstração no dobro do tamanho.'
    },

    aiSearch: {
      heading: 'A IA é o novo Google, e ela nunca abre a sua página num navegador.',
      body: 'Cada vez mais gente pergunta para um assistente em vez de buscar. O crawler por trás dele baixa o seu texto, lê e segue. A sua análise tem uma aba só para isso.',
      points: [
        {
          title: 'Um leitor sem navegador',
          body: 'Sem script, sem fonte, sem design. Ele fica com a versão mais crua da sua página, então tudo que só aparece na tela não existe para ele.'
        },
        {
          title: 'O que a sua página diz sobre ela mesma',
          body: 'Title, description, canonical, dados estruturados, alt text. A gente confere quais desses a sua página tem e quais estão faltando.'
        },
        {
          title: 'O robots.txt voltou a importar',
          body: 'O arquivinho que diz quem pode ler o seu site foi escrito para buscador. Hoje ele decide a mesma coisa para os crawlers de IA. A gente mostra o que o seu permite.'
        }
      ],
      link: 'Ler: a IA é o novo Google?'
    },

    how: {
      eyebrow: 'Como funciona',
      heading: 'Três passos, e nenhum deles mexe no seu site.',
      intro: 'A nota é gratuita e não pede conta. Libere as correções quando quiser a copy nova escrita para você.',
      stepLabel: 'Etapa {n}',
      previews: {
        url: {
          placeholder: 'https://sua-landing-page.com',
          cta: 'Ver minha nota'
        },
        score: {
          label: 'Medido',
          groups: [
            { label: 'Estrutura', value: '42' },
            { label: 'Credibilidade', value: '68' },
            { label: 'Carregamento', value: '25' }
          ],
          outOf: '/100'
        },
        fix: {
          impact: '9',
          outOf: '/10',
          category: 'Atrito no cadastro',
          title: 'Corte o formulário de sete campos para três',
          drawer: 'Como implementar'
        }
      }
    },
    steps: [
      {
        label: 'Cole a sua URL',
        body: 'Sem instalar script, sem login no seu site, sem mexer em DNS. Qualquer landing page pública serve, e a gente abre num navegador de verdade, do jeito que um visitante abre.'
      },
      {
        label: 'Receba a sua nota',
        body: 'De 0 a 100, com todas as linhas que formaram ela: campos de formulário, CTAs, tempo de carregamento, alt text, dados estruturados. Ninguém escreve um relatório para você e ninguém manda depois.'
      },
      {
        label: 'Libere as correções',
        body: 'Mudanças priorizadas com a copy substituta já escrita, e uma prévia dela na sua página real. A ordem é o que diz por onde começar.'
      }
    ],

    leaderboard: {
      eyebrow: 'Medidos até agora',
      heading: 'Veja todas as páginas analisadas e a nota que cada uma recebeu.',
      intro: 'Cada chip é uma página real que carregamos e metrificamos. Arraste a esfera para olhar em volta.',
      sphereLabel: 'Páginas medidas, por nota',
      topLabel: 'Maiores notas',
      outOf: '/100'
    },

    pulse: {
      running: 'sendo analisado agora mesmo',
      done: 'acabou de ser medido: {score}/100',
      dismiss: 'Fechar'
    },

    faq: {
      eyebrow: 'Antes de perguntar',
      heading: 'As perguntas que a gente recebe de verdade.',
      items: [
        {
          question: 'A nota é gratuita mesmo?',
          answer: 'É, e não pede conta. Você cola a URL, a gente abre a página e conta o que tem nela, e o diagnóstico inteiro é seu. Pagar é só pelas correções priorizadas e pela copy substituta.'
        },
        {
          question: 'O que acontece se eu ficar sem créditos?',
          answer: 'Você continua com a metade gratuita. Cole uma URL com saldo zerado e ainda recebe a nota e todas as linhas que formaram ela, igual a quem não tem conta. O que o crédito compra são as correções priorizadas e a copy substituta, então essas ficam esperando você ter um.'
        },
        {
          question: 'Vocês precisam de acesso ao meu site?',
          answer: 'Não. Sem instalar nada, sem script, sem login, sem mexer em DNS. A gente abre a página pública do mesmo jeito que qualquer visitante abre, que é justamente por que isso funciona até numa página que não é sua.'
        },
        {
          question: 'De onde sai a nota?',
          answer: 'De contagem. Campos de formulário, CTAs acima da dobra, imagens sem alt text, tempos de carregamento, o que a sua head declara. Cada linha é um número que o nosso código leu na sua página, e todos eles são coisas que você confere sozinho em um clique.'
        },
        {
          question: 'O que um crédito compra, na prática?',
          answer: 'Uma análise completa de uma página: as correções de fluxo priorizadas, os achados de visibilidade em IA e as reescritas de copy com a linha substituta já escrita e renderizada sobre um screenshot da sua página real.'
        },
        {
          question: 'Vocês guardam a minha página?',
          answer: 'A gente guarda as medições e o screenshot por trás da sua análise, para o relatório continuar funcionando e para uma análise futura conseguir mostrar o que mudou. Os screenshots são apagados periodicamente.'
        },
        {
          question: 'Por que vocês não dizem quanto isso aumenta a minha conversão?',
          answer: 'Porque ninguém mediu isso. A gente consegue dizer que o seu maior elemento pinta em 4,2 segundos, porque cronometrou. Transformar isso numa porcentagem de cadastros perdidos seria um número inventado, e você descobriria que foi inventado no mês em que ele não se confirmasse.'
        }
      ]
    },

    finalCta: {
      heading: 'Cole a sua URL. Veja a sua nota.'
    }
  },
  privacy: {
    eyebrow: 'Privacidade',
    heading: 'Política de privacidade',
    updated: 'Última atualização: {date}',
    intro:
      'O que a gente guarda, por quanto tempo e com quem divide. Escrito para ser conferido: cada linha aqui descreve algo que o código faz.',
    sections: [
      {
        title: 'Quem é o responsável',
        body: [
          'O Hunch é operado por Lucas Medeiros, pessoa física. O canal de contato para qualquer pedido sobre os seus dados é o WhatsApp no rodapé desta página.'
        ]
      },
      {
        title: 'O que a gente não faz',
        body: [
          'Não tem Google Analytics, Google Tag Manager, gtag.js, pixel de rede social nem ferramenta de comportamento neste site. Nada de anúncio é carregado nas nossas páginas, e por isso não existe banner de cookie aqui.',
          'A gente não vende, não aluga e não troca os seus dados com ninguém para marketing.',
          'Dois recursos de terceiro aparecem no navegador, e só esses: a demonstração do produto na landing page, que roda dentro de um iframe do Supademo, e o formulário de pagamento do Mercado Pago, que só carrega quando você abre o checkout.'
        ]
      },
      {
        title: 'A página que você cola',
        body: [
          'A gente abre a URL que você enviou num navegador nosso, conta o que tem nela e guarda essas medições, mais um screenshot da página. A análise fica guardada para o relatório continuar funcionando e para uma medição futura conseguir mostrar o que mudou.',
          'O screenshot é apagado depois de 30 dias.',
          'O relatório é acessível por uma chave no próprio link. Quem tiver o link vê o relatório, então trate ele como você trataria qualquer link privado.'
        ]
      },
      {
        title: 'A sua conta',
        body: [
          'Se você entrar, guardamos o e-mail, o nome e a foto que o Google ou o GitHub devolvem. A gente só aceita e-mail que o provedor confirma como verificado, e nunca guarda senha, porque não existe senha aqui.'
        ]
      },
      {
        title: 'O seu e-mail quando você pede o link do relatório',
        body: [
          'No relatório dá para pedir o link por e-mail. O endereço fica guardado junto daquela análise e serve para te mandar o link.',
          'Dá para sair a qualquer momento. A linha continua existindo, marcada como descadastrada, justamente para que um envio seguinte não te inscreva de novo sem querer.'
        ]
      },
      {
        title: 'Pagamento',
        body: [
          'Quem processa o pagamento é o Mercado Pago ou a Stripe. A gente nunca vê nem guarda número de cartão.',
          'Do nosso lado fica a referência do pagamento e o extrato de créditos, que é o que responde para onde foi cada crédito.'
        ]
      },
      {
        title: 'O anúncio que te trouxe',
        body: [
          'Se você chegou por um anúncio do Google, o identificador do clique fica num cookie nosso, que o navegador não deixa nenhum script ler, por 90 dias.',
          'Ele só sai daqui se você comprar. Nesse caso o nosso servidor envia ao Google Ads o identificador do clique e o valor pago, e nada além disso. Quem não compra nunca é reportado.'
        ]
      },
      {
        title: 'Cookies',
        body: [
          'Dois, e nenhum de terceiro: o da sua sessão, que mantém você logado, e o do clique de anúncio descrito acima.'
        ]
      },
      {
        title: 'Com quem os dados são compartilhados',
        body: [
          'A Anthropic recebe o conteúdo da página analisada, que é o que permite escrever as correções. O Mercado Pago e a Stripe recebem o necessário para cobrar. A Resend envia os e-mails. O Google Ads recebe o clique e o valor, só quando existe uma compra. E a infraestrutura onde o produto roda hospeda o banco e a aplicação.',
          'Ninguém mais recebe nada.'
        ]
      },
      {
        title: 'Os seus direitos',
        body: [
          'Pela LGPD você pode pedir acesso aos seus dados, correção, exclusão, portabilidade e a revogação de um consentimento que tenha dado.',
          'É só pedir pelo WhatsApp que está no rodapé desta página. A gente responde e cumpre.'
        ]
      },
      {
        title: 'Mudanças nesta política',
        body: [
          'Quando algo aqui mudar, a data no topo muda junto. Ela é escrita num lugar só do código, para não existir uma data na tela diferente da real.'
        ]
      }
    ]
  },

  signIn: {
    title: 'Entrar',
    description: 'Continue com sua conta de trabalho',
    google: 'Continuar com o Google',
    github: 'Continuar com o GitHub',
    adminEmail: 'E-mail do admin',
    password: 'Senha',
    invalidCredentials: 'Credenciais inválidas',
    adminSubmit: 'Entrar como admin'
  },

  admin: {
    eyebrow: 'Operação',
    credits: {
      title: 'Dar créditos',
      subtitle: 'Créditos entregues sem nenhum pagamento por trás, para cortesia ou para consertar um pagamento cujo webhook não chegou. Todo crédito dado vai para o extrato e aparece na lista abaixo.',
      emailLabel: 'Conta',
      emailPlaceholder: 'alguem@exemplo.com',
      creditsLabel: 'Créditos',
      submit: 'Dar',
      result: {
        granted: 'Creditado.',
        invalid: 'Confira o endereço e a quantidade de créditos.',
        forbidden: 'Você não é operador.',
        failed: 'Nada foi creditado. Tente de novo.'
      },
      historyTitle: 'Créditos dados recentemente',
      historyEmpty: 'Nenhum crédito foi dado na mão ainda.'
    }
  },

  dashboard: {
    eyebrow: 'Páginas',
    title: 'Suas páginas',
    hintLabel: 'Como a análise funciona',
    hint: 'Cole a URL da landing page. O Hunch mede a página e prioriza as correções que valem a pena. Adicione *detalhes do negócio* para o texto voltar pronto em vez de com [placeholders].',
    subtitle: 'Cole a URL de uma landing page para medir e receber as correções priorizadas.',
    emptyTitle: 'Nenhuma página ainda',
    emptyDescription: 'Cole a URL de uma landing page aqui em cima para rodar a sua primeira análise.',
    pagination: {
      label: 'Mais páginas suas',
      previous: 'Mais recentes',
      next: 'Mais antigas',
      position: 'Página {page} de {pages}'
    }
  },

  urlForm: {
    measuring: 'Abrindo a sua página e contando o que tem nela...',
    urlLabel: 'URL da sua landing page',
    urlPlaceholder: 'https://sua-landing-page.com',
    analyze: 'Analisar',
    analyzing: 'Analisando...',
    waitNote:
      'Leva menos de um minuto. Mantenha esta aba aberta: assim que a nota estiver pronta a gente te leva até ela, e as correções continuam sendo escritas na própria tela do relatório.',
    briefSummary: 'Adicionar detalhes do negócio (opcional)',
    briefSummaryRequired: 'Detalhes do negócio, que é no que o crédito é gasto',
    briefIntro: 'Quatro toques. Sem eles a copy reescrita só consegue repetir o que a página já diz, porque é tudo o que ela tem na frente.',
    briefIntroRequired: 'Quatro toques, e eles são metade do preço. Deixe qualquer um em branco e a análise roda e entrega a nota do mesmo jeito, ela só não gasta crédito e não escreve nada.',
    briefWizard: {
      step: 'Etapa {step} de {total}',
      back: 'Voltar',
      skip: 'Pular',
      other: 'Outra coisa',
      otherPlaceholder: 'Descreva com as suas palavras',
      done: 'Respondeu as quatro. Cole a URL aí em cima e mande ver.',
      edit: 'Trocar'
    },
    briefFields: {
      audience: {
        label: 'Público',
        question: 'Quem cai nessa página?',
        options: {
          consumers: 'Pessoas comuns, comprando para si',
          smb: 'Pequenos negócios e quem toca eles',
          enterprise: 'Empresas grandes, com comitê de compra',
          developers: 'Desenvolvedores e times técnicos',
          creators: 'Criadores, freelancers e profissionais solo'
        }
      },
      offer: {
        label: 'Oferta',
        question: 'O que você vende para essa pessoa?',
        options: {
          saas: 'Um software ou app',
          service: 'Um serviço que eu mesmo entrego',
          ecommerce: 'Um produto físico ou de compra única',
          course: 'Um curso, comunidade ou conteúdo',
          marketplace: 'Um marketplace ligando dois lados'
        }
      },
      action: {
        label: 'Ação',
        question: 'O que ela deveria fazer nessa página?',
        options: {
          signup: 'Criar uma conta ou começar um teste grátis',
          demo: 'Agendar uma demo ou uma call',
          purchase: 'Comprar, ali mesmo',
          waitlist: 'Entrar numa lista de espera',
          contact: 'Mandar uma mensagem ou pedir orçamento'
        }
      },
      objection: {
        label: 'Objeção',
        question: 'O que trava a pessoa na hora de fazer isso?',
        options: {
          price: 'Ela acha caro',
          trust: 'Ela nunca ouviu falar de mim',
          unclear: 'Ela não entende o que a coisa faz',
          switching: 'Ela já usa outra solução',
          effort: 'Ela imagina que configurar vai dar trabalho'
        }
      }
    },
    errorInvalidUrl: 'Informe uma URL válida, incluindo https://',
    errorInvalidCompetitor: 'A página de comparação precisa de uma URL válida, incluindo https://',
    competitorLabel: 'Comparar com outra página (opcional)',
    competitorPlaceholder: 'https://outra-landing-page.com',
    competitorHint:
      'A gente mede essa página com as mesmas verificações e mostra as duas colunas lado a lado. Mesmo crédito, sem cobrança extra.',
    errorGeneric: 'Algo deu errado. Tente novamente.',
    errorLimitReached:
      'Você rodou várias análises em pouco tempo. Espere uma hora e tente de novo.',
    errorBusy:
      'Não deu para começar a análise agora. Nada foi cobrado. Tente de novo em instantes.',
    errorUnsupportedUrl: 'Essa URL não é válida ou não é suportada.',
    errorScrapeFailed: 'Não conseguimos carregar essa página. Confira a URL e tente novamente.',
    errorAnalyzeFailed: 'Algo deu errado durante a análise. Tente novamente.'
  },


  history: {
    openAria: 'Abrir análise de {url}',
    deleteAria: 'Excluir análise de {url}',
  },

  analysis: {
    eyebrow: 'O que mudar',
    title: 'O que mudar nesta página',
    hintLabel: 'Como usar esta tela',
    hint: 'Cada seção é um tipo de correção. *Estrutura* e *SEO* saem à mão; *Copy* já vem com o texto novo escrito. Todo número do diagnóstico acima foi contado na sua página.',
    backToDashboard: 'Voltar para clientes',
    copyFailed: 'Não foi possível copiar',
    copyLink: 'Copiar link',
    sections: {
      flow: 'Estrutura',
      copy: 'Copy',
      seo: 'SEO',
      ai: 'IA'
    },
    sectionQuestions: {
      flow: 'A sua página está espantando quem chega?',
      copy: 'O seu texto convence, ou só descreve?',
      seo: 'O Google acha a sua página?',
      ai: 'A sua landing page é visível pela IA?'
    }
  },


  flow: {
    eyebrow: 'Ajuste o fluxo',
    title: 'Antes de mexer nas palavras',
    hintLabel: 'Por que isto sai à mão',
    hint: 'Isto muda a *estrutura* da sua página, não uma linha de texto, então sai à mão.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê',
    count: {
      one: '{count} ajuste de fluxo',
      other: '{count} ajustes de fluxo'
    }
  },

  seo: {
    eyebrow: 'Seja encontrado',
    title: 'O que um buscador consegue ler aqui',
    hintLabel: 'O que esta seção verificou',
    hint: 'Vem do que a sua página *declara sobre si mesma*: title, meta description, canonical, dados estruturados, robots.txt. Verificamos a página, *não* o índice - nada aqui diz onde você aparece nem quanto tráfego recebe.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê'
  },

  ai: {
    eyebrow: 'Encontrado por IA',
    title: 'Uma IA consegue citar esta página',
    hintLabel: 'O que esta seção verificou',
    hint: 'Para citar você, um assistente precisa *ler uma resposta na sua página*: fatos em texto, não presos dentro de uma imagem. Verificamos a página, *não* o que algum modelo diz hoje.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê'
  },

  readout: {
    eyebrow: 'Medido na página',
    title: 'O que encontramos',
    hintLabel: 'De onde vêm esses números',
    hint: 'Tudo aqui foi *contado na sua página* quando a carregamos - nada estimado, nada de benchmark. Os tempos vêm de um data center, então são *o melhor cenário*: um visitante real nunca bate isso.',
    fixLabel: 'Correção escrita:',
    groupOk: '{total} verificações, todas passando',
    groupWrong: '{wrong} de {total} precisam de atenção',
    groups: {
      structure: 'A experiência de quem chega na página',
      credibility: 'O que a página oferece como motivo para confiar',
      mobile: 'O que a página faz no celular',
      declared: 'O que a página conta para uma máquina',
      crawler_access: 'O que um crawler de IA tem permissão de ler',
      load: 'O que custa abrir a página'
    },
    score: {
      label: 'Saúde do que medimos',
      scale: '100 significa que todas as verificações desta página passaram. 0 significa que nenhuma passou.',
      method: 'Média das {count} verificações abaixo, cada uma contada na própria página: a que passa vale um ponto inteiro, a que fica no limite vale meio, a que falha não vale nada. A nota avalia só o que foi contado aqui, e não diz nada sobre quanto tráfego ou receita a página gera.',
      railAria: 'Saúde do grupo {score} de 100',
      severity: {
        ok: 'Saudável',
        warn: 'Vale olhar',
        alert: 'Precisa de trabalho'
      }
    },
    findings: {
      form_fields: 'Campos no formulário',
      required_fields: 'Campos obrigatórios no formulário',
      fields_without_label: 'Campos sem label',
      form_steps: 'Etapas até conseguir enviar o formulário',
      no_submit: 'Formulário tem botão que envia',
      no_social_signin: 'Login com Google ou GitHub',
      above_fold_ctas: 'CTAs acima da dobra',
      dead_ctas: 'Botões que não levam a lugar nenhum',
      nav_links: 'Links do menu que tiram o visitante da página',
      no_faq: 'Dúvidas respondidas na página',
      no_testimonials: 'Depoimentos de clientes',
      word_count: 'Palavras na página',
      heading_count: 'Títulos e subtítulos na página',
      noindex: 'Bloqueada para buscadores',
      no_meta_description: 'Meta description',
      h1_count: 'Títulos H1',
      images_missing_alt: 'Imagens sem alt',
      no_structured_data: 'Dados estruturados',
      no_og_image: 'Imagem de compartilhamento',
      no_canonical: 'URL canonical',
      no_lang: 'Idioma declarado na página',
      internal_links: 'Links para outras páginas do site',
      term_in_title: 'Termo principal no title',
      term_in_h1: 'Termo principal no H1',
      term_in_meta_description: 'Termo principal na meta description',
      ai_crawlers_blocked: 'Crawlers de IA bloqueados no robots.txt',
      robots_blocks_all: 'Rastreamento permitido',
      no_sitemap: 'Sitemap declarado no robots.txt',
      ttfb: 'TTFB (tempo até o primeiro byte)',
      fcp: 'FCP (primeiro conteúdo a aparecer)',
      lcp: 'LCP (maior elemento a aparecer)',
      page_weight: 'Peso da página',
      request_count: 'Requisições de rede',
      no_cnpj: 'CNPJ no rodapé',
      no_trust_badge: 'Selo de segurança ou de reputação',
      testimonial_attribution: 'Depoimentos que dizem quem falou',
      no_privacy_policy: 'Política de privacidade linkada',
      no_contact_channel: 'Um jeito de falar com a empresa',
      mobile_overflow: 'A página cabe na largura da tela',
      no_viewport_meta: 'A página declara viewport de celular',
      mobile_tap_targets: 'Botões pequenos demais para o dedo',
      mobile_tiny_text: 'Texto pequeno demais para ler no celular',
      mobile_above_fold_ctas: 'CTAs acima da dobra no celular'
    },
    criterion: {
      above: 'sinalizamos a partir de {value}',
      below: 'sinalizamos em {value} ou menos',
      band: 'sinalizamos em nenhum, e a partir de {value}',
      exactly: 'sinalizamos quando não é {value}'
    },
    presence: {
      yes: 'Sim',
      no: 'Não'
    },
    delta: {
      up: '+{value}',
      down: '-{value}',
      gained: 'passou a ter',
      lost: 'deixou de ter'
    },
    trend: {
      title: 'Evolução ao longo do tempo',
      hint: 'Um ponto por medição desta página. Mostra o que mudou, não o que causou a mudança.'
    },
    atLeast: 'no mínimo',
    units: {
      seconds: '{value}s',
      megabytes: '{value} MB'
    },
    keywords: {
      eyebrow: 'Contado no seu próprio texto',
      heading: 'As palavras em torno das quais esta página foi escrita',
      explain:
        'São os termos que a sua página repete, contados no texto dela mesma. O que importa são as colunas da direita: um termo que você diz quinze vezes no corpo e nunca colocou no title nem no H1 é um termo que o crawler, o assistente e o anúncio não têm com o que casar.',
      title: 'Os termos que esta página mais repete',
      term: 'Termo',
      count: 'Vezes que aparece',
      surfaces: {
        inTitle: 'Title',
        inH1: 'H1',
        inMetaDescription: 'Meta description',
        inHeadings: 'Títulos'
      },
      hint: 'Contado no próprio texto da página. São as palavras em torno das quais ela foi escrita, não o que as pessoas buscam.'
    },
    measure: {
      explain:
        'Esta análise foi gerada antes de começarmos a contar. Carregamos a página de novo e medimos: campos de formulário, CTAs acima da dobra, tempo de carregamento, imagens sem alt.',
      cta: 'Medir esta página',
      loading: 'Medindo a página...',
      hint: 'Leva cerca de {seconds} segundos. Abrimos a página do mesmo jeito que um visitante abre.',
      failed: 'Não conseguimos carregar a página desta vez. Nada foi alterado nesta análise.',
      retry: 'Tentar de novo',
      again: 'Medir de novo',
      trendStartTitle: 'Acompanhe como esta página muda',
      trendStartBody: 'Uma medição é uma foto, não um histórico. Meça esta página de novo e cada número aqui em cima ganha um "desde a última vez", mais uma linha mostrando a nota ao longo do tempo.'
    }
  },

  adIdeas: {
    eyebrow: 'Escrito a partir desses termos',
    title: 'Grupos de anúncio para uma campanha de busca',
    hintLabel: 'De onde vêm estes anúncios',
    hint: 'Agrupados a partir dos termos *contados na sua página* e escritos dentro dos limites do Google Ads: headline até 30 caracteres, descrição até 90. Não há *volume de busca, custo por clique nem concorrência* em lugar nenhum aqui, porque não temos índice nem clickstream e nunca inventamos um. Trate como um primeiro rascunho para conferir dentro da sua conta.',
    explain:
      'Agrupamos os termos acima em grupos de anúncio e escrevemos as headlines e as descrições de cada um com o que esta página já diz. Não gasta crédito: vem junto com a análise.',
    cta: 'Escrever ideias de anúncio',
    loading: 'Escrevendo ideias de anúncio...',
    failed: 'Não conseguimos escrever as ideias de anúncio desta vez. Nada nesta análise foi alterado.',
    retry: 'Tentar de novo',
    headlines: 'Headlines',
    descriptions: 'Descrições',
    negatives: 'Palavras negativas',
    negativesHint: 'Buscas que esta página não atende. Adicione no nível da campanha antes do primeiro clique.'
  },

  hypothesisList: {
    eyebrow: 'Reescreva o texto',
    title: 'As linhas que valem trocar',
    hintLabel: 'Como usar isto',
    hint: 'Cada uma mostra a linha como ela está hoje e o texto substituto, *já escrito*. Quando a linha é um elemento único que conseguimos apontar, você vê um preview dela na sua página real.',
    manualSetup: 'Configuração manual',
    testThisFirst: 'Comece por aqui',
    evidenceMechanism: 'O mecanismo',
    assessmentLabel: 'A linha hoje',
    placeholderWarning:
      'Contém [placeholders] - substitua pelos dados reais antes de entregar.',
    previewLabel: 'Na sua página',
    otherOptions: 'Outras opções',
    writingOptions: 'Escrevendo outras opções...',
    roundsLeft: 'Mais duas por vez, {rounds} rodadas restantes. Escolha uma direção:',
    roundsSpent: 'Acabaram as rodadas desta linha. Escreva a sua ali em cima.',
    tones: {
      direct: 'Mais direto',
      shorter: 'Mais curto',
      concrete: 'Mais concreto',
      informal: 'Menos formal'
    },
    useThis: 'Usar esta',
    editThis: 'Escrever a minha',
    saveEdit: 'Salvar a minha linha',
    yourWords: 'Escrita por você',
    overBudget: 'São {words} palavras contra um teto de {budget} para este elemento. Ela vai ser salva do mesmo jeito.',
    choosing: 'Trocando',
    optionsUnavailable:
      'Não conseguimos escrever outras opções agora. A recomendação acima continua valendo.',
    backlog: {
      one: 'mais {count} ideia',
      other: 'mais {count} ideias'
    }
  },

  credits: {
    eyebrow: 'Créditos',
    heading: 'Um crédito, uma análise completa.',
    body: 'A nota é sempre gratuita. O crédito compra a metade que um modelo escreve: as correções priorizadas, a copy substituta e uma prévia dela na sua página real.',
    balance: 'Você tem {count} créditos',
    balanceOne: 'Você tem 1 crédito',
    balanceNone: 'Você não tem créditos',
    freeHalf:
      'Você ainda consegue rodar uma página. A nota e todas as linhas por trás dela são de graça; as correções priorizadas e a copy reescrita é que precisam de um crédito.',
    credits: { one: '{count} análise', other: '{count} análises' },
    buy: 'Comprar',
    opening: 'Abrindo o checkout...',
    mostChosen: 'Mais escolhido',
    mercadopago: {
      loading: 'Carregando o formulário de pagamento...',
      failed: 'Não deu para carregar o formulário de pagamento. Tente de novo daqui a pouco.',
      approved: 'Pagamento aprovado.',
      pending: 'Aguardando a confirmação do pagamento.',
      qrAlt: 'QR Code do Pix',
      creditsArrive: 'Os créditos entram na sua conta assim que o pagamento for confirmado.',
      refresh: 'Atualizar o saldo'
    },
    packs: {
      single: {
        name: 'Avulso',
        price: 'R$147',
        perAnalysis: 'R$147 por análise',
        tagline: 'Uma página, um diagnóstico dela.',
        features: [
          'A nota e cada linha que a formou, no desktop e no celular',
          'Quanto a página pesa e quanto demora para carregar',
          'Correções priorizadas de estrutura, copy, SEO e visibilidade para IA',
          'A copy substituta escrita, vista na sua página real',
          'Grupos de anúncio escritos com as palavras contadas na página'
        ]
      },
      trio: {
        name: 'Trio',
        price: 'R$297',
        perAnalysis: 'R$99 por análise',
        tagline: 'Um funil de até três páginas.',
        features: [
          'Tudo do Avulso, nas três páginas',
          'Uma análise para cada etapa do funil, não só a home',
          'Ou a mesma página de novo depois de mexer nela, para comparar as duas medições',
          'As três no mesmo painel, cada uma com a sua nota',
          'Os créditos não expiram'
        ]
      }
    }
  },

  unlock: {
    heading: 'A sua nota está medida. As correções estão escritas.',
    body: 'Tudo acima foi contado na sua página. O que está atrás disso é a parte que alguém precisa escrever: mudanças priorizadas, a copy substituta e uma prévia dela na sua página real.',
    points: [
      'Correções priorizadas em estrutura, copy, SEO e IA',
      'O texto novo, já escrito',
      'Cada linha vista na sua própria página'
    ],
    cta: 'Liberar as correções',
    ctaBuy: 'Comprar um crédito para liberar'
  },

  watch: {
    heading: 'Receba este relatório por email',
    body: 'Este relatório fica num link impossível de adivinhar que só este navegador conhece. Limpou o histórico, perdeu. Mande para você e ele é seu.',
    placeholder: 'voce@empresa.com',
    cta: 'Me manda o link',
    sending: 'Enviando...',
    success: 'Enviado. Confira sua caixa de entrada.',
    errorInvalid: 'Isso não parece um endereço de email.',
    errorRate: 'Tentativas demais. Espere alguns minutos.',
    errorGeneric: 'Não deu para enviar. Tente de novo daqui a pouco.',
    note: 'Um email com o link. Nada além disso, a não ser que você peça.',
    email: {
      subject: 'O relatório da sua landing page',
      heading: 'Aqui está o seu relatório',
      body: 'Você mediu {host}. O readout completo está no link abaixo, e ele continua lá.',
      cta: 'Abrir o relatório',
      keep: 'Guarde este email. O link é o único caminho de volta para este relatório.',
      footer: 'Você recebeu isto porque alguém pediu neste endereço no hunch.'
    }
  },

  verdict: {
    question: 'Vale fazer?',
    applied: 'Já apliquei',
    dismissed: 'Não é para mim',
    appliedState: 'Aplicada',
    dismissedState: 'Descartada',
    undo: 'desfazer'
  },
  report: {
    generating: {
      eyebrow: 'Ainda sendo escrito',
      note: 'A sua nota aí em cima já está fechada. As correções e a copy substituta estão sendo escritas agora e aparecem aqui sozinhas, então dá para sair desta página e voltar depois.',
      stalled: 'Está demorando mais que o normal. O trabalho continua na fila. Recarregue a página para conferir.'
    },
    failed: {
      heading: 'As correções não vieram',
      body: 'A sua nota aí em cima continua valendo e é sua. A metade escrita não terminou, então o crédito voltou para o seu saldo e nada foi cobrado por esta rodada.',
      cta: 'Rodar a página de novo'
    },
    backToTestIdeas: 'Voltar para a análise',
    teardown: 'Análise de conversão',
    measuringHeading: 'Medindo esta página...',
    measuringBody: 'Estamos abrindo ela do jeito que um visitante abre e contando o que tem nela. Isso leva cerca de um minuto. A página se atualiza quando os números chegarem.',
    plan: 'Nota da landing page',
    landingPageAnalyzed: 'Landing page analisada',
    dated: 'Revisado em {date}',
    summaryBody:
      'Passamos por esta página linha a linha e encontramos {changes} mudanças que valem a pena. {ready} delas são mudanças de texto, e o texto novo já está escrito aqui embaixo. As outras {structural} mudam como a página está montada.',
    summaryMeasured:
      'Tudo aqui embaixo foi contado nesta página no momento em que a abrimos. As correções priorizadas e a copy substituta são a metade que um modelo precisa escrever, e ela ainda não foi escrita para esta página.',
    changesFound: 'Mudanças recomendadas',
    copyWritten: 'Texto já escrito',
    testThisFirst: 'Comece por aqui',
    startHere: {
      eyebrow: 'Prioridade',
      title: 'O que mudar primeiro'
    },
    rail: {
      label: 'Nesta página',
      sections: {
        start: 'Mudar primeiro',
        readout: 'Medições',
        terms: 'Termos da página'
      }
    },
    problem: 'Problema',
    current: 'Atual',
    changeTo: 'Trocar por',
    whyThisWorks: 'Por que isso funciona',
    manualSetupBody:
      'Não é uma troca de linha única, então não há preview. Aplique este texto manualmente.',
    appliedToYourPage: 'Aplicado à sua página',
    previewAlt: 'Variante aplicada à landing page',
    previewBeforeAlt: 'A landing page como ela está hoje',
    compareLabel: 'Arraste para comparar a página antes e depois da mudança',
    compareValue: '{percent}% da página reescrita à mostra',
    compareBefore: 'Agora',
    compareAfter: 'Reescrita',
    previewCta: 'Veja como fica na sua página',
    previewHint:
      'Carregamos sua página real com este texto no lugar. Leva cerca de {seconds} segundos.',
    previewLoading: 'Renderizando sua página...',
    previewUnavailable:
      'Não conseguimos renderizar sua página agora. O texto recomendado acima continua valendo.',
    previewRetry: 'Tentar de novo',
    previewOverflow:
      'Este texto não cabe no espaço que sua página dá para esse elemento, então a prévia mostra ele cortado. Encurte o texto, ou dê mais espaço ao elemento antes de publicar.'
  },







  blog: ptBrBlog
}
