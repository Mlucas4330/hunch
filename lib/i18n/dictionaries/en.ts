export const en = {
  metadata: {
    title: 'Hunch',
    description: 'Turn your landing page into ranked, competitor-grounded A/B test hunches.',
    ogImageAlt: 'Hunch - ranked A/B test hypotheses for your landing page',
    pages: {
      landing: {
        title: 'Find what costs you signups',
        description:
          'Paste your landing page URL and get the A/B tests worth running, ranked, grounded in real competitors, and already written.'
      },
      signin: {
        title: 'Sign in',
        description: 'Sign in to Hunch with Google.'
      },
      dashboard: {
        title: 'Your clients',
        description: 'Every client landing page you have analyzed, and the tests each one produced.'
      },
      analysis: {
        title: 'Your test ideas',
        description: 'Ranked A/B test hypotheses and the flow playbook for this landing page.'
      },
      analysisReport: {
        title: 'Conversion teardown',
        description: 'The printable teardown for this landing page analysis.'
      },
      analysisTests: {
        title: 'Live A/B tests',
        description: 'Install the snippet and run the ideas from this analysis on the real page.'
      },
      settings: {
        title: 'Your brand',
        description: 'The logo and name that go on every report you hand over.'
      },
      test: {
        title: 'Run a test',
        description: 'Approve the challenger, set the conversion goal, and launch the live test.'
      },
      leads: {
        title: 'Waitlist leads',
        description: 'Leads captured by the public reports.'
      },
      accounts: {
        title: 'Accounts',
        description: 'Who has an account, what plan they are on, and when they last signed in.'
      },
      reports: {
        title: 'Report opens',
        description: 'Which public reports have been opened, and when.'
      },
      report: {
        title: 'A/B test plan for {host}',
        description:
          '{count} ranked tests to lift conversion on {host}, with the copy to run and the reasoning behind each one.'
      }
    }
  },

  common: {
    upgrade: 'Talk to us',
    close: 'Close',
    cancel: 'Cancel',
    delete: 'Delete',
    deleting: 'Deleting',
    copy: 'Copy',
    copied: 'Copied',
    or: 'or',
    none: '-'
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
      indexability: 'Indexability',
      metadata: 'Metadata',
      structured_data: 'Structured Data',
      ai_answerability: 'AI Answerability'
    },
    market: {
      us: 'United States',
      br: 'Brazil'
    },
    hypothesisStatus: {
      pending: 'Pending',
      testing: 'Testing',
      completed: 'Completed',
      skipped: 'Skipped'
    },
    variantStatus: {
      proposed: 'Proposed',
      testing: 'Testing',
      winner: 'Winner',
      rejected: 'Rejected'
    },
    experimentStatus: {
      running: 'Running',
      stopped: 'Stopped',
      completed: 'Completed'
    },
    experimentArm: {
      control: 'Control',
      variant: 'Variant'
    },
    experimentRecommendation: {
      ship_variant: 'Ship the variant',
      keep_control: 'Keep current copy',
      inconclusive: 'Inconclusive - not enough traffic'
    },
    plan: {
      free: 'Free',
      pro: 'Pro'
    },
    userRole: {
      user: 'User',
      admin: 'Admin'
    },
    leadSource: {
      report: 'Report wall',
      contact: 'Asked to talk'
    }
  },

  nav: {
    homeAria: 'Hunch home',
    dashboard: 'Clients',
    settings: 'Your brand',
    admin: 'Admin',
    signIn: 'Sign in',
    signOut: 'Sign out',
    account: 'Account',
    languageAria: 'Language',
    menuAria: 'Open menu'
  },

  footer: {
    copyright: 'Copyright {year} Hunch. All rights reserved.',
    contact: 'Talk to us',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp'
  },

  infoHint: {
    defaultLabel: 'How this step works'
  },

  score: {
    impact: 'Impact',
    effort: 'Effort',
    aria: '{label} {score} of 10',
    short: {
      impact: 'I',
      effort: 'E'
    }
  },

  landing: {
    eyebrow: 'Audit tooling for people who sell CRO',
    headlineTop: 'Show the prospect what their page costs them.',
    headlineBottom: 'Send it under your own name.',
    lead: 'Paste any landing page. Get a measured teardown you can put in front of a client in minutes, with the ranked fixes and the copy already written.',
    cta: 'Run a report',
    howItWorksLink: 'How it works',

    sample: [
      {
        problem: 'Your H1 says what you do, not why it beats the tab they already have open.',
        variant: 'Ship changes to your pricing page without waiting on a designer.',
        evidence: 'Linear leads with the outcome the founder wants, not the feature set.'
      },
      {
        problem: '"Sign up" asks for commitment before the visitor has seen a single win.'
      },
      {
        problem: 'Nothing above the fold tells them another founder trusted this.'
      }
    ],

    readout: {
      domain: 'landing page',
      liveTest: 'Live test',
      winner: 'Headline variant wins',
      detail: '14-day test, {visitors} visitors',
      lift: '+18%',
      significant: 'Significant',
      why: 'Why'
    },

    reality: {
      eyebrow: 'The reality',
      heading: 'The hard part of selling an audit is doing it before anyone has paid you.'
    },
    pains: [
      {
        headline: 'A good teardown takes half a day.',
        reality: 'Reading the page, checking the head, timing the load, looking at two competitors. Then you do it again for the next prospect who may never reply.',
        answer: 'One URL, a few minutes, and the whole readout comes back measured rather than remembered.'
      },
      {
        headline: 'Opinion does not survive a procurement meeting.',
        reality: '"Your headline is weak" is a matter of taste to the person who wrote it. It stops being taste when it has a number beside it.',
        answer: 'Form fields, calls to action above the fold, load time, alt text, structured data. Counted on their page, next to the competitors they named.'
      },
      {
        headline: 'A tool with someone else logo on it is not your deliverable.',
        reality: 'You cannot send a document that advertises a vendor to your client, and you certainly cannot send one that asks them for their email.',
        answer: 'On a paid plan the report carries no mark of ours, no wall, and nothing hidden. It is yours to send.'
      }
    ],

    how: {
      eyebrow: 'How it works',
      heading: 'Win the meeting first. Prove the lift after you have signed.',
      intro: 'The report is what gets you in the room: a measured teardown of a page you were never given access to. The live test is what keeps you there once the work is yours.'
    },
    tracks: [
      {
        label: 'Send the report',
        note: 'Minutes, no access needed',
        steps: [
          {
            label: 'Paste their URL',
            body: 'Any public landing page. We load it, measure it, and study two to three real competitors in their market.'
          },
          {
            label: 'Read the teardown',
            body: 'A measured readout of the page, then ranked fixes across flow, copy and discoverability, each with the replacement copy written.'
          },
          {
            label: 'Send it as yours',
            body: 'Share the link or hand over the printed version. On a paid plan there is nothing on it that says us.'
          }
        ]
      },
      {
        label: 'Prove the lift',
        note: 'After the contract',
        steps: [
          {
            label: 'Install it once',
            body: 'Once you have access to the client site: one script tag, plus one attribute on the button that counts as a conversion. After that the copy changes from here, with no further deploys.'
          },
          {
            label: 'Pick a window',
            body: 'Choose 7, 14, or 30 days. Significance is read once at the finish line, so nobody calls a winner early.'
          },
          {
            label: 'Show the verdict',
            body: 'The test closes into conversion lift, statistical significance and a plain recommendation. That is your renewal conversation.'
          }
        ]
      }
    ],

    value: {
      eyebrow: 'What you get',
      heading: 'A document that argues for itself.'
    },
    proof: [
      {
        title: 'Measured, not asserted',
        body: 'The readout counts what is on the page: form fields, calls to action above the fold, load time, images with no alt text. Numbers we took, never numbers a model guessed.'
      },
      {
        title: 'Finished copy, not prompts',
        body: 'Every ranked fix carries the replacement copy and the reasoning behind it. Add a brief about the business and it comes back with their real details already in it.'
      },
      {
        title: 'Yours to send',
        body: 'A paid report has no logo of ours, no waitlist wall, and nothing blurred. Paste the link in an email or hand over the printed version.'
      }
    ],

    contact: {
      eyebrow: 'Talk to us',
      heading: 'Tell us how many pages you audit a month.',
      body: 'We will show you a real report on a page of your choosing, and what it costs to send it under your own name. No deck.',
      points: [
        'Reports with your name on them, not ours',
        'Your client never sees a signup wall',
        'One measured readout per page, not a template',
        'We answer the same day'
      ],
      form: {
        emailPlaceholder: 'you@agency.com',
        phonePlaceholder: 'Phone (optional)',
        join: 'Ask for a report',
        joining: 'Sending...',
        done: 'Got it. We will reply to that address today.',
        error: 'Something went wrong. Please try again.'
      }
    },

    finalCta: {
      heading: 'Pick a prospect. Run the report. See what you would have sent.'
    }
  },

  signIn: {
    title: 'Sign in',
    description: 'Continue with your work account',
    google: 'Continue with Google',
    microsoft: 'Continue with Microsoft',
    adminEmail: 'Admin email',
    password: 'Password',
    invalidCredentials: 'Invalid credentials',
    adminSubmit: 'Sign in as admin'
  },

  dashboard: {
    eyebrow: 'Clients',
    title: 'Your clients',
    hintLabel: 'How analysis works',
    hint: "Paste your client's live landing page URL. Hunch scans the copy, studies competitors, and generates ranked A/B test ideas. Add *business details* so the copy comes back finished instead of with [placeholders]. On paid plans, paste competitor URLs (*Competitor mode*) to ground the ideas; free analyses find competitors automatically.",
    subtitle: "Paste a client's landing page URL to generate their ranked teardown.",
    emptyTitle: 'No clients yet',
    emptyDescription: "Paste a client's landing page URL above to run your first analysis."
  },

  urlForm: {
    phases: [
      'Scraping your page...',
      'Researching competitors...',
      'Writing your test ideas...',
      'Saving results...'
    ],
    urlPlaceholder: 'https://your-landing-page.com',
    analyze: 'Analyze',
    analyzing: 'Analyzing...',
    waitNote: 'This usually takes 2 to 3 minutes. Keep this tab open while we scrape the page, study competitors, and write your tests.',
    briefSummary: 'Add business details (optional)',
    briefPlaceholder: "Who it's for, your real numbers (users, trial length, pricing), and what makes you different. We use these to write finished copy instead of placeholders.",
    competitorSummary: 'Competitor mode',
    competitorPaidOnly: '(Pro)',
    competitorHint: 'Paste up to {max} competitor landing pages to ground your hunches.',
    competitorPlaceholder: 'https://a-competitor.com',
    competitorLockedBefore: 'Ground your hunches on competitors you choose.',
    competitorLockedAfter: 'to unlock Competitor mode. Free analyses find competitors automatically.',
    errorInvalidUrl: 'Enter a valid URL, including https://',
    errorGeneric: 'Something went wrong. Please try again.',
    errorLimitReached: 'You have reached the free plan limit. Talk to us to keep analyzing.',
    errorUnsupportedUrl: 'That URL is not valid or supported.',
    errorScrapeFailed: 'We could not load that page. Check the URL and try again.',
    errorAnalyzeFailed: 'Something went wrong while analyzing. Please try again.'
  },

  usageBanner: {
    limitReached: 'Limit reached',
    almostOut: 'Almost out',
    usageOf: 'of',
    used: 'analyses used this month.',
    blockedNote: 'Talk to us to keep analyzing pages.',
    remainingNote: '{remaining} left before you hit the free limit.'
  },

  history: {
    openAria: 'Open analysis for {url}',
    deleteAria: 'Delete analysis for {url}'
  },

  analysis: {
    eyebrow: 'What to test',
    title: 'Your test ideas',
    hintLabel: 'How to use this screen',
    hint: 'Each tab is one kind of fix, ranked by likely impact. *Flow* and *SEO* are changes you ship by hand; *Copy* is the wording, and every idea there comes with the replacement already written. When you have access to the site and want to prove a change rather than argue it, the *Live A/B test* tab is where you install the snippet and run one test at a time.',
    backToDashboard: 'Back to clients',
    benchmarkedAgainst: 'Benchmarked against:',
    marketNote: '(market: {market})',
    copyFailed: 'Could not copy',
    deliverables: {
      eyebrow: 'Deliverables',
      hintLabel: 'Which one to send',
      hint: 'This analysis gives you two documents to hand over, and they are the same findings in two shapes. The *interactive report* is a link: your client opens it in a browser, moves between the tabs and can see each copy change rendered on their own page. The *PDF report* is the same analysis flattened onto one page, for the client who wants something to print, forward or attach. On a paid plan neither one carries our name.',
      interactiveTitle: 'Interactive report',
      interactiveBody: 'A web page your client opens. Each copy change can be previewed on their real page.',
      pdfTitle: 'PDF report',
      pdfShort: 'PDF',
      pdfBody: 'The same findings on one page, to print or attach to an email.',
      open: 'Open',
      copyLink: 'Copy link'
    },
    tabs: {
      flow: 'Page structure',
      copy: 'Wording',
      seo: 'Search visibility',
      ai: 'AI visibility'
    }
  },

  settings: {
    eyebrow: 'White label',
    title: 'Your brand',
    hintLabel: 'Where your brand shows up',
    hint: 'On a paid plan the reports carry no mark of ours. What you set here fills that space instead, on all four places our name used to reach a reader: the *report link* your client opens, the *PDF* you hand over, the preview card when the link is pasted into WhatsApp or email, and the browser tab title a printer puts in the page header.',
    nameLabel: 'Agency name',
    namePlaceholder: 'Your agency',
    nameHint: 'Used when no logo is set, and on the preview card when a link is shared.',
    logoLabel: 'Logo',
    logoHint: 'PNG or JPEG, up to {kb} KB. Shown at the top of every report.',
    logoReplace: 'Replace logo',
    logoChoose: 'Choose a file',
    logoRemove: 'Remove logo',
    accentLabel: 'Accent color',
    accentHint: 'Optional. A hex value like #2C6BED.',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'That did not save. Check the file and try again.',
    errorLogoTooLarge: 'That file is over {kb} KB. Export it smaller and try again.',
    errorUnsupportedLogo: 'That file is not a PNG or a JPEG.',
    errorInvalidAccent: 'The accent has to be a hex value like #2C6BED.',
    lockedTitle: 'Branding is on the paid plan',
    lockedBody: 'Free reports carry our name. On a paid plan they carry yours instead, and nothing of ours reaches your client.',
    lockedCta: 'Talk to us'
  },

  flow: {
    eyebrow: 'Fix the flow',
    title: 'Before you test the words',
    hintLabel: 'Why these have no test button',
    hint: 'These change the *structure* of your page, not one line of text, so there is nothing for the snippet to swap and nothing to A/B. Ship them by hand: they usually pay off more than any wording change, and they make the copy tests below cleaner to read.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why',
    count: {
      one: '{count} flow fix',
      other: '{count} flow fixes'
    }
  },

  visibility: {
    eyebrow: 'Get found',
    title: 'Can a search engine and an AI read this page',
    hintLabel: 'What this section checked',
    hint: 'These come from what your page *declares about itself* - its title, description, structured data, and what its robots.txt allows. We checked the page, *not* your search ranking: nothing here tells you where you rank or whether an AI mentions you today, only whether your page gives them what they need to find and quote you.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why'
  },

  seo: {
    eyebrow: 'Get found',
    title: 'What a search engine can read here',
    hintLabel: 'What this section checked',
    hint: 'These come from what your page *declares about itself* - its title, description, canonical, structured data, and what its robots.txt allows. We checked the page, *not* your search ranking: nothing here tells you where you rank or how much traffic you get, only whether your page gives a crawler what it needs to reach and read you.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why'
  },

  ai: {
    eyebrow: 'Found by AI',
    title: 'Can a language model quote this page',
    hintLabel: 'What this section checked',
    hint: 'An assistant answering a question about your category has to *read an answer off your page* to cite it. These are the things that make one findable: facts stated in text rather than locked inside an image, and questions answered where a model can see them. We checked the page, *not* what any model says today - nothing here tells you whether an AI mentions you right now.',
    stepsLabel: 'How to ship it',
    evidenceLabel: 'Why'
  },

  readout: {
    eyebrow: 'Measured on your page',
    title: 'What we counted',
    hintLabel: 'Where these numbers come from',
    hint: 'Everything here was *counted on your page* when we loaded it - nothing is estimated, averaged, or taken from a benchmark. Load times are measured from a data center on a clean connection, so treat them as *the best case*: a visitor on mobile sees slower than this, never faster.',
    groups: {
      structure: 'What a visitor runs into on the page',
      metadata: 'What the page tells a machine',
      visibility: 'What an AI crawler is allowed to read',
      load: 'What the page costs to open'
    },
    score: {
      label: 'Health of what we counted',
      scale: '100 means every check on this page passed. 0 means none of them did.',
      method: 'Averaged over the {count} checks below, each one counted on this page itself: a check that passes is worth a full point, a borderline one half, a failing one none. It rates only what was counted here, and says nothing about how much traffic or revenue the page makes.'
    },
    findings: {
      form_fields: 'Signup form fields',
      no_social_signin: 'Sign in with Google or GitHub',
      above_fold_ctas: 'Calls to action above the fold',
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
      request_count: 'Network requests'
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
    comparison: {
      title: 'Your page next to the competitors you gave us',
      hint: 'Measured the same way on each page, at the same screen size.',
      you: 'Your page',
      metrics: {
        form_fields: 'Signup form fields',
        social_signin: 'Social sign in',
        above_fold_ctas: 'CTAs above the fold',
        nav_links: 'Navigation links',
        word_count: 'Words on the page',
        pricing: 'Pricing on page',
        testimonials: 'Testimonials',
        faq: 'FAQ',
        sticky_cta: 'Sticky CTA',
        meta_description: 'Meta description',
        structured_data: 'Structured data',
        lcp: 'Largest content painted',
        page_weight: 'Downloaded to open'
      }
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
      againHint: 'Open the page again and add a point to the trend. The fixes and tests are untouched.'
    }
  },

  hypothesisList: {
    manualSetup: 'Manual setup',
    testThisFirst: 'Test this first',
    recommendedChallenger: 'Recommended challenger',
    competitorEvidence: 'From a competitor',
    placeholderWarning: "Has [placeholders] - you'll replace them with your real details when you set up the test.",
    viewTest: 'View test',
    setUpTest: 'Set up test',
    backlog: {
      one: '{count} more idea',
      other: '{count} more ideas'
    }
  },

  embedSnippet: {
    title: 'Install the tracking snippet',
    body: 'Step one. Paste this once, just before the closing body tag on your landing page. It applies running variants and reports results back automatically.',
    goalTitle: 'Step two: mark what counts as a conversion',
    goalBody: 'Add this attribute to the element a visitor clicks when they convert, usually your main call to action. Without it the snippet can count visitors but never a result, and a test cannot be launched.',
    troubleshootTitle: 'Test running but recording nothing?',
    cspBody: 'Check this before anything else. The usual cause is a Content-Security-Policy on the landing page: a security header listing which domains are allowed to run scripts. The snippet is served from another domain, so a strict policy blocks it. Ask whoever manages the site to allow this origin in both directives below.',
    cspBoth: 'Both are needed. With only the first, the snippet loads and then reports nothing, silently.',
    debugBody: 'To see what the snippet is doing, add data-debug="1" to the tag and open the browser console on the landing page. It reports what it found, which variant it applied and what it sent.'
  },

  testList: {
    eyebrow: 'Prove it',
    title: 'Run a live test',
    hintLabel: 'What belongs on this screen',
    hint: 'Everything about running a test lives here, because it is the step you reach for *after* you have access to the site. Install the snippet once, then run one test at a time: the snippet shows the challenger to half the visitors and the result, not an opinion, decides the winner. Only ideas whose copy maps to a single element can run this way - the rest are shipped by hand from the analysis.',
    empty: 'None of the ideas in this analysis map to a single element, so there is nothing the snippet can swap. Ship them by hand from the analysis.',
    backToAnalysis: 'Back to the analysis'
  },

  nextStage: {
    eyebrow: 'After you win the work',
    title: 'Prove the lift on their page',
    body: 'Everything above needs nothing but the URL, which is why you can send it to a prospect. This is the other half: put a change live on the real page and let the result decide whether it worked.',
    requirement: 'Needs access to the site: one snippet installed, and the button you count as a conversion marked.',
    cta: 'Open the live test',
    ready: {
      one: '{count} idea here can run as a live test',
      other: '{count} ideas here can run as a live test'
    }
  },

  runTest: {
    eyebrow: 'Live A/B test',
    hintLabel: 'How running a test works',
    hint: 'Your current copy is the *control*. Pick a *challenger*, edit it to fit your product (replace any [bracketed] placeholders with real details), and choose how long to run. On *Launch*, the snippet shows the challenger to half your visitors and tracks conversions. When the window ends we read the result once and recommend a winner.',
    backToIdeas: 'Back to ideas',
    relaunch: 'Run another test'
  },

  testRunner: {
    controlTitle: 'Control (your current copy)',
    challengerTitle: 'Challenger to test',
    variant: 'Variant {letter}',
    recommendedSuffix: ' (recommended)',
    writingAlternates: 'Writing alternates...',
    placeholderWarning: 'This copy still has [placeholders] like [trial length]. Replace them with your real details before launching, or your visitors will see the brackets.',
    goalTitle: 'What counts as a conversion',
    goalHelp: 'Add this attribute to the element a visitor clicks when they convert, usually your main call to action. One click on it is one conversion. It replaces guessing at a CSS selector, which breaks silently the next time the page is redesigned.',
    goalMissing: 'That attribute is not on the page yet, so this test could only ever record visitors and never a result. Add it, publish the page, then launch.',
    testLength: 'Test length',
    days: '{days} days',
    launch: 'Launch test',
    launching: 'Launching...',
    gatedBefore: 'You already have a test running. Free plans run one at a time.',
    gatedAfter: 'to run more.',
    manualTarget: 'This idea is a manual setup: its copy does not map to a single element we can swap automatically, so it cannot run as a live text test. Apply the recommended copy on your page by hand.',
    alreadyRunning: 'This idea already has a live test. Stop it before launching another one.',
    error: 'Something went wrong launching the test.'
  },

  experimentPanel: {
    stop: 'Stop',
    discard: 'Discard',
    declareWinner: 'Declare winner',
    recommendation: 'Recommendation',
    copyReport: 'Copy report',
    downloadMd: 'Download .md',
    upgradeToExport: 'Talk to us to export',
    notEnoughData: 'Not enough data yet.',
    finalizing: 'Finalizing...',
    endsIn: { one: 'Ends in {days} day', other: 'Ends in {days} days' },
    lift: 'lift',
    drop: 'drop',
    magnitude: '{value}% {direction}',
    significant: 'Significant: {magnitude} (p={pValue}).',
    notSignificant: '{magnitude} so far, not yet significant (p={pValue}).'
  },

  report: {
    backToTestIdeas: 'Back to test ideas',
    printHint: 'Press Ctrl or Cmd + P to save as PDF',
    teardown: 'Conversion teardown',
    plan: 'A/B test plan',
    landingPageAnalyzed: 'Landing page analyzed',
    preparedBy: 'Prepared by {name}',
    dated: 'Reviewed on {date}',
    summaryBody:
      'We went through this page line by line and found {changes} changes worth making. {ready} of them are wording changes, and the new wording is already written below. The other {structural} change how the page is put together.',
    changesFound: 'Changes recommended',
    copyWritten: 'Copy already written',
    benchmarkedAgainst: 'Benchmarked against',
    testThisFirst: 'Test this first',
    problem: 'Problem',
    recommendation: 'Recommendation',
    current: 'Current',
    changeTo: 'Change to',
    placeholderNote: 'Contains [placeholders]. Swap in your real details before launching.',
    whyThisWorks: 'Why this works',
    manualSetup: 'Manual setup',
    manualSetupBody: 'This change touches a section that is not a single-line text swap, so an in-context preview is not available. Apply the recommended copy by hand.',
    appliedToYourPage: 'Applied to your page',
    previewAlt: 'Variant applied to the landing page',
    previewCta: 'See how this looks on your page',
    previewHint: 'We load your real page with this copy swapped in. Takes about {seconds} seconds.',
    previewLoading: 'Rendering your page...',
    previewUnavailable:
      'We could not render your page just now. The recommended copy above still stands.',
    previewRetry: 'Try again',
    previewOverflow:
      'This copy does not fit the space your page gives that element, so the preview shows it cut off. Shorten it, or give the element more room before you ship it.',
    footerQuestion: 'Want these measured live on your page?',
    generatedBy: 'Generated by Hunch'
  },

  waitlist: {
    seeMore: 'See more',
    heading: {
      one: '{count} more high-impact test is ready',
      other: '{count} more high-impact tests are ready'
    },
    body: 'Join the waitlist to unlock the full teardown, the recommended copy for every section, and live A/B testing on your page.',
    done: 'You are on the list. We will be in touch.',
    emailPlaceholder: 'you@company.com',
    phonePlaceholder: 'Phone (optional)',
    join: 'Join the waitlist',
    joining: 'Joining...',
    error: 'Something went wrong. Please try again.'
  },

  upgradePrompt: {
    eyebrow: 'Pro',
    title: 'Send this report under your own name',
    body: 'On Pro the report carries no mark of ours and no signup wall, so you can hand it to a client. Unlimited analyses, competitor mode and export come with it.',
    dismiss: 'Not now',
    dismissAria: 'Dismiss upgrade prompt'
  },

  leads: {
    eyebrow: 'Admin',
    title: 'Waitlist leads',
    empty: 'No leads yet. They arrive from a public report wall or the contact form.',
    email: 'Email',
    source: 'Source',
    phone: 'Phone',
    fromReport: 'From report',
    joined: 'Joined'
  },

  accounts: {
    eyebrow: 'Admin',
    title: 'Accounts',
    grantTitle: 'Grant a plan',
    grantHint:
      'Grant the plan when the deal closes. The account does not have to exist yet: the plan waits on the email and is already there at their first sign-in.',
    emailPlaceholder: 'buyer@company.com',
    grantSubmit: 'Grant pro',
    email: 'Email',
    plan: 'Plan',
    lastSignIn: 'Last sign-in',
    neverSignedIn: 'Never signed in',
    stripeCustomer: 'Stripe customer',
    joined: 'Created',
    action: 'Action',
    grant: 'Grant pro',
    revoke: 'Revoke'
  },

  reports: {
    eyebrow: 'Admin',
    title: 'Report opens',
    empty: 'No analyses yet. A report starts counting opens the first time someone loads its link.',
    page: 'Page',
    owner: 'Owner',
    views: 'Opens',
    lastOpened: 'Last opened',
    never: 'Never'
  },

  export: {
    filename: 'ab-test-report.md',
    title: 'A/B test report',
    source: 'Source',
    section: 'Section',
    duration: 'Duration',
    days: 'days',
    recommendation: 'Recommendation',
    problem: 'Problem',
    result: 'Result',
    arm: 'Arm',
    copy: 'Copy',
    conversions: 'Conversions / Visitors',
    rate: 'Rate',
    uplift: 'Uplift',
    pValue: 'p-value',
    notAvailable: 'n/a'
  }
}

export type Dictionary = typeof en
