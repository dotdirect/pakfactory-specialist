import type {TechnicalBrief} from '@/types/brief';
import {Card, CardContent, CardTitle} from '@/components/ui/card';
import {RevealOnUpdate} from '@/components/common/reveal-on-update';

interface BriefPanelProjectDetailProps {
    brief: TechnicalBrief;
}

export function BriefPanelProjectDetail({brief}: BriefPanelProjectDetailProps) {
    const packagingItem = brief.project?.productItem
        ? `${brief.project?.productItem ?? ''}`.trim()
        : 'N/A';
    const industry = brief.customer?.industry ?? 'N/A';

    return (
        <Card className="border-none shadow-none display-flex flex-row grid-cols-2 gap-1 items-start">
            <img
                src="https://avatar.vercel.sh/shadcn1"
                alt="Event cover"
                className="relative aspect-square  w-1/3 object-cover background-green-100 dark:brightness-40 rounded-lg "
            />
            <CardContent className="w-full flex flex-col gap-4">
                <CardTitle className="text-sm">Project Detail</CardTitle>
                <div className="flex items-center gap-2 text-sm md:gap-10">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs  text-gray-400">
                            Packaging Item
                        </span>
                        <RevealOnUpdate
                            show={true}
                            className="text-xs text-muted-foreground font-semibold"
                        >
                            {packagingItem}
                        </RevealOnUpdate>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs  text-gray-400">Industry</span>
                        <RevealOnUpdate
                            show={true}
                            className="text-xs text-muted-foreground font-semibold"
                        >
                            {industry}
                        </RevealOnUpdate>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs  text-gray-400">
                        Quick Summary
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Bonbon oat cake marzipan fruitcake jujubes bonbon.
                        Chocolate cake oat cake chupa chups oat cake chupa
                        chups. Gingerbread pudding soufflé pastry sweet danish
                        chupa chups. Candy canes candy lollipop cake apple pie
                        gummies marshmallow. Chocolate cake sugar plum bear claw
                        chocolate cake croissant jujubes bear claw jelly
                        marzipan. Wafer icing tiramisu pie tootsie roll gummi
                        bears croissant cupcake. Biscuit gummies donut candy
                        canes macaroon. Cotton candy wafer oat cake caramels
                        jujubes candy pie jelly. Brownie pie halvah chocolate
                        topping jelly pudding dragée. Sweet roll gingerbread
                        dessert bear claw oat cake cupcake shortbread. Ice cream
                        lemon drops soufflé tart chupa chups gummi bears
                        caramels. Macaroon tart croissant lollipop soufflé
                        shortbread soufflé wafer. Powder sweet bear claw tart
                        chupa chups. Jelly beans topping topping croissant
                        sweet. Fruitcake caramels tiramisu cake halvah ice
                        cream. Cake pudding cotton candy muffin cupcake. Sesame
                        snaps pudding jelly-o shortbread jujubes jujubes
                        chocolate cake.
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
