import type { BlogDictionary } from '@/lib/i18n/dictionaries/en.blog'

export const ptBrBlog: BlogDictionary = {
  index: {
    eyebrow: 'Blog',
    heading: 'Três coisas que decidem se a sua página funciona.',
    intro:
      'Curto, prático e sem número inventado. Cada post explica algo que você consegue conferir na sua própria página hoje.'
  },
  readMore: 'Ler o post',
  backToIndex: 'Todos os posts',
  postsLabel: 'Continue lendo',

  cta: {
    heading: 'Quer saber como a sua página está nisso?',
    body: 'Cole a sua URL. A gente abre a sua página do jeito que um visitante abre, conta o que tem nela e dá uma nota de 0 a 100.',
    button: 'Verificar minha página'
  },

  posts: {
    'what-is-seo': {
      title: 'O que é SEO e como isso afeta o meu negócio?',
      excerpt:
        'SEO não é um truque que você aplica na página. É o que uma máquina consegue ler dela. E o que ela não lê é como se não existisse.',
      lead: 'Quase toda explicação de SEO começa por palavra-chave. Palavra-chave vem por último. Começa por uma pergunta mais simples: quando uma máquina abre a sua página, o que ela entende?',
      sections: [
        {
          heading: 'O buscador lê uma página diferente da que você vê',
          paragraphs: [
            'Você abre a sua landing page e vê um design. O Google abre o mesmo endereço e vê texto. Alguns textos têm uma função especial, e são esses que ele olha com atenção.',
            'Ele não liga se o seu layout é bonito. E normalmente nem espera tudo que a sua página carrega. O que ele leva embora é o que está escrito como texto.'
          ],
          bullets: [
            'O title: a linha azul que as pessoas clicam no resultado da busca',
            'A meta description: a linha cinza logo abaixo dela',
            'O H1 e os outros headings: do que a página trata, e em que ordem',
            'O alt text das imagens: o único jeito de ler o que está dentro de uma imagem',
            'O canonical: qual endereço é o verdadeiro, quando mais de um mostra a mesma página',
            'Os dados estruturados: os mesmos fatos escritos num formato que a máquina não precisa adivinhar'
          ]
        },
        {
          heading: 'Por que isso custa clientes',
          paragraphs: [
            'Uma página sem meta description continua aparecendo no Google. Ela só aparece com uma linha que o próprio Google escreveu, usando o primeiro texto que achou. Muitas vezes é o seu aviso de cookies.',
            'Se a sua oferta só existe dentro da imagem lá em cima, o buscador vê uma página sobre nada. Se a sua página tem quatro H1, ela parece uma página que não decidiu o que é.',
            'Nada disso é castigo. É a distância entre o que você vende e o que a sua página realmente diz. E isso custa o visitante mais barato que existe: o que já estava procurando você.'
          ],
          bullets: []
        },
        {
          heading: 'O que costuma estar quebrado',
          paragraphs: [
            'É quase sempre a mesma lista curta, e nada nela exige refazer o site.'
          ],
          bullets: [
            'Nenhuma meta description, então o Google escreve uma no seu lugar',
            'Um title só com o nome da empresa, então ninguém sabe o que você vende',
            'A oferta, o preço ou os depoimentos presos dentro de uma imagem, sem alt text',
            'Nenhum dado estruturado, então tudo precisa ser deduzido do texto',
            'Um bloqueio esquecido de um ambiente de teste, que é o único problema capaz de sumir com a página inteira'
          ]
        },
        {
          heading: 'O que fazer hoje',
          paragraphs: [
            'Leia a sua página como se ela fosse só texto. Ignore as imagens e o design. O que sobra?',
            'Ela diz o que você vende, para quem é e o que acontece quando alguém clica? Se a resposta só existe no design, a resposta não existe. Isso é SEO, antes de palavra-chave sequer entrar na conversa.'
          ],
          bullets: []
        }
      ]
    },

    'what-is-copy': {
      title: 'O que é copy e como isso afeta o meu negócio?',
      excerpt:
        'Copy não é texto bonito. São as poucas frases que o visitante usa para decidir. E a maioria das páginas nunca diz o que está em jogo.',
      lead: 'Copy parece a parte decorativa da landing page. É o contrário. É a única parte da página que convence alguém. O design está ali para que ela seja lida na ordem certa.',
      sections: [
        {
          heading: 'As pessoas decidem em segundos',
          paragraphs: [
            'Quem cai na sua página está respondendo três perguntas, rápido: o que é isso, isso é para mim e o que acontece se eu clicar.',
            'Ninguém está apreciando o seu texto. Estão procurando um motivo para clicar mais uma vez. *A copy falha quando obriga o leitor a deduzir a resposta em vez de simplesmente dar ela.*'
          ],
          bullets: []
        },
        {
          heading: 'Onde costuma dar errado',
          paragraphs: [
            'Os erros se repetem em todo lugar, e cada um deles é uma linha de texto, não um redesign.'
          ],
          bullets: [
            'Um headline que fala da sua empresa em vez de falar do leitor',
            'Um botão escrito Enviar, que descreve o seu formulário e não o que a pessoa recebe',
            'Uma lista de funcionalidades, sem uma linha dizendo o que cada uma permite fazer',
            'Uma dúvida que ninguém respondeu, então o leitor imagina o pior',
            'Depoimentos depois do botão, num lugar em que já é tarde para ajudar'
          ]
        },
        {
          heading: 'Como arrumar uma linha',
          paragraphs: [
            'Pegue o seu headline principal. Escreva, em palavras simples, o que muda para alguém depois de comprar de você. Agora confira: o seu headline diz isso, ou só dá a entender?',
            'Faça o mesmo com o botão. Continuar descreve o software. Ver a nota da minha página descreve o que a pessoa recebe.',
            'Uma página costuma ter cinco ou seis linhas que sustentam o argumento inteiro. Reescrever essas é um trabalho pequeno que alcança muita coisa.'
          ],
          bullets: []
        },
        {
          heading: 'Por que começar por aqui',
          paragraphs: [
            'Tráfego custa dinheiro. Um redesign leva semanas. Copy é um campo de texto que você edita hoje.',
            'E é a parte que ninguém confere, porque um headline fraco não parece quebrado. A página carrega, o design está bom, e as pessoas vão embora por um motivo que o seu analytics nunca vai te contar.'
          ],
          bullets: []
        }
      ]
    },

    'ai-is-the-new-google': {
      title: 'A IA é o novo Google? Por que a sua página precisa ser legível por um modelo',
      excerpt:
        'Cada vez mais gente pergunta para uma IA em vez de buscar. O que ela consegue ler da sua página depende das mesmas coisas que o SEO sempre cobrou, mais um arquivo que quase ninguém confere.',
      lead: 'O hábito mudou sem alarde. A pergunta que virava uma busca e uma lista de links hoje muitas vezes vira uma pergunta digitada num assistente, e a resposta volta como um parágrafo. A sua landing page continua importando. O que mudou é quem está lendo ela.',
      sections: [
        {
          heading: 'Um leitor que não tem navegador',
          paragraphs: [
            'Quando uma pessoa abre a sua página, o navegador dela roda os seus scripts, carrega as suas fontes e desenha o seu design.',
            'O crawler que alimenta um assistente normalmente não faz nada disso. Ele baixa o texto, lê e segue. Ou seja, ele fica com a versão mais crua da sua página. Tudo que só aparece depois que o design carrega não existe para ele.'
          ],
          bullets: []
        },
        {
          heading: 'O que a sua página diz sobre ela mesma',
          paragraphs: [
            'Essa é a parte que vale guardar: um modelo falando do seu negócio está trabalhando com o texto da sua página, não com o seu design.'
          ],
          bullets: [
            'O title e a meta description: a sua página se descrevendo em uma linha cada',
            'Os headings: o resumo do que você está dizendo',
            'Os dados estruturados: os seus fatos escritos de um jeito que a máquina não precisa interpretar',
            'O alt text: a única versão legível do que está dentro de uma imagem',
            'Respostas claras para as dúvidas mais comuns, que é por que um FAQ de verdade funciona tão bem aqui'
          ]
        },
        {
          heading: 'O robots.txt voltou a importar',
          paragraphs: [
            'Todo site tem um arquivinho chamado robots.txt que diz quem pode ler ele. Foi escrito para buscador, muitas vezes anos atrás, muitas vezes por alguém que já saiu da empresa.',
            'Esse mesmo arquivo hoje decide se os crawlers por trás das IAs podem ler o seu site. Tem site bloqueando sem saber. Tem site sem arquivo nenhum, e está tudo bem. De um jeito ou de outro, vale uma olhada, e quase ninguém olhou.'
          ],
          bullets: []
        },
        {
          heading: 'O que dá para conferir de verdade',
          paragraphs: [
            'Dá para conferir a sua página: o que ela diz sobre si mesma, se essas linhas existem e o que o seu robots.txt permite. Isso é contável, e é o que a aba de AI de uma análise mostra, do lado da aba de SEO.',
            'O motivo para arrumar é simples. Uma máquina não lê um preço que só existe dentro de uma imagem, e nada resume uma página que nunca disse o que vende.'
          ],
          bullets: []
        }
      ]
    }
  }
}
