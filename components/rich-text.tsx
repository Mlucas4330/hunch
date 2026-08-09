export function RichText({ children }: { children: string }) {
  return (
    <>
      {children.split('*').map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
    </>
  )
}
