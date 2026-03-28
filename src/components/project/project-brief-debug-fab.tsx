'use client'

import { useMemo, useState } from 'react'
import { BugIcon, CheckIcon, CopyIcon, XIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useBriefStore } from '@/stores/brief-store'

const EMPTY_BRIEF_MESSAGE = 'No brief has been initialized yet.'
const STRINGIFY_ERROR_MESSAGE =
  'Unable to serialize brief state. Open Redux DevTools (brief-store) for full inspection.'

export function ProjectBriefDebugFab() {
  const brief = useBriefStore((state) => state.brief)
  const currentStep = useBriefStore((state) => state.currentStep)
  const currentFlow = useBriefStore((state) => state.currentFlow)
  const ragDebug = useBriefStore((state) => state.ragDebug)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const briefJson = useMemo(() => {
    if (!brief) return EMPTY_BRIEF_MESSAGE
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
    <>
      {/* FAB toggle */}
      <Button
        type="button"
        size="icon-lg"
        className="fixed right-6 bottom-6 z-60 rounded-full shadow-lg"
        aria-label="Toggle debug inspector"
        onClick={() => setOpen((v) => !v)}
      >
        <BugIcon />
      </Button>

      {/* Floating popup — no overlay, doesn't block interaction */}
      {open && (
        <div className="fixed right-6 bottom-20 z-50 flex h-[70vh] w-[400px] flex-col rounded-xl border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">Debug Inspector</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{currentFlow}</Badge>
              <Badge variant="secondary" className="text-xs">{currentStep}</Badge>
              <Button type="button" variant="ghost" size="sm" className="size-7 p-0" onClick={() => setOpen(false)}>
                <XIcon className="size-3.5" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="brief" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="mx-4 mt-2">
              <TabsTrigger value="brief">Brief State</TabsTrigger>
              <TabsTrigger value="rag">RAG Results</TabsTrigger>
            </TabsList>

            <TabsContent value="brief" className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between px-4 py-2">
                <p className="text-xs text-muted-foreground">
                  {brief ? 'Live state from brief-store' : EMPTY_BRIEF_MESSAGE}
                </p>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleCopy} disabled={!canCopy}>
                  {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <ScrollArea className="flex-1 min-h-0 px-4 pb-4">
                <pre className="wrap-break-word whitespace-pre-wrap font-mono text-xs leading-5">
                  {briefJson}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="rag" className="flex-1 min-h-0 flex flex-col">
              <div className="px-4 py-2">
                <p className="text-xs text-muted-foreground">
                  {ragDebug ? 'Live from last recommend step' : 'No RAG search yet'}
                </p>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-4 pb-4">
                {ragDebug ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Query</p>
                      <p className="text-xs font-mono bg-muted rounded p-2">{ragDebug.query}</p>
                    </div>

                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Industry</p>
                        <Badge variant="outline" className="text-xs">
                          {ragDebug.industry ?? 'none'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Filter</p>
                        <Badge variant={ragDebug.filterUsed ? 'default' : 'secondary'} className="text-xs">
                          {ragDebug.filterUsed ? 'Applied' : 'Fallback (unfiltered)'}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Results ({ragDebug.products.length})
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {ragDebug.products.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded border px-3 py-2 text-xs"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-muted-foreground">{p.category}</span>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">
                              {p.score.toFixed(3)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Run through to the recommend step to see RAG search results here.
                  </p>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  )
}
