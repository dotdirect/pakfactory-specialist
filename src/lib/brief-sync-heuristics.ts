const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/
const NUMBER_PATTERN = /\$?\d[\d,]*(?:\.\d+)?\s*(?:k|m|usd|dollars?)?/i
const WORD_PATTERN = /[a-z]+(?:['-][a-z]+)?/gi

function normalizeText(text: string): string {
  return text.trim().toLowerCase()
}

function getWords(text: string): string[] {
  const withoutEmails = text.replace(EMAIL_PATTERN, ' ')
  return withoutEmails.match(WORD_PATTERN) ?? []
}

function isEmailOnlyMessage(text: string): boolean {
  const normalized = normalizeText(text)
  if (normalized.length === 0) return false
  return EMAIL_PATTERN.test(normalized) && getWords(normalized).length <= 2
}

function likelyHasFirstName(text: string): boolean {
  return getWords(text).length >= 1
}

function likelyHasLastName(text: string): boolean {
  return getWords(text).length >= 2
}

function likelyHasEmail(text: string): boolean {
  return EMAIL_PATTERN.test(text)
}

function likelyHasIndustry(text: string): boolean {
  return normalizeText(text).length >= 3 && !isEmailOnlyMessage(text)
}

function likelyHasProductItem(text: string): boolean {
  const normalized = normalizeText(text)
  return normalized.length >= 3 && !isEmailOnlyMessage(text)
}

function likelyHasBudget(text: string): boolean {
  return NUMBER_PATTERN.test(text)
}

function likelyHasCompany(text: string): boolean {
  return getWords(text).length >= 2 && !isEmailOnlyMessage(text)
}

function likelyHasPhone(text: string): boolean {
  const digits = text.replace(/\D/g, '')
  return digits.length >= 7
}

function likelyHasSummary(text: string): boolean {
  return normalizeText(text).length >= 20
}

export function likelySatisfiesField(field: string, messageText: string): boolean {
  switch (field) {
    case 'customer.firstName':
      return likelyHasFirstName(messageText)
    case 'customer.lastName':
      return likelyHasLastName(messageText)
    case 'customer.email':
      return likelyHasEmail(messageText)
    case 'customer.industry':
      return likelyHasIndustry(messageText)
    case 'customer.company':
      return likelyHasCompany(messageText)
    case 'customer.phone':
      return likelyHasPhone(messageText)
    case 'project.productItem':
      return likelyHasProductItem(messageText)
    case 'project.productLine':
    case 'project.packagingStyle':
      return likelyHasProductItem(messageText)
    case 'project.dimensions':
      return /[0-9]+\s*x\s*[0-9]+\s*x\s*[0-9]+/i.test(messageText)
    case 'project.deliveryCountry':
      return likelyHasIndustry(messageText)
    case 'customer.annualBudget':
      return likelyHasBudget(messageText)
    case 'project.summary':
    case 'project.details':
      return likelyHasSummary(messageText)
    default:
      return normalizeText(messageText).length >= 2
  }
}

const RELEVANT_SYNC_FIELDS = [
  'customer.firstName',
  'customer.lastName',
  'customer.email',
  'customer.company',
  'customer.phone',
  'customer.industry',
  'customer.annualBudget',
  'project.productItem',
  'project.productLine',
  'project.packagingStyle',
  'project.summary',
  'project.details',
  'project.dimensions',
  'project.deliveryCountry',
] as const

function getMissingRequiredFieldsForPhase(currentPhase: string | undefined, missingFields: string[]): string[] {
  if (!currentPhase) return missingFields

  if (currentPhase.startsWith('1.')) {
    const required = ['customer.firstName', 'customer.lastName', 'customer.email']
    return required.filter((field) => missingFields.includes(field))
  }

  if (currentPhase.startsWith('2.')) {
    const required = ['customer.industry', 'project.productItem']
    return required.filter((field) => missingFields.includes(field))
  }

  return missingFields
}

/**
 * Heuristic gate for "must sync this turn" and client fallback.
 * It intentionally favors reliability over strict precision.
 */
export function shouldExpectSyncForMessage(params: {
  currentPhase?: string
  missingFields?: string[]
  messageText: string
}): boolean {
  const messageText = params.messageText.trim()
  if (!messageText) return false

  const missingFields = params.missingFields ?? []
  if (missingFields.length > 0) {
    const requiredMissing = getMissingRequiredFieldsForPhase(params.currentPhase, missingFields)
    if (requiredMissing.length > 0) return requiredMissing.every((field) => likelySatisfiesField(field, messageText))
  }

  return RELEVANT_SYNC_FIELDS.some((field) => likelySatisfiesField(field, messageText))
}

