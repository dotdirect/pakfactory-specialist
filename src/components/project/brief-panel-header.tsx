import type {TechnicalBrief} from '@/types/brief';
import {RevealOnUpdate} from '@/components/common/reveal-on-update';
import {Separator} from '@/components/ui/separator';
import Image from 'next/image';

export function BriefPanelHeader({brief}: {brief: TechnicalBrief}) {
    const preparedFor =
        brief.customer?.firstName || brief.customer?.lastName
            ? `${brief.customer?.firstName ?? ''} ${brief.customer?.lastName ?? ''}`.trim()
            : 'Guest';
    const email = brief.customer?.email ?? 'N/A';
    const dateStr = new Date().toLocaleDateString();

    console.log(brief);
    const hasCustomerIdentity = Boolean(
        brief.customer?.firstName?.trim() &&
        brief.customer?.lastName?.trim() &&
        brief.customer?.email?.trim(),
    );

    return (
        <div className="flex flex-col gap-3 @min-[700px]:flex-row @min-[700px]:items-center @min-[700px]:justify-between">
            <div className="flex items-center gap-2">
                <Image
                    src="/assets/pakfactory-logo.png"
                    alt="PakFactory Logo"
                    width={150}
                    height={150}
                />
                <span className="text-sm text-gray-300">|</span>
                <h2 className="text-lg text-grey-300">Project Brief</h2>
            </div>

            <div className="flex items-center gap-4 text-sm @min-[700px]:gap-10">
                <RevealOnUpdate
                    show={hasCustomerIdentity}
                    className="text-xs text-muted-foreground"
                >
                    <div className="flex flex-col gap-1">
                        <span className="font-medium">Prepared For</span>

                        {preparedFor}
                    </div>
                </RevealOnUpdate>
                <Separator orientation="vertical" />
                <RevealOnUpdate
                    show={hasCustomerIdentity}
                    className="text-xs text-muted-foreground"
                >
                    <div className="flex flex-col gap-1">
                        <span className="font-medium">Email</span>

                        {email}
                    </div>
                </RevealOnUpdate>
                <Separator orientation="vertical" className="hidden @min-[700px]:block" />
                <RevealOnUpdate
                    show={true}
                    className="text-xs text-muted-foreground"
                >
                    <div className="hidden flex-col gap-1 @min-[700px]:flex">
                        <span className="font-medium">Date</span>
                        {dateStr}
                    </div>
                </RevealOnUpdate>
            </div>
        </div>
    );
}
