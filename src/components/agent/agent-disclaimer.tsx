import {usePlatformStore} from '@/stores/platform-store';

export function AgentDisclaimer() {
    return (
        <p className="text-xs text-muted-foreground w-full text-center">
            {usePlatformStore.getState().activeAgent} our AI Specialist can make
            mistakes. Consider checking important information.
        </p>
    );
}
