'use client';

import {useState} from 'react';
import {ArrowLeft, Check, X, Package} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useBriefStore} from '@/stores/brief-store';
import type {ProjectEntry} from '@/types/brief';
import type {ProjectContext, Billing} from '@/types/brief';

// ─── Field row helper ────────────────────────────────────────────────────────

function FieldRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-[120px_1fr] items-start gap-2">
            <label className="text-xs text-muted-foreground pt-2 whitespace-nowrap">
                {label}
            </label>
            {children}
        </div>
    );
}

// ─── Project details edit ───────────────────────────────────────────────────

function ProjectDetailsEdit({
    project,
    onChange,
}: {
    project: ProjectContext | undefined;
    onChange: (p: ProjectContext) => void;
}) {
    const [productItem, setProductItem] = useState(
        project?.productItem ?? '',
    );
    const [deliveryCountry, setDeliveryCountry] = useState(
        project?.deliveryCountry ?? '',
    );
    const [summary, setSummary] = useState(project?.summary ?? '');

    const handleBlur = () => {
        onChange({
            ...project,
            productItem: productItem.trim() || undefined,
            deliveryCountry: deliveryCountry.trim() || undefined,
            summary: summary.trim() || undefined,
        });
    };

    return (
        <div className="space-y-3">
            <FieldRow label="Packaging Item">
                <Input
                    value={productItem}
                    onChange={(e) => setProductItem(e.target.value)}
                    onBlur={handleBlur}
                    className="h-8 text-sm"
                />
            </FieldRow>
            <FieldRow label="Delivery Country">
                <Input
                    value={deliveryCountry}
                    onChange={(e) => setDeliveryCountry(e.target.value)}
                    onBlur={handleBlur}
                    className="h-8 text-sm"
                />
            </FieldRow>
            <FieldRow label="Summary">
                <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    onBlur={handleBlur}
                    className="min-h-[80px] text-sm"
                />
            </FieldRow>
        </div>
    );
}

// ─── Billing edit ───────────────────────────────────────────────────────────

function BillingEdit({
    billing,
    onChange,
}: {
    billing: Billing | undefined;
    onChange: (b: Billing) => void;
}) {
    const [street, setStreet] = useState(billing?.street ?? '');
    const [city, setCity] = useState(billing?.city ?? '');
    const [stateProvince, setStateProvince] = useState(
        billing?.stateProvince ?? '',
    );
    const [postalCode, setPostalCode] = useState(billing?.postalCode ?? '');
    const [country, setCountry] = useState(billing?.country ?? '');

    const handleBlur = () => {
        onChange({
            street: street.trim() || undefined,
            city: city.trim() || undefined,
            stateProvince: stateProvince.trim() || undefined,
            postalCode: postalCode.trim() || undefined,
            country: country.trim() || undefined,
        });
    };

    return (
        <div className="space-y-3">
            <FieldRow label="Street">
                <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    onBlur={handleBlur}
                    className="h-8 text-sm"
                />
            </FieldRow>
            <FieldRow label="City">
                <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={handleBlur}
                    className="h-8 text-sm"
                />
            </FieldRow>
            <FieldRow label="State/Province">
                <Input
                    value={stateProvince}
                    onChange={(e) => setStateProvince(e.target.value)}
                    onBlur={handleBlur}
                    className="h-8 text-sm"
                />
            </FieldRow>
            <FieldRow label="Postal Code">
                <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    onBlur={handleBlur}
                    className="h-8 text-sm"
                />
            </FieldRow>
            <FieldRow label="Country">
                <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    onBlur={handleBlur}
                    className="h-8 text-sm"
                />
            </FieldRow>
        </div>
    );
}

// ─── Line items display ─────────────────────────────────────────────────────

function LineItemsList({entry}: {entry: ProjectEntry}) {
    if (entry.lineItems.length === 0) {
        return (
            <p className="text-sm text-muted-foreground italic">
                No products selected.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {entry.lineItems.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-md border border-border/50 p-2"
                >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted/50">
                        {item.imageUrl ? (
                            <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="size-full rounded object-cover"
                            />
                        ) : (
                            <Package className="size-4 text-muted-foreground" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                            {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {[
                                item.category,
                                item.quantities?.length
                                    ? `Qty: ${item.quantities.join(', ')}`
                                    : item.quantity > 1
                                      ? `Qty: ${item.quantity}`
                                      : null,
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Main sheet component ───────────────────────────────────────────────────

interface ProjectEditSheetProps {
    index: number;
    onClose: () => void;
}

export function ProjectEditSheet({index, onClose}: ProjectEditSheetProps) {
    const entry = useBriefStore((s) => s.brief?.projects[index]);
    const updateArchivedProject = useBriefStore(
        (s) => s.updateArchivedProject,
    );
    const persistSession = useBriefStore((s) => s.persistSession);

    // Local draft of edits — committed on save
    const [projectDraft, setProjectDraft] = useState<
        ProjectContext | undefined
    >(entry?.project);
    const [billingDraft, setBillingDraft] = useState<Billing | undefined>(
        entry?.billing,
    );

    if (!entry) return null;

    const productName = entry.project?.productItem ?? 'Untitled Project';

    const handleSave = () => {
        updateArchivedProject(index, {
            project: projectDraft,
            billing: billingDraft,
        });
        persistSession();
        onClose();
    };

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
                <span className="text-sm font-medium">
                    Project {index + 1} — {productName}
                </span>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Project Details */}
                <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Project Details
                    </h3>
                    <ProjectDetailsEdit
                        project={projectDraft}
                        onChange={setProjectDraft}
                    />
                </section>

                {/* Selected Products (read-only) */}
                <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Selected Products
                    </h3>
                    <LineItemsList entry={entry} />
                </section>

                {/* Billing */}
                <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Billing & Shipping
                    </h3>
                    <BillingEdit
                        billing={billingDraft}
                        onChange={setBillingDraft}
                    />
                </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t px-5 py-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="gap-1"
                >
                    <X className="size-3.5" />
                    Cancel
                </Button>
                <Button size="sm" onClick={handleSave} className="gap-1">
                    <Check className="size-3.5" />
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
