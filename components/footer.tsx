import { getDictionary } from '@/lib/i18n'

export async function Footer() {
  const t = await getDictionary()

  return (
    <footer className="mt-auto border-t print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-6">
        <p className="panel-label text-[0.65rem] text-muted-foreground">
          {t.footer.poweredBy}{' '}
          <a
            href="https://www.linkedin.com/in/lucas-medeiros-dev/"
            target="_blank"
            rel="noreferrer"
            className="text-foreground transition-colors hover:text-purple"
          >
            Lucas Medeiros
          </a>
        </p>
      </div>
    </footer>
  )
}
