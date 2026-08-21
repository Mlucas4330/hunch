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
      analysis: {
        title: 'O que mudar',
        description: 'Correções de texto priorizadas e o playbook de fluxo desta landing page.'
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
    blog: 'Blog',
    dashboard: 'Minhas páginas',
    admin: 'Admin',
    signIn: 'Entrar',
    signOut: 'Sair',
    account: 'Conta',
    languageAria: 'Idioma',
    menuAria: 'Abrir menu'
  },

  footer: {
    copyright: 'Copyright {year} Hunch. Todos os direitos reservados.',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp'
  },

  infoHint: {
    defaultLabel: 'Como esta etapa funciona'
  },

  score: {
    impact: 'Impacto',
    aria: '{label} {score} de 10',
    short: {
      impact: 'I'
    }
  },

  landing: {
    eyebrow: 'Grátis. Sem conta. Em menos de um minuto.',
    headlineTop: 'Descubra a nota da sua landing page.',
    headlineBottom: 'Medida na sua página, em menos de um minuto.',
    lead: 'Cole a URL. A gente abre a página do jeito que um visitante abre, conta o que tem nela de verdade e dá uma nota de 0 a 100. Ver a nota não custa nada e não pede cadastro.',
    cta: 'Ver minha nota agora, de graça',
    ctaNote: 'Sem cadastro, sem cartão, sem instalar nada. Só a sua URL.',
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
      eyebrow: 'Veja antes',
      heading: 'Passeie pela ferramenta inteira antes de colar qualquer coisa.',
      body: 'As mesmas telas que você recebe depois de uma análise: o diagnóstico, as correções priorizadas e a copy nova renderizada sobre uma página real.',
      frameTitle: 'Demonstração interativa do produto'
    },

    aiSearch: {
      eyebrow: 'Visibilidade em IA',
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
      heading: 'Cole, veja a nota, corrija.',
      intro: 'A nota é gratuita e não pede conta. Libere as correções quando quiser a copy nova escrita para você.'
    },
    steps: [
      {
        label: 'Cole a sua URL',
        body: 'Qualquer landing page pública. A gente abre num navegador de verdade, do jeito que um visitante abre.'
      },
      {
        label: 'Receba a sua nota',
        body: 'De 0 a 100, com todas as linhas que formaram ela: campos de formulário, CTAs, tempo de carregamento, alt text, dados estruturados.'
      },
      {
        label: 'Libere as correções',
        body: 'Mudanças priorizadas com a copy substituta já escrita, e uma prévia dela na sua página real.'
      }
    ],

    value: {
      eyebrow: 'O que você recebe',
      heading: 'Números que dá para conferir, copy que dá para colar.'
    },
    proof: [
      {
        title: 'Medido, não chutado',
        body: 'Todo número é contado na sua página no momento em que a abrimos. Nada vem de média de benchmark, nem é estimado, nem preenchido por um modelo.'
      },
      {
        title: 'Copy pronta, não prompt',
        body: 'Cada correção priorizada traz a linha substituta e o raciocínio por trás dela. Adicione os detalhes do seu negócio e ela volta com os seus números reais já dentro.'
      },
      {
        title: 'Visto na sua própria página',
        body: 'A copy nova é renderizada sobre um screenshot da sua página real, então você vê como ela fica antes de publicar.'
      }
    ],

    testimonials: {
      eyebrow: 'O que dizem',
      heading: 'De quem já rodou.',
      // Vazio de propósito, e a seção não renderiza enquanto estiver assim. Ver en.ts.
      items: [],
    },

    leaderboard: {
      eyebrow: 'Medidos até agora',
      heading: 'Veja todas as páginas analisadas e a nota que cada uma recebeu.',
      intro: 'Cada chip é uma página real que carregamos e metrificamos. Arraste a esfera para olhar em volta.',
      sphereLabel: 'Páginas medidas, por nota',
      topLabel: 'Maiores notas',
      outOf: '/100'
    },

    pulse: {
      running: '{domain} está sendo analisado agora mesmo',
      done: '{domain} acabou de ser medido: {score}/100',
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
    phases: [
      'Lendo sua página...',
      'Lendo o head e cronometrando o carregamento...',
      'Escrevendo a copy nova...',
      'Salvando resultados...'
    ],
    urlPlaceholder: 'https://sua-landing-page.com',
    analyze: 'Analisar',
    analyzing: 'Analisando...',
    waitNote:
      'Isso costuma levar de 2 a 3 minutos. Mantenha esta aba aberta enquanto lemos a página, medimos e escrevemos a copy nova.',
    briefSummary: 'Adicionar detalhes do negócio (opcional)',
    briefIntro: 'Quatro toques. São eles que transformam a copy reescrita de um modelo cheio de [placeholders] em linhas que dá para publicar.',
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
          saas: 'Software por assinatura',
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
    errorGeneric: 'Algo deu errado. Tente novamente.',
    errorLimitReached:
      'Você chegou ao limite do plano gratuito. Fale com a gente para continuar analisando.',
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
    hint: 'Cada aba é um tipo de correção, ordenada pelo impacto provável. *Fluxo* e *SEO* são mudanças que alguém aplica à mão; *Copy* é o texto, e ali cada ideia já vem com a versão nova escrita. Todo número do diagnóstico acima foi contado na própria página, então nada aqui é estimativa.',
    backToDashboard: 'Voltar para clientes',
    copyFailed: 'Não foi possível copiar',
    deliverables: {
      eyebrow: 'Entregáveis',
      hintLabel: 'Para quem mandar',
      hint: 'O relatório é *um link*, e quem abrir não precisa de conta. Mande para quem de fato edita a página, seja o dev, o designer ou quem publica a mudança: a pessoa recebe as correções priorizadas e a copy substituta sem você ter que colar nada em uma mensagem. Cada troca de texto pode ser vista na sua página real, dentro do próprio relatório.',
      interactiveTitle: 'Relatório interativo',
      interactiveBody: 'Uma página que qualquer um abre com o link. Cada troca de texto pode ser vista na sua página real.',
      open: 'Abrir',
      copyLink: 'Copiar link'
    },
    tabs: {
      flow: 'Estrutura',
      copy: 'Copy',
      seo: 'SEO',
      ai: 'IA'
    },
    tabQuestions: {
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
    hint: 'Isto muda a *estrutura* da sua página, não uma linha de texto, então sai à mão, e não como troca de texto. Costuma dar mais retorno do que qualquer mudança de texto.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê',
    count: {
      one: '{count} ajuste de fluxo',
      other: '{count} ajustes de fluxo'
    }
  },

  visibility: {
    eyebrow: 'Seja encontrado',
    title: 'Um buscador e uma IA conseguem ler esta página',
    hintLabel: 'O que esta seção verificou',
    hint: 'Isto vem do que a sua página *declara sobre si mesma*: título, descrição, dados estruturados e o que o robots.txt permite. Verificamos a página, *não* a sua posição em busca: nada aqui diz onde você aparece nem se alguma IA cita você hoje, apenas se a sua página entrega o que elas precisam para encontrar e citar você.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê'
  },

  seo: {
    eyebrow: 'Seja encontrado',
    title: 'O que um buscador consegue ler aqui',
    hintLabel: 'O que esta seção verificou',
    hint: 'Isto vem do que a sua página *declara sobre si mesma*: título, descrição, canonical, dados estruturados e o que o robots.txt permite. Verificamos a página, *não* a sua posição em busca: nada aqui diz onde você aparece nem quanto tráfego você recebe, apenas se a sua página entrega o que um crawler precisa para alcançar e ler você.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê'
  },

  ai: {
    eyebrow: 'Encontrado por IA',
    title: 'Uma IA consegue citar esta página',
    hintLabel: 'O que esta seção verificou',
    hint: 'Um assistente respondendo sobre a sua categoria precisa *ler uma resposta na sua página* para citar você. Isto é o que torna uma resposta encontrável: fatos escritos em texto em vez de presos dentro de uma imagem, e perguntas respondidas onde um modelo consegue ver. Verificamos a página, *não* o que algum modelo diz hoje - nada aqui diz se alguma IA cita você neste momento.',
    stepsLabel: 'Como implementar',
    evidenceLabel: 'Por quê'
  },

  readout: {
    eyebrow: 'Medido na página',
    title: 'O que encontramos',
    hintLabel: 'De onde vêm esses números',
    hint: 'Tudo aqui foi *contado na própria página* na hora em que a carregamos - nada é estimativa, média de mercado ou benchmark. Os tempos vêm de um data center com conexão boa, então são *o melhor cenário*: no celular o visitante espera mais que isso, nunca menos.',
    groups: {
      structure: 'A experiência de quem chega na página',
      metadata: 'O que a IA precisa está aqui?',
      visibility: 'O que um crawler de IA tem permissão de ler',
      load: 'A página está otimizada?'
    },
    score: {
      label: 'Saúde do que medimos',
      scale: '100 significa que todas as verificações desta página passaram. 0 significa que nenhuma passou.',
      method: 'Média das {count} verificações abaixo, cada uma contada na própria página: a que passa vale um ponto inteiro, a que fica no limite vale meio, a que falha não vale nada. A nota avalia só o que foi contado aqui, e não diz nada sobre quanto tráfego ou receita a página gera.'
    },
    findings: {
      form_fields: 'Campos no formulário de cadastro',
      no_social_signin: 'Login com Google ou GitHub',
      above_fold_ctas: 'CTAs acima da dobra',
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
      request_count: 'Requisições de rede'
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
      againHint: 'Abrimos a página outra vez e acrescentamos um ponto à evolução. As correções e os testes não mudam.'
    }
  },

  hypothesisList: {
    manualSetup: 'Configuração manual',
    testThisFirst: 'Comece por aqui',
    recommendedChallenger: 'Desafiante recomendado',
    evidenceMechanism: 'O mecanismo',
    placeholderWarning:
      'Contém [placeholders] - substitua pelos dados reais antes de entregar.',
    otherOptions: 'Outras opções',
    writingOptions: 'Escrevendo outras opções...',
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
        price: 'R$19',
        perAnalysis: 'R$19 por análise',
        tagline: 'Uma página, um diagnóstico dela.',
        features: [
          'A nota e cada linha que a formou',
          'Correções priorizadas com a copy substituta escrita',
          'Cada linha vista na sua página real'
        ]
      },
      trio: {
        name: 'Trio',
        price: 'R$39',
        perAnalysis: 'R$13 por análise',
        tagline: 'Uma página, a reescrita dela e uma conferida depois.',
        features: [
          'Tudo do Avulso, três vezes',
          'Espaço para medir de novo depois de publicar as mudanças',
          'Os créditos não expiram'
        ]
      },
      pack: {
        name: 'Pacote',
        price: 'R$99',
        perAnalysis: 'R$9,90 por análise',
        tagline: 'Um funil inteiro, ou uma carteira de clientes.',
        features: [
          'Tudo do Trio, dez análises no total',
          'Dá para cada página de um funil',
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
    cta: 'Liberar as correções'
  },

  report: {
    backToTestIdeas: 'Voltar para a análise',
    teardown: 'Análise de conversão',
    measuringHeading: 'Medindo esta página...',
    measuringBody: 'Estamos abrindo ela do jeito que um visitante abre e contando o que tem nela. Isso leva cerca de um minuto. A página se atualiza quando os números chegarem.',
    plan: 'Nota da landing page',
    landingPageAnalyzed: 'Landing page analisada',
    dated: 'Revisado em {date}',
    summaryBody:
      'Passamos por esta página linha a linha e encontramos {changes} mudanças que valem a pena. {ready} delas são mudanças de texto, e o texto novo já está escrito aqui embaixo. As outras {structural} mudam como a página está montada.',
    changesFound: 'Mudanças recomendadas',
    copyWritten: 'Texto já escrito',
    testThisFirst: 'Comece por aqui',
    problem: 'Problema',
    recommendation: 'Recomendação',
    current: 'Atual',
    changeTo: 'Trocar por',
    placeholderNote:
      'Contém [placeholders]. Substitua pelos seus dados reais antes de lançar.',
    whyThisWorks: 'Por que isso funciona',
    manualSetup: 'Configuração manual',
    manualSetupBody:
      'Esta mudança toca uma seção que não é uma troca de texto de linha única, então a prévia no contexto não está disponível. Aplique o texto recomendado manualmente.',
    appliedToYourPage: 'Aplicado à sua página',
    previewAlt: 'Variante aplicada à landing page',
    previewCta: 'Veja como fica na sua página',
    previewHint:
      'Carregamos sua página real com este texto no lugar. Leva cerca de {seconds} segundos.',
    previewLoading: 'Renderizando sua página...',
    previewUnavailable:
      'Não conseguimos renderizar sua página agora. O texto recomendado acima continua valendo.',
    previewRetry: 'Tentar de novo',
    previewOverflow:
      'Este texto não cabe no espaço que sua página dá para esse elemento, então a prévia mostra ele cortado. Encurte o texto, ou dê mais espaço ao elemento antes de publicar.',
    footerQuestion: 'Quer uma nota assim para a sua página?',
    generatedBy: 'Gerado pelo Hunch'
  },







  blog: ptBrBlog
}
