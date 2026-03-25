'use client';

import Link from 'next/link';
import Image from 'next/image';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {useAuthStore} from '@/hooks/use-auth-store';
import {usePlatformStore} from '@/hooks/use-platform-store';
import {AIGlow} from '@/components/common/ai-glow';

function getDisplayName(name: string | null, email: string | null) {
    if (name) return name;
    if (email) return email;
    return 'Account';
}

function getInitials(name: string | null, email: string | null) {
    const source = name ?? email ?? 'A';
    const parts = source.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return 'A';

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function Header() {
    const status = useAuthStore((state) => state.status);
    const user = useAuthStore((state) => state.user);
    const profile = useAuthStore((state) => state.profile);
    const activeAgent = usePlatformStore((state) => state.activeAgent);

    const displayName = getDisplayName(
        profile?.fullName ?? user?.name ?? null,
        user?.email ?? null,
    );
    const initials = getInitials(
        profile?.fullName ?? user?.name ?? null,
        user?.email ?? null,
    );

    return (
        <header className="bg-background-alt">
            <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-0">
                <Link href="/" className="flex items-center space-x-2">
                    <Image
                        src="/assets/pakfactory-logo.png"
                        alt="PakFactory Logo"
                        width={150}
                        height={100}
                    />
                </Link>

                <nav className="flex items-center gap-4">
                    {status === 'authenticated' && user ? (
                        <div className="flex items-center gap-3">
                            {activeAgent ? (
                                <Badge
                                    variant="secondary"
                                    className="hidden sm:inline-flex"
                                >
                                    {activeAgent}
                                </Badge>
                            ) : null}
                            <div className="flex items-center gap-2">
                                <Avatar size="sm">
                                    {profile?.avatarUrl ? (
                                        <AvatarImage
                                            src={profile.avatarUrl}
                                            alt={displayName}
                                        />
                                    ) : null}
                                    <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                                <span className="hidden text-sm font-medium sm:inline">
                                    {displayName}
                                </span>
                            </div>
                        </div>
                    ) : status === 'loading' ? (
                        <div className="h-10 w-40" />
                    ) : (
                        <>
                            <Link href="/help-center">
                                <Button variant="ghost" size="lg">
                                    Login
                                </Button>
                            </Link>
                            <Link href="/project">
                                <AIGlow trigger="hover" theme="cosmic">
                                    <Button size="lg">Create Account</Button>
                                </AIGlow>
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
