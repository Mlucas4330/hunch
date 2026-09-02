import type {
  AdIdeas,
  AnalysisOutput,
  FlowFixOutput,
  VariantOutput,
  VisibilityFixOutput
} from '@/lib/ai/schema'
import type { Locale } from '@/lib/enums'
import type { PageMobile, PagePerformance, PageSeo, PageStructure } from '@/lib/scrape'
import type { CrawlerAccess } from '@/lib/robots'
import type { PageKeywords } from '@/lib/keywords'

export const FIXTURE_STRUCTURE: PageStructure = {
  hasOauth: false,
  // The fixture playbook recommends offering Google login, so the fixture page has to be one that
  // signs people in at all -- otherwise the readout correctly declines to ask the question and the
  // fix hangs off a finding nobody emitted. See lib/readout.ts.
  hasAuthForm: true,
  oauthProviders: [],
  formCount: 1,
  formFieldCount: 6,
  hasFaq: false,
  hasPricing: true,
  hasTestimonials: true,
  hasVideo: false,
  hasStickyCta: false,
  bodyLinkCount: 7,
  aboveFoldCtaCount: 3,
  navLinkCount: 8,
  headingCount: 14,
  sectionCount: 9,
  wordCount: 720,

  requiredFieldCount: 5,
  fieldsWithoutLabel: 2,
  formSteps: 1,
  hasSubmit: true,
  hasClientValidation: true,
  deadCtaCount: 1,

  hasCnpj: false,
  testimonialWithAttributionCount: 0,
  clientLogoCount: 4,
  trustBadgeCount: 0,
  hasPrivacyPolicy: true,
  hasTerms: true,
  hasPhysicalAddress: false,
  hasPhone: false,
  hasSocialLinks: true
}

export const FIXTURE_SEO: PageSeo = {
  title: 'Acme - The workspace for modern teams',
  metaDescription: null,
  canonical: null,
  robotsMeta: null,
  lang: 'en',
  h1Count: 1,
  imageCount: 12,
  imagesMissingAlt: 5,
  internalLinkCount: 14,
  hasOgTitle: true,
  hasOgDescription: true,
  hasOgImage: false,
  jsonLdTypes: [],
  headings: ['The workspace for modern teams', 'Pricing', 'Frequently asked questions']
}

export const FIXTURE_PERFORMANCE: PagePerformance = {
  ttfbMs: 410,
  fcpMs: 1900,
  lcpMs: 4200,
  domContentLoadedMs: 2600,
  loadMs: 5100,
  transferredBytes: 3_400_000,
  requestCount: 84,
  domNodeCount: 1450
}

// Deliberately a page with mobile problems: the e2e run is the only place these cells are rendered
// without a real browser behind them, so a clean fixture would mean nothing ever exercises the
// warn and alert branches.
export const FIXTURE_MOBILE: PageMobile = {
  horizontalOverflow: true,
  smallTapTargetCount: 6,
  tinyTextCount: 11,
  aboveFoldCtaCount: 1,
  hasViewportMeta: true
}

export const FIXTURE_CRAWLER_ACCESS: CrawlerAccess = {
  status: 'found',
  blockedAgents: ['GPTBot'],
  blocksAll: false,
  sitemaps: []
}

export const FIXTURE_KEYWORDS: PageKeywords = {
  totalWords: 720,
  terms: [
    {
      term: 'workspace',
      count: 14,
      inTitle: true,
      inH1: true,
      inMetaDescription: false,
      inHeadings: true
    },
    {
      term: 'teams',
      count: 11,
      inTitle: true,
      inH1: true,
      inMetaDescription: false,
      inHeadings: true
    },
    {
      term: 'modern teams',
      count: 6,
      inTitle: true,
      inH1: true,
      inMetaDescription: false,
      inHeadings: true
    },
    {
      term: 'pricing',
      count: 5,
      inTitle: false,
      inH1: false,
      inMetaDescription: false,
      inHeadings: true
    },
    {
      term: 'onboarding',
      count: 3,
      inTitle: false,
      inH1: false,
      inMetaDescription: false,
      inHeadings: false
    }
  ]
}

