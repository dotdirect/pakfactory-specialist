import {CardHeader} from '@/components/ui/card';
import {CardTitle} from '@/components/ui/card';
export function BriefPanelSectionWrapper({
    title,
    children,
}: {
    children: React.ReactNode;
    title: string;
}) {
    return (
        <div className="flex flex-col">
            <CardHeader className="bg-secondary gap-0 py-4 rounded-lg mb-4">
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            {children}
        </div>
    );
}
