import { describe, expect, it } from 'vitest'
import {
  buildPromptFromSkillDocument,
  parsePromptSkillMarkdown,
} from '@/lib/prompts/skills/loader'
import {
  CsAgentSkillMarkdown,
  SpecialistAgentSkillMarkdown,
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

  it('builds specialist prompt body from markdown sections', () => {
    const parsed = parsePromptSkillMarkdown(SpecialistAgentSkillMarkdown)
    const prompt = buildPromptFromSkillDocument(parsed, {
      requiredSectionTitles: ['Role', 'Mission', 'Conversation Rules', 'Packaging Context'],
    })

    expect(prompt).toContain('quote-ready project brief')
    expect(prompt).toContain('one comprehensive question that captures all key fields for that phase')
    expect(prompt).toContain('Do not split related required fields into separate turns')
    expect(prompt).toContain('MOQ typically starts at 500-1000 units')
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