const PLAYBOOK: Record<Locale, FlowFixOutput[]> = {
  en: [
    {
      category: 'signup_friction',
      finding: 'no_social_signin',
      title: 'Offer login with Google',
      problem:
        'Signing up means typing an email, inventing a password, and waiting on a confirmation.',
      steps: [
        'Register an OAuth client with Google and add the callback URL for your app',
        'Add a "Continue with Google" button above the email field on the signup form',
        'Match an existing account by verified email so returning users are never duplicated'
      ],
      impact_score: 9,
      evidence:
        'Every account created today costs the visitor a password they must invent and then remember.'
    },
    {
      category: 'objections',
      finding: 'no_faq',
      title: 'Add a Q&A block before the footer',
      problem:
        'The page never answers what happens after the trial, so visitors leave to find out.',
      steps: [
        'Collect the five questions your support inbox receives most often',
        'Answer each in two sentences inside a collapsible list above the footer',
        'Link the pricing question straight to the pricing section'
      ],
      impact_score: 7,
      evidence: 'Reference pages resolve pricing and cancellation questions on the page itself.'
    },
    {
      category: 'decision_load',
      finding: 'form_fields',
      title: 'Cut the signup form to two fields',
      problem: 'The form asks for six fields before the visitor has seen any value.',
      steps: [
        'Keep only email and password on the form',
        'Move company name and team size into the first onboarding screen',
        'Drop the fields you never query'
      ],
      impact_score: 7,
      evidence: 'Four of the six fields are asked before the visitor has any reason to answer them.'
    },
    {
      category: 'cta_placement',
      finding: null,
      title: 'Repeat the primary action after pricing',
      problem: 'The only call to action sits above the fold, far from where the decision happens.',
      steps: [
        'Add the same primary button directly under the pricing table',
        'Keep the label identical to the hero button so it reads as one path'
      ],
      impact_score: 5,
      evidence: 'Reference pages repeat one action rather than offering several competing ones.'
    }
  ],
  'pt-BR': [
    {
      category: 'signup_friction',
      finding: 'no_social_signin',
      title: 'Ofereça login com o Google',
      problem:
        'Criar conta exige digitar um email, inventar uma senha e esperar por uma confirmação.',
      steps: [
        'Registre um cliente OAuth no Google e adicione a URL de callback do seu app',
        'Adicione um botão "Continuar com o Google" acima do campo de email no formulário de cadastro',
        'Reconheça a conta existente pelo email verificado para nunca duplicar quem volta'
      ],
      impact_score: 9,
      evidence:
        'Toda conta criada hoje custa ao visitante uma senha que ele precisa inventar e depois lembrar.'
    },
    {
      category: 'objections',
      finding: 'no_faq',
      title: 'Adicione um bloco de perguntas antes do rodapé',
      problem:
        'A página nunca responde o que acontece depois do teste, então o visitante sai para descobrir.',
      steps: [
        'Reúna as cinco perguntas que sua caixa de suporte mais recebe',
        'Responda cada uma em duas frases numa lista recolhível acima do rodapé',
        'Ligue a pergunta sobre preço direto à seção de planos'
      ],
      impact_score: 7,
      evidence:
        'A página faz o visitante sair para descobrir preço e cancelamento, e responder na própria página remove essa saída.'
    },
    {
      category: 'decision_load',
      finding: 'form_fields',
      title: 'Reduza o formulário de cadastro a dois campos',
      problem: 'O formulário pede seis campos antes de o visitante ter visto qualquer valor.',
      steps: [
        'Mantenha apenas email e senha no formulário',
        'Mova nome da empresa e tamanho do time para a primeira tela de onboarding',
        'Descarte os campos que você nunca consulta'
      ],
      impact_score: 7,
      evidence:
        'Quatro dos seis campos são pedidos antes de o visitante ter qualquer motivo para respondê-los.'
    },
    {
      category: 'cta_placement',
      finding: null,
      title: 'Repita a ação principal depois dos planos',
      problem: 'A única chamada para ação fica acima da dobra, longe de onde a decisão acontece.',
      steps: [
        'Adicione o mesmo botão principal logo abaixo da tabela de planos',
        'Mantenha o rótulo idêntico ao do botão do topo para que os dois leiam como um só caminho'
      ],
      impact_score: 5,
      evidence:
        'Duas ações diferentes no mesmo campo de visão obrigam o visitante a escolher um caminho antes de escolher o produto.'
    }
  ]
}

