'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport, isTextUIPart, type UIMessage} from 'ai';
import {toast} from 'sonner';
import {
    useBriefStore,
    type PersistedMessage,
    type SessionRecoveryStatus,
} from '@/stores/brief-store';
import {STEP_CONFIGS} from '@/lib/steps/step-configs';
import type {FlowId, StepId} from '@/lib/steps/types';
import type {BriefEvent} from '@/types/brief-events';
import type {Message, Choice} from '@/types/conversation';
import type {RecommendedProduct} from '@/lib/steps/types';
import {
    getReviewSectionsForFlow,
    type ReviewSectionResult,
} from '@/lib/steps/review-sections';

// ─── Tool output extraction ──────────────────────────────────────────────────

export type RagDebugInfo = {
    query: string;
    industry?: string;
    filterTier: 'alias' | 'none';
    aliasesUsed?: string[];
    products: Array<{name: string; score: number; category: string}>;
};

type StepToolPartData = {
    toolCallId: string;
    events: BriefEvent[];
    nextStep?: string;
    recommendations?: RecommendedProduct[];
    ragDebug?: RagDebugInfo;
    reviewReady?: boolean;
    choices?: Choice[];
};

function extractStepToolPart(part: unknown): StepToolPartData | null {
    if (typeof part !== 'object' || part == null) return null;
    const p = part as Record<string, unknown>;
    if (typeof p.toolCallId !== 'string') return null;
    const state = p.state as string | undefined;
    if (state != null && state !== 'output-available') return null;
    const payload = (p.output ?? p.result) as
        | Record<string, unknown>
        | undefined;
    if (!payload) return null;
    return {
        toolCallId: p.toolCallId,
        events: Array.isArray(payload.events)
            ? (payload.events as BriefEvent[])
            : [],
        nextStep:
            typeof payload.nextStep === 'string' ? payload.nextStep : undefined,
        recommendations: Array.isArray(payload.recommendations)
            ? (payload.recommendations as RecommendedProduct[])
            : undefined,
        ragDebug:
            payload.ragDebug && typeof payload.ragDebug === 'object'
                ? (payload.ragDebug as RagDebugInfo)
                : undefined,
        reviewReady: payload.reviewReady === true ? true : undefined,
        choices: Array.isArray(payload.choices)
            ? (payload.choices as Choice[])
            : undefined,
    };
}

export type RecommendationData = {
    products: RecommendedProduct[];
    messageId: string;
    dismissed?: boolean;
};

export type ReviewData = {
    sections: ReviewSectionResult[];
};

function toPersistedMessage(message: UIMessage): PersistedMessage {
    return {
        id: message.id,
        role: message.role as PersistedMessage['role'],
        content: message.parts
            .filter(isTextUIPart)
            .map((p) => p.text)
            .join(''),
        createdAt: new Date().toISOString(),
    };
}

function persistedToDisplay(m: PersistedMessage): Message {
    return {
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: new Date(m.createdAt),
    };
}

// ─── Welcome-back message builder ────────────────────────────────────────────

