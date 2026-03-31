'use client';

import {ArrowLeft, Check, ExternalLink, Package} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {RecommendedProduct} from '@/lib/steps/types';

interface ProductDetailSheetProps {
    product: RecommendedProduct;
    isSelected: boolean;
    onToggleSelect: (productId: string) => void;
    onClose: () => void;
}

// ─── Metadata field categories ──────────────────────────────────────────────

/** Internal / technical fields — never shown. */
const INTERNAL_KEYS = new Set([
    'productId',
    'product_id',
    'id',
    'productName',
    'product_name',
    'name',
    'title',
    'description',
    'shortDescription',
    'descriptionSnippet',
    'body',
    'text',
    'chunk_text',
    'imageUrl',
    'image_url',
    'primaryImageUrl',
    'image',
    'thumbnail',
    'handle',
    'slug',
    'url',
    'productUrl',
    'sku',
    'SKU',
    'product_sku',
    'variant_sku',
    'score',
    'category',
    'type',
    'productType',
    'source',
    'blobType',
    'status',
    'vendor',
    'loc.lines.from',
    'loc.lines.to',
    'productGroupingID',
    'updatedAT',
]);

/** Product spec fields — shown in the specs grid. */
const SPEC_FIELDS: {key: string; label: string}[] = [
    {key: 'productLine', label: 'Product Line'},
    {key: 'collection', label: 'Collection'},
    {key: 'productCollection', label: 'Product Collection'},
    {key: 'industry', label: 'Industry'},
    {key: 'productMoq', label: 'Min. Order Qty'},
    {key: 'material', label: 'Material'},
    {key: 'shape', label: 'Shape'},
    {key: 'style', label: 'Style'},
    {key: 'structureType', label: 'Structure Type'},
];

/** Capability fields — shown in capabilities section. */
const CAPABILITY_FIELDS: {key: string; label: string}[] = [
    {key: 'capabilityMaterials', label: 'Materials'},
    {key: 'capabilityFinishes', label: 'Finishes'},
    {key: 'capabilityPrinting', label: 'Printing'},
    {key: 'capabilityInks', label: 'Inks'},
    {key: 'capabilityAddOns', label: 'Add-Ons'},
    {key: 'capabilityCertifications', label: 'Certifications'},
];

function formatMetadataKey(key: string): string {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProductDetailSheet({
    product,
    isSelected,
    onToggleSelect,
    onClose,
}: ProductDetailSheetProps) {
    const m = product.metadata ?? {};

    const specs = SPEC_FIELDS.map(({key, label}) => ({
        label,
        value: m[key],
    })).filter((s): s is {label: string; value: string} => !!s.value);

    const capabilities = CAPABILITY_FIELDS.map(({key, label}) => ({
        label,
        value: m[key],
    })).filter((c): c is {label: string; value: string} => !!c.value);

    const knownKeys = new Set([
        ...INTERNAL_KEYS,
        ...SPEC_FIELDS.map((f) => f.key),
        ...CAPABILITY_FIELDS.map((f) => f.key),
    ]);
    const extraMetadata = (Object.entries(m) as [string, string][]).filter(
        ([key, val]) => !knownKeys.has(key) && val.length > 0,
    );

    // Gallery: find extra image URLs in metadata
    const galleryImages: string[] = [];
    for (const [key, val] of Object.entries(m) as [string, string][]) {
        if (
            ![
                'imageUrl',
                'image_url',
                'primaryImageUrl',
                'image',
                'thumbnail',
            ].includes(key) &&
            (key.toLowerCase().includes('image') ||
                key.toLowerCase().includes('photo')) &&
            val.startsWith('http')
        ) {
            galleryImages.push(val);
        }
    }

    const productPageUrl =
        m['productUrl'] ||
        (product.handle?.startsWith('http')
            ? product.handle
            : product.handle
              ? `https://www.pakfactory.com/products/${product.handle}`
              : null);

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-t-xl border border-border/50 bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-5 py-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="size-5" />
                </button>
                <span className="text-sm font-medium text-muted-foreground">
                    Back to recommendations
                </span>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
                {/* Hero: 1/3 image left + 2/3 info right */}
                <div className="flex flex-col sm:flex-row gap-6 p-6">
                    {/* Product image — 1/3 */}
                    <div className="w-full sm:w-4/3 aspect-square rounded-lg bg-muted/40 flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                            <img
                                src={product.imageUrl}
                                alt={product.productName}
                                className="size-full object-contain"
                            />
                        ) : (
                            <Package className="size-16 text-muted-foreground" />
                        )}
                    </div>

                    {/* Product info — 2/3 */}
                    <div className=" flex flex-col gap-2 px-4 sm:px-0">
                        {product.sku && (
                            <span className="text-xs text-muted-foreground">
                                {product.sku}
                            </span>
                        )}
                        <h2 className="text-xl font-bold leading-tight">
                            {product.productName}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                            {product.description}
                        </p>

                        {/* Specs grid */}
                        {specs.length > 0 && (
                            <div className="grid grid-cols-3 gap-x-4 gap-y-2 mt-3">
                                {specs.map(({label, value}) => (
                                    <div key={label} className="flex flex-col">
                                        <span className="text-[11px] text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="text-xs font-medium">
                                            {value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Why this is good for you */}
                        {product.recommendationNote && (
                            <div className="mt-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                    Why This Is a Great Fit
                                </h3>
                                <p className="text-sm leading-relaxed">
                                    {product.recommendationNote}
                                </p>
                            </div>
                        )}

                        {/* Capabilities */}
                        {capabilities.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                    Capabilities
                                </h3>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                    {capabilities.map(({label, value}) => (
                                        <div
                                            key={label}
                                            className="flex flex-col"
                                        >
                                            <span className="text-[11px] text-muted-foreground">
                                                {label}
                                            </span>
                                            <span className="text-xs font-medium">
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extra metadata */}
                        {extraMetadata.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                    Additional Info
                                </h3>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                    {extraMetadata.map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="flex flex-col"
                                        >
                                            <span className="text-[11px] text-muted-foreground">
                                                {formatMetadataKey(key)}
                                            </span>
                                            <span className="text-xs font-medium">
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Gallery thumbnails */}
                {galleryImages.length > 0 && (
                    <div className="flex gap-3 px-6 pb-5">
                        {galleryImages.map((url, i) => (
                            <div
                                key={i}
                                className="size-20 shrink-0 rounded-md bg-muted overflow-hidden"
                            >
                                <img
                                    src={url}
                                    alt={`${product.productName} view ${i + 2}`}
                                    className="size-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-4 border-t px-6 py-4">
                <Button
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => onToggleSelect(product.productId)}
                >
                    {isSelected ? (
                        <>
                            <Check className="size-3.5 mr-1.5" />
                            Selected
                        </>
                    ) : (
                        'Select'
                    )}
                </Button>
                {productPageUrl && (
                    <a
                        href={productPageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Go to product page
                        <ExternalLink className="size-3.5" />
                    </a>
                )}
            </div>
        </div>
    );
}