const VISIBILITY: Record<Locale, VisibilityFixOutput[]> = {
  en: [
    {
      category: 'metadata',
      finding: 'no_meta_description',
      title: 'Write a meta description',
      problem: 'The page declares no description, so search engines write their own from the copy.',
      steps: [
        'Add a meta description tag summarizing what the product does and who it is for',
        'Keep it to one sentence that reads as a whole thought on its own'
      ],
      impact_score: 8,
      evidence:
        'With no description declared, the snippet a reader sees is assembled from whatever text the crawler picked.'
    },
    {
      category: 'structured_data',
      finding: 'no_structured_data',
      title: 'Add Organization structured data',
      problem: 'Nothing on the page states in machine readable form what this company is.',
      steps: [
        'Add a JSON-LD script describing the Organization with its name, URL, and logo',
        'Add a SoftwareApplication entry naming the product and its category',
        'Validate the markup renders without errors before shipping'
      ],
      impact_score: 6,
      evidence:
        'A model reading this page has to infer what the company is from prose, because no markup states it.'
    },
    {
      category: 'ai_answerability',
      finding: 'images_missing_alt',
      title: 'Add alt text to the product images',
      problem: 'Several images carry no alt attribute, so their content reaches no crawler at all.',
      steps: [
        'Write alt text for every image that carries a claim or a screenshot of the product',
        'Leave alt empty only for images that are purely decorative'
      ],
      impact_score: 5,
      evidence: 'What those images show is currently readable only by a person looking at the page.'
    }
  ],
  'pt-BR': [
    {
      category: 'metadata',
      finding: 'no_meta_description',
      title: 'Escreva uma meta description',
      problem:
        'A página não declara descrição, então os buscadores escrevem a deles a partir do texto.',
      steps: [
        'Adicione uma tag meta description resumindo o que o produto faz e para quem ele é',
        'Mantenha em uma frase que se sustente sozinha como ideia completa'
      ],
      impact_score: 8,
      evidence:
        'Sem descrição declarada, o trecho que o leitor vê é montado a partir de qualquer texto que o rastreador escolheu.'
    },
    {
      category: 'structured_data',
      finding: 'no_structured_data',
      title: 'Adicione dados estruturados de Organization',
      problem: 'Nada na página diz, em formato legível por máquina, o que é esta empresa.',
      steps: [
        'Adicione um script JSON-LD descrevendo a Organization com nome, URL e logo',
        'Adicione uma entrada SoftwareApplication nomeando o produto e sua categoria',
        'Valide se a marcação carrega sem erros antes de publicar'
      ],
      impact_score: 6,
      evidence:
        'Um modelo que lê esta página precisa deduzir o que é a empresa a partir do texto corrido, porque nenhuma marcação diz isso.'
    },
    {
      category: 'ai_answerability',
      finding: 'images_missing_alt',
      title: 'Adicione texto alternativo às imagens',
      problem:
        'Várias imagens não têm atributo alt, então o conteúdo delas não chega a rastreador nenhum.',
      steps: [
        'Escreva o texto alternativo de toda imagem que carrega uma afirmação ou uma tela do produto',
        'Deixe o alt vazio apenas nas imagens puramente decorativas'
      ],
      impact_score: 5,
      evidence:
        'O que essas imagens mostram hoje só é legível por uma pessoa olhando para a página.'
    }
  ]
}

const ALTERNATE_VARIANTS: Record<Locale, VariantOutput[]> = {
  en: [
    {
      emphasis: null,
      copy: 'The workspace that gets [your core job] done in [timeframe]',
      evidence:
        'The current line names a category while this one names a finished outcome, so the visitor no longer has to infer what they get.'
    },
    {
      emphasis: null,
      copy: 'Stop [specific pain]. Start shipping.',
      evidence:
        'The current line describes the product while this one names the cost of staying put, so the reason to act is stated rather than assumed.'
    }
  ],
  'pt-BR': [
    {
      emphasis: null,
      copy: 'O espaço de trabalho que resolve [seu trabalho principal] em [prazo]',
      evidence:
        'A linha atual anuncia uma categoria e esta anuncia um resultado pronto, então o visitante não precisa deduzir o que recebe.'
    },
    {
      emphasis: null,
      copy: 'Pare de [dor específica]. Comece a entregar.',
      evidence:
        'A linha atual descreve o produto e esta nomeia o custo de continuar como está, então o motivo para agir fica escrito na página.'
    }
  ]
}

