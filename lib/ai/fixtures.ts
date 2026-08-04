import type { AnalysisOutput, FlowFixOutput, VariantOutput } from '@/lib/ai/schema'
import type { Locale } from '@/lib/enums'
import type { PageStructure } from '@/lib/scrape'

// Fixtures are written per locale for the same reason the real prompts take a language: the analysis
// is written in the language the user is reading the app in, and E2E_FIXTURES must not be the one
// path that ignores that. Each map is Record<Locale, T>, so a new locale without a fixture fails
// typecheck exactly like a missing dictionary key.
//
// What is NOT translated, mirroring the prompt contracts in lib/ai/prompt.ts:
// - current_copy quotes the (English) fictional page these fixtures pretend to have scraped, and is
//   what analyzeLandingPage synthesizes its elements from. Translating it would break target
//   resolution.
// - competitors, section and category are proper names and Postgres enum values.

// The structural readout the fixture analysis pretends to have scraped: a page with no social sign
// in, no FAQ, a long form, and competing calls to action, so every fixture flow fix has a cause.
// Numeric and boolean throughout, so it is language independent.
export const FIXTURE_STRUCTURE: PageStructure = {
  hasOauth: false,
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
  wordCount: 720
}

// The flow playbook under E2E_FIXTURES. Four fixes across distinct categories, ordered by impact
// descending, each one traceable to a false/high field in FIXTURE_STRUCTURE above.
const PLAYBOOK: Record<Locale, FlowFixOutput[]> = {
  en: [
    {
      category: 'signup_friction',
      title: 'Offer login with Google',
      problem:
        'Signing up means typing an email, inventing a password, and waiting on a confirmation.',
      steps: [
        'Register an OAuth client with Google and add the callback URL for your app',
        'Add a "Continue with Google" button above the email field on the signup form',
        'Match an existing account by verified email so returning users are never duplicated'
      ],
      impact_score: 9,
      effort_score: 4,
      evidence:
        '3 of 3 reference pages offer social sign in, so the one click path is the expectation.'
    },
    {
      category: 'objections',
      title: 'Add a Q&A block before the footer',
      problem: 'The page never answers what happens after the trial, so visitors leave to find out.',
      steps: [
        'Collect the five questions your support inbox receives most often',
        'Answer each in two sentences inside a collapsible list above the footer',
        'Link the pricing question straight to the pricing section'
      ],
      impact_score: 7,
      effort_score: 2,
      evidence: 'Reference pages resolve pricing and cancellation questions on the page itself.'
    },
    {
      category: 'decision_load',
      title: 'Cut the signup form to two fields',
      problem: 'The form asks for six fields before the visitor has seen any value.',
      steps: [
        'Keep only email and password on the form',
        'Move company name and team size into the first onboarding screen',
        'Drop the fields you never query'
      ],
      impact_score: 7,
      effort_score: 3,
      evidence: 'The median reference page asks for 2 fields at signup.'
    },
    {
      category: 'cta_placement',
      title: 'Repeat the primary action after pricing',
      problem: 'The only call to action sits above the fold, far from where the decision happens.',
      steps: [
        'Add the same primary button directly under the pricing table',
        'Keep the label identical to the hero button so it reads as one path'
      ],
      impact_score: 5,
      effort_score: 1,
      evidence: 'Reference pages repeat one action rather than offering several competing ones.'
    }
  ],
  'pt-BR': [
    {
      category: 'signup_friction',
      title: 'Ofereça login com o Google',
      problem:
        'Criar conta exige digitar um email, inventar uma senha e esperar por uma confirmação.',
      steps: [
        'Registre um cliente OAuth no Google e adicione a URL de callback do seu app',
        'Adicione um botão "Continuar com o Google" acima do campo de email no formulário de cadastro',
        'Reconheça a conta existente pelo email verificado para nunca duplicar quem volta'
      ],
      impact_score: 9,
      effort_score: 4,
      evidence:
        '3 de 3 páginas de referência oferecem login social, então o caminho de um clique é o esperado.'
    },
    {
      category: 'objections',
      title: 'Adicione um bloco de perguntas antes do rodapé',
      problem:
        'A página nunca responde o que acontece depois do teste, então o visitante sai para descobrir.',
      steps: [
        'Reúna as cinco perguntas que sua caixa de suporte mais recebe',
        'Responda cada uma em duas frases numa lista recolhível acima do rodapé',
        'Ligue a pergunta sobre preço direto à seção de planos'
      ],
      impact_score: 7,
      effort_score: 2,
      evidence:
        'As páginas de referência resolvem dúvidas de preço e cancelamento na própria página.'
    },
    {
      category: 'decision_load',
      title: 'Reduza o formulário de cadastro a dois campos',
      problem: 'O formulário pede seis campos antes de o visitante ter visto qualquer valor.',
      steps: [
        'Mantenha apenas email e senha no formulário',
        'Mova nome da empresa e tamanho do time para a primeira tela de onboarding',
        'Descarte os campos que você nunca consulta'
      ],
      impact_score: 7,
      effort_score: 3,
      evidence: 'A página de referência mediana pede 2 campos no cadastro.'
    },
    {
      category: 'cta_placement',
      title: 'Repita a ação principal depois dos planos',
      problem:
        'A única chamada para ação fica acima da dobra, longe de onde a decisão acontece.',
      steps: [
        'Adicione o mesmo botão principal logo abaixo da tabela de planos',
        'Mantenha o rótulo idêntico ao do botão do topo para que os dois leiam como um só caminho'
      ],
      impact_score: 5,
      effort_score: 1,
      evidence:
        'As páginas de referência repetem uma ação em vez de oferecer várias concorrentes entre si.'
    }
  ]
}

