import { PenLine, Search, Sparkles, Workflow, type LucideIcon } from 'lucide-react'
import type { AnalysisTab } from '@/lib/enums'

// Its own module rather than beside AnalysisSections: that file is a client module, and a server page
// importing a plain object out of one receives a client reference instead of the object.
export const ANALYSIS_SECTION_ICON: Record<AnalysisTab, LucideIcon> = {
  ai: Sparkles,
  seo: Search,
  flow: Workflow,
  copy: PenLine
}