const ANALYSIS: Record<Locale, AnalysisOutput> = {
  en: {
    hypotheses: [
      {
        section: 'headline',
        problem:
          'The headline describes the product category instead of the outcome the visitor wants.',
        current_copy: 'The all-in-one platform for modern teams',
        variants: [
          {
            emphasis: null,
            copy: 'Ship faster: releases in [days], not [weeks]',
            evidence:
              'The current headline asserts a category while the rewrite states the outcome, so the visitor reads the benefit instead of working it out.'
          }
        ],
        impact_score: 9,
        rationale:
          'A specific, quantified outcome in the headline raises perceived value within the first 5 seconds.'
      },
      {
        section: 'cta',
        problem: 'The primary CTA is generic and adds friction by implying a long commitment.',
        current_copy: 'Get started',
        variants: [
          {
            emphasis: null,
            copy: 'Start free, no card required',
            evidence:
              'The current label asks for a decision without saying what it costs, and the rewrite answers that before the click.'
          }
        ],
        impact_score: 8,
        rationale:
          'Removing risk and signalling zero cost lowers friction at the decision point.'
      },
      {
        section: 'social_proof',
        problem:
          'Social proof is a vague logo strip with no credibility or relevance to the buyer.',
        current_copy: 'Trusted by teams everywhere',
        variants: [
          {
            emphasis: null,
            copy: 'Trusted by [number] teams shipping every day',
            evidence:
              'The current line asserts that the product is trusted while the rewrite points at something the visitor can check.'
          }
        ],
        impact_score: 7,
        rationale:
          'Concrete numbers and recognizable names convert abstract trust into verifiable evidence.'
      },
      {
        section: 'pricing',
        problem: 'Pricing leads with the highest tier, anchoring visitors on cost before value.',
        current_copy: 'Enterprise - $99/user/mo',
        variants: [
          {
            emphasis: null,
            copy: 'Free to start, [Pro] at [$price]',
            evidence:
              'The current framing shows the full price first, and the rewrite puts the lowest commitment in front of it.'
          }
        ],
        impact_score: 6,
        rationale:
          'Anchoring on a low-friction entry point reduces sticker shock.'
      },
      {
        section: 'features',
        problem: 'Features are listed as capabilities, not benefits the buyer cares about.',
        current_copy: 'Real-time sync, API access, role-based permissions',
        variants: [
          {
            emphasis: null,
            copy: 'See data instantly, automate with the API, control access',
            evidence:
              'The current text names a capability while the rewrite names the job it finishes, so the visitor maps it to their own work.'
          }
        ],
        impact_score: 5,
        rationale:
          'Reframing capabilities as outcomes connects each feature to a buyer goal.'
      },
      {
        section: 'subheadline',
        problem: 'The subheadline repeats the headline instead of handling the next objection.',
        current_copy: 'Built for teams that move fast',
        variants: [
          {
            emphasis: null,
            copy: 'Set up in [setup time]. No migration, no training.',
            evidence: 'The current subheadline leaves the setup question open, and the rewrite answers it where the objection appears.'
          }
        ],
        impact_score: 4,
        rationale:
          'Using the subheadline to pre-empt the top objection keeps momentum toward the CTA.'
      }
    ]
  },
  'pt-BR': {
    hypotheses: [
      {
        section: 'headline',
        problem:
          'O título descreve a categoria do produto em vez do resultado que o visitante quer.',
        current_copy: 'The all-in-one platform for modern teams',
        variants: [
          {
            emphasis: null,
            copy: 'Entregue em [dias], não em [semanas]',
            evidence:
              'O título atual afirma uma categoria e a reescrita declara o resultado, então o visitante lê o benefício em vez de deduzir.'
          }
        ],
        impact_score: 9,
        rationale:
          'Um resultado específico e quantificado no título eleva o valor percebido nos primeiros 5 segundos.'
      },
      {
        section: 'cta',
        problem: 'A chamada principal é genérica e cria atrito ao sugerir um compromisso longo.',
        current_copy: 'Get started',
        variants: [
          {
            emphasis: null,
            copy: 'Comece grátis, sem cartão',
            evidence:
              'O rótulo atual pede uma decisão sem dizer o que ela custa, e a reescrita responde isso antes do clique.'
          }
        ],
        impact_score: 8,
        rationale:
          'Remover o risco e sinalizar custo zero reduz o atrito no momento da decisão.'
      },
      {
        section: 'social_proof',
        problem: 'A prova social é vaga e não traz credibilidade nem relevância para o comprador.',
        current_copy: 'Trusted by teams everywhere',
        variants: [
          {
            emphasis: null,
            copy: 'A escolha de [número] times que entregam',
            evidence:
              'A linha atual afirma que o produto é confiável e a reescrita aponta algo que o visitante consegue conferir.'
          }
        ],
        impact_score: 7,
        rationale:
          'Números concretos e nomes reconhecíveis convertem confiança abstrata em evidência verificável.'
      },
      {
        section: 'pricing',
        problem: 'Os planos começam pelo mais caro, ancorando o visitante no custo antes do valor.',
        current_copy: 'Enterprise - $99/user/mo',
        variants: [
          {
            emphasis: null,
            copy: 'Grátis para começar, [Pro] por [$preço]',
            evidence:
              'O enquadramento atual mostra o preço cheio primeiro, e a reescrita coloca o menor compromisso à frente dele.'
          }
        ],
        impact_score: 6,
        rationale:
          'Ancorar num ponto de entrada de baixo atrito reduz o choque de preço.'
      },
      {
        section: 'features',
        problem:
          'Os recursos aparecem como capacidades, não como benefícios que interessam ao comprador.',
        current_copy: 'Real-time sync, API access, role-based permissions',
        variants: [
          {
            emphasis: null,
            copy: 'Veja dados na hora, automatize pela API, controle acessos',
            evidence:
              'O texto atual nomeia uma capacidade e a reescrita nomeia a tarefa que ela conclui, então o visitante liga ao próprio trabalho.'
          }
        ],
        impact_score: 5,
        rationale:
          'Reformular capacidades como resultados conecta cada recurso a um objetivo do comprador.'
      },
      {
        section: 'subheadline',
        problem: 'O subtítulo repete o título em vez de tratar a próxima objeção.',
        current_copy: 'Built for teams that move fast',
        variants: [
          {
            emphasis: null,
            copy: 'Configure em [tempo de setup]. Sem migração, sem treinamento.',
            evidence:
              'O subtítulo atual deixa a dúvida de configuração aberta, e a reescrita responde onde a objeção aparece.'
          }
        ],
        impact_score: 4,
        rationale:
          'Usar o subtítulo para antecipar a principal objeção mantém o avanço até a chamada para ação.'
      }
    ]
  }
}

