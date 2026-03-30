'use client';

import {useState, useCallback} from 'react';
import {Check, Package} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils/cn';
import type {RecommendedProduct} from '@/lib/steps/types';

interface ProductRecommendationCardsProps {
    products: RecommendedProduct[];
    onConfirm: (selected: RecommendedProduct[]) => void;
    onSkip: () => void;
    selectionMode?: 'single' | 'multiple';
}

export function ProductRecommendationCards({
    products,
    onConfirm,
    onSkip,
    selectionMode = 'multiple',
}: ProductRecommendationCardsProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = useCallback(
        (productId: string) => {
            setSelectedIds((prev) => {
                if (selectionMode === 'single') {
                    return prev.has(productId)
                        ? new Set()
                        : new Set([productId]);
                }
                const next = new Set(prev);
                if (next.has(productId)) {
                    next.delete(productId);
                } else {
                    next.add(productId);
                }
                return next;
            });
        },
        [selectionMode],
    );

    const handleConfirm = useCallback(() => {
        const selected = products.filter((p) => selectedIds.has(p.productId));
        onConfirm(selected);
    }, [products, selectedIds, onConfirm]);

    return (
        <div className="flex flex-col gap-3 w-full">
            <p className="text-sm text-muted-foreground">
                {selectionMode === 'single'
                    ? 'Please select the product that best fits your project:'
                    : 'Please select all that apply (you can choose multiple):'}
            </p>

            {products.map((product) => {
                const isSelected = selectedIds.has(product.productId);
                return (
                    <Card
                        key={product.productId}
                        className={cn(
                            'flex flex-row items-start gap-4 p-4 cursor-pointer transition-all shadow-none',
                            isSelected && ' shadow-lg',
                            !isSelected && 'bg-white/50',
                        )}
                        onClick={() => toggleSelect(product.productId)}
                    >
                        {/* Thumbnail */}
                        <div className="shrink-0 size-20 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                            {product.imageUrl ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.productName}
                                    className="size-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove(
                                            'hidden',
                                        );
                                    }}
                                />
                            ) : null}
                            <Package
                                className={cn(
                                    'size-8 text-muted-foreground',
                                    product.imageUrl && 'hidden',
                                )}
                            />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <span className="font-bold text-base leading-tight">
                                {product.productName}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {product.sku && (
                                    <>
                                        <span>SKU: {product.sku}</span>
                                        <span>·</span>
                                    </>
                                )}
                                <span>{product.category}</span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {product.recommendationNote ||
                                    product.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                                <Button
                                    size="sm"
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelect(product.productId);
                                    }}
                                >
                                    {isSelected ? (
                                        <>
                                            <Check className="size-3 mr-1" />
                                            Selected
                                        </>
                                    ) : (
                                        'Select'
                                    )}
                                </Button>
                                <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Learn More
                                </button>
                            </div>
                        </div>
                    </Card>
                );
            })}

            {/* Action bar */}
            <div className="flex items-center gap-3 mt-2">
                {selectedIds.size > 0 && (
                    <Button size="sm" onClick={handleConfirm}>
                        {selectionMode === 'single'
                            ? 'Continue with selection'
                            : `Continue with ${selectedIds.size} selected`}
                    </Button>
                )}
                <Button size="sm" variant="outline" onClick={onSkip}>
                    Skip Selection
                </Button>
                <Button size="sm" variant="outline" disabled>
                    Need more recommendation
                </Button>
            </div>
        </div>
    );
}
