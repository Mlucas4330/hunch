import { enBlog } from '@/lib/i18n/dictionaries/en.blog'

export const en = {
  metadata: {
    title: 'Hunch',
    description: 'Turn a landing page into a measured teardown with ranked fixes and the copy already written.',
    ogImageAlt: 'Hunch - a measured teardown of your landing page',
    pages: {
      landing: {
        title: 'Find out your landing page score',
        description:
          'Paste your landing page URL and get a score out of 100, measured on the page, plus ranked fixes with the replacement copy already written.'
      },
      signin: {
        title: 'Sign in',
        description: 'Sign in to Hunch with Google.'
      },
      blog: {
        title: 'Blog',
        description:
          'What a machine reads of your landing page, why copy is the part that argues, and what changes now that people ask an assistant instead of searching.'
      },
      dashboard: {
        title: 'Your pages',
        description: 'Every landing page you have scored, and the report each one produced.'
      },
      admin: {
        title: 'Credits',
        description: 'Grant credits by hand.'
      },
      report: {
        title: 'Conversion teardown for {host}',
        description:
          '{count} ranked fixes for {host}, measured on the page, with the replacement copy and the reasoning behind each one.'
      }
    }
  },

  common: {
    close: 'Close',
    cancel: 'Cancel',
    delete: 'Delete',
    deleting: 'Deleting',
    copy: 'Copy',
    copied: 'Copied',
    or: 'or',
    none: '-',
    loading: 'Loading'
  },

  labels: {
    section: {
      headline: 'Headline',
      subheadline: 'Subheadline',
      cta: 'CTA',
      social_proof: 'Social Proof',
      pricing: 'Pricing',
      features: 'Features',
      hero_image: 'Hero Image',
      navigation: 'Navigation',
      other: 'Other'
    },
    flowCategory: {
      signup_friction: 'Signup Friction',
      cta_placement: 'CTA Placement',
      decision_load: 'Decision Load',
      objections: 'Objections',
      trust: 'Trust',
      pricing_clarity: 'Pricing Clarity',
      page_structure: 'Page Structure',
      mobile: 'Mobile',
      performance: 'Performance',
      indexability: 'Indexability',
      metadata: 'Metadata',
      structured_data: 'Structured Data',
      ai_answerability: 'AI Answerability'
    },
    market: {
      us: 'United States',
      br: 'Brazil'
    }
  },

  nav: {
    homeAria: 'Hunch home',
    how: 'How it works',
    pricing: 'Pricing',
    blog: 'Blog',
    dashboard: 'My pages',
    admin: 'Admin',
    signIn: 'Sign in',
    signOut: 'Sign out',
    account: 'Account',
    languageAria: 'Language',
    menuAria: 'Open menu'
  },

  footer: {
    copyright: 'Copyright {year} Hunch. All rights reserved.',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp'
  },

  infoHint: {
    defaultLabel: 'How this step works'
  },

  score: {
    impact: 'Impact',
    aria: '{label} {score} of 10',
    hintLabel: 'What the impact number means',
    // **It ranks, it does not predict.** Saying a 9 is "worth more signups" would be stating what a
    // number will produce, which nothing here may do -- see docs/invariants.md. Saying it was
    // measured would be worse: the score is written by the model that wrote the fix.
    hint: 'How much this change matters *next to the others in this analysis*, from 1 to 10. It orders the list: start at the top. Written by a model, not counted, and it does not forecast what the change will do.',
    short: {
      impact: 'I'
    }
  },

  landing: {
    eyebrow: 'Free. No account. Under a minute.',
    headlineTop: 'Find out your landing page score.',
    headlineBottom: 'Measured on your page, in under a minute.',
    lead: 'Paste your URL. We open the page the way a visitor does, count what is actually on it, and score it out of 100. Seeing the score costs nothing and needs no account.',
    cta: 'Score my page now, free',
    ctaNote: 'No signup, no card, no install. Just your URL.',
    howItWorksLink: 'How it works',

    heroCard: {
      domain: 'yourlandingpage.com',
      scoreLabel: 'Page score',
      score: '47',
      outOf: '/100',
      rows: [
        { label: 'Signup form fields', value: '7', severity: 'alert' },
        { label: 'Calls to action above the fold', value: '6', severity: 'warn' },
        { label: 'Largest content painted', value: '4.2s', severity: 'alert' },
        { label: 'Meta description', value: 'Missing', severity: 'alert' },
        { label: 'Testimonials', value: 'Yes', severity: 'ok' }
      ]
    },

    reality: {
      eyebrow: 'The reality',
      heading: 'You cannot fix what nobody counted.'
    },
    pains: [
      {
        headline: 'You know it is not converting. You do not know which part.',
        reality: 'Traffic arrives, nobody signs up, and every guess about why costs you another week.',
        answer: 'A score out of 100, and the exact rows that dragged it down. Counted on your page, never guessed.'
      },
      {
        headline: 'Every tool tells you something different.',
        reality: 'One says your speed is fine, the next says it is terrible, and none of them says what to change.',
        answer: 'One readout, one number, and every row is something you can check on your own page in a click.'
      },
      {
        headline: 'Asking an AI gets you generic advice.',
        reality: 'You paste your URL into a chat and it writes plausible tips about a page it never opened.',
        answer: 'We load your page for real, count what is on it, and rewrite the lines that need rewriting.'
      }
    ],
    painsNav: {
      label: 'The reality, one card at a time',
      previous: 'Previous',
      next: 'Next',
      goTo: 'Go to card {index}'
    },

    demo: {
      body: 'The same screens you get after a run: the readout, the ranked fixes, and the new copy rendered onto a real page.',
      frameTitle: 'Interactive product demo',
      rotateHint: 'Turn your phone sideways to see the demo twice as big.'
    },

    aiSearch: {
      heading: 'AI is the new Google, and it never opens your page in a browser.',
      body: 'More and more people ask an assistant instead of searching. The crawler behind it downloads your text, reads it, and moves on. Your analysis has a tab for exactly that.',
      points: [
        {
          title: 'A reader with no browser',
          body: 'No scripts, no fonts, no design. It gets the barest version of your page, so anything that only appears on screen is not there for it.'
        },
        {
          title: 'What your page says about itself',
          body: 'Title, description, canonical, structured data, alt text. We check which of those your page has, and which are missing.'
        },
        {
          title: 'robots.txt matters again',
          body: 'The small file that says who may read your site was written for search engines. It now decides the same thing for AI crawlers. We show you what yours allows.'
        }
      ],
      link: 'Read: is AI the new Google?'
    },

    how: {
      eyebrow: 'How it works',
      heading: 'Paste, score, fix.',
      intro: 'The score is free and needs no account. Unlock the fixes when you want the new copy written for you.'
    },
    steps: [
      {
        label: 'Paste your URL',
        body: 'Any public landing page. We open it in a real browser, the way a visitor does.'
      },
      {
        label: 'Get your score',
        body: 'Out of 100, with every row that made it: form fields, calls to action, load time, alt text, structured data.'
      },
      {
        label: 'Unlock the fixes',
        body: 'Ranked changes with the replacement copy already written, and a preview of it on your real page.'
      }
    ],

    leaderboard: {
      eyebrow: 'Measured so far',
      heading: 'Every page this has opened, scored.',
      intro: 'Each chip is a real page we loaded and counted. Drag the sphere to look around.',
      sphereLabel: 'Pages measured, by score',
      topLabel: 'Highest scores',
      outOf: '/100'
    },

    pulse: {
      running: 'being analyzed right now',
      done: 'just measured: {score}/100',
      dismiss: 'Dismiss'
    },

    faq: {
      eyebrow: 'Before you ask',
      heading: 'The questions people actually send us.',
      items: [
        {
          question: 'Is the score really free?',
          answer: 'Yes, and it needs no account. You paste a URL, we open the page and count what is on it, and the whole readout is yours. Paying is only for the ranked fixes and the replacement copy.'
        },
        {
          question: 'What happens if I run out of credits?',
          answer: 'You keep the free half. Paste a URL with an empty balance and you still get the score and every row that made it, exactly as someone with no account does. What a credit buys is the ranked fixes and the replacement copy, so those wait until you have one.'
        },
        {
          question: 'Do you need access to my site?',
          answer: 'No. No install, no script, no login, no DNS change. We open the public page the same way any visitor does, which is why it works on a page you do not control either.'
        },
        {
          question: 'Where does the score come from?',
          answer: 'Counting. Form fields, calls to action above the fold, images with no alt text, load timings, what your head tag declares. Each row is a number our code read off your page, and every one of them is something you can check yourself in a click.'
        },
        {
          question: 'What does a credit actually buy?',
          answer: 'One full analysis of one page: the ranked flow fixes, the AI visibility findings, and the copy rewrites with the replacement line already written and rendered onto a screenshot of your real page.'
        },
        {
          question: 'Do you store my page?',
          answer: 'We keep the measurements and the screenshot behind your analysis so the report keeps working and a later run can show you what moved. Screenshots are pruned on a schedule.'
        },
        {
          question: 'Why will you not tell me how much this lifts my conversion?',
          answer: 'Because nobody measured it. We can tell you your largest content paints in 4.2 seconds, because we timed it. Turning that into a percentage of lost signups would be a number we made up, and you would find out it was made up the month it did not come true.'
        }
      ]
    },

    finalCta: {
      heading: 'Paste your URL. See your score.'
    }
  },
  signIn: {
    title: 'Sign in',
    description: 'Continue with your work account',
    google: 'Continue with Google',
    github: 'Continue with GitHub',
    adminEmail: 'Admin email',
    password: 'Password',
    invalidCredentials: 'Invalid credentials',
    adminSubmit: 'Sign in as admin'
  },

  admin: {
    eyebrow: 'Operator',
    credits: {
      title: 'Grant credits',
      subtitle: 'Credits handed over with no payment behind them, for comping someone or repairing a payment whose webhook never landed. Every grant is written to the ledger and listed below.',
      emailLabel: 'Account',
      emailPlaceholder: 'someone@example.com',
      creditsLabel: 'Credits',
      submit: 'Grant',
      result: {
        granted: 'Granted.',
        invalid: 'Check the address and the number of credits.',
        forbidden: 'You are not an operator.',
        failed: 'Nothing was granted. Try again.'
      },
      historyTitle: 'Recent grants',
      historyEmpty: 'No credits have been granted by hand yet.'
    }
  },

  dashboard: {
    eyebrow: 'Pages',
    title: 'Your pages',
    hintLabel: 'How analysis works',
    hint: 'Paste the live landing page URL. Hunch measures the page and ranks the fixes worth making. Add *business details* so the copy comes back finished instead of with [placeholders].',
    subtitle: 'Paste a landing page URL to measure it and get the fixes ranked.',
    emptyTitle: 'No pages yet',
    emptyDescription: 'Paste a landing page URL above to run your first analysis.',
    pagination: {
      label: 'More of your pages',
      previous: 'Newer',
      next: 'Older',
      position: 'Page {page} of {pages}'
    }
  },

  urlForm: {
    phases: [
      'Scraping your page...',
      'Reading the head and timing the load...',
      'Writing the new copy...',
      'Saving results...'
    ],
    urlPlaceholder: 'https://your-landing-page.com',
    analyze: 'Analyze',
    analyzing: 'Analyzing...',
    waitNote: 'This usually takes 2 to 3 minutes. Keep this tab open while we scrape the page, measure it, and write the new copy.',
    briefSummary: 'Add business details (optional)',
    briefIntro: 'Four taps. They are what turns the rewritten copy from a template with [placeholders] into lines you can ship.',
    briefWizard: {
      step: 'Step {step} of {total}',
      back: 'Back',
      skip: 'Skip this',
      other: 'Something else',
      otherPlaceholder: 'Describe it in your own words',
      done: 'All four answered. Paste your URL above and go.',
      edit: 'Change'
    },
    briefFields: {
      audience: {
        label: 'Audience',
        question: 'Who lands on this page?',
        options: {
          consumers: 'Regular people, buying for themselves',
          smb: 'Small businesses and their owners',
          enterprise: 'Big companies, with a buying committee',
          developers: 'Developers and technical teams',
          creators: 'Creators, freelancers and solo operators'
        }
      },
      offer: {
        label: 'Offer',
        question: 'What are you selling them?',
        options: {
          saas: 'Software on a subscription',
          service: 'A service I deliver myself',
          ecommerce: 'A physical or one off product',
          course: 'A course, community or content',
          marketplace: 'A marketplace connecting two sides'
        }
      },
      action: {
        label: 'Action',
        question: 'What should they do on this page?',
        options: {
          signup: 'Start a free account or trial',
          demo: 'Book a demo or a call',
          purchase: 'Buy, right here',
          waitlist: 'Join a waitlist',
          contact: 'Send a message or a quote request'
        }
      },
      objection: {
        label: 'Objection',
        question: 'What stops them from doing it?',
        options: {
          price: 'They think it costs too much',
          trust: 'They have never heard of me',
          unclear: 'They cannot tell what it actually does',
          switching: 'They already use something else',
          effort: 'They expect it to be a pain to set up'
        }
      }
    },
    errorInvalidUrl: 'Enter a valid URL, including https://',
    errorInvalidCompetitor: 'The page to compare against needs a valid URL, including https://',
    competitorLabel: 'Compare against another page (optional)',
    competitorPlaceholder: 'https://another-landing-page.com',
    competitorHint:
      'We measure that page with the same checks and show both columns side by side. Same credit, no extra charge.',
    errorGeneric: 'Something went wrong. Please try again.',
    errorLimitReached: 'You have run several analyses in a short time. Give it an hour and try again.',
    errorBusy: 'We could not start the analysis just now. Nothing was charged. Try again in a moment.',
    errorUnsupportedUrl: 'That URL is not valid or supported.',
    errorScrapeFailed: 'We could not load that page. Check the URL and try again.',
    errorAnalyzeFailed: 'Something went wrong while analyzing. Please try again.'
  },


  history: {
    openAria: 'Open analysis for {url}',
    deleteAria: 'Delete analysis for {url}',
  },

  analysis: {
    eyebrow: 'What to change',
    title: 'What to change on this page',
    hintLabel: 'How to use this screen',
    hint: 'Each section is one kind of fix. *Structure* and *SEO* ship by hand; *Copy* comes with the replacement already written. Every number in the readout above was counted on your page.',
    backToDashboard: 'Back to clients',
    copyFailed: 'Could not copy',
    copyLink: 'Copy link',
    sections: {
      flow: 'Structure',
      copy: 'Copy',
      seo: 'SEO',
      ai: 'AI'
    },
    sectionQuestions: {
      flow: 'Is your page scaring off the people who arrive?',
      copy: 'Does your copy convince, or only describe?',
      seo: 'Can Google find your page?',
      ai: 'Is your landing page visible to AI?'
    }
  },


  flow: {
    eyebrow: 'Fix the flow',
    title: 'Before you touch the words',
    hintLabel: 'Why these are shipped by hand',
    hint: 'These change the *structure* of your page, not one line of text, so they ship by hand.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why',
    count: {
      one: '{count} flow fix',
      other: '{count} flow fixes'
    }
  },

  seo: {
    eyebrow: 'Get found',
    title: 'What a search engine can read here',
    hintLabel: 'What this section checked',
    hint: 'From what your page *declares about itself*: title, description, canonical, structured data, robots.txt. We checked the page, *not* the index - nothing here says where you rank or what traffic you get.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why'
  },

  ai: {
    eyebrow: 'Found by AI',
    title: 'Can a language model quote this page',
    hintLabel: 'What this section checked',
    hint: 'To cite you, an assistant has to *read an answer off your page*: facts in text rather than locked inside an image. We checked the page, *not* what any model says today.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why'
  },

  readout: {
    eyebrow: 'Measured on your page',
    title: 'What we counted',
    hintLabel: 'Where these numbers come from',
    hint: 'Everything here was *counted on your page* when we loaded it - nothing estimated, nothing benchmarked. Load times come from a data center, so they are *the best case*: a real visitor never beats them.',
    fixLabel: 'Fix written:',
    groupOk: '{total} checks, all passing',
    groupWrong: '{wrong} of {total} need attention',
    groups: {
      structure: 'What a visitor runs into on the page',
      credibility: 'What the page offers as a reason to believe it',
      mobile: 'What the page does on a phone',
      declared: 'What the page tells a machine',
      crawler_access: 'What an AI crawler is allowed to read',
      load: 'What the page costs to open'
    },
    score: {
      label: 'Health of what we counted',
      scale: '100 means every check on this page passed. 0 means none of them did.',
      method: 'Averaged over the {count} checks below, each one counted on this page itself: a check that passes is worth a full point, a borderline one half, a failing one none. It rates only what was counted here, and says nothing about how much traffic or revenue the page makes.',
      railAria: 'Group health {score} out of 100',
      severity: {
        ok: 'Healthy',
        warn: 'Worth a look',
        alert: 'Needs work'
      }
    },
    findings: {
      form_fields: 'Signup form fields',
      required_fields: 'Fields the form makes mandatory',
      fields_without_label: 'Fields with no label',
      form_steps: 'Steps before the form can be sent',
      no_submit: 'Form has a button that sends it',
      no_social_signin: 'Sign in with Google or GitHub',
      above_fold_ctas: 'Calls to action above the fold',
      dead_ctas: 'Buttons that link nowhere',
      nav_links: 'Navigation links out of the page',
      no_faq: 'Questions answered on the page',
      no_testimonials: 'Customer proof on the page',
      word_count: 'Words on the page',
      heading_count: 'Headings on the page',
      noindex: 'Blocked from search engines',
      no_meta_description: 'Meta description',
      h1_count: 'H1 headings',
      images_missing_alt: 'Images with no alt text',
      no_structured_data: 'Structured data',
      no_og_image: 'Social share image',
      no_canonical: 'Canonical URL',
      no_lang: 'Declared page language',
      internal_links: 'Links to other pages on the site',
      term_in_title: 'Main term in the title tag',
      term_in_h1: 'Main term in the H1',
      term_in_meta_description: 'Main term in the meta description',
      ai_crawlers_blocked: 'AI crawlers your robots.txt blocks',
      robots_blocks_all: 'Crawling allowed at all',
      no_sitemap: 'Sitemap declared in robots.txt',
      ttfb: 'Time to first byte',
      fcp: 'First content painted',
      lcp: 'Largest content painted',
      page_weight: 'Downloaded to open the page',
      request_count: 'Network requests',
      no_cnpj: 'Company registration in the footer',
      no_trust_badge: 'Security or review badge on the page',
      testimonial_attribution: 'Testimonials naming who said them',
      no_privacy_policy: 'Privacy policy linked',
      no_contact_channel: 'A way to reach the company',
      mobile_overflow: 'Page fits the screen sideways',
      no_viewport_meta: 'Page declares a mobile viewport',
      mobile_tap_targets: 'Buttons too small to tap',
      mobile_tiny_text: 'Text too small to read on a phone',
      mobile_above_fold_ctas: 'Calls to action above the fold on a phone'
    },
    criterion: {
      above: 'flagged from {value}',
      below: 'flagged at {value} or fewer',
      band: 'flagged at none, and from {value}',
      exactly: 'flagged when it is not {value}'
    },
    presence: {
      yes: 'Yes',
      no: 'No'
    },
    delta: {
      up: '+{value}',
      down: '-{value}',
      gained: 'added',
      lost: 'removed'
    },
    trend: {
      title: 'Health over time',
      hint: 'One point per measurement of this page. It shows what moved, not what moved it.'
    },
    atLeast: 'at least',
    units: {
      seconds: '{value}s',
      megabytes: '{value} MB'
    },
    keywords: {
      eyebrow: 'Counted in your own copy',
      heading: 'The words this page is built around',
      explain:
        'These are the terms your page repeats, counted in its own text. What matters is the columns on the right: a term you say fifteen times in the body but never put in the title or the H1 is a term a crawler, an assistant and an ad have nothing to match on.',
      title: 'The terms this page repeats most',
      term: 'Term',
      count: 'Times said',
      surfaces: {
        inTitle: 'Title',
        inH1: 'H1',
        inMetaDescription: 'Meta description',
        inHeadings: 'Headings'
      },
      hint: 'Counted in the page copy itself. These are the words this page is built around, not what anyone searches for.'
    },
    measure: {
      explain:
        'This analysis was generated before we started counting. Load the page again and we will measure it: form fields, calls to action above the fold, load time, images with no alt text.',
      cta: 'Measure this page',
      loading: 'Measuring the page...',
      hint: 'Takes about {seconds} seconds. We open the page the same way a visitor does.',
      failed: 'We could not load the page this time. Nothing was changed in this analysis.',
      retry: 'Try again',
      again: 'Measure again',
      trendStartTitle: 'Track how this page changes',
      trendStartBody: 'One measurement is a photo, not a history. Measure this page again and every number above gains a "since last time", plus a line showing the score over time.'
    }
  },

  adIdeas: {
    eyebrow: 'Written from those terms',
    title: 'Ad groups for a search campaign',
    hintLabel: 'Where these ads come from',
    hint: 'Grouped from the terms *counted on your page* and written to fit Google Ads: headlines up to 30 characters, descriptions up to 90. There is *no search volume, no cost per click and no competition* anywhere here, because we have no index and no clickstream and never invent one. Treat it as a first draft to check inside your account.',
    explain:
      'Group the terms above into ad groups, and write the headlines and descriptions for each one using what this page already says. One credit is not spent: it is included with the analysis.',
    cta: 'Write ad ideas',
    loading: 'Writing ad ideas...',
    failed: 'We could not write the ad ideas this time. Nothing in this analysis was changed.',
    retry: 'Try again',
    headlines: 'Headlines',
    descriptions: 'Descriptions',
    negatives: 'Negative keywords',
    negativesHint: 'Searches this page does not serve. Add them at campaign level before the first click.'
  },

  hypothesisList: {
    eyebrow: 'Rewrite the words',
    title: 'The lines worth swapping',
    hintLabel: 'How to use these',
    hint: 'Each one names the line as it stands today and the replacement, *already written*. Where the line is a single element we can point at, you get a preview of it on your real page.',
    manualSetup: 'Manual setup',
    testThisFirst: 'Start here',
    evidenceMechanism: 'The mechanism',
    placeholderWarning: 'Has [placeholders] - replace them with the real details before you hand this over.',
    previewLabel: 'On your page',
    otherOptions: 'Other options',
    writingOptions: 'Writing other options...',
    optionsUnavailable: 'We could not write more options just now. The recommendation above still stands.',
    backlog: {
      one: '{count} more idea',
      other: '{count} more ideas'
    }
  },

  credits: {
    eyebrow: 'Credits',
    heading: 'One credit, one full analysis.',
    body: 'The score is always free. A credit buys the half a model writes: the ranked fixes, the replacement copy, and a preview of it on your real page.',
    balance: 'You have {count} credits',
    balanceOne: 'You have 1 credit',
    balanceNone: 'You have no credits',
    freeHalf:
      'You can still run a page. The score and every row behind it are free; the ranked fixes and the rewritten copy are what a credit buys.',
    credits: { one: '{count} analysis', other: '{count} analyses' },
    buy: 'Buy',
    opening: 'Opening checkout...',
    mostChosen: 'Most chosen',
    mercadopago: {
      loading: 'Loading the payment form...',
      failed: 'The payment form could not be loaded. Try again in a moment.',
      approved: 'Payment approved.',
      pending: 'Waiting for the payment to clear.',
      qrAlt: 'Pix QR code',
      creditsArrive: 'The credits land on your account as soon as the payment is confirmed.',
      refresh: 'Refresh the balance'
    },
    packs: {
      single: {
        name: 'Single',
        price: 'R$147',
        perAnalysis: 'R$147 per analysis',
        tagline: 'One page, one look at it.',
        features: [
          'The score and every row that made it',
          'Ranked fixes with the replacement copy written',
          'Each line previewed on your real page'
        ]
      },
      trio: {
        name: 'Trio',
        price: 'R$297',
        perAnalysis: 'R$99 per analysis',
        tagline: 'A funnel of up to three pages.',
        features: [
          'Everything in Single, three times over',
          'One analysis for every page in the funnel',
          'Credits never expire'
        ]
      }
    }
  },

  unlock: {
    heading: 'Your score is measured. The fixes are written.',
    body: 'Everything above was counted on your page. What is behind this is the part someone has to write: ranked changes, the replacement copy, and a preview of it on your real page.',
    points: [
      'Ranked fixes across structure, copy, SEO and AI',
      'The new wording, already written',
      'Each line previewed on your own page'
    ],
    cta: 'Unlock the fixes',
    ctaBuy: 'Buy a credit to unlock'
  },

  watch: {
    heading: 'Email yourself this report',
    body: 'This report lives at an unguessable link that only this browser knows. Clear your history and it is gone. Send it to yourself and it is yours to keep.',
    placeholder: 'you@company.com',
    cta: 'Send me the link',
    sending: 'Sending...',
    success: 'Sent. Check your inbox.',
    errorInvalid: 'That does not look like an email address.',
    errorRate: 'Too many tries. Give it a few minutes.',
    errorGeneric: 'Could not send it. Try again in a moment.',
    note: 'One email with the link. Nothing else, unless you ask for it.',
    email: {
      subject: 'Your landing page report',
      heading: 'Here is your report',
      body: 'You measured {host}. The full readout is at the link below, and it stays there.',
      cta: 'Open the report',
      keep: 'Keep this email. The link is the only way back to this report.',
      footer: 'You got this because someone asked for it at this address on hunch.'
    }
  },

  report: {
    backToTestIdeas: 'Back to the analysis',
    teardown: 'Conversion teardown',
    measuringHeading: 'Measuring this page...',
    measuringBody: 'We are opening it the way a visitor does and counting what is on it. This takes about a minute. The page updates itself when the numbers land.',
    plan: 'Landing page score',
    landingPageAnalyzed: 'Landing page analyzed',
    dated: 'Reviewed on {date}',
    summaryBody:
      'We went through this page line by line and found {changes} changes worth making. {ready} of them are wording changes, and the new wording is already written below. The other {structural} change how the page is put together.',
    summaryMeasured:
      'Everything below was counted on this page when we opened it. The ranked fixes and the replacement copy are the half a model has to write, and they have not been written for this page yet.',
    changesFound: 'Changes recommended',
    copyWritten: 'Copy already written',
    testThisFirst: 'Start here',
    problem: 'Problem',
    current: 'Current',
    changeTo: 'Change to',
    whyThisWorks: 'Why this works',
    manualSetupBody: 'Not a single-line swap, so there is no preview for it. Apply this copy by hand.',
    appliedToYourPage: 'Applied to your page',
    previewAlt: 'Variant applied to the landing page',
    previewBeforeAlt: 'The landing page as it is today',
    compareLabel: 'Drag to compare the page before and after the change',
    compareValue: '{percent}% of the rewritten page shown',
    compareBefore: 'Now',
    compareAfter: 'Rewritten',
    previewCta: 'See how this looks on your page',
    previewHint: 'We load your real page with this copy swapped in. Takes about {seconds} seconds.',
    previewLoading: 'Rendering your page...',
    previewUnavailable:
      'We could not render your page just now. The recommended copy above still stands.',
    previewRetry: 'Try again',
    previewOverflow:
      'This copy does not fit the space your page gives that element, so the preview shows it cut off. Shorten it, or give the element more room before you ship it.'
  },

  blog: enBlog






}

export type Dictionary = typeof en
