'use client';

import {Check, Package, Pencil} from 'lucide-react';
import {useBriefStore} from '@/stores/brief-store';
import {cn} from '@/lib/utils/cn';
import type {ProjectEntry} from '@/types/brief';

const EMPTY_PROJECTS: readonly ProjectEntry[] = [];

// ─── Single thumbnail card ─────────────────────────────────────────────────

function Thumbnail({
    index,
    entry,
    isActive,
    onSelect,
    onEdit,
}: {
    index: number;
    entry: ProjectEntry;
    isActive: boolean;
    onSelect: () => void;
    onEdit: () => void;
}) {
    const productName = entry.project?.productItem ?? 'Untitled';
    const itemCount = entry.lineItems.length;

    return (
        <>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    'relative flex flex-col items-center gap-0.5 rounded-md  bg-card p-4 py-5 cursor-pointer transition-all ',
                    // Desktop: vertical card
                    'w-20 shrink-0',
                    // Mobile: horizontal card
                    'md:w-20',
                    isActive
                        ? 'border-muted-foreground shadow-2xl'
                        : 'opacity-50 hover:opacity-100 hover:shadow-xl transition-opacity duration-100',
                )}
            >
                {/* Mini icon */}
                <div
                    className={cn(
                        'mx-auto flex size-7 items-center justify-center rounded bg-muted/60',
                        isActive && 'bg-primary/10',
                    )}
                >
                    <Package className="size-3.5 text-muted-foreground" />
                </div>

                {/* Project number */}
                <div>
                    <span className="mt-0.5 block text-[10px] font-medium leading-tight text-foreground">
                        P{index + 1}
                    </span>

                    {/* Product name (truncated) */}
                    <span className="block w-full truncate text-center text-[8px] leading-tight text-muted-foreground">
                        {productName}
                    </span>
                </div>

                {/* Pulsing dot for active */}
                {isActive && (
                    <div className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary animate-pulse z-40" />
                )}
            </button>

            {/* <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-5 items-center gap-1 rounded border border-border/60 bg-background px-1.5 text-[8px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Edit project ${index + 1}`}
            >
                <Pencil className="size-2.5" />
                Edit
            </button> */}

            {/* Item count badge */}
            {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                    {itemCount}
                </span>
            )}

            {/* Checkmark for completed projects */}
            {/* <div className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-green-500 text-white">
                <Check className="size-2.5" />
            </div> */}
        </>
    );
}

// ─── Current project thumbnail (in-progress) ───────────────────────────────

function CurrentProjectThumbnail({
    index,
    isActive,
    onSelect,
}: {
    index: number;
    isActive: boolean;
    onSelect: () => void;
}) {
    const project = useBriefStore((s) => s.brief?.project);
    const productName = project?.productItem ?? 'Current';

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'relative flex flex-col items-center gap-0.5 rounded-md  bg-card p-4 py-5 cursor-pointer transition-all',
                // Desktop: vertical card
                'w-20 shrink-0',
                // Mobile: horizontal card
                'md:w-20',
                isActive
                    ? 'border-muted-foreground shadow-2xl'
                    : 'opacity-50 hover:opacity-100 hover:shadow-xl transition-opacity duration-100',
            )}
        >
            <div
                className={cn(
                    'flex size-7 items-center justify-center rounded',
                    isActive ? 'bg-primary/10' : 'bg-muted/40',
                )}
            >
                <Package className="size-3.5 text-muted-foreground" />
            </div>
            <span className="text-[10px] font-medium leading-tight text-foreground">
                P{index + 1}
            </span>
            <span className="w-full truncate text-center text-[8px] leading-tight text-muted-foreground">
                {/* {productName} */}
                In progress...
            </span>

            {/* Pulsing dot for active */}
            {isActive && (
                <div className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary animate-pulse z-40" />
            )}
        </button>
    );
}

// ─── Main rail component ────────────────────────────────────────────────────

interface ProjectThumbnailRailProps {
    selectedProjectIndex: number | null;
    onSelectProject: (index: number | null) => void;
    onEditProject: (index: number) => void;
    renderDesktop?: boolean;
    renderMobile?: boolean;
    className?: string;
}

export function ProjectThumbnailRail({
    selectedProjectIndex,
    onSelectProject,
    onEditProject,
    renderDesktop = true,
    renderMobile = true,
    className,
}: ProjectThumbnailRailProps) {
    const projects = useBriefStore((s) => s.brief?.projects ?? EMPTY_PROJECTS);
    const currentStep = useBriefStore((s) => s.currentStep);

    // Don't show rail until at least one project has been archived
    if (projects.length === 0) return null;

    const isOnReviewOrLater =
        currentStep === 'review' || currentStep === 'add-project';
    const showCurrentProject = !isOnReviewOrLater;

    return (
        <>
            {renderDesktop && (
                <div className={cn('gap-5 flex flex-col pt-3', className)}>
                    {projects.map((entry, i) => (
                        <Thumbnail
                            key={entry.id}
                            index={i}
                            entry={entry}
                            isActive={selectedProjectIndex === i}
                            onSelect={() => onSelectProject(i)}
                            onEdit={() => onEditProject(i)}
                        />
                    ))}
                    {showCurrentProject && (
                        <CurrentProjectThumbnail
                            index={projects.length}
                            isActive={selectedProjectIndex === null}
                            onSelect={() => onSelectProject(null)}
                        />
                    )}
                </div>
            )}

            {renderMobile && (
                <div className="flex md:hidden overflow-x-auto gap-2 border-b border-border/30  py-5 px-3 z-50">
                    {projects.map((entry, i) => (
                        <Thumbnail
                            key={entry.id}
                            index={i}
                            entry={entry}
                            isActive={selectedProjectIndex === i}
                            onSelect={() => onSelectProject(i)}
                            onEdit={() => onEditProject(i)}
                        />
                    ))}
                    {showCurrentProject && (
                        <CurrentProjectThumbnail
                            index={projects.length}
                            isActive={selectedProjectIndex === null}
                            onSelect={() => onSelectProject(null)}
                        />
                    )}
                </div>
            )}
        </>
    );
}
