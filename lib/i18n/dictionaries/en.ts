import { enBlog } from '@/lib/i18n/dictionaries/en.blog'

export const en = {
  metadata: {
    title: 'Hunch',
    description:
      'Landing page audits for agencies: Google PageSpeed Insights scores, AI crawler access, and the errors in structure, copy, SEO and AI visibility.',
    ogImageAlt: 'Hunch - a landing page audit',
    reportOgImageAlt: 'A landing page audit',
    pages: {
      settings: {
        title: 'Your brand',
        description: 'The logo and name every report you send carries.'
      },
      landing: {
        title: 'Landing page audits for agencies',
        description:
          "Paste a client's URL and send a report by link: Google PageSpeed Insights scores, AI crawler access, and the errors in AI, SEO, structure and copy."
      },
      signin: {
        title: 'Sign in',
        description: 'Sign in to Hunch.'
      },
      blog: {
        title: 'Blog',
        description:
          'What a machine reads of your landing page, why copy is the part that argues, and what changes now that people ask an assistant instead of searching.'
      },
      dashboard: {
        title: 'Your pages',
        description: 'Every landing page you have audited, and the report each one produced.'
      },
      admin: {
        title: 'Accounts',
        description: 'Set the monthly quota of each account.'
      },
      privacy: {
        title: 'Privacy policy',
        description: 'What Hunch keeps about the pages you audit and your account, and who else sees it.'
      },
      report: {
        title: 'Landing page audit for {host}',
        description: '{count} errors found on {host}, with PageSpeed Insights scores and the reasoning behind each one.'
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

  // The two screens a reader reaches by accident. Both name what happened and offer the one thing
  // that helps, because an error that only apologises leaves the reader with nothing to do.
  //
  // `notFound.body` avoids guessing why: a report link goes stale, gets truncated by a chat client,
  // or was never valid, and this cannot tell which. Saying "this report was deleted" would be a
  // claim about something we did not check.
  errors: {
    crashed: {
      title: 'This page did not load',
      body: 'Something broke while putting this page together. Nothing you did caused it and nothing was lost.',
      retry: 'Try again'
    },
    notFound: {
      title: 'There is nothing at this link',
      body: 'The address may be incomplete, or it may never have pointed anywhere. Report links are long, so check that the whole thing was copied.',
      home: 'Go to the home page'
    }
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
      distinctiveness: 'Distinctiveness',
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
    blog: 'Blog',
    dashboard: 'My pages',
    settings: 'Your brand',
    admin: 'Admin',
    signIn: 'Sign in',
    signOut: 'Sign out',
    account: 'Account',
    languageAria: 'Language',
    menuAria: 'Open menu',
    themeAria: 'Colour theme',
    theme: {
      light: 'Light',
      dark: 'Dark'
    }
  },

  footer: {
    copyright: 'Copyright {year} Hunch. All rights reserved.',
    privacy: 'Privacy',
    email: 'Send an email to {address}',
    whatsapp: 'WhatsApp'
  },

  settings: {
    eyebrow: 'White label',
    title: 'Your brand',
    hintLabel: 'Where your brand shows up',
    hint: 'Once you save a logo or a name, the reports you send carry *your brand instead of ours*: at the top of the report your client opens, on the preview card when the link is pasted into WhatsApp or email, and in the browser tab title.',
    nameLabel: 'Agency name',
    namePlaceholder: 'Your agency',
    nameHint: 'Shown when there is no logo, and on the preview card when a link is shared.',
    logoLabel: 'Logo',
    logoHint: 'PNG or JPEG, up to {kb} KB. Shown at the top of every report.',
    logoRemove: 'Remove the logo',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'That did not save. Check the file and try again.',
    errorLogoTooLarge: 'That file is over {kb} KB. Export it smaller and try again.',
    errorUnsupportedLogo: 'That file is not a PNG or a JPEG.',
    errorNameTooLong: 'The name can be up to {max} characters.',
    errorStorage: 'Logo uploads are not available right now. Try again later.'
  },

  landing: {
    eyebrow: 'For agencies',
    headlineTop: 'Landing page audits your agency sends by link.',
    headlineBottom: 'Starting with what AI can read.',
    lead: "Paste a client's URL and get the PageSpeed score, what AI crawlers may read, and the page's errors.",
    actions: {
      contact: 'Contact us',
      signIn: 'Sign in'
    },
    preview: {
      label: 'The report, section by section'
    },
    how: {
      heading: "Three steps, and none of them asks for access to the client's site.",
      steps: [
        {
          title: "Paste the client's URL",
          body: 'No script to install and no access to the code. You can name a second page to compare against.'
        },
        {
          title: 'Get the report',
          body: 'PageSpeed Insights measures the page, we check its robots.txt, and a model lists the errors in AI, SEO, structure and copy.'
        },
        {
          title: 'Send the link',
          body: 'The report opens without signing in. When the page changes, run it again and the lists are rewritten behind the same link.'
        }
      ]
    },
    ai: {
      heading: 'AI is the new Google, and it never opens the page in a browser.',
      body: 'More people ask an assistant instead of searching. The report starts with what a model can read and quote on the page, the part SEO tools usually leave out.',
      points: [
        {
          title: 'Who may read the site',
          body: "Which AI crawlers the site's robots.txt blocks, whether it blocks everything, and whether it declares a sitemap."
        },
        {
          title: 'What a model can quote',
          body: 'Facts written as text, not locked inside an image or a script. Each error says what is missing and why.'
        },
        {
          title: 'What the page declares',
          body: 'Title, description, structured data and alt text, read beside the PageSpeed Insights SEO audits.'
        }
      ],
      link: 'Read: is AI the new Google?'
    },
    report: {
      heading: 'What each report brings',
      errors: {
        title: 'Four error lists',
        body: "AI, SEO, structure and copy. Each error names what is wrong on the page and why it is a problem. What to do about it is your agency's work."
      },
      score: {
        title: 'The Google PageSpeed score',
        body: 'The four Lighthouse categories on mobile, and real Chrome visitors when Google has enough of them.'
      },
      compare: {
        title: 'A page to compare',
        body: "Name a competitor's page and its scores show beside your client's."
      },
      history: {
        title: 'Run it again',
        body: 'Each run measures the page again and rewrites the lists, and you see how the score moved.'
      },
      link: {
        title: 'A link for the client',
        body: 'The report opens without an account. Your client reads the same page you do.'
      }
    },
    pricing: {
      heading: 'What it costs',
      recommended: 'Most agencies',
      price: 'R$ {value}/mo',
      quota: '{count} runs a month',
      note: 'If the quota runs out before the month does, you move up a tier. A run that fails does not count against it.',
      plans: {
        studio: {
          name: 'Studio',
          body: 'Three to five clients, with room left to audit a prospect before you pitch it.'
        },
        agency: {
          name: 'Agency',
          body: 'Ten to twenty clients audited every month, and the rest of the quota goes into new business.'
        },
        network: {
          name: 'Network',
          body: 'A report a day, or a sales team that opens every conversation with one.'
        }
      }
    },
    faq: {
      heading: 'Common questions',
      items: [
        {
          question: 'How does the subscription work?',
          answer: 'You agree on a plan with us by email, and your account gets a monthly quota of analyses. A new analysis uses one, and so does every "Run again". A run that fails does not count, and if the quota runs out before the month does, you move up a tier.'
        },
        {
          question: 'Does my client need an account to see the report?',
          answer: 'No. The report opens from a link that only the people you send it to know. Running it again and the score history stay with your account.'
        },
        {
          question: "Do you need access to the client's site or code?",
          answer: 'No. We open the public page the way any visitor does, with nothing to install, no script and no DNS change.'
        },
        {
          question: 'Does the report write the fixes?',
          answer: "No. Each error says what is wrong on the page and why. There is no replacement copy and no step by step, because what to do about the error is the agency's work."
        },
        {
          question: 'Where do the numbers come from?',
          answer: "The score and the audits come from Google PageSpeed Insights, on a mobile run. AI crawler access comes from the site's robots.txt. The error lists are written by a model from the page and those measurements."
        },
        {
          question: "Does the report carry my agency's brand?",
          answer: 'Yes. In Your brand you upload a logo and set the agency name, and the reports you send carry them instead of Hunch, on the preview card and in the tab title too.'
        },
        {
          question: 'What do you keep?',
          answer: 'The measurements from each run and the error lists, so the report stays online and can show how the score moved. The privacy policy has the details.'
        }
      ]
    },
    finalCta: {
      heading: 'Want to see the report for one of your clients?'
    }
  },

  infoHint: {
    defaultLabel: 'How this step works'
  },

  score: {
    impact: 'Impact',
    aria: '{label} {score} of 10',
    hintLabel: 'What the impact number means',
    hint: 'How much this error costs the page *next to the others in this analysis*, from 1 to 10. It orders the list: start at the top. Written by a model, not counted.',
    short: {
      impact: 'I'
    }
  },

  privacy: {
    eyebrow: 'Privacy',
    heading: 'Privacy policy',
    updated: 'Last updated: {date}',
    intro: 'What we keep, for how long, and who else sees it.',
    sections: [
      {
        title: 'Who is responsible',
        body: [
          'Hunch is operated by Lucas Medeiros, an individual. For any request about your data, write to {email} or use the WhatsApp link in the footer of this page.'
        ]
      },
      {
        title: 'What we do not do',
        body: [
          'There is no analytics script, no tag manager, no ad pixel and no behaviour tool on this site. We do not sell or rent your data.'
        ]
      },
      {
        title: 'The pages you audit',
        body: [
          'We open the URL you submit in a browser of ours, measure it, send it to Google PageSpeed Insights, and keep the results so the report keeps working and a later measurement can show what changed.',
          'The report is reachable through a key in the link itself. Anyone holding the link can read the report, so treat it the way you would treat any private link.'
        ]
      },
      {
        title: 'Your account',
        body: [
          'If you sign in, we keep the email, name and picture Google or GitHub returns, and the monthly quota set for your account. We only accept an address the provider confirms as verified, and we never store a password.',
          'If you set up your brand, we also keep the agency name and the logo you upload. The logo is served from a public address, because it shows on the report for anyone holding the link.',
          'Your subscription is billed outside this site. No payment details pass through it.'
        ]
      },
      {
        title: 'Cookies',
        body: [
          'Your session, which keeps you signed in, and your language and theme preferences. None of them is third-party.'
        ]
      },
      {
        title: 'Who the data is shared with',
        body: [
          'Anthropic receives the content of the audited page, which is what makes writing the error lists possible. Google receives the URL of the audited page to run PageSpeed Insights on it. The infrastructure the product runs on hosts the database and the application.',
          'Nobody else receives anything.'
        ]
      },
      {
        title: 'Your rights',
        body: [
          'Under Brazilian data protection law you can request access to your data, correction, deletion and portability.',
          'Ask at {email} or through the WhatsApp link in the footer of this page.'
        ]
      },
      {
        title: 'Changes to this policy',
        body: ['When something here changes, the date at the top changes with it.']
      }
    ]
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
    accounts: {
      title: 'Accounts',
      subtitle: 'Set how many analyses an account can run each calendar month. The address does not need to have signed in yet: the quota is waiting for it when it does.',
      emailLabel: 'Account',
      emailPlaceholder: 'someone@agency.com',
      quotaLabel: 'Analyses per month',
      presetsAria: 'The quota each tier carries',
      submit: 'Save',
      result: {
        saved: 'Saved.',
        invalid: 'Check the address and the number of analyses.',
        forbidden: 'You are not an operator.',
        failed: 'Nothing was saved. Try again.'
      },
      listTitle: 'Accounts with a quota',
      listEmpty: 'No account has a quota yet.',
      usage: '{used} of {limit} this month'
    }
  },

  quota: {
    usage: '{used} of {limit} analyses used this month',
    none: 'No analyses left this month. Talk to the team that manages your account.'
  },

  dashboard: {
    eyebrow: 'Pages',
    title: 'Your pages',
    hintLabel: 'How analysis works',
    hint: 'Paste the live landing page URL. Hunch runs PageSpeed Insights on it, checks what AI crawlers may read, and lists the errors in structure, copy, SEO and AI visibility.',
    subtitle: 'Paste a landing page URL to audit it.',
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
    measuring: 'Opening the page and measuring it...',
    urlLabel: 'Landing page URL',
    urlPlaceholder: 'https://client-landing-page.com',
    analyze: 'Analyze',
    analyzing: 'Analyzing...',
    waitNote: 'Keep this tab open. As soon as the measurement is ready we take you to the report, and the error lists carry on being written there.',
    errorInvalidUrl: 'Enter a valid URL, including https://',
    errorInvalidCompetitor: 'The page to compare against needs a valid URL, including https://',
    competitorLabel: 'Compare against another page (optional)',
    competitorPlaceholder: 'https://another-landing-page.com',
    competitorHint: 'We measure that page too and show its scores beside these. It counts as one analysis.',
    errorGeneric: 'Something went wrong. Please try again.',
    errorLimitReached: 'You have run several analyses in a short time. Give it an hour and try again.',
    errorBusy: 'We could not start the analysis just now. It did not count against your quota. Try again in a moment.',
    errorUnsupportedUrl: 'That URL is not valid or supported.',
    errorScrapeFailed: 'We could not load that page. Check the URL and try again.',
    errorAnalyzeFailed: 'Something went wrong while analyzing. Please try again.',
    errorQuotaExhausted: 'This account has used every analysis it has this month.'
  },


  history: {
    openAria: 'Open analysis for {url}',
    deleteAria: 'Delete analysis for {url}',
  },

  analysis: {
    eyebrow: 'Errors',
    title: 'Errors on this page',
    hintLabel: 'How to use this screen',
    hint: 'Each section is one theme. It opens with what Google PageSpeed Insights measured on it, then lists the errors: what is wrong and why, without writing the fix.',
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
      flow: 'What in the structure gets in the visitor\'s way?',
      copy: 'Which lines describe without convincing?',
      seo: 'What stops a search engine reading the page?',
      ai: 'What stops an AI from reading and quoting the page?'
    }
  },


  flow: {
    eyebrow: 'Structure',
    title: 'What the page puts in the way',
    hintLabel: 'What this section covers',
    hint: 'Errors in how the page is *put together*: the form, the calls to action, what answers objections, what loads slowly.',
    evidenceLabel: 'Why',
    count: {
      one: '{count} structure error',
      other: '{count} structure errors'
    }
  },

  seo: {
    eyebrow: 'SEO',
    title: 'What a search engine cannot read here',
    hintLabel: 'What this section checked',
    hint: 'From what the page *declares about itself* and the PageSpeed Insights SEO audits: title, description, canonical, structured data, robots.txt.',
    evidenceLabel: 'Why'
  },

  ai: {
    eyebrow: 'AI visibility',
    title: 'What a language model cannot quote',
    hintLabel: 'What this section checked',
    hint: 'To cite a page, an assistant has to *read an answer off it*: facts in text rather than locked inside an image or a script.',
    evidenceLabel: 'Why'
  },

  readout: {
    eyebrow: 'Measured by Google PageSpeed Insights',
    title: 'Overall score',
    hintLabel: 'Where these numbers come from',
    hint: 'A *mobile* PageSpeed Insights run on this URL. The score is the average of the four Lighthouse categories, and each category\'s audits sit in the section for its theme. Real visitors are Chrome users over the last 28 days, when Google has enough of them.',
    unavailable: 'PageSpeed Insights did not answer for this page. Run it again to retry.',
    fixLabel: 'Error listed:',
    groupOk: '{total} checks, all passing',
    groupWrong: '{wrong} of {total} need attention',
    groups: {
      crawler_access: 'What an AI crawler is allowed to read'
    },
    score: {
      label: 'PageSpeed score',
      scale: 'The average of the four Lighthouse category scores, from 0 to 100.',
      competitor: '{host}: {score}/100',
      railAria: 'Score {score} out of 100',
      severity: {
        ok: 'Good',
        warn: 'Needs improvement',
        alert: 'Poor'
      }
    },
    categories: {
      performance: 'Performance',
      accessibility: 'Accessibility',
      'best-practices': 'Best practices',
      seo: 'SEO'
    },
    auditsFailed: '{count} audits to look at',
    auditsPassed: 'Every scored audit passed.',
    field: {
      title: 'Real visitors',
      scope: {
        page: 'This URL, last 28 days',
        origin: 'Whole site, last 28 days'
      },
      category: {
        FAST: 'Good',
        AVERAGE: 'Needs improvement',
        SLOW: 'Poor'
      },
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: 'Largest Contentful Paint',
        INTERACTION_TO_NEXT_PAINT: 'Interaction to Next Paint',
        CUMULATIVE_LAYOUT_SHIFT_SCORE: 'Cumulative Layout Shift',
        FIRST_CONTENTFUL_PAINT_MS: 'First Contentful Paint',
        EXPERIMENTAL_TIME_TO_FIRST_BYTE: 'Time to First Byte'
      }
    },
    findings: {
      ai_crawlers_blocked: 'AI crawlers your robots.txt blocks',
      robots_blocks_all: 'Crawling allowed at all',
      no_sitemap: 'Sitemap declared in robots.txt'
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
      down: '-{value}'
    },
    trend: {
      title: 'Score over time',
      hint: 'One point per measurement of this page.'
    },
    atLeast: 'at least',
    units: {
      seconds: '{value}s',
      milliseconds: '{value} ms',
      megabytes: '{value} MB'
    },
    run: {
      again: 'Run again',
      loading: 'Starting...',
      failed: 'The new run could not start. Nothing changed in this report.',
      inProgress: 'A new run is in progress. The report updates itself when it finishes.',
      quotaExhausted: 'No analyses left this month.',
      lastRunFailed: 'The last run did not finish and did not count against the quota. The errors below are from the run before it.',
      trendStartTitle: 'Track how this page changes',
      trendStartBody: 'One run is a photo, not a history. Run this page again, using one analysis of the month, and every score gains a "since last time", plus a line showing the score over time.'
    }
  },

  hypothesisList: {
    eyebrow: 'Copy',
    title: 'Lines that are not doing their job',
    hintLabel: 'How to read these',
    hint: 'Each one quotes the line *as it stands on the page* and says what is wrong with it.',
    testThisFirst: 'Start here',
    assessmentLabel: 'What it does today'
  },

  report: {
    generating: {
      eyebrow: 'Still being written',
      note: 'The measurement in each section is final. The error lists are being written now and appear here on their own, so you can leave this page and come back to it.',
      stalled: 'This is taking longer than usual. The work is still queued. Reload the page to check on it.'
    },
    failed: {
      heading: 'The error lists did not come through',
      body: 'The measurement above stands. The written part did not finish, and this run does not count against the monthly quota.',
      cta: 'Run the page again'
    },
    measureFailed: {
      heading: 'This page could not be measured',
      body: 'The run did not finish, and it does not count against the monthly quota.'
    },
    teardown: 'Landing page audit',
    measuringHeading: 'Measuring this page...',
    measuringBody: 'We are opening it and running PageSpeed Insights on it. This takes about a minute. The page updates itself when the numbers land.',
    plan: 'Landing page audit',
    landingPageAnalyzed: 'Landing page analyzed',
    dated: 'Reviewed on {date}',
    summaryBody:
      'We found {changes} errors on this page: {copy} in the wording, and {structural} in the structure, SEO and AI visibility.',
    summaryPending: 'The error lists for this page have not been written.',
    changesFound: 'Errors found',
    copyErrors: 'Wording errors',
    startHere: {
      eyebrow: 'Priority',
      title: 'The biggest errors'
    },
    rail: {
      label: 'On this page',
      sections: {
        start: 'Biggest errors',
        readout: 'Overall score'
      }
    },
    current: 'Current',
    whyThisIsWrong: 'Why this is an error'
  },

  blog: enBlog






}

export type Dictionary = typeof en
