import type { BlogSlug } from '@/lib/enums'

type BlogPost = {
  title: string
  excerpt: string
  lead: string
  sections: { heading: string; paragraphs: string[]; bullets: string[] }[]
}

export const enBlog = {
  index: {
    eyebrow: 'Blog',
    heading: 'Three things that decide whether your page works.',
    intro:
      'Short and practical, with no invented numbers. Each post explains something you can check on your own page today.'
  },
  readMore: 'Read the post',
  backToIndex: 'All posts',
  postsLabel: 'Keep reading',

  cta: {
    heading: 'Want to know how your page is doing on this?',
    body: 'Paste your URL. We open your page the way a visitor does, count what is on it, and give it a score out of 100.',
    button: 'Check my page'
  },

  posts: {
    'what-is-seo': {
      title: 'What is SEO, and how does it affect my business?',
      excerpt:
        'SEO is not a trick you apply to a page. It is what a machine can read of it. And what it cannot read might as well not be there.',
      lead: 'Most explanations of SEO start with keywords. Keywords come last. It starts with a simpler question: when a machine opens your page, what does it understand?',
      sections: [
        {
          heading: 'A search engine reads a different page than you do',
          paragraphs: [
            'You open your landing page and see a design. Google opens the same address and sees text. Some text has a special job, and that is the text it pays attention to.',
            'It does not care that your layout is nice. It usually does not wait for everything your page loads either. What it takes away is what is written as text.'
          ],
          bullets: [
            'The title: the blue line people click in the results',
            'The meta description: the grey line right under it',
            'The H1 and the other headings: what the page is about, and in what order',
            'The alt text on images: the only way anything inside an image can be read',
            'The canonical: which address is the real one, when more than one shows the same page',
            'Structured data: the same facts written in a format a machine does not have to guess at'
          ]
        },
        {
          heading: 'Why this costs you customers',
          paragraphs: [
            'A page with no meta description still shows up in Google. It just shows up with a line Google wrote by itself, using the first text it found. Often that is your cookie banner.',
            'If your offer only exists inside the image at the top, a search engine sees a page about nothing. If your page has four H1s, it looks like a page that could not decide what it is.',
            'None of this is a punishment. It is a gap between what you sell and what your page actually says. And it costs you the cheapest visitor there is: the one who was already looking for you.'
          ],
          bullets: []
        },
        {
          heading: 'What is usually broken',
          paragraphs: [
            'It is almost always the same short list, and none of it means rebuilding the site.'
          ],
          bullets: [
            'No meta description, so Google writes one for you',
            'A title with only the company name, so nobody knows what you sell',
            'The offer, the price or the customer reviews stuck inside an image, with no alt text',
            'No structured data, so everything has to be guessed from the text',
            'A leftover block from a test site, which is the one problem that hides the page completely'
          ]
        },
        {
          heading: 'What to do today',
          paragraphs: [
            'Read your page as if it were plain text. Ignore the images and the design. What is left?',
            'Does it say what you sell, who it is for, and what happens when someone clicks? If the answer only exists in the design, the answer does not exist. That is SEO, before keywords even come up.'
          ],
          bullets: []
        }
      ]
    },

    'what-is-copy': {
      title: 'What is copy, and how does it affect my business?',
      excerpt:
        'Copy is not pretty writing. It is the handful of sentences a visitor uses to decide. Most pages never say the thing being decided.',
      lead: 'Copy sounds like the decorative part of a landing page. It is the opposite. It is the only part of the page that convinces anyone. The design is there to get it read in the right order.',
      sections: [
        {
          heading: 'People decide in seconds',
          paragraphs: [
            'Someone who lands on your page is answering three questions, fast: what is this, is it for me, and what happens if I click.',
            'Nobody is enjoying your writing. They are looking for a reason to click once more. *Copy fails when it makes the reader work out the answer instead of just saying it.*'
          ],
          bullets: []
        },
        {
          heading: 'Where it usually goes wrong',
          paragraphs: [
            'The mistakes repeat everywhere, and each one is a line of text, not a redesign.'
          ],
          bullets: [
            'A headline about your company instead of about the reader',
            'A button that says Send, which describes your form and not what the person gets',
            'A list of features, with no line saying what each one lets someone do',
            'A doubt nobody answered, so the reader assumes the worst',
            'Customer reviews placed after the button, where they are too late to help'
          ]
        },
        {
          heading: 'How to fix one line',
          paragraphs: [
            'Take your main headline. Write down, in plain words, what changes for someone after they buy from you. Now check: does your headline say that, or only hint at it?',
            'Do the same with the button. Continue describes the software. See my page score describes what the person gets.',
            'A page usually has five or six lines carrying the whole argument. Rewriting those is a small job with a big reach.'
          ],
          bullets: []
        },
        {
          heading: 'Why start here',
          paragraphs: [
            'Traffic costs money. A redesign takes weeks. Copy is a text field you can edit today.',
            'It is also the part nobody checks, because a weak headline does not look broken. The page loads, the design is fine, and people leave for a reason your analytics will never tell you.'
          ],
          bullets: []
        }
      ]
    },

    'ai-is-the-new-google': {
      title: 'Is AI the new Google? Why your page needs to be readable by a model',
      excerpt:
        'More people ask an assistant instead of searching. What it can read of your page comes down to the same things SEO always cared about, plus one file almost nobody checks.',
      lead: 'The habit changed quietly. A question that used to become a search and a list of links now often becomes a question typed into an assistant, and the answer comes back as a paragraph. Your landing page still matters. What changed is who is reading it.',
      sections: [
        {
          heading: 'A reader with no browser',
          paragraphs: [
            'When a person opens your page, their browser runs your scripts, loads your fonts and draws your design.',
            'The crawler that feeds an assistant usually does none of that. It downloads the text, reads it, and moves on. So it gets the barest version of your page. Anything that only appears once the design loads is not there for it.'
          ],
          bullets: []
        },
        {
          heading: 'What your page says about itself',
          paragraphs: [
            'This is the part worth remembering: a model talking about your business is working from the text on your page, not from your design.'
          ],
          bullets: [
            'The title and the meta description: your page describing itself in one line each',
            'The headings: the outline of what you are saying',
            'Structured data: your facts written so a machine does not have to interpret them',
            'The alt text: the only readable version of anything inside an image',
            'Clear answers to common questions, which is why a real FAQ works so well here'
          ]
        },
        {
          heading: 'robots.txt matters again',
          paragraphs: [
            'Every site has a small file called robots.txt that says who is allowed to read it. It was written for search engines, often years ago, often by someone who has left.',
            'That same file now decides whether the crawlers behind AI assistants can read your site at all. Some sites block them without knowing. Others have no file and are fine. Either way it is worth a look, and almost nobody has looked.'
          ],
          bullets: []
        },
        {
          heading: 'What you can actually check',
          paragraphs: [
            'You can check your page: what it says about itself, whether those lines exist at all, and what your robots.txt allows. That is countable, and it is what the AI tab of an analysis shows you, right next to the SEO one.',
            'The reason to fix it is simple. A machine cannot read a price that only exists inside an image, and nothing can summarise a page that never said what it sells.'
          ],
          bullets: []
        }
      ]
    }
  } as Record<BlogSlug, BlogPost>
}

export type BlogDictionary = typeof enBlog
