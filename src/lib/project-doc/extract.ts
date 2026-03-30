import { generateObject } from 'ai'
import { z } from 'zod'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { getModel } from '@/lib/agents/model'

const ExtractedProjectFieldsSchema = z.object({
  customerIndustry: z.string().min(1).optional(),
  productItem: z.string().min(1).optional(),
  productLine: z.string().min(1).optional(),
  packagingStyle: z.string().min(1).optional(),
  dimensions: z.string().min(1).optional(),
  quantityList: z.array(z.number().int().positive()).optional(),
  deliveryCountry: z.string().min(1).optional(),
  materials: z.string().min(1).optional(),
  finishes: z.string().min(1).optional(),
  addOns: z.string().min(1).optional(),
  details: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
  unknownFields: z.array(z.string().min(1)).default([]),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
})

export type ExtractedProjectFields = z.infer<typeof ExtractedProjectFieldsSchema>

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  return result.text?.trim() ?? ''
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value?.trim() ?? ''
}

async function extractTextByType(fileName: string, buffer: Buffer): Promise<string> {
  const extension = getExtension(fileName)
  if (extension === 'pdf') return extractPdfText(buffer)
  if (extension === 'docx') return extractDocxText(buffer)
  if (extension === 'doc') {
    // Legacy .doc is a binary format. Keep best-effort plain-text fallback.
    return buffer.toString('utf8').trim()
  }
  throw new Error('Unsupported file type')
}

function buildExtractionPrompt(text: string) {
  return `
Extract packaging project intake fields from the document text.

Return only values that are explicitly present. Do not infer unknown values.
If a value is missing, omit it.

Document text:
${text}
`.trim()
}

function normalizeExtraction(object: ExtractedProjectFields): ExtractedProjectFields {
  if (!object.quantityList || object.quantityList.length === 0) return object
  const sortedUnique = [...new Set(object.quantityList)].sort((a, b) => a - b)
  return { ...object, quantityList: sortedUnique }
}

export type ProjectDocExtractionResult = {
  textLength: number
  extracted: ExtractedProjectFields
}

export async function extractProjectDocFields(
  fileName: string,
  buffer: Buffer,
): Promise<ProjectDocExtractionResult> {
  const rawText = await extractTextByType(fileName, buffer)
  const text = rawText.slice(0, 18_000)

  if (!text) {
    return {
      textLength: 0,
      extracted: ExtractedProjectFieldsSchema.parse({
        notes: 'No extractable text was found in the uploaded document.',
        confidence: 'low',
        unknownFields: ['document_text'],
      }),
    }
  }

  const { object } = await generateObject({
    model: getModel(),
    schema: ExtractedProjectFieldsSchema,
    prompt: buildExtractionPrompt(text),
    temperature: 0,
  })

  return {
    textLength: text.length,
    extracted: normalizeExtraction(ExtractedProjectFieldsSchema.parse(object)),
  }
}
