import type {Metadata, Viewport} from 'next';
import {Inter} from 'next/font/google';
import {ThemeProvider} from 'next-themes';
import {Header} from '@/components/layout/header';
import {AppProviders} from '@/providers/app-providers';
import {Toaster} from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({subsets: ['latin']});

export const metadata: Metadata = {
    title: 'PakSpecialist',
    description: 'Custom packaging quote builder',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem
                    disableTransitionOnChange
                >
                    <AppProviders>
                        <Header />
                        {children}
                        <Toaster />
                    </AppProviders>
                </ThemeProvider>
            </body>
        </html>
    );
}
