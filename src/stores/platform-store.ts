import {create} from 'zustand';
import {devtools, subscribeWithSelector} from 'zustand/middleware';
import {immer} from 'zustand/middleware/immer';

export const DEFAULT_AGENT_NAME = 'Anthony';

interface PlatformState {
    activeAgent: string | null;
    setActiveAgent: (name: string | null) => void;
    resetPlatform: () => void;
}

export const usePlatformStore = create<PlatformState>()(
    devtools(
        subscribeWithSelector(
            immer((set) => ({
                activeAgent: DEFAULT_AGENT_NAME,

                setActiveAgent: (name) => {
                    set((state) => {
                        state.activeAgent = name;
                    });
                },

                resetPlatform: () => {
                    set((state) => {
                        state.activeAgent = DEFAULT_AGENT_NAME;
                    });
                },
            })),
        ),
        {name: 'platform-store'},
    ),
);
