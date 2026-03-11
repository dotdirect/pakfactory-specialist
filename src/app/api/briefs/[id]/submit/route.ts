import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const SubmitBriefParamsSchema = z.object({
  id: z.string().uuid(),
})

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const raw = await params
  const result = SubmitBriefParamsSchema.safeParse(raw)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid brief ID' },
      { status: 400 }
    )
  }

  // TODO: validate brief completeness and update status in Supabase
  return NextResponse.json({
    data: {
      id: result.data.id,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    },
  })
}