export function fixtureAnalysis(locale: Locale): AnalysisOutput {
  return ANALYSIS[locale]
}

export function fixturePlaybook(locale: Locale): FlowFixOutput[] {
  return PLAYBOOK[locale]
}

export function fixtureVisibility(locale: Locale): VisibilityFixOutput[] {
  return VISIBILITY[locale]
}

export function fixtureAlternateVariants(locale: Locale): VariantOutput[] {
  return ALTERNATE_VARIANTS[locale]
}

// Every term below is one of FIXTURE_KEYWORDS' own, because the route filters the generated groups
// against the measured terms and a fixture that failed that filter would come back empty.
const AD_IDEAS: Record<Locale, AdIdeas> = {
  en: {
    groups: [
      {
        theme: 'Workspace for teams',
        terms: ['workspace', 'teams', 'modern teams'],
        headlines: [
          'One workspace for teams',
          'Your team, one workspace',
          'Built for modern teams',
          'Start your workspace free',
          'A workspace teams keep'
        ],
        descriptions: [
          'One workspace where your team plans, writes and ships without switching tools.',
          'Set up in minutes. No card to start, and your team can join the same day.'
        ]
      },
      {
        theme: 'Pricing and onboarding',
        terms: ['pricing', 'onboarding'],
        headlines: [
          'Pricing on the page',
          'See pricing, no demo call',
          'Onboarding in one sitting',
          'Simple pricing, no surprises',
          'Start onboarding today'
        ],
        descriptions: [
          'Pricing is on the page, so you can decide before anyone asks you for a call.',
          'Onboarding walks your team through setup, from the first invite to the first project.'
        ]
      }
    ],
    negatives: ['course', 'jobs', 'salary', 'template', 'free download', 'tutorial']
  },
  'pt-BR': {
    groups: [
      {
        theme: 'Workspace para times',
        terms: ['workspace', 'teams', 'modern teams'],
        headlines: [
          'Um workspace para o time',
          'Seu time, um workspace so',
          'Feito para times modernos',
          'Comece seu workspace gratis',
          'O workspace que o time usa'
        ],
        descriptions: [
          'Um workspace onde seu time planeja, escreve e entrega sem trocar de ferramenta.',
          'Configuracao em minutos. Sem cartao para comecar, e o time entra no mesmo dia.'
        ]
      },
      {
        theme: 'Precos e onboarding',
        terms: ['pricing', 'onboarding'],
        headlines: [
          'Precos na propria pagina',
          'Veja o preco, sem reuniao',
          'Onboarding de uma sentada',
          'Precos simples, sem surpresa',
          'Comece o onboarding hoje'
        ],
        descriptions: [
          'O preco esta na pagina, entao voce decide antes de alguem pedir uma reuniao.',
          'O onboarding leva o time pela configuracao, do primeiro convite ao primeiro projeto.'
        ]
      }
    ],
    negatives: ['curso', 'vaga', 'salario', 'template', 'download gratis', 'tutorial']
  }
}

export function fixtureAdIdeas(locale: Locale): AdIdeas {
  return AD_IDEAS[locale]
}
