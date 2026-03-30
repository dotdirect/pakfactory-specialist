import { describe, expect, it } from 'vitest'
import {
  buildPromptFromSkillDocument,
  parsePromptSkillMarkdown,
} from '@/lib/prompts/skills/loader'
import {
  CsAgentSkillMarkdown,
} from '@/lib/prompts/skills/generated'

describe('prompt skill markdown loader', () => {
  it('parses cs skill frontmatter and sections', () => {
    const parsed = parsePromptSkillMarkdown(CsAgentSkillMarkdown)

    expect(parsed.frontmatter.name).toBe('cs-agent')
    expect(parsed.frontmatter.version).toBe(1)
    expect(parsed.frontmatter.toolsAllowed).toEqual([
      'start_project_inquiry',
      'show_pricing_calculator',
    ])
    expect(parsed.sections.map((section) => section.title)).toEqual([
      'Role',
      'Mission',
      'Conversation Rules',
      'Key Information',
    ])
  })

  it('throws if required sections are missing', () => {
    const parsed = parsePromptSkillMarkdown(CsAgentSkillMarkdown)
    expect(() =>
      buildPromptFromSkillDocument(parsed, {
        requiredSectionTitles: ['Role', 'Nonexistent Section'],
      }),
    ).toThrow('missing required section')
  })

  it('throws when markdown is missing frontmatter delimiters', () => {
    expect(() =>
      parsePromptSkillMarkdown('## Role\nThis is not frontmatter formatted.'),
    ).toThrow('must start with frontmatter')
  })
})
