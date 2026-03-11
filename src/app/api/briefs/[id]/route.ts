import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  CustomerInfoSchema,
  IntentSchema,
  TimelineSchema,
  BriefStatusSchema,
} from '@/types/brief'

interface RouteParams {
  params: Promise<{ id: string }>
}

const UpdateBriefSchema = z.object({
  customerInfo: CustomerInfoSchema.optional(),
  intent: IntentSchema.optional(),
  timeline: TimelineSchema.optional(),
  status: BriefStatusSchema.optional(),
  notes: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  // TODO: fetch brief by id from Supabase
  return NextResponse.json({ data: { id } })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const raw = await req.json()
  const result = UpdateBriefSchema.safeParse(raw)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // TODO: update in Supabase
  return NextResponse.json({ data: { id, ...result.data } })
}