function buildWelcomeBackMessage(
    brief: {
        customer?: {firstName?: string; lastName?: string; name?: string};
    } | null,
): Message {
    const firstName =
        brief?.customer?.firstName ||
        brief?.customer?.name?.split(' ')[0] ||
        '';
    const greeting = firstName
        ? `Welcome back, ${firstName}!`
        : 'Welcome back!';

    return {
        id: 'recovery-welcome-back',
        role: 'assistant',
        content: `${greeting} You were in the middle of working on your project brief. Would you like to continue?`,
        createdAt: new Date(),
        metadata: {
            choices: [
                {id: 'continue', label: 'Yes, continue', value: 'continue'},
                {id: 'restart', label: 'Start over', value: 'restart'},
            ],
        },
    };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export type UseBriefChatReturn = {
    messages: Message[];
    handleSend: (content: string) => void;
    isTyping: boolean;
    currentStep: StepId;
    currentFlow: FlowId;
    isSubmitted: boolean;
    recommendationData: RecommendationData | null;
    ragDebug: RagDebugInfo | null;
    handleRecommendationConfirm: (
        selectedProducts: RecommendedProduct[],
    ) => void;
    handleRecommendationSkip: () => void;
    handleRequestMoreRecommendations: () => void;
    hasRequestedMore: boolean;
    handleRequestProjectDetails: () => void;
    reviewData: ReviewData | null;
    pendingChoices: Choice[] | null;
    handleChoiceSelect: (choice: Choice) => void;
    handleManualSubmit: () => void;
    sessionRecovery: SessionRecoveryStatus;
    handleRecoveryChoice: (choice: Choice) => void;
};

export function useBriefChat(flowId: FlowId): UseBriefChatReturn {
    const brief = useBriefStore((s) => s.brief);
    const currentStep = useBriefStore((s) => s.currentStep);
    const currentFlow = useBriefStore((s) => s.currentFlow);
    const initFlow = useBriefStore((s) => s.initFlow);
    const handleBriefEvent = useBriefStore((s) => s.handleBriefEvent);
    const advanceStep = useBriefStore((s) => s.advanceStep);

    // ─── Conversation log — from Zustand store (persisted) ──────────────────
    const conversationLog = useBriefStore((s) => s.conversationLog);
    const storeProcessedToolCallIds = useBriefStore(
        (s) => s.processedToolCallIds,
    );
    const appendToConversationLog = useBriefStore(
        (s) => s.appendToConversationLog,
    );

    // ─── Session recovery ──────────────────────────────────────────────────────
    const sessionRecovery = useBriefStore((s) => s.sessionRecovery);
    const acceptRecovery = useBriefStore((s) => s.acceptRecovery);
    const declineRecovery = useBriefStore((s) => s.declineRecovery);
    const clearSession = useBriefStore((s) => s.clearSession);
    const initializeBrief = useBriefStore((s) => s.initializeBrief);

    // ─── Cached recommendations (from localStorage) ──────────────────────────
    const lastRecommendations = useBriefStore((s) => s.lastRecommendations);
    const lastRagDebug = useBriefStore((s) => s.lastRagDebug);
    const lastRecommendationNextStep = useBriefStore(
        (s) => s.lastRecommendationNextStep,
    );
    const setLastRecommendations = useBriefStore(
        (s) => s.setLastRecommendations,
    );

    // Local ref for processed tool call IDs — seeded from store on mount
    const processedToolCallIds = useRef(
        new Set<string>(storeProcessedToolCallIds),
    );
    // Local ref for logged message IDs — seeded from store on mount
    const loggedMessageIds = useRef(
        new Set<string>(conversationLog.map((m) => m.id)),
    );

    const hasSubmittedRef = useRef(false);
    const addProjectChoiceMade = useRef(false);
    const pendingNextStepRef = useRef<string | undefined>(undefined);
    const autoTriggeredSteps = useRef(new Set<string>());

    const setRagDebugStore = useBriefStore((s) => s.setRagDebug);

    // Recommendation generative UI state
    const [recommendationData, setRecommendationData] =
        useState<RecommendationData | null>(null);
    const [ragDebug, setRagDebug] = useState<RagDebugInfo | null>(null);
    const [hasRequestedMore, setHasRequestedMore] = useState(false);
    const [reviewData, setReviewData] = useState<ReviewData | null>(null);
    const [pendingChoices, setPendingChoices] = useState<Choice[] | null>(null);

    // Initialize flow on mount only (brief initialization is handled by BriefProvider)
    useEffect(() => {
        const state = useBriefStore.getState();
        // Only init flow if it's a fresh session (not recovering)
        if (
            state.sessionRecovery !== 'pending' &&
            state.currentFlow !== flowId
        ) {
            state.initFlow(flowId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Submit lead to n8n when status becomes 'submitted'
    useEffect(() => {
        if (brief?.status !== 'submitted') return;
        if (hasSubmittedRef.current) return;
        hasSubmittedRef.current = true;

        const latestBrief = useBriefStore.getState().brief;
        if (!latestBrief) return;

        fetch('/api/project-brief/submit', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({brief: latestBrief}),
        })
            .then(() => {
                // Clean up localStorage after successful submission
                clearSession();
            })
            .catch((err) => {
                console.error('[use-brief-chat] lead submission failed:', err);
                toast.error('Failed to submit your brief. Please try again.');
            });
    }, [brief?.status, clearSession]);

    const chatId = `${flowId}-${currentStep}`;

    // Build the opening message for this step — shown immediately, no API call needed.
    const initialMessages = useMemo<UIMessage[]>(
        () => [
            {
                id: `opening-${currentStep}`,
                role: 'assistant',
                parts: [
                    {
                        type: 'text',
                        text: STEP_CONFIGS[currentStep].openingMessage,
                        state: 'done',
                    },
                ],
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [currentStep],
    );

    const {messages, sendMessage, status} = useChat({
        id: chatId,
        messages: initialMessages,
        transport: new DefaultChatTransport({
            api: '/api/project-brief',
        }),
    });

    // Restore cached recommendations on recovery — skip RAG entirely.
    // This effect MUST be declared before the auto-trigger so it runs first.
    useEffect(() => {
        if (currentStep !== 'recommend') return;
        if (sessionRecovery === 'pending') return;
        if (!lastRecommendations || lastRecommendations.length === 0) return;
        if (recommendationData) return; // already showing

        // Block the auto-trigger from firing
        autoTriggeredSteps.current.add(currentStep);

        // Restore from cache — no API call
        setRecommendationData({
            products: lastRecommendations,
            messageId: 'cached',
        });
        if (lastRagDebug) {
            setRagDebug(lastRagDebug as RagDebugInfo);
            setRagDebugStore(lastRagDebug as RagDebugInfo);
        }
        pendingNextStepRef.current =
            lastRecommendationNextStep ?? 'product-select';
    }, [
        currentStep,
        sessionRecovery,
        lastRecommendations,
        lastRagDebug,
        lastRecommendationNextStep,
        recommendationData,
        setRagDebugStore,
    ]);

    // Auto-trigger the recommend step — no user input needed, just fetch products immediately.
    useEffect(() => {
        if (currentStep !== 'recommend') return;
        if (autoTriggeredSteps.current.has(currentStep)) return;
        if (status !== 'ready') return;
        // Don't auto-trigger during recovery prompt
        if (sessionRecovery === 'pending') return;

        const timer = setTimeout(() => {
            if (autoTriggeredSteps.current.has(currentStep)) return;
            autoTriggeredSteps.current.add(currentStep);

            const latestBrief = useBriefStore.getState().brief;
            sendMessage(
                {text: 'Find product recommendations for my project.'},
                {
                    body: {
                        stepKey: currentStep,
                        flowId,
                        briefSnapshot: latestBrief,
                    },
                },
            );
        }, 100);

        return () => clearTimeout(timer);
    }, [currentStep, status, sendMessage, flowId, sessionRecovery]);

    // Reset add-project choice guard when the step changes.
    useEffect(() => {
        addProjectChoiceMade.current = false;
    }, [currentStep]);

    // Auto-present choices when entering the add-project step — no AI call needed.
    useEffect(() => {
        if (currentStep !== 'add-project') return;
        if (sessionRecovery === 'pending') return;
        if (pendingChoices) return; // already showing
        if (addProjectChoiceMade.current) return; // user already picked, don't re-show

        setPendingChoices([
            {
                id: 'add-yes',
                label: 'Yes, add another project',
                value: 'Yes, I want to add another project',
            },
            {
                id: 'add-no',
                label: 'No, proceed to review',
                value: 'No, I am ready to review',
            },
        ]);
    }, [currentStep, sessionRecovery, pendingChoices]);

    // Clear auto-trigger tracking when looping back to project-details (so recommend re-triggers).
    useEffect(() => {
        if (currentStep !== 'project-details') return;
        autoTriggeredSteps.current.delete('recommend');
        setRecommendationData(null);
        setRagDebug(null);
    }, [currentStep]);

    // Populate review data immediately when entering the review step — no AI needed.
    useEffect(() => {
        if (currentStep !== 'review') return;
        if (reviewData) return;
        if (sessionRecovery === 'pending') return;

        const latestBrief = useBriefStore.getState().brief;
        const latestFlow = useBriefStore.getState().currentFlow;
        if (latestBrief) {
            const sections = getReviewSectionsForFlow(latestFlow, latestBrief);
            setReviewData({sections});
        }
    }, [currentStep, reviewData, sessionRecovery]);

    // Sync current step's messages into the conversation log (in the store).
    const AUTO_TRIGGER_TEXT = 'Find product recommendations for my project.';
    useEffect(() => {
        // Don't sync messages during recovery prompt
        if (sessionRecovery === 'pending') return;

        const incoming = messages
            .filter((m) => m.role !== 'system')
            .map(toPersistedMessage)
            .filter(
                (m) => !(m.role === 'user' && m.content === AUTO_TRIGGER_TEXT),
            )
            .filter((m) => m.content.trim().length > 0)
            .filter((m) => m.role === 'user' || status === 'ready');

        const newEntries = incoming.filter(
            (m) => !loggedMessageIds.current.has(m.id),
        );
        if (newEntries.length === 0) return;

        for (const m of newEntries) loggedMessageIds.current.add(m.id);
        appendToConversationLog(newEntries);
    }, [messages, status, appendToConversationLog, sessionRecovery]);

    // Process step tool outputs: apply events, then advance
    useEffect(() => {
        for (const message of messages) {
            if (message.role !== 'assistant') continue;
            for (const part of message.parts ?? []) {
                const extracted = extractStepToolPart(part);
                if (!extracted) continue;
                const {
                    toolCallId,
                    events,
                    nextStep,
                    recommendations,
                    ragDebug: toolRagDebug,
                } = extracted;
                if (processedToolCallIds.current.has(toolCallId)) continue;
                processedToolCallIds.current.add(toolCallId);

                for (const event of events) {
                    handleBriefEvent(event);
                }

                // For the recommend step with product cards: delay advancement
                if (recommendations && recommendations.length > 0) {
                    setRecommendationData({
                        products: recommendations,
                        messageId: message.id,
                    });
                    if (toolRagDebug) {
                        setRagDebug(toolRagDebug);
                        setRagDebugStore(toolRagDebug);
                    }
                    pendingNextStepRef.current = nextStep;

                    // Cache recommendations to localStorage so they survive refresh
                    setLastRecommendations(
                        recommendations,
                        toolRagDebug ?? null,
                        nextStep,
                    );

                    continue;
                }

                // Tool returned choices — present them to the user, don't advance
                if (extracted.choices && extracted.choices.length > 0) {
                    setPendingChoices(extracted.choices);
                    pendingNextStepRef.current = nextStep;
                    continue;
                }

                advanceStep(nextStep as StepId | 'submit' | undefined);
            }
        }
    }, [messages, handleBriefEvent, advanceStep, setRagDebugStore]);

    const handleRecommendationConfirm = useCallback(
        (selectedProducts: RecommendedProduct[]) => {
            for (const product of selectedProducts) {
                handleBriefEvent({
                    action: 'brief.product.added',
                    data: {
                        productId: product.productId,
                        productName: product.productName,
                        handle: product.handle,
                        category: product.category,
                        quantity: 1,
                        imageUrl: product.imageUrl,
                    },
                });
            }
            setRecommendationData(null);
            advanceStep(
                (pendingNextStepRef.current as StepId | 'submit') ??
                    'product-select',
            );
            pendingNextStepRef.current = undefined;
        },
        [handleBriefEvent, advanceStep],
    );

    const handleRecommendationSkip = useCallback(() => {
        setRecommendationData((prev) =>
            prev ? {...prev, dismissed: true} : null,
        );
        advanceStep('add-project' as StepId);
        pendingNextStepRef.current = undefined;
    }, [advanceStep]);

    const handleRequestMoreRecommendations = useCallback(() => {
        setRecommendationData(null);
        setHasRequestedMore(true);
        pendingNextStepRef.current = undefined;
        const latestBrief = useBriefStore.getState().brief;
        const latestStep = useBriefStore.getState().currentStep;
        sendMessage(
            {
                text: "I'd like to see more recommendations or different options.",
            },
            {
                body: {
                    stepKey: latestStep,
                    flowId,
                    briefSnapshot: latestBrief,
                },
            },
        );
    }, [sendMessage, flowId]);

    const handleRequestProjectDetails = useCallback(() => {
        setRecommendationData(null);
        pendingNextStepRef.current = undefined;
        const latestBrief = useBriefStore.getState().brief;
        const latestStep = useBriefStore.getState().currentStep;
        sendMessage(
            {
                text: "I'd like to tell you more about my project so you can find better options.",
            },
            {
                body: {
                    stepKey: latestStep,
                    flowId,
                    briefSnapshot: latestBrief,
                },
            },
        );
    }, [sendMessage, flowId]);

    const handleChoiceSelect = useCallback(
        (choice: Choice) => {
            // Prevent the auto-choices effect from re-presenting add-project buttons
            if (useBriefStore.getState().currentStep === 'add-project') {
                addProjectChoiceMade.current = true;
            }
            setPendingChoices(null);
            const latestBrief = useBriefStore.getState().brief;
            const latestStep = useBriefStore.getState().currentStep;
            sendMessage(
                {text: choice.value},
                {
                    body: {
                        stepKey: latestStep,
                        flowId,
                        briefSnapshot: latestBrief,
                    },
                },
            );
        },
        [sendMessage, flowId],
    );

    const handleManualSubmit = useCallback(() => {
        advanceStep('submit');
    }, [advanceStep]);

    const handleSend = useCallback(
        (content: string) => {
            const latestBrief = useBriefStore.getState().brief;
            const latestStep = useBriefStore.getState().currentStep;
            sendMessage(
                {text: content},
                {
                    body: {
                        stepKey: latestStep,
                        flowId,
                        briefSnapshot: latestBrief,
                    },
                },
            );
        },
        [sendMessage, flowId],
    );

    // ─── Recovery choice handler ──────────────────────────────────────────────
    const handleRecoveryChoice = useCallback(
        (choice: Choice) => {
            if (choice.value === 'continue') {
                acceptRecovery();
            } else {
                // Capture customer info before wiping — we already have their name/email
                const savedCustomer = useBriefStore.getState().brief?.customer;

                declineRecovery();

                // Create a fresh brief but carry over the customer data
                const store = useBriefStore.getState();
                store.initializeBrief();
                if (savedCustomer) {
                    store.updateCustomerInfo(savedCustomer);
                }

                // Skip profile step — jump straight to project-details
                useBriefStore.setState({
                    currentStep: 'project-details' as StepId,
                    currentFlow: flowId,
                });

                // Seed the conversation log with the opening message so the chat isn't blank
                const openingMessage: PersistedMessage = {
                    id: `opening-project-details`,
                    role: 'assistant',
                    content: STEP_CONFIGS['project-details'].openingMessage,
                    createdAt: new Date().toISOString(),
                };
                store.appendToConversationLog([openingMessage]);
                loggedMessageIds.current.add(openingMessage.id);
            }
        },
        [acceptRecovery, declineRecovery, flowId],
    );

    const isTyping = status === 'submitted' || status === 'streaming';
    const isSubmitted = brief?.status === 'submitted';

    // ─── Build display messages ───────────────────────────────────────────────
    const displayMessages = useMemo<Message[]>(() => {
        if (sessionRecovery === 'pending') {
            return [buildWelcomeBackMessage(brief)];
        }

        // Convert persisted messages to display messages
        const msgs = conversationLog.map(persistedToDisplay);

        // Attach pending choices to the last message so MessageList renders them
        if (pendingChoices && pendingChoices.length > 0 && msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            msgs[msgs.length - 1] = {
                ...last,
                metadata: {...last.metadata, choices: pendingChoices},
            };
        }

        return msgs;
    }, [sessionRecovery, conversationLog, brief, pendingChoices]);

    return {
        messages: displayMessages,
        handleSend,
        isTyping,
        currentStep,
        currentFlow,
        isSubmitted,
        recommendationData,
        ragDebug,
        handleRecommendationConfirm,
        handleRecommendationSkip,
        handleRequestMoreRecommendations,
        hasRequestedMore,
        handleRequestProjectDetails,
        reviewData,
        pendingChoices,
        handleChoiceSelect,
        handleManualSubmit,
        sessionRecovery,
        handleRecoveryChoice,
    };
}
