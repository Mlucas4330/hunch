export function Footer() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-6">
        <p className="panel-label text-[0.65rem] text-muted-foreground">
          Powered by{' '}
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
