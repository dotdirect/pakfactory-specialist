import { z } from 'zod'

const PromptSkillFrontmatterSchema = z.object({
  name: z.string().min(1),
  version: z.coerce.number().int().positive(),
  modelHints: z.array(z.string().min(1)).default([]),
  toolsAllowed: z.array(z.string().min(1)).default([]),
})

export type PromptSkillFrontmatter = z.infer<typeof PromptSkillFrontmatterSchema>

export type PromptSkillSection = {
  title: string
  body: string
}

export type PromptSkillDocument = {
  frontmatter: PromptSkillFrontmatter
  sections: PromptSkillSection[]
}

function parseListValue(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1)
    return inner
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseFrontmatterBlock(frontmatterBlock: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  const lines = frontmatterBlock
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (const line of lines) {
    const separator = line.indexOf(':')
    if (separator <= 0) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (key === 'modelHints' || key === 'toolsAllowed') {
      result[key] = parseListValue(value)
    } else {
      result[key] = value
    }
  }

  return result
}

function parseSections(body: string): PromptSkillSection[] {
  const lines = body.split('\n')
  const sections: PromptSkillSection[] = []
  let currentTitle: string | null = null
  let currentBody: string[] = []

  const flush = () => {
    if (!currentTitle) return
    const normalizedBody = currentBody.join('\n').trim()
    if (normalizedBody) {
      sections.push({ title: currentTitle, body: normalizedBody })
    }
  }

  for (const rawLine of lines) {
    const heading = rawLine.match(/^##\s+(.+)$/)
    if (heading) {
      flush()
      currentTitle = heading[1].trim()
      currentBody = []
      continue
    }
    if (currentTitle) {
      currentBody.push(rawLine)
    }
  }

  flush()
  return sections
}

export function parsePromptSkillMarkdown(markdown: string): PromptSkillDocument {
  const content = markdown.replace(/\r\n/g, '\n').trim()
  if (!content.startsWith('---\n')) {
    throw new Error('Prompt skill markdown must start with frontmatter delimited by ---')
  }

  const secondDelimiter = content.indexOf('\n---\n', 4)
  if (secondDelimiter < 0) {
    throw new Error('Prompt skill markdown frontmatter is missing closing ---')
  }

  const frontmatterRaw = content.slice(4, secondDelimiter)
  const body = content.slice(secondDelimiter + 5).trim()
  const frontmatterParsed = parseFrontmatterBlock(frontmatterRaw)
  const frontmatter = PromptSkillFrontmatterSchema.parse(frontmatterParsed)
  const sections = parseSections(body)

  if (sections.length === 0) {
    throw new Error(`Prompt skill "${frontmatter.name}" has no sections`)
  }

  return { frontmatter, sections }
}

export function buildPromptFromSkillDocument(
  document: PromptSkillDocument,
  options?: {
    requiredSectionTitles?: string[]
    appendBlocks?: string[]
  },
): string {
  const required = options?.requiredSectionTitles ?? []
  const requiredSet = new Set(required.map((title) => title.toLowerCase()))
  const sectionTitleSet = new Set(
    document.sections.map((section) => section.title.toLowerCase()),
  )

  for (const requiredTitle of requiredSet) {
    if (!sectionTitleSet.has(requiredTitle)) {
      throw new Error(
        `Prompt skill "${document.frontmatter.name}" is missing required section "${requiredTitle}"`,
      )
    }
  }

  const blocks = document.sections.map((section) => section.body.trim()).filter(Boolean)
  for (const block of options?.appendBlocks ?? []) {
    const trimmed = block.trim()
    if (trimmed) blocks.push(trimmed)
  }

  return blocks.join('\n\n')
}
