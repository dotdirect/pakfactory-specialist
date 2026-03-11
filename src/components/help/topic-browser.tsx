'use client';

import {Button} from '@/components/ui/button';

const topics = [
    {
        title: 'Getting Started & Getting a Quote',
        items: [
            'How do I get a quote?',
            'Minimum order quantities (MOQs)',
            'Turnaround/production times',
            'Proofing process',
            'Pricing factors and custom options',
        ],
    },
    {
        title: 'Products & Packaging Types',
        items: [
            'Rigid Boxes & Luxury Packaging',
            'Corrugated Boxes & Shipping Mailers',
            'Folding Cartons & Retail Boxes',
            'Paper Bags, Pouches & Flexible Packaging',
            'Inserts, Displays & Accessories',
        ],
    },
    {
        title: 'Materials, Finishes & Custom Options',
        items: [
            'Choosing the right material',
            'Printing methods & special effects',
            'Add-ons & structural upgrades',
            'Certifications & sustainability',
            'Design guidelines & artwork requirements',
        ],
    },
    {
        title: 'Orders, Production & After-Support',
        items: [
            'Order status & tracking',
            'Shipping & handling recommendations',
            'Quality control & returns',
            'Reordering or file management',
            'General account & communication',
        ],
    },
];

interface TopicBrowserProps {
    onTopicSelect: (question: string) => void;
}

export function TopicBrowser({onTopicSelect}: TopicBrowserProps) {
    return (
        <div className="space-y-10">
            <h2 className="text-lg font-semibold">Browse by topic</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
                {topics.map((topic) => (
                    <div key={topic.title}>
                        <h3 className="font-semibold text-sm mb-3">
                            {topic.title}
                        </h3>
                        <ul className="space-y-1.5">
                            {topic.items.map((item) => (
                                <li key={item}>
                                    <Button
                                        variant="link"
                                        className="h-auto p-0 text-sm font-normal text-muted-foreground hover:text-foreground justify-start"
                                        onClick={() => onTopicSelect(item)}
                                    >
                                        {item}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
