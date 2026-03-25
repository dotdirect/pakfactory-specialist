import { describe, expect, it } from 'vitest'
import { buildSyncProjectBriefOutput } from '@/lib/tools/sync-project-brief'

describe('buildSyncProjectBriefOutput', () => {
  it('maps projectPDF into project context event payload', () => {
    const output = buildSyncProjectBriefOutput({
      summary: 'Uploaded project spec document.',
      projectPDF: 'https://cdn.example.com/project/brief.pdf',
      productItem: 'tea sachets',
      details: 'Retail launch with premium shelf goals',
    })

    const projectContextEvent = output.events.find(
      (event) => event.action === 'brief.project.context_confirmed',
    )

    expect(projectContextEvent).toBeDefined()
    if (projectContextEvent?.action !== 'brief.project.context_confirmed') return
    expect(projectContextEvent.data.projectPDF).toBe('https://cdn.example.com/project/brief.pdf')
    expect(projectContextEvent.data.productItem).toBe('tea sachets')
    expect(projectContextEvent.data.details).toContain('Retail launch')
    expect(projectContextEvent.data.summary).toContain('Retail launch')
    expect(output.changedFields).toContain('project.productItem')
    expect(output.changedFields).toContain('project.projectPDF')
  })

  it('persists provided projectSummary into project context event payload', () => {
    const output = buildSyncProjectBriefOutput({
      summary: 'Captured project details.',
      projectSummary: 'Premium candle mailer for holiday DTC launch.',
      productItem: 'candles',
    })

    const projectContextEvent = output.events.find(
      (event) => event.action === 'brief.project.context_confirmed',
    )

    expect(projectContextEvent).toBeDefined()
    if (projectContextEvent?.action !== 'brief.project.context_confirmed') return
    expect(projectContextEvent.data.summary).toBe('Premium candle mailer for holiday DTC launch.')
    expect(output.changedFields).toContain('project.summary')
  })

  it('builds a fallback project summary when projectSummary is missing', () => {
    const output = buildSyncProjectBriefOutput({
      summary: 'Updated context with known project details.',
      productItem: 'tea sachets',
      packagingStyle: 'stand-up pouch',
      deliveryCountry: 'Canada',
      quantityList: [1000, 2500],
    })

    const projectContextEvent = output.events.find(
      (event) => event.action === 'brief.project.context_confirmed',
    )

    expect(projectContextEvent).toBeDefined()
    if (projectContextEvent?.action !== 'brief.project.context_confirmed') return
    expect(projectContextEvent.data.summary).toContain('Product: tea sachets')
    expect(projectContextEvent.data.summary).toContain('Style: stand-up pouch')
    expect(projectContextEvent.data.summary).toContain('Delivery: Canada')
    expect(output.changedFields).toContain('project.summary')
    expect(output.appliedUpdates.length).toBeGreaterThan(0)
  })

  it('auto-generates output summary when summary input is omitted', () => {
    const output = buildSyncProjectBriefOutput({
      customerCompany: 'PakFactory',
    })

    expect(output.summary.length).toBeGreaterThan(0)
    expect(output.changedFields).toContain('customer.company')
  })
})
