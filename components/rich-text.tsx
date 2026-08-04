// Renders *asterisk-wrapped* spans of a translated string as bold, so emphasis travels with the
// words instead of being hardcoded as JSX around them.
export function RichText({ children }: { children: string }) {
  return (
    <>
      {children.split('*').map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
    </>
  )
}
