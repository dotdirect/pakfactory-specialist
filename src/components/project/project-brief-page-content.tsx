'use client';

import {Suspense, useCallback, useEffect, useState} from 'react';
import {DualPanelLayout} from '@/components/layout/dual-panel-layout';
import {BriefPanel} from '@/components/project/brief-panel';
import {BriefPanelEntrance} from '@/components/project/brief-panel-entrance';
import {ProductDetailSheet} from '@/components/project/product-detail-sheet';
import {ProjectEditSheet} from '@/components/project/project-edit-sheet';
import {ProjectThumbnailRail} from '@/components/project/project-thumbnail-rail';
import {ProgressBar} from '@/components/project/progress-bar';
import {ProjectBriefChatPanel} from '@/components/project/project-brief-chat-panel';
import {Skeleton} from '@/components/ui/skeleton';
import {useBriefStore} from '@/stores/brief-store';
import {STEP_CONFIGS} from '@/lib/steps/step-configs';
import {cn} from '@/lib/utils/cn';
import type {RecommendedProduct} from '@/lib/steps/types';

function RightPanel({
    activeProduct,
    onCloseProduct,
    selectedIds,
    onToggleSelect,
    selectedProjectIndex,
    onSelectProject,
}: {
    activeProduct: RecommendedProduct | null;
    onCloseProduct: () => void;
    selectedIds: Set<string>;
    onToggleSelect: (productId: string) => void;
    selectedProjectIndex: number | null;
    onSelectProject: (index: number | null) => void;
}) {
    const completion = useBriefStore((state) =>
        state.getCompletionPercentage(),
    );
    const currentStep = useBriefStore((state) => state.currentStep);
    const editingProjectIndex = useBriefStore(
        (state) => state.editingProjectIndex,
    );
    const setEditingProjectIndex = useBriefStore(
        (state) => state.setEditingProjectIndex,
    );
    const projectCount = useBriefStore(
        (state) => state.brief?.projects?.length ?? 0,
    );

    const projectNumber = projectCount + 1;
    const stepLabel =
        projectNumber > 1
            ? `Project ${projectNumber} \u2014 ${STEP_CONFIGS[currentStep].label}`
            : STEP_CONFIGS[currentStep].label;
    const isDetailOpen = activeProduct !== null;
    const isEditSheetOpen = editingProjectIndex !== null;

    return (
        <div className="relative flex h-full flex-col gap-4 px-4 md:px-15 overflow-hidden">
            <ProjectThumbnailRail
                selectedProjectIndex={selectedProjectIndex}
                onSelectProject={onSelectProject}
                onEditProject={(index) => setEditingProjectIndex(index)}
                renderDesktop
                renderMobile={false}
                className="absolute right-7 top-9 z-20 "
            />

            {/* Brief panel — pushes back when detail or edit sheet is open */}
            <div
                className={cn(
                    'flex h-full flex-col gap-4 transition-all duration-300 ease-out origin-top md:pr-20',
                    (isDetailOpen || isEditSheetOpen) &&
                        'scale-[0.87] opacity-60 cursor-pointer',
                )}
                onClick={
                    isDetailOpen
                        ? onCloseProduct
                        : isEditSheetOpen
                          ? () => setEditingProjectIndex(null)
                          : undefined
                }
            >
                <div className="shrink-0 pb-0">
                    <ProgressBar value={completion} label={stepLabel} />
                </div>
                <BriefPanelEntrance className="relative flex min-h-0 flex-1 flex-col">
                    <div className="relative flex flex-1 flex-col overflow-hidden rounded-t-xl border border-border/50 bg-card shadow-2xl">
                        <BriefPanel
                            hideProgressBar
                            selectedProjectIndex={selectedProjectIndex}
                            onSelectProject={onSelectProject}
                            onEditProject={(index) =>
                                setEditingProjectIndex(index)
                            }
                        />
                    </div>
                </BriefPanelEntrance>
            </div>

            {/* Product detail overlay — slides up from bottom */}
            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 top-12 px-10 transition-all duration-300 ease-out',
                    isDetailOpen
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-full opacity-0 pointer-events-none',
                )}
            >
                <div className="flex h-full flex-col">
                    {activeProduct && (
                        <ProductDetailSheet
                            product={activeProduct}
                            isSelected={selectedIds.has(
                                activeProduct.productId,
                            )}
                            onToggleSelect={onToggleSelect}
                            onClose={onCloseProduct}
                        />
                    )}
                </div>
            </div>

            {/* Project edit sheet overlay — slides up from bottom */}
            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 top-12 px-10 transition-all duration-300 ease-out',
                    isEditSheetOpen
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-full opacity-0 pointer-events-none',
                )}
            >
                <div className="flex h-full flex-col">
                    {editingProjectIndex !== null && (
                        <ProjectEditSheet
                            index={editingProjectIndex}
                            onClose={() => setEditingProjectIndex(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function PageFallback() {
    return (
        <div className="flex h-[calc(100vh-5rem)] gap-4 p-4">
            <Skeleton className="h-full flex-1 rounded-lg" />
            <Skeleton className="h-full flex-1 rounded-lg" />
        </div>
    );
}

function PageContent() {
    const projectCount = useBriefStore(
        (state) => state.brief?.projects.length ?? 0,
    );
    const [activeProduct, setActiveProduct] =
        useState<RecommendedProduct | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedProjectIndex, setSelectedProjectIndex] = useState<
        number | null
    >(null);

    useEffect(() => {
        if (
            selectedProjectIndex !== null &&
            selectedProjectIndex >= projectCount
        ) {
            setSelectedProjectIndex(null);
        }
    }, [selectedProjectIndex, projectCount]);

    const handleLearnMore = useCallback((product: RecommendedProduct) => {
        setActiveProduct(product);
    }, []);

    const handleCloseProduct = useCallback(() => {
        setActiveProduct(null);
    }, []);

    const handleToggleSelect = useCallback((productId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    }, []);

    return (
        <DualPanelLayout
            leftPanel={
                <ProjectBriefChatPanel
                    flowId="rfq-full"
                    onLearnMore={handleLearnMore}
                />
            }
            rightPanel={
                <RightPanel
                    activeProduct={activeProduct}
                    onCloseProduct={handleCloseProduct}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    selectedProjectIndex={selectedProjectIndex}
                    onSelectProject={setSelectedProjectIndex}
                />
            }
        />
    );
}

export function ProjectBriefPageContent() {
    return (
        <Suspense fallback={<PageFallback />}>
            <PageContent />
        </Suspense>
    );
}