// Returned by generateAlternateVariants under E2E_FIXTURES so the challenger picker on the
// run-a-test screen has its three pills without calling Claude.
const ALTERNATE_VARIANTS: Record<Locale, VariantOutput[]> = {
  en: [
    {
      copy: 'The workspace that gets [your core job] done in [timeframe]',
      evidence:
        'Vercel headlines a concrete time-to-value - fill in the job and timeframe you can prove.'
    },
    {
      copy: 'Stop [specific pain]. Start shipping.',
      evidence:
        'Retool frames the headline against the cost of the status quo - name the pain your buyers feel.'
    }
  ],
  'pt-BR': [
    {
      copy: 'O espaço de trabalho que resolve [seu trabalho principal] em [prazo]',
      evidence:
        'A Vercel destaca um tempo até o valor concreto, preencha com o trabalho e o prazo que você consegue provar.'
    },
    {
      copy: 'Pare de [dor específica]. Comece a entregar.',
      evidence:
        'A Retool posiciona o título contra o custo de continuar como está, nomeie a dor que seus compradores sentem.'
    }
  ]
}

// Deterministic output used when E2E_FIXTURES=1 so end-to-end tests can run without
// scraping, web search, or calling Claude. Ordered by impact_score descending.
// Variants are templates (with [placeholders]) inspired by competitor strategy -- never
// fabricated numbers, quotes, or competitor names in the copy itself.
const COMPETITORS: AnalysisOutput['competitors'] = [
  { name: 'Linear', url: 'https://linear.app' },
  { name: 'Vercel', url: 'https://vercel.com' },
  { name: 'Retool', url: 'https://retool.com' }
]

