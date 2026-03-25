'use client'

import { useMemo, useState } from 'react'
import { BugIcon, CheckIcon, CopyIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useBriefStore } from '@/stores/brief-store'

const EMPTY_BRIEF_MESSAGE = 'No brief has been initialized yet.'
const STRINGIFY_ERROR_MESSAGE =
  'Unable to serialize brief state. Open Redux DevTools (brief-store) for full inspection.'

export function ProjectBriefDebugFab() {
  const brief = useBriefStore((state) => state.brief)
  const [copied, setCopied] = useState(false)

  const briefJson = useMemo(() => {
    if (!brief) {
      return EMPTY_BRIEF_MESSAGE
    }

    try {
      return JSON.stringify(brief, null, 2)
    } catch {
      return STRINGIFY_ERROR_MESSAGE
    }
  }, [brief])

  const canCopy = briefJson !== EMPTY_BRIEF_MESSAGE && briefJson !== STRINGIFY_ERROR_MESSAGE

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  async function handleCopy() {
    if (!canCopy) return

    try {
      await navigator.clipboard.writeText(briefJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon-lg"
          className="fixed right-6 bottom-6 z-60 rounded-full shadow-lg"
          aria-label="Open project brief debug inspector"
        >
          <BugIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Project Brief Debug State</DialogTitle>
          <DialogDescription>
            Live Zustand <code>brief</code> state from <code>brief-store</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between border-b px-6 py-3">
          <p className="text-sm text-muted-foreground">
            {brief ? 'State is live and updates as chat events arrive.' : EMPTY_BRIEF_MESSAGE}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={!canCopy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied' : 'Copy JSON'}
          </Button>
        </div>

        <ScrollArea className="h-[60vh] px-6 py-4">
          <pre className="wrap-break-word whitespace-pre-wrap font-mono text-xs leading-5">
            {briefJson}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
