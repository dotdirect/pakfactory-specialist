'use client';

import {useState} from 'react';
import {Skeleton} from '@/components/ui/skeleton';
import {BriefPanelEntrance} from '@/components/project/brief-panel-entrance';
import {BriefPanelSectionWrapper} from '@/components/project/brief-panel-section-wrapper';
import {BriefPanelProjectDetail} from '@/components/project/brief-panel-project-detail';
import {BriefSectionEditForm} from '@/components/project/brief-section-edit-form';
import {useBriefStore} from '@/stores/brief-store';
import {
    getReviewSectionsForFlow,
    type ReviewSectionResult,
} from '@/lib/steps/review-sections';
import type {TechnicalBrief} from '@/types/brief';

// ─── Section field renderer ─────────────────────────────────────────────────

function SectionFields({fields}: {fields: ReviewSectionResult['fields']}) {
    return (
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {fields.map((field, i) => (
                <div key={i} className="contents">
                    <span className="text-muted-foreground whitespace-nowrap">
                        {field.label}
                    </span>
                    <span className="text-foreground wrap-break-word">
                        {field.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Placeholder shown during profile step or when no sections have data ────

function BodyPlaceholder({message}: {message?: string}) {
    return (
        <div className="relative min-h-[calc(75vh)] rounded-lg overflow-hidden">
            <Skeleton className="absolute inset-0 " />
            <div className="absolute inset-0 flex items-start justify-center pt-16 px-6">
                <p className="text-lg italic text-center text-muted-foreground">
                    {message ??
                        'Your brief will be built as we continue the conversation.'}
                </p>
            </div>
        </div>
    );
}

// ─── Editable section IDs ───────────────────────────────────────────────────

const EDITABLE_SECTIONS = new Set(['contact', 'project', 'billing']);

// ─── Main body component ────────────────────────────────────────────────────

interface BriefPanelBodyProps {
    selectedProjectIndex: number | null;
}

function getPreviewBrief(
    brief: TechnicalBrief,
    selectedProjectIndex: number | null,
    isReviewStep: boolean,
): TechnicalBrief {
    if (selectedProjectIndex !== null) {
        const selectedProject = brief.projects[selectedProjectIndex];
        if (!selectedProject) return brief;
        // Keep customer/meta context from the active brief while previewing
        // project-scoped sections from the selected archived project.
        return {
            ...brief,
            project: selectedProject.project,
            lineItems: selectedProject.lineItems,
            billing: selectedProject.billing,
            projects: [],
        };
    }

    // During flow (not review), hide the projects array so the rich
    // BriefPanelProjectDetail component renders instead of the flat all-projects section.
    if (!isReviewStep) {
        return {...brief, projects: []};
    }

    return brief;
}

export function BriefPanelBody({selectedProjectIndex}: BriefPanelBodyProps) {
    const brief = useBriefStore((s) => s.brief);
    const currentStep = useBriefStore((s) => s.currentStep);
    const currentFlow = useBriefStore((s) => s.currentFlow);
    const [editingSection, setEditingSection] = useState<string | null>(null);

    const isReviewStep = currentStep === 'review';

    if (!brief || currentStep === 'profile') {
        return <BodyPlaceholder />;
    }

    const displayBrief = getPreviewBrief(brief, selectedProjectIndex, isReviewStep);
    const sections = getReviewSectionsForFlow(currentFlow, displayBrief).filter(
        (s) => s.id !== 'contact',
    );

    if (sections.length === 0) {
        return (
            <BodyPlaceholder message="Details will appear as they're collected..." />
        );
    }

    return (
        <div className="space-y-4">
            {sections.map((section, i) => (
                <BriefPanelEntrance key={section.id} delayMs={i * 100}>
                    <BriefPanelSectionWrapper
                        title={section.label}
                        onEdit={
                            isReviewStep &&
                            selectedProjectIndex === null &&
                            EDITABLE_SECTIONS.has(section.id)
                                ? () => setEditingSection(section.id)
                                : undefined
                        }
                    >
                        {editingSection === section.id ? (
                            <BriefSectionEditForm
                                sectionId={section.id}
                                onDone={() => setEditingSection(null)}
                            />
                        ) : section.id === 'project' ? (
                            <BriefPanelProjectDetail brief={displayBrief} />
                        ) : (
                            <SectionFields fields={section.fields} />
                        )}
                    </BriefPanelSectionWrapper>
                </BriefPanelEntrance>
            ))}
        </div>
    );
}
