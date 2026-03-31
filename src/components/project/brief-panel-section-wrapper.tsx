import {PencilLine} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {CardHeader} from '@/components/ui/card';
import {CardTitle} from '@/components/ui/card';

interface BriefPanelSectionWrapperProps {
    children: React.ReactNode;
    title: string;
    onEdit?: () => void;
}

export function BriefPanelSectionWrapper({
    title,
    children,
    onEdit,
}: BriefPanelSectionWrapperProps) {
    return (
        <div className="flex flex-col">
            <CardHeader className="bg-secondary gap-0 py-4 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                    <CardTitle>{title}</CardTitle>
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onEdit}
                            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <PencilLine className="size-3" />
                            Edit
                        </Button>
                    )}
                </div>
            </CardHeader>
            {children}
        </div>
    );
}