const ANALYSIS: Record<Locale, AnalysisOutput> = {
  en: {
    competitors: COMPETITORS,
    hypotheses: [
      {
        section: 'headline',
        problem:
          'The headline describes the product category instead of the outcome the visitor wants.',
        current_copy: 'The all-in-one platform for modern teams',
        variants: [
          {
            copy: 'Ship faster: cut your release cycle from [weeks] to [days]',
            evidence:
              'Linear leads with a quantified speed outcome - plug in your real before/after numbers.'
          }
        ],
        impact_score: 9,
        effort_score: 2,
        rationale:
          'A specific, quantified outcome in the headline raises perceived value within the first 5 seconds, matching how the strongest competitors open.'
      },
      {
        section: 'cta',
        problem: 'The primary CTA is generic and adds friction by implying a long commitment.',
        current_copy: 'Get started',
        variants: [
          {
            copy: 'Start free, no card required',
            evidence:
              'Linear and Vercel remove payment risk at the primary CTA - use only if your trial truly needs no card.'
          }
        ],
        impact_score: 8,
        effort_score: 1,
        rationale:
          'Removing risk and signalling zero cost lowers friction at the decision point, a lever every benchmarked competitor pulls.'
      },
      {
        section: 'social_proof',
        problem: 'Social proof is a vague logo strip with no credibility or relevance to the buyer.',
        current_copy: 'Trusted by teams everywhere',
        variants: [
          {
            copy: 'Trusted by [number] teams shipping every day',
            evidence:
              'Linear quantifies adoption instead of asserting trust - drop in your real active-team count.'
          }
        ],
        impact_score: 7,
        effort_score: 3,
        rationale:
          'Concrete numbers and recognizable names convert abstract trust into verifiable evidence, as the strongest competitor pages do.'
      },
      {
        section: 'pricing',
        problem: 'Pricing leads with the highest tier, anchoring visitors on cost before value.',
        current_copy: 'Enterprise - $99/user/mo',
        variants: [
          {
            copy: 'Free for [solo builders]. Scale to [Pro] at [$price]/user/mo as your team grows.',
            evidence:
              'Vercel anchors on a free entry tier before paid - map this to your real tiers.'
          }
        ],
        impact_score: 6,
        effort_score: 4,
        rationale:
          'Anchoring on a low-friction entry point reduces sticker shock, mirroring how competitors structure their pricing page.'
      },
      {
        section: 'features',
        problem: 'Features are listed as capabilities, not benefits the buyer cares about.',
        current_copy: 'Real-time sync, API access, role-based permissions',
        variants: [
          {
            copy: 'Everyone sees the same data instantly. Automate your stack with the API. Control who can touch what.',
            evidence:
              'Linear frames each feature as a job-to-be-done - keep your real capabilities, lead with the outcome.'
          }
        ],
        impact_score: 5,
        effort_score: 3,
        rationale:
          'Reframing capabilities as outcomes connects each feature to a buyer goal, as competitor feature sections do.'
      },
      {
        section: 'subheadline',
        problem: 'The subheadline repeats the headline instead of handling the next objection.',
        current_copy: 'Built for teams that move fast',
        variants: [
          {
            copy: 'Set up in [setup time]. No migration, no training, cancel anytime.',
            evidence: 'Vercel pre-empts setup-effort objections - use your real onboarding time.'
          }
        ],
        impact_score: 4,
        effort_score: 2,
        rationale:
          'Using the subheadline to pre-empt the top objection keeps momentum toward the CTA, as competitor pages do.'
      }
    ]
  },
  'pt-BR': {
    competitors: COMPETITORS,
    hypotheses: [
      {
        section: 'headline',
        problem: 'O título descreve a categoria do produto em vez do resultado que o visitante quer.',
        current_copy: 'The all-in-one platform for modern teams',
        variants: [
          {
            copy: 'Entregue mais rápido: reduza seu ciclo de releases de [semanas] para [dias]',
            evidence:
              'A Linear abre com um ganho de velocidade quantificado, use seus números reais de antes e depois.'
          }
        ],
        impact_score: 9,
        effort_score: 2,
        rationale:
          'Um resultado específico e quantificado no título eleva o valor percebido nos primeiros 5 segundos, como abrem os concorrentes mais fortes.'
      },
      {
        section: 'cta',
        problem: 'A chamada principal é genérica e cria atrito ao sugerir um compromisso longo.',
        current_copy: 'Get started',
        variants: [
          {
            copy: 'Comece grátis, sem cartão',
            evidence:
              'Linear e Vercel tiram o risco de pagamento da chamada principal, use apenas se seu teste realmente dispensar cartão.'
          }
        ],
        impact_score: 8,
        effort_score: 1,
        rationale:
          'Remover o risco e sinalizar custo zero reduz o atrito no momento da decisão, alavanca que todo concorrente avaliado usa.'
      },
      {
        section: 'social_proof',
        problem: 'A prova social é vaga e não traz credibilidade nem relevância para o comprador.',
        current_copy: 'Trusted by teams everywhere',
        variants: [
          {
            copy: 'A escolha de [número] times que entregam todo dia',
            evidence:
              'A Linear quantifica a adoção em vez de afirmar confiança, coloque seu número real de times ativos.'
          }
        ],
        impact_score: 7,
        effort_score: 3,
        rationale:
          'Números concretos e nomes reconhecíveis convertem confiança abstrata em evidência verificável, como fazem as páginas concorrentes mais fortes.'
      },
      {
        section: 'pricing',
        problem: 'Os planos começam pelo mais caro, ancorando o visitante no custo antes do valor.',
        current_copy: 'Enterprise - $99/user/mo',
        variants: [
          {
            copy: 'Grátis para [quem trabalha sozinho]. Suba para o [Pro] por [$preço] por usuário ao mês conforme o time cresce.',
            evidence:
              'A Vercel ancora num plano de entrada gratuito antes do pago, mapeie isso para seus planos reais.'
          }
        ],
        impact_score: 6,
        effort_score: 4,
        rationale:
          'Ancorar num ponto de entrada de baixo atrito reduz o choque de preço, espelhando como os concorrentes estruturam a página de planos.'
      },
      {
        section: 'features',
        problem:
          'Os recursos aparecem como capacidades, não como benefícios que interessam ao comprador.',
        current_copy: 'Real-time sync, API access, role-based permissions',
        variants: [
          {
            copy: 'Todo mundo vê os mesmos dados na hora. Automatize sua stack pela API. Controle quem pode mexer em quê.',
            evidence:
              'A Linear apresenta cada recurso como uma tarefa a resolver, mantenha suas capacidades reais e comece pelo resultado.'
          }
        ],
        impact_score: 5,
        effort_score: 3,
        rationale:
          'Reformular capacidades como resultados conecta cada recurso a um objetivo do comprador, como fazem as seções de recursos dos concorrentes.'
      },
      {
        section: 'subheadline',
        problem: 'O subtítulo repete o título em vez de tratar a próxima objeção.',
        current_copy: 'Built for teams that move fast',
        variants: [
          {
            copy: 'Configure em [tempo de setup]. Sem migração, sem treinamento, cancele quando quiser.',
            evidence:
              'A Vercel antecipa a objeção de esforço de configuração, use seu tempo real de onboarding.'
          }
        ],
        impact_score: 4,
        effort_score: 2,
        rationale:
          'Usar o subtítulo para antecipar a principal objeção mantém o avanço até a chamada para ação, como fazem as páginas concorrentes.'
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

export function fixtureAlternateVariants(locale: Locale): VariantOutput[] {
  return ALTERNATE_VARIANTS[locale]
}
