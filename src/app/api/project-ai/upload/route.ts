import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseProjectDocUploadEnvStrict } from '@/lib/env/server'
import { extractProjectDocFields } from '@/lib/project-doc/extract'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildSyncProjectBriefOutput,
  type SyncProjectBriefInput,
} from '@/lib/tools/sync-project-brief'

export const runtime = 'nodejs'
export const maxDuration = 30

const ChatIdSchema = z.string().trim().min(1).max(120).optional()
const AllowedExtensions = new Set(['pdf', 'doc', 'docx'])

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function sanitizeName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function buildStoragePath(fileName: string, chatId?: string): string {
  const safeName = sanitizeName(fileName)
  const token = crypto.randomUUID()
  const folder = chatId ? chatId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'general'
  return `project-ai/${folder}/${Date.now()}-${token}-${safeName}`
}

function buildExtractionSummary(input: Omit<SyncProjectBriefInput, 'summary'>): string {
  const captured: string[] = []
  if (input.customerIndustry) captured.push(`industry: ${input.customerIndustry}`)
  if (input.productItem) captured.push(`product item: ${input.productItem}`)
  if (input.productLine) captured.push(`product line: ${input.productLine}`)
  if (input.packagingStyle) captured.push(`packaging style: ${input.packagingStyle}`)
  if (input.dimensions) captured.push(`dimensions: ${input.dimensions}`)
  if (input.quantityList?.length) captured.push(`quantities: ${input.quantityList.join(', ')}`)
  if (input.deliveryCountry) captured.push(`delivery country: ${input.deliveryCountry}`)
  if (input.details) captured.push('project details')
  if (captured.length === 0) {
    return 'Uploaded document. No structured fields were confidently extracted yet.'
  }
  return `Uploaded document and extracted ${captured.join('; ')}.`
}

export async function POST(req: Request) {
  try {
    const env = parseProjectDocUploadEnvStrict()
    const formData = await req.formData()
    const file = formData.get('file')
    const chatId = ChatIdSchema.parse(formData.get('chatId')?.toString())

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file upload' }, { status: 400 })
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 })
    }

    if (file.size > env.PROJECT_DOC_MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max size is ${Math.round(env.PROJECT_DOC_MAX_BYTES / (1024 * 1024))}MB.` },
        { status: 413 },
      )
    }

    const extension = getExtension(file.name)
    if (!AllowedExtensions.has(extension)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOC, or DOCX.' },
        { status: 415 },
      )
    }

    const admin = createAdminClient()
    const storagePath = buildStoragePath(file.name, chatId)
    const { data: uploaded, error: uploadError } = await admin.storage
      .from(env.PROJECT_DOC_UPLOAD_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError || !uploaded) {
      return NextResponse.json(
        { error: 'Failed to store uploaded document. Check storage bucket configuration.' },
        { status: 500 },
      )
    }

    const publicUrlResult = admin.storage
      .from(env.PROJECT_DOC_UPLOAD_BUCKET)
      .getPublicUrl(uploaded.path)
    const fileUrl = publicUrlResult.data.publicUrl

    const buffer = Buffer.from(await file.arrayBuffer())
    const extraction = await extractProjectDocFields(file.name, buffer)
    const extractionNotes = [
      extraction.extracted.notes,
      extraction.extracted.unknownFields.length > 0
        ? `Unknown or missing fields: ${extraction.extracted.unknownFields.join(', ')}`
        : undefined,
      `Extraction confidence: ${extraction.extracted.confidence}.`,
    ]
      .filter(Boolean)
      .join('\n')

    const syncInput = {
      summary: buildExtractionSummary({ ...extraction.extracted, projectPDF: fileUrl }),
      customerIndustry: extraction.extracted.customerIndustry,
      productItem: extraction.extracted.productItem,
      productLine: extraction.extracted.productLine,
      packagingStyle: extraction.extracted.packagingStyle,
      dimensions: extraction.extracted.dimensions,
      quantityList: extraction.extracted.quantityList,
      deliveryCountry: extraction.extracted.deliveryCountry,
      materials: extraction.extracted.materials,
      finishes: extraction.extracted.finishes,
      addOns: extraction.extracted.addOns,
      details: extraction.extracted.details,
      notes: extractionNotes || undefined,
      projectPDF: fileUrl,
    } satisfies SyncProjectBriefInput

    const sync = buildSyncProjectBriefOutput(syncInput)
    return NextResponse.json({
      fileUrl,
      fileName: file.name,
      textLength: extraction.textLength,
      sync,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected upload error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
