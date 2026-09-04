'use client'

import { useState } from 'react'
import { Check, Copy, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PanelCard } from '@/components/panel-card'
import { InfoHint } from '@/components/info-hint'
import { useI18n } from '@/components/i18n-provider'
import { COPY_FEEDBACK_MS } from '@/lib/constants'
import { writeToClipboard } from '@/lib/clipboard'

/**
 * The report handed back to the tool that built the page.
 *
 * **The prompt is assembled on the server and arrives as a string.** `fixPrompt` is pure and needs
 * the whole dictionary, so building it here would ship a second copy of every rule into the bundle
 * for a value that never changes after render.
 *
 * **Not owner-gated, and that is on purpose.** Everything in the prompt is already rendered above it
 * on the same page; a reader handed the link can select the fixes and copy them by hand today. The
 * owner-only list in docs/report.md is actions that spend a credit or record a decision, and copying
 * text that is already on screen is neither.
 */
export function FixPromptCard({ prompt, className }: { prompt: string; className?: string }) {
  const { dictionary } = useI18n()
  const copy = dictionary.fixPrompt
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    // A denied clipboard permission needs no message: the preview below holds the same text and
    // selecting it by hand still works.
    if (await writeToClipboard(prompt)) {
      setCopied(true)
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
    }
  }

  return (
    <PanelCard id="prompt" icon={Terminal} label={copy.eyebrow} testId="fix-prompt" className={className}>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-balance font-display text-xl font-bold tracking-tight">
              {copy.title}
            </h2>
            <InfoHint label={copy.hintLabel}>{copy.hint}</InfoHint>
          </div>
        </div>

        <Button onClick={onCopy} data-testid="copy-fix-prompt">
          {copied ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copied ? copy.copied : copy.cta}
        </Button>

        {/* Readable and selectable without a click, so the reader can see exactly what they are about
            to paste. A prompt someone pastes into their own codebase unread is worse than no prompt. */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground">{copy.preview}</summary>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
            {prompt}
          </pre>
        </details>
      </div>
    </PanelCard>
  )
}
