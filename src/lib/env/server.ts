import { z } from 'zod'

/**
 * Server-only env for Pinecone-backed help retrieval.
 * Optional at runtime: if parsing fails, help chat skips RAG (no fake citations).
 */
export const RetrievalEnvSchema = z.object({
  PINECONE_API_KEY: z.string().min(1),
  PINECONE_HOST: z.string().url(),
  AI_EMBEDDING_PROVIDER: z.enum(['openai', 'google']).default('openai'),
  AI_EMBEDDING_MODEL: z.string().min(1),
  PINECONE_TOP_K: z.coerce.number().int().positive().max(20).default(5),
  PINECONE_NAMESPACE: z.string().optional(),
  PINECONE_NAMESPACES: z.string().optional(),
  /** Documented for ops; optional — queries use `PINECONE_HOST` today. */
  PINECONE_INDEX_NAME: z.string().optional(),
})

export type RetrievalEnv = z.infer<typeof RetrievalEnvSchema>

/** Safe parse for production: missing/invalid config disables RAG without crashing. */
export function parseRetrievalEnv(): RetrievalEnv | null {
  const parsed = RetrievalEnvSchema.safeParse(process.env)
  return parsed.success ? parsed.data : null
}

/**
 * Strict parse — use in tests or startup checks when RAG must be configured.
 * @throws ZodError if required vars are missing or invalid.
 */
export function parseRetrievalEnvStrict(): RetrievalEnv {
  return RetrievalEnvSchema.parse(process.env)
}

export function getNamespaceFromEnv(env: RetrievalEnv): string | undefined {
  if (env.PINECONE_NAMESPACE?.trim()) return env.PINECONE_NAMESPACE.trim()
  if (env.PINECONE_NAMESPACES?.trim()) {
    return env.PINECONE_NAMESPACES.split(',')[0]?.trim() || undefined
  }
  return undefined
}

/**
 * Server-only env for project document uploads and extraction.
 */
export const ProjectDocUploadEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PROJECT_DOC_UPLOAD_BUCKET: z.string().min(1).default('project-documents'),
  PROJECT_DOC_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
})

export type ProjectDocUploadEnv = z.infer<typeof ProjectDocUploadEnvSchema>

export function parseProjectDocUploadEnv(): ProjectDocUploadEnv | null {
  const parsed = ProjectDocUploadEnvSchema.safeParse(process.env)
  return parsed.success ? parsed.data : null
}

export function parseProjectDocUploadEnvStrict(): ProjectDocUploadEnv {
  return ProjectDocUploadEnvSchema.parse(process.env)
}
