import type { INDUSTRIES } from '@/lib/tools/capture-project-details'

/**
 * Maps each normalized app industry category to an array of known
 * Pinecone metadata `industry` values that should match.
 *
 * The canonical category name itself is always prepended by
 * `getIndustryFilterValues()`, so it does not need to appear here.
 *
 * Add new aliases when new product data is ingested into Pinecone.
 */
export const INDUSTRY_ALIAS_MAP: Record<(typeof INDUSTRIES)[number], string[]> = {
  Apparel: [
    'Custom Apparel Packaging',
    'Apparel Packaging',
    'Clothing Packaging',
    'Custom Clothing Packaging',
    'Fashion Packaging',
  ],
  Beer: [
    'Custom Beer Packaging',
    'Beer Packaging',
    'Craft Beer Packaging',
    'Brewery Packaging',
    'Beer Boxes',
  ],
  Candle: [
    'Custom Candle Packaging',
    'Candle Packaging',
    'Candle Boxes',
    'Custom Candle Boxes',
  ],
  Chocolate: [
    'Custom Chocolate Packaging',
    'Chocolate Packaging',
    'Chocolate Boxes',
    'Custom Chocolate Boxes',
  ],
  Coffee: [
    'Custom Coffee Packaging',
    'Coffee Packaging',
    'Coffee Boxes',
    'Custom Coffee Boxes',
    'Coffee Bag Packaging',
  ],
  'Cosmetic & Skincare': [
    'Custom Cosmetic Packaging',
    'Cosmetic Packaging',
    'Skincare Packaging',
    'Custom Skincare Packaging',
    'Beauty Packaging',
    'Custom Beauty Packaging',
    'Cosmetic Boxes',
  ],
  Ecommerce: [
    'Custom Ecommerce Packaging',
    'Ecommerce Packaging',
    'E-commerce Packaging',
    'Custom E-commerce Packaging',
    'Shipping Boxes',
    'Mailer Boxes',
  ],
  Electronics: [
    'Custom Electronics Packaging',
    'Electronics Packaging',
    'Tech Packaging',
    'Custom Tech Packaging',
    'Electronics Boxes',
  ],
  'Food & Restaurant': [
    'Custom Food Packaging',
    'Food Packaging',
    'Restaurant Packaging',
    'Custom Restaurant Packaging',
    'Food Boxes',
    'Custom Food Boxes',
    'Takeout Packaging',
  ],
  Game: [
    'Custom Game Packaging',
    'Game Packaging',
    'Board Game Packaging',
    'Custom Board Game Packaging',
    'Game Boxes',
  ],
  'Gift Box': [
    'Custom Gift Packaging',
    'Gift Packaging',
    'Gift Box Packaging',
    'Custom Gift Box Packaging',
    'Gift Boxes',
    'Custom Gift Boxes',
  ],
  'Liquor & Spirits': [
    'Custom Liquor Packaging',
    'Liquor Packaging',
    'Spirits Packaging',
    'Custom Spirits Packaging',
    'Liquor Boxes',
    'Custom Liquor Boxes',
  ],
  Luxury: [
    'Custom Luxury Packaging',
    'Luxury Packaging',
    'Premium Packaging',
    'Custom Premium Packaging',
    'Luxury Boxes',
    'Custom Luxury Boxes',
  ],
  Presentation: [
    'Custom Presentation Packaging',
    'Presentation Packaging',
    'Presentation Boxes',
    'Custom Presentation Boxes',
    'Display Packaging',
  ],
  Soap: [
    'Custom Soap Packaging',
    'Soap Packaging',
    'Soap Boxes',
    'Custom Soap Boxes',
    'Handmade Soap Packaging',
  ],
  Tea: [
    'Custom Tea Packaging',
    'Tea Packaging',
    'Tea Boxes',
    'Custom Tea Boxes',
    'Tea Bag Packaging',
  ],
  Wine: [
    'Custom Wine Packaging',
    'Wine Packaging',
    'Wine Boxes',
    'Custom Wine Boxes',
    'Wine Bottle Packaging',
  ],
}

/**
 * Returns the full `$in` list for a given app industry:
 * the canonical name itself + all known aliases.
 *
 * Unknown industries gracefully return `[industry]`.
 */
export function getIndustryFilterValues(industry: string): string[] {
  const aliases = INDUSTRY_ALIAS_MAP[industry as (typeof INDUSTRIES)[number]]
  if (!aliases) return [industry]
  return [industry, ...aliases]
}
