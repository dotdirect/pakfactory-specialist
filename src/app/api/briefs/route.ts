import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CustomerInfoSchema, IntentSchema } from '@/types/brief'

const CreateBriefSchema = z.object({
  customerInfo: CustomerInfoSchema.optional(),
  intent: IntentSchema.optional(),
  notes: z.string().optional(),
})

export async function GET() {
  // TODO: fetch briefs from Supabase
  return NextResponse.json({ data: [] })
}

export async function POST(req: Request) {
  const raw = await req.json()
  const result = CreateBriefSchema.safeParse(raw)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // TODO: insert into Supabase
  return NextResponse.json({ data: result.data }, { status: 201 })
}
