"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from "next/navigation";
import { useGameState } from "@/context/GameStateContext";
import { 
    ConflictResult, 
    EventCardDefinition, 
    ActionCardInstance, 
    PlacedActor, 
    OpponentData, 
    MarketOffer,
    ActorType
} from "@/lib/modules/core/types";
import { EVENTS, LOCATIONS, ACTION_CARDS, ALLOWED_MOVES } from '@/data/gameConstants';
import { formatLog } from '@/lib/logUtils';
import { pickRandomEvent, resolveCompareEvent, resolveDiscardEvent } from '@/lib/modules/actions/eventLogic';
import { getActorRewardType, calculateReward } from '@/lib/modules/resources/resourceManager';
import { initOpponentData } from '@/lib/modules/player/playerManager';

// --- Types for internal hook state ---
interface PlayerConflictContextType {
    actorId: string;
    moves: { playerId: string, targetLocId: string, choice?: string }[];
}

export const MY_ACTORS = [
    { id: "a1", type: "politician", avatar: "/actors/Polotican.png", headAvatar: "/actors/Politican_head.png", name: "Politician" },
    { id: "a3", type: "scientist", avatar: "/actors/Scientist.png", headAvatar: "/actors/Scientist_head.png", name: "Scientist" },
    { id: "a4", type: "artist", avatar: "/actors/Artist.png", headAvatar: "/actors/Artist_head.png", name: "Artist" },
    { id: "a2", type: "robot", avatar: "/actors/Robot.png", headAvatar: "/actors/Robot_head.png", name: "Robot" }
];

const PLAYERS = [
    { id: 'p2', name: 'Viper', avatar: '/avatars/viper.png', color: '#ff4444' },
    { id: 'p3', name: 'Ghost', avatar: '/avatars/ghost.png', color: '#44ff44' },
    { id: 'p4', name: 'Union', avatar: '/avatars/ghost.png', color: '#4444ff' },
];

export function useBoardSession() {
    const { id } = useParams();
    const router = useRouter();
    const { resources, updateResource, setResources, player } = useGameState();

    // --- Core Game State ---
    const [game, setGame] = useState<any>(null);
    const [phase, setPhase] = useState(2);
    const [turn, setTurn] = useState(1);
    const [placedActors, setPlacedActors] = useState<PlacedActor[]>([]);
    const [disabledLocations, setDisabledLocations] = useState<string[]>([]);
    const [locationsBlockedBy, setLocationsBlockedBy] = useState<Record<string, string>>({});
    const [actionDiscardPile, setActionDiscardPile] = useState<ActionCardInstance[]>([]);
    const [eventDiscardPile, setEventDiscardPile] = useState<EventCardDefinition[]>([]);
    const [localEventDeckCount, setLocalEventDeckCount] = useState<number | null>(null);
    const [localActionDeckCount, setLocalActionDeckCount] = useState<number | null>(null);
    const [opponentsReady, setOpponentsReady] = useState(false);
    const [opponentsData, setOpponentsData] = useState<Record<string, OpponentData>>({});
    const [isGameOver, setIsGameOver] = useState(false);
    const [isTieBreakerScreen, setIsTieBreakerScreen] = useState(false);
    const [tieWinners, setTieWinners] = useState<{ id: string, name: string, vp: number }[]>([]);
    const [isWaitingForTieBreaker, setIsWaitingForTieBreaker] = useState(false);
    const [activeConflictLocId, setActiveConflictLocId] = useState<string | null>(null);
    const [resolvedConflicts, setResolvedConflicts] = useState<string[]>([]);
    // Derive localPlayerId — try citizenId first, then address, then match against server game.players
    const localPlayerId = useMemo(() => {
        const fromContext = (player.citizenId && player.citizenId !== '0000') ? player.citizenId : (player.address || '');
        if (fromContext) return fromContext;
        // Fallback: try to find ourselves in the server game.players list by name
        if (game && game !== '404' && game.players) {
            const match = game.players.find((p: any) =>
                (p.citizenId && p.citizenId !== '0000' && p.citizenId === player.citizenId) ||
                (p.address && p.address === player.address) ||
                (p.name && p.name === player.name)
            );
            if (match) return match.citizenId || match.address || match.id;
        }
        return 'p1';
    }, [player.citizenId, player.address, player.name, game]);

    // --- Phase 1: Event State ---
    const [currentEvent, setCurrentEvent] = useState<EventCardDefinition | null>(null);
    const [discardAmount, setDiscardAmount] = useState(0);
    const [eventResult, setEventResult] = useState<{ msg: string; win: boolean; winnerName?: string; rewardLabel?: string; isTie?: boolean; tieParticipants?: string[] } | null>(null);
    const [eventTieBreakerActive, setEventTieBreakerActive] = useState<{ conflict: any } | null>(null);

    // --- Phase 2: Placement State ---
    const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
    const [hoveredActorId, setHoveredActorId] = useState<string | null>(null);
    const [selectedHex, setSelectedHex] = useState<string | null>(null);
    const [isWaiting, setIsWaiting] = useState(false);
    const [pendingPlacement, setPendingPlacement] = useState<{ actorId: string, locId: string } | null>(null);
    const [pendingRsp, setPendingRsp] = useState<string | null>(null);

    // --- Phase 3: Action State ---
    const [p3Step, setP3Step] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [selectedActionCards, setSelectedActionCards] = useState<Record<string, number>>({});
    const [actionHand, setActionHand] = useState<ActionCardInstance[]>([]);
    const [relocationSource, setRelocationSource] = useState<string | null>(null);
    const [pendingRelocations, setPendingRelocations] = useState<{ playerId: string, actorId: string, targetLocId: string }[]>([]);
    const [exchangeStep, setExchangeStep] = useState<0 | 1 | 2>(0);
    const [exchangeSourceValue, setExchangeSourceValue] = useState<string | null>(null);
    const [exchangeTargetPlayer, setExchangeTargetPlayer] = useState<string | null>(null);
    const [exchangeTargetValue, setExchangeTargetValue] = useState<string | null>(null);
    const [currentExchangeIndex, setCurrentExchangeIndex] = useState<number>(0); 
    const [pendingExchanges, setPendingExchanges] = useState<any[]>([]);
    const [p3Step1Ready, setP3Step1Ready] = useState(false);
    const [opponentsP3Step1Ready, setOpponentsP3Step1Ready] = useState<Record<string, boolean>>({});
    const [exchangeDone, setExchangeDone] = useState(false);
    const [exchangeResults, setExchangeResults] = useState<any[] | null>(null);
    const [relocResults, setRelocResults] = useState<any[] | null>(null);
    const [playerConflictContext, setPlayerConflictContext] = useState<PlayerConflictContextType | null>(null);

    // --- Phase 3 Step 3: Initialize exchange when entering CHANGE VALUES step ---
    useEffect(() => {
        if (phase === 3 && p3Step === 3 && exchangeStep === 0) {
            setExchangeStep(1);
        }
        // Reset exchange state when leaving step 3
        if (p3Step !== 3 && exchangeStep !== 0) {
            setExchangeStep(0);
            setExchangeSourceValue(null);
            setExchangeTargetPlayer(null);
            setExchangeTargetValue(null);
        }
        if (p3Step !== 3) {
            setExchangeResults(null);
        }
    }, [phase, p3Step, exchangeStep]);

    // --- Phase 3 Step 2: Reset relocation state when leaving step 2 ---
    useEffect(() => {
        if (p3Step !== 2) {
            setRelocationSource(null);
            setPendingRelocations([]);
        }
    }, [p3Step]);

    // --- Phase 5: Market State ---
    const [p5Step, setP5Step] = useState<1 | 2 | 3>(1);
    const [playerMarketOffer, setPlayerMarketOffer] = useState<MarketOffer | null>(null);
    const [botMarketOffers, setBotMarketOffers] = useState<{ [id: string]: MarketOffer | null }>({});
    const [marketMatchId, setMarketMatchId] = useState<string | null>(null);

    // --- UI/Misc State ---
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isWaitingForPlayers, setIsWaitingForPlayers] = useState(false);
    const [triggerGlobalPhaseAdvance, setTriggerGlobalPhaseAdvance] = useState(0);

    // --- Derived Memos ---
    const dynamicPlayers = useMemo(() => {
        const mainPlayer = {
            id: localPlayerId,
            name: player.name || '080',
            avatar: player.avatar || '/avatars/golden_avatar.png',
            address: player.address
        };

        if (!game) return [mainPlayer, PLAYERS[0], PLAYERS[1]];

        const activeIds = game.gameState?.activePlayerIds;
        const isTieMode = game.gameState?.isTieBreaker;

        const allJoined = game.players.map((p: any, index: number) => ({
            ...p,
            id: p.citizenId || p.address || p.id || `bot-${index + 1}`,
            name: p.name || PLAYERS[index]?.name || 'Citizen',
            avatar: p.avatar || PLAYERS[index]?.avatar || '/avatars/ghost.png'
        }));

        const filteredJoined = (isTieMode && activeIds)
            ? allJoined.filter((p: any) => activeIds.includes(p.id))
            : allJoined;

        const otherPlayers = filteredJoined.filter((p: any) => p.id !== localPlayerId);

        const finalPlayers = filteredJoined.some((p: any) => p.id === localPlayerId)
            ? [mainPlayer, ...otherPlayers]
            : otherPlayers;

        if (game?.isBotGame && finalPlayers.length < 3 && !isTieMode) {
            if (finalPlayers.length === 1) finalPlayers.push(PLAYERS[0], PLAYERS[1]);
            else if (finalPlayers.length === 2) finalPlayers.push(PLAYERS[1]);
        }

        return finalPlayers;
    }, [player.citizenId, player.address, player.name, player.avatar, game?.players, game?.gameState?.activePlayerIds, game?.gameState?.isTieBreaker, game?.isBotGame, localPlayerId]);

    // --- Refs ---
    const isDrawingRef = useRef(false);
    const lastResetTurnRef = useRef(0);
    const stopPollingRef = useRef(false);
    const localPhaseTicker = useRef(0);
    const botActionCommitsRef = useRef<Record<string, number[]>>({});
    const botCardSelectionsRef = useRef<Record<string, any>>({});
    const botPhase2TriggeredRef = useRef('');

    // --- Handlers (Pre-defined for use in Effect) ---
    const addLog = useCallback(async (msg: string) => {
        if (!id || !game || game === '404') return;
        const displayId = game.displayId || game.id || id as string;
        const formattedMsg = formatLog(displayId, msg);
        
        setGame((prev: any) => (prev === '404' ? prev : {
            ...prev,
            logs: [...(prev?.logs || []), formattedMsg]
        }));

        try {
            await fetch(`/api/games/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add-log', message: msg })
            });
        } catch (e) { console.error("Failed to sync log", e); }
    }, [id, game]);

    const handleNextPhaseWrapper = useCallback(async (skipResolution = false) => {
        const { handleNextPhase } = await import('@/lib/game/PhaseEngine');

        const playerSteps: number[] = [];
        Object.entries(selectedActionCards).forEach(([cid, qty]) => {
            if ((qty as number) <= 0) return;
            const card = actionHand.find(c => c.id === cid);
            if (!card) return;
            // Classify card into Phase 3 sub-steps by type/properties
            if (card.type === 'turn off location' || card.disables) playerSteps.push(1);
            else if ((card.title || '').toLowerCase().includes('relocation')) playerSteps.push(2);
            else if ((card.title || '').toLowerCase().includes('change') || (card.title || '').toLowerCase().includes('exchange')) playerSteps.push(3);
        });

        const finalCommits: Record<string, number[]> = { [localPlayerId]: Array.from(new Set(playerSteps)) };

        // If player has no action cards at Step 0, skip Phase 3 entirely
        // (run all bot steps automatically, then advance to Phase 4)
        if (phase === 3 && p3Step === 0 && actionHand.length === 0 && playerSteps.length === 0 && game?.isBotGame) {
            const { decideBotCardSelection, getBotInventory, triggerBotPhase3Actions } = await import('@/lib/game/BotAI');
            const opponents = dynamicPlayers.filter((p: any) => p.id !== localPlayerId);
            const botSelections: Record<string, any> = {};
            const botCommits: Record<string, number[]> = {};
            for (const opp of opponents) {
                const botInv = getBotInventory(opponentsData, opp.id);
                if (botInv.length === 0) { botCommits[opp.id] = []; continue; }
                const hasBlock = botInv.some((c: any) => c.type === 'turn off location' && c.disables);
                const decision = decideBotCardSelection(botInv, hasBlock);
                botSelections[opp.id] = decision;
                botCommits[opp.id] = decision.steps;
            }
            // Run all bot steps silently
            for (const step of [1, 2, 3]) {
                const anyBotHasStep = Object.values(botCommits).some(steps => Array.isArray(steps) && steps.includes(step));
                if (anyBotHasStep) {
                    await triggerBotPhase3Actions(
                        game, step, opponents, placedActors, addLog,
                        setDisabledLocations, setPlacedActors, setOpponentsReady,
                        setPendingRelocations, botCommits,
                        opponentsData, setOpponentsData, localPlayerId, resources,
                        botSelections, setActionDiscardPile, setLocationsBlockedBy
                    );
                }
            }
            addLog("ACTION PHASE CONCLUDED (no player cards)");
            // Advance directly to Phase 4
            const playerWithResources = { ...player, localResources: resources };
            const playersWithResources = dynamicPlayers.map((p: any) => ({
                ...p, resources: opponentsData[p.id]?.resources || p.resources || {}
            }));
            // Pass p3Step=4 so PhaseEngine skips all sub-steps
            const { isGameOver: gameEnded, winners: finalWinners, newPhase, newTurn } = handleNextPhase(
                turn, phase, 4 as any, playerWithResources, playersWithResources, placedActors, disabledLocations,
                addLog, async () => {}, setPhase, setP3Step, setP5Step,
                setTurn, setPlacedActors, setResolvedConflicts, setDisabledLocations,
                setOpponentsReady, { [localPlayerId]: [], ...botCommits }, game?.isBotGame
            );
            if (gameEnded) {
                setIsGameOver(true);
                await fetch(`/api/games/${id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update', updates: { status: 'finished' } })
                });
                return;
            }
            if (game && id) {
                await fetch(`/api/games/${id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sync-turn', citizenId: localPlayerId, resources, currentPhase: newPhase, turn: newTurn, clearBoard: newTurn !== turn })
                });
            }
            return;
        }

        // Bot card selection at Step 0 — decide which cards each bot will play
        if (phase === 3 && p3Step === 0 && game?.isBotGame) {
            const { decideBotCardSelection, getBotInventory } = await import('@/lib/game/BotAI');
            const opponents = dynamicPlayers.filter((p: any) => p.id !== localPlayerId);
            botCardSelectionsRef.current = {};
            botActionCommitsRef.current = {};
            for (const opp of opponents) {
                const botInv = getBotInventory(opponentsData, opp.id);
                if (botInv.length === 0) {
                    botActionCommitsRef.current[opp.id] = [];
                    continue;
                }
                const hasBlock = botInv.some((c: any) => c.type === 'turn off location' && c.disables);
                const decision = decideBotCardSelection(botInv, hasBlock);
                botCardSelectionsRef.current[opp.id] = decision;
                botActionCommitsRef.current[opp.id] = decision.steps;
            }
        }

        Object.assign(finalCommits, botActionCommitsRef.current);

        // Apply player's block cards to disabledLocations when committing Step 0
        if (phase === 3 && p3Step === 0) {
            const playerBlockLocations: string[] = [];
            Object.entries(selectedActionCards).forEach(([cid, qty]) => {
                if ((qty as number) <= 0) return;
                const card = actionHand.find(c => c.id === cid);
                if (card && card.disables) {
                    playerBlockLocations.push(card.disables);
                }
            });
            if (playerBlockLocations.length > 0) {
                setDisabledLocations(prev => [...prev, ...playerBlockLocations]);
                const playerDisplayName = player.name || 'You';
                setLocationsBlockedBy(prev => {
                    const updates: Record<string, string> = {};
                    playerBlockLocations.forEach(locId => { updates[locId] = playerDisplayName; });
                    return { ...prev, ...updates };
                });
                // PvP: sync block card disabled locations to server
                if (!game?.isBotGame && id) {
                    fetch(`/api/games/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'sync-disabled-locations',
                            citizenId: localPlayerId,
                            disabledLocations: playerBlockLocations
                        })
                    }).catch(console.error);
                }
            }
        }

        const botP3Trigger = async (step: number) => {
            const { triggerBotPhase3Actions } = await import('@/lib/game/BotAI');
            const opponents = dynamicPlayers.filter((p: any) => p.id !== localPlayerId);
            await triggerBotPhase3Actions(
                game, step, opponents, placedActors, addLog,
                setDisabledLocations, setPlacedActors, setOpponentsReady,
                setPendingRelocations, botActionCommitsRef.current,
                opponentsData, setOpponentsData, localPlayerId, resources,
                botCardSelectionsRef.current, setActionDiscardPile, setLocationsBlockedBy
            );
        };

        // Attach local resources to player and opponents so PhaseEngine can read them for VP calculation
        const playerWithResources = { ...player, localResources: resources };
        const playersWithResources = dynamicPlayers.map((p: any) => ({
            ...p,
            resources: opponentsData[p.id]?.resources || p.resources || {}
        }));

        const { isGameOver: gameEnded, winners: finalWinners, newPhase, newTurn } = handleNextPhase(
            turn, phase, p3Step, playerWithResources, playersWithResources, placedActors, disabledLocations,
            addLog, botP3Trigger, setPhase, setP3Step, setP5Step,
            setTurn, setPlacedActors, setResolvedConflicts, setDisabledLocations,
            setOpponentsReady, finalCommits, game?.isBotGame
        );

        // Discard played action cards when Phase 3 ends (transitioning to Phase 4+)
        if (phase === 3 && newPhase >= 4) {
            const playedCardIds = Object.entries(selectedActionCards)
                .filter(([, qty]) => (qty as number) > 0)
                .map(([cid]) => cid);
            if (playedCardIds.length > 0) {
                const playedCards = actionHand.filter(c => playedCardIds.includes(c.id));
                setActionHand(prev => prev.filter(c => !playedCardIds.includes(c.id)));
                setActionDiscardPile(prev => [...prev, ...playedCards]);
                setSelectedActionCards({});
            }
        }

        if (gameEnded) {
            setIsGameOver(true);
            await fetch(`/api/games/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', updates: { status: 'finished' } })
            });
            return;
        }

        if (game && id) {
            if (game.isBotGame) {
                // Bot game: sync-turn (no consensus needed)
                await fetch(`/api/games/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'sync-turn',
                        citizenId: localPlayerId,
                        resources: resources,
                        currentPhase: newPhase,
                        turn: newTurn,
                        clearBoard: newTurn !== turn
                    })
                });
            } else {
                // PvP: signal phase-ready and wait for consensus
                setIsWaitingForPlayers(true);
                await fetch(`/api/games/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'phase-ready',
                        citizenId: localPlayerId,
                        resources: resources,
                        inventory: actionHand,
                        nextPhase: newPhase,
                        nextTurn: newTurn,
                        clearBoard: newTurn !== turn,
                        disabledLocations: disabledLocations
                    })
                });
            }
        }
    }, [id, phase, turn, p3Step, player, dynamicPlayers, placedActors, disabledLocations, resources, actionHand, selectedActionCards, localPlayerId, addLog, game]);

    // --- Polling & Fetch Logic ---
    useEffect(() => {
        if (!id) return;
        stopPollingRef.current = false;

        const fetchGame = async () => {
            if (stopPollingRef.current) return;
            try {
                const res = await fetch(`/api/games/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setGame((prev: any) => {
                        if (prev === '404') return prev;

                        const prevStagedStr = JSON.stringify(prev?.gameState?.stagedActors || {});
                        const nextStagedStr = JSON.stringify(data?.gameState?.stagedActors || {});
                        const prevReadyStr = JSON.stringify(prev?.gameState?.playerReady || {});
                        const nextReadyStr = JSON.stringify(data?.gameState?.playerReady || {});
                        const prevResourcesStr = JSON.stringify(prev?.gameState?.playerResources || {});
                        const nextResourcesStr = JSON.stringify(data?.gameState?.playerResources || {});
                        const prevDisabledStr = JSON.stringify(prev?.gameState?.disabledLocations || []);
                        const nextDisabledStr = JSON.stringify(data?.gameState?.disabledLocations || []);

                        if (
                            prev &&
                            prev.gameState?.phaseTicker === data.gameState?.phaseTicker &&
                            prev.players?.length === data.players?.length &&
                            prevStagedStr === nextStagedStr &&
                            prevReadyStr === nextReadyStr &&
                            prevResourcesStr === nextResourcesStr &&
                            prevDisabledStr === nextDisabledStr &&
                            prev.gameState?.currentEventId === data.gameState?.currentEventId
                        ) {
                            return prev;
                        }
                        return data;
                    });
                } else if (res.status === 404) {
                    stopPollingRef.current = true;
                    setGame('404');
                }
            } catch (e) { console.error("Fetch game error", e); }
        };

        fetchGame();
        const interval = setInterval(() => { if (!stopPollingRef.current) fetchGame(); }, 3000);
        return () => {
            stopPollingRef.current = true;
            clearInterval(interval);
        };
    }, [id]);

    const availableActors = useMemo(() => {
        // Only filter out actors placed by the LOCAL player (other players use the same actor IDs)
        return MY_ACTORS.filter(a => !placedActors.find(p => p.actorId === a.id && p.playerId === localPlayerId));
    }, [placedActors, localPlayerId]);

    const usedRSPs = useMemo(() => {
        return placedActors.filter(p => p.playerId === localPlayerId).map(p => p.type || '');
    }, [placedActors, localPlayerId]);

    const relocationCardsCount = useMemo(() => {
        return actionHand.filter(c => (c.title || '').toLowerCase().includes('relocation')).length;
    }, [actionHand]);

    const selectedRelocationCount = useMemo(() => {
        return actionHand.filter(c => (c.title || '').toLowerCase().includes('relocation') && (selectedActionCards[c.id] || 0) > 0).length;
    }, [actionHand, selectedActionCards]);

    const remainingRelocations = useMemo(() => {
        return Math.max(0, selectedRelocationCount - pendingRelocations.filter(r => r.playerId === localPlayerId).length);
    }, [selectedRelocationCount, pendingRelocations, localPlayerId]);

    const exchangeCardsCount = useMemo(() => {
        return actionHand.filter(c => (c.title || '').toLowerCase().includes('exchange') || (c.title || '').toLowerCase().includes('change')).length;
    }, [actionHand]);

    const activeConflicts = useMemo(() => {
        if (phase !== 4) return [];

        const locsWithActors: { [key: string]: any[] } = {};
        placedActors.forEach(p => {
            if (!locsWithActors[p.locId]) locsWithActors[p.locId] = [];
            locsWithActors[p.locId].push(p);
        });

        const conflicts: any[] = [];
        Object.entries(locsWithActors).forEach(([locId, actors]) => {
            if (!disabledLocations.includes(locId)) {
                const actorTypesAtLoc = Array.from(new Set(actors.map(a => (a.actorType || a.type || 'unknown').toLowerCase())));

                actorTypesAtLoc.forEach(actorType => {
                    const actorsOfType = actors.filter(a => (a.actorType || a.type || '').toLowerCase() === actorType);
                    const locDef = LOCATIONS.find(l => l.id === locId);
                    const uniqueConflictId = `${locId}_${actorType}`;

                    if (conflicts.find(c => c.locId === uniqueConflictId)) return;

                    const playerActorRaw = actorsOfType.find(a => a.playerId === localPlayerId) || actorsOfType[0];
                    const opponentsRaw = actorsOfType.filter(a => a.actorId !== playerActorRaw.actorId);

                    const playerActorSource = MY_ACTORS.find(p => p.id === playerActorRaw.actorId) ||
                        { avatar: playerActorRaw.avatar, headAvatar: playerActorRaw.headAvatar, type: actorType, name: playerActorRaw.name };

                    const playerActor = {
                        ...playerActorRaw,
                        avatar: playerActorRaw.avatar || (playerActorSource as any)?.avatar || '',
                        headAvatar: (playerActorRaw as any).headAvatar || (playerActorSource as any)?.headAvatar || '',
                        type: (playerActorRaw as any).type || 'rock', 
                        actorType: actorType
                    };

                    conflicts.push({
                        locId: uniqueConflictId,
                        realLocId: locId,
                        locationName: locDef?.name || locId,
                        playerActor,
                        opponents: opponentsRaw.map(o => ({
                            ...o,
                            name: dynamicPlayers.find((p: any) => p.id === o.playerId)?.name || o.ownerName || 'Unknown',
                            playerAvatar: dynamicPlayers.find((p: any) => p.id === o.playerId)?.avatar || o.ownerAvatar || '',
                            actorType: actorType,
                            avatar: o.avatar || '',
                            headAvatar: (o as any).headAvatar || ''
                        })),
                        resourceType: locDef?.resource || 'fame',
                        isPeaceful: opponentsRaw.length === 0,
                        hasPlayer: actorsOfType.some(a => a.playerId === localPlayerId)
                    });
                });
            }
        });
        return conflicts;
    }, [phase, placedActors, disabledLocations, dynamicPlayers, localPlayerId]);

    const stickyConflicts = useMemo(() => {
        return phase === 4 ? activeConflicts : [];
    }, [phase, activeConflicts]);

    const victoryPoints = useMemo(() => {
        return (resources as any).fame || 0;
    }, [resources]);

    // --- Synchronization Effect ---
    useEffect(() => {
        if (!game || !game.gameState) return;
        const myId = localPlayerId;
        
        // For test/bot games, the client is the source of truth for resources and inventory.
        // Server data is stale (only synced at phase transitions) and would overwrite
        // values earned in Phase 4 conflicts and items bought in Phase 5 market.
        if (!game.isBotGame) {
            if (game.gameState.playerResources && game.gameState.playerResources[myId] && !isWaitingForPlayers) {
                const serverResources = game.gameState.playerResources[myId];
                const isDifferent = Object.keys(serverResources).some(k => (serverResources as any)[k] !== (resources as any)[k]);
                if (isDifferent) setResources(serverResources);
            }

            if (game.gameState.playerInventories && game.gameState.playerInventories[myId] && !isWaitingForPlayers) {
                const serverInventory = game.gameState.playerInventories[myId];
                const isDifferent = serverInventory.length !== actionHand.length ||
                                    serverInventory.some((c: any, i: number) => c.instanceId !== actionHand[i]?.instanceId);
                if (isDifferent) setActionHand(serverInventory);
            }

            if (game.gameState.discardPile && game.gameState.discardPile.length !== actionDiscardPile.length && !isWaitingForPlayers) {
                setActionDiscardPile(game.gameState.discardPile);
            }
        }

        // Only sync disabledLocations from server for PvP games.
        // In bot games, the client is the source of truth for disabledLocations
        // (set locally when block cards are played at Phase 3 Step 0).
        if (!game.isBotGame && game.gameState.disabledLocations) {
            const serverDisabled = game.gameState.disabledLocations;
            if (serverDisabled.length !== disabledLocations.length || serverDisabled.some((l: string) => !disabledLocations.includes(l))) {
                setDisabledLocations(serverDisabled);
            }
        }

        // PvP: sync opponent resources from server
        if (!game.isBotGame && game.gameState.playerResources) {
            const serverResources = game.gameState.playerResources;
            setOpponentsData(prev => {
                let changed = false;
                const next = { ...prev };
                Object.keys(serverResources).forEach(pid => {
                    if (pid === myId) return; // Skip self
                    const serverRes = serverResources[pid];
                    if (!serverRes) return;
                    const existing = prev[pid];
                    if (!existing) {
                        // Initialize opponent data
                        const playerInfo = game.players.find((p: any) => (p.citizenId || p.address) === pid);
                        next[pid] = {
                            resources: serverRes,
                            inventory: game.gameState?.playerInventories?.[pid] || [],
                            name: playerInfo?.name || 'Player',
                            avatar: playerInfo?.avatar || ''
                        } as any;
                        changed = true;
                    } else {
                        // Update if different
                        const isDiff = Object.keys(serverRes).some(k => serverRes[k] !== (existing.resources as any)?.[k]);
                        if (isDiff) {
                            next[pid] = { ...existing, resources: serverRes };
                            changed = true;
                        }
                    }
                });
                return changed ? next : prev;
            });
        }

        // PvP: sync event from server if we don't have it yet
        if (!game.isBotGame && game.gameState.currentEventId && !currentEvent) {
            const eventDef = EVENTS.find(e => e.id === game.gameState!.currentEventId);
            if (eventDef) {
                setCurrentEvent(eventDef as EventCardDefinition);
                setEventResult(null);
                setDiscardAmount(0);
            }
        }

        if (game.gameState.phaseTicker > localPhaseTicker.current) {
            localPhaseTicker.current = game.gameState.phaseTicker;
            setIsWaitingForPlayers(false);
            const serverPhase = game.gameState.currentPhase;
            const serverTurn = game.gameState.turn;
            if (serverPhase !== undefined && serverTurn !== undefined) {
                setPhase(serverPhase);
                setTurn(serverTurn);
            } else {
                setTriggerGlobalPhaseAdvance(prev => prev + 1);
            }
        }

        // Sync placed actors from server — skip entirely for bot games,
        // because bot actors are placed client-side and the server has no record of them.
        // Only sync actors from server in PvP games where both players store their placements.
        const skipActorSync = game.isBotGame;
        if (!skipActorSync) {
            let allStagedActors: any[] = [];
            Object.values(game.gameState.stagedActors || {}).forEach((actors: any) => {
                allStagedActors = [...allStagedActors, ...actors];
            });

            setPlacedActors(prev => {
                // Include playerId in comparison for PvP (both players use same actor IDs)
                const toKey = (a: any) => `${a.playerId}:${a.actorId}:${a.locId}`;
                const prevKey = prev.map(toKey).sort().join(',');
                const nextKey = allStagedActors.map(toKey).sort().join(',');
                if (prevKey === nextKey) return prev;
                return allStagedActors;
            });
        }

        if (game.gameState.p3Step !== undefined && game.gameState.p3Step !== p3Step) {
            setP3Step(game.gameState.p3Step);
        }
    }, [game?.gameState, isWaitingForPlayers, localPlayerId, resources, actionHand, actionDiscardPile, disabledLocations, p3Step, phase, setResources]);

    // Reset locationsBlockedBy when disabledLocations is cleared (new turn)
    useEffect(() => {
        if (disabledLocations.length === 0) {
            setLocationsBlockedBy({});
        }
    }, [disabledLocations]);

    // --- Phase 1 (Event) and Phase 2 (Distribution) initialization ---
    useEffect(() => {
        if (!game || game === '404') return;
        if (phase !== 1 && phase !== 2) return;

        const key = `${turn}-${phase}`;
        if (botPhase2TriggeredRef.current === key) return;
        botPhase2TriggeredRef.current = key;

        if (phase === 1) {
            // Turn 1 skips Phase 1 per rules; Turn 2+ draws an Event Card
            if (turn > 1) {
                if (game.isBotGame) {
                    // Bot game: draw client-side, excluding already-discarded cards
                    const discardedIds = eventDiscardPile.map(e => e.id);
                    const drawnEvent = pickRandomEvent(discardedIds);
                    // If all cards were discarded, deck reshuffled — clear the discard pile
                    if (discardedIds.length >= EVENTS.length) {
                        setEventDiscardPile([]);
                    }
                    setCurrentEvent(drawnEvent);
                    setEventResult(null);
                    setDiscardAmount(0);
                    setLocalEventDeckCount(prev => prev !== null ? Math.max(0, prev - 1) : prev);
                } else {
                    // PvP: draw from server-managed deck
                    const drawFromServer = async () => {
                        try {
                            const res = await fetch(`/api/games/${id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'draw-event', citizenId: localPlayerId })
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.eventId) {
                                    const eventDef = EVENTS.find(e => e.id === data.eventId);
                                    if (eventDef) {
                                        setCurrentEvent(eventDef as EventCardDefinition);
                                        setEventResult(null);
                                        setDiscardAmount(0);
                                        setLocalEventDeckCount(prev => prev !== null ? Math.max(0, prev - 1) : prev);
                                    }
                                }
                            }
                        } catch (e) { console.error("Failed to draw event from server", e); }
                    };
                    drawFromServer();
                }
            }
            if (game.isBotGame) setOpponentsReady(true);
            return;
        }

        // Phase 2: trigger bot opponent placements (only for bot games)
        if (game.isBotGame) {
            const trigger = async () => {
                const { triggerOpponentPlacements } = await import('@/lib/game/BotAI');
                await triggerOpponentPlacements(
                    game,
                    [],
                    dynamicPlayers.filter((p: any) => p.id !== localPlayerId),
                    setOpponentsReady,
                    setPlacedActors,
                    setOpponentsData,
                    addLog,
                    opponentsData
                );
            };
            trigger();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.isBotGame, game?.id, phase, turn]);

    // --- Initialize bot/opponent resources when game loads ---
    useEffect(() => {
        if (!game || game === '404') return;
        // Only initialize once (when opponentsData is empty)
        if (Object.keys(opponentsData).length > 0) return;
        const initial = initOpponentData(game, localPlayerId) as unknown as Record<string, OpponentData>;
        if (Object.keys(initial).length > 0) {
            setOpponentsData(initial);
        }
    }, [game, localPlayerId, opponentsData]);

    // --- Initialize local deck counts from server state ---
    useEffect(() => {
        if (!game || game === '404') return;
        if (localEventDeckCount === null && game.gameState?.eventDeck?.length !== undefined) {
            setLocalEventDeckCount(game.gameState.eventDeck.length);
        }
        if (localActionDeckCount === null && game.gameState?.actionDeck?.length !== undefined) {
            setLocalActionDeckCount(game.gameState.actionDeck.length);
        }
    }, [game, localEventDeckCount, localActionDeckCount]);

    // --- Phase 5: Bot market buying ---
    const botMarketTriggeredRef = useRef('');
    useEffect(() => {
        if (!game?.isBotGame || phase !== 5) return;
        const key = `${turn}-${phase}`;
        if (botMarketTriggeredRef.current === key) return;
        botMarketTriggeredRef.current = key;
        const trigger = async () => {
            const { botMarketBuy } = await import('@/lib/game/BotAI');
            const opponents = dynamicPlayers.filter((p: any) => p.id !== localPlayerId);
            botMarketBuy(opponentsData, opponents, setOpponentsData, addLog, setLocalActionDeckCount);
        };
        trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.isBotGame, phase, turn]);

    // --- Phase 4: Auto-resolve bot-only conflicts when entering Phase 4 ---
    const botConflictsTriggeredRef = useRef('');
    useEffect(() => {
        if (!game?.isBotGame || phase !== 4) return;
        const key = `${turn}-${phase}`;
        if (botConflictsTriggeredRef.current === key) return;
        botConflictsTriggeredRef.current = key;
        const resolve = async () => {
            const { resolveBotOnlyConflicts } = await import('@/lib/game/BotAI');
            await resolveBotOnlyConflicts(
                placedActors, disabledLocations, resolvedConflicts, dynamicPlayers,
                localPlayerId, addLog, setOpponentsData, setPlacedActors, setResolvedConflicts
            );
        };
        resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.isBotGame, phase, turn]);

    // --- Phase Handlers ---
    const handleEventConfirm = useCallback(() => {
        if (!currentEvent) return;
        const playerName = player.name || '080';
        const opponents = dynamicPlayers.filter((p: any) => p.id !== localPlayerId);

        if (currentEvent.type === 'compare' || currentEvent.type === 'compare_sum') {
            // Build opponent stats from opponentsData
            const opponentStats = opponents.map((opp: any) => {
                const oppRes = opponentsData[opp.id]?.resources || {};
                let amount: number;
                if (currentEvent.type === 'compare_sum' && currentEvent.targetResources) {
                    amount = currentEvent.targetResources.reduce((sum: number, r: string) => sum + ((oppRes as any)[r] || 0), 0);
                } else {
                    amount = (oppRes as any)[currentEvent.targetResource!] || 0;
                }
                return { name: opp.name || 'Bot', amount };
            });
            const result = resolveCompareEvent(currentEvent, playerName, resources, opponentStats);
            addLog(result.message);
            if (result.reward && !result.isTie) {
                if (result.won) {
                    // Player won — add reward to player
                    updateResource(result.reward.type as any, result.reward.amount);
                } else if (result.winnerName && game?.isBotGame) {
                    // A bot won — add reward (Fame) to the winning bot
                    const winnerBot = opponents.find((o: any) => o.name === result.winnerName);
                    if (winnerBot && result.reward.type) {
                        setOpponentsData((prev: any) => {
                            const od = prev[winnerBot.id];
                            if (!od) return prev;
                            const res = { ...od.resources };
                            res[result.reward!.type] = (res[result.reward!.type] || 0) + (result.reward!.amount || 1);
                            return { ...prev, [winnerBot.id]: { ...od, resources: res } };
                        });
                    }
                }
            }
            setEventResult({ msg: result.message, win: result.won, winnerName: result.winnerName, rewardLabel: result.rewardLabel, isTie: result.isTie, tieParticipants: result.tieParticipants });
        } else if (currentEvent.type === 'discard') {
            // Bots randomly discard 0-2 of the target resource
            const opponentDiscards = opponents.map((opp: any) => {
                const oppRes = opponentsData[opp.id]?.resources || {};
                const available = (oppRes as any)[currentEvent.targetResource!] || 0;
                const botDiscard = Math.min(Math.floor(Math.random() * 3), available);
                // Deduct from bot resources
                if (botDiscard > 0) {
                    setOpponentsData((prev: Record<string, OpponentData>) => {
                        const od = prev[opp.id];
                        if (!od) return prev;
                        return {
                            ...prev,
                            [opp.id]: { ...od, resources: { ...od.resources, [currentEvent.targetResource!]: Math.max(0, ((od.resources as any)[currentEvent.targetResource!] || 0) - botDiscard) } }
                        };
                    });
                }
                return { name: opp.name || 'Bot', amount: botDiscard };
            });
            const result = resolveDiscardEvent(currentEvent, playerName, discardAmount, opponentDiscards);
            addLog(result.message);
            // Deduct player's discarded resources
            if (discardAmount > 0 && currentEvent.targetResource) {
                updateResource(currentEvent.targetResource as any, -discardAmount);
            }
            // Award action card to winner
            if (!result.isTie && currentEvent.reward === 'action_card') {
                if (result.won) {
                    // Player won — give card to player
                    const deck = ACTION_CARDS.filter(c => !actionHand.some(h => h.id === c.id));
                    if (deck.length > 0) {
                        const drawn = deck[Math.floor(Math.random() * deck.length)];
                        const instance = { ...drawn, instanceId: `${drawn.id}_${Date.now()}` } as ActionCardInstance;
                        setActionHand(prev => [...prev, instance]);
                        setLocalActionDeckCount(prev => prev !== null ? Math.max(0, prev - 1) : prev);
                        addLog(`Won an Action Card: ${drawn.title}!`);
                    }
                } else if (result.winnerName && game?.isBotGame) {
                    // A bot won — give card to the winning bot
                    const winnerBot = opponents.find((o: any) => o.name === result.winnerName);
                    if (winnerBot) {
                        const deck = ACTION_CARDS.filter(c => {
                            const botInv = opponentsData[winnerBot.id]?.inventory || [];
                            return !botInv.some((h: any) => h.id === c.id);
                        });
                        if (deck.length > 0) {
                            const drawn = deck[Math.floor(Math.random() * deck.length)];
                            const instance = { ...drawn, instanceId: `${drawn.id}_${Date.now()}` } as ActionCardInstance;
                            // Add card to bot inventory directly
                            setOpponentsData((prev: any) => {
                                const od = prev[winnerBot.id];
                                if (!od) return prev;
                                const inventory = [...(od.inventory || []), instance];
                                return { ...prev, [winnerBot.id]: { ...od, inventory } };
                            });
                            setLocalActionDeckCount(prev => prev !== null ? Math.max(0, prev - 1) : prev);
                            addLog(`${winnerBot.name} won an Action Card!`);
                        }
                    }
                }
            }
            setEventResult({ msg: result.message, win: result.won, winnerName: result.winnerName, rewardLabel: result.rewardLabel, isTie: result.isTie, tieParticipants: result.tieParticipants });
        }
    }, [currentEvent, discardAmount, player.name, dynamicPlayers, localPlayerId, opponentsData, resources, addLog, updateResource, actionHand]);

    const closeEvent = useCallback(() => {
        // If tie is still active, don't close — user should use "RESOLVE CONFLICT" button
        if (eventResult?.isTie) return;

        // Add used event card to event discard pile
        if (currentEvent) {
            setEventDiscardPile(prev => [...prev, currentEvent]);
        }
        setEventResult(null);
        setCurrentEvent(null);
        setDiscardAmount(0);

        if (game?.isBotGame) {
            // Bot game: advance immediately
            addLog("All players are ready");
            setPhase(2);
        } else {
            // PvP: signal phase-ready and wait for consensus
            setIsWaitingForPlayers(true);
            fetch(`/api/games/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'phase-ready',
                    citizenId: localPlayerId,
                    resources,
                    nextPhase: 2,
                    nextTurn: turn,
                    clearEvent: true
                })
            }).catch(console.error);
        }
    }, [addLog, eventResult, currentEvent, game?.isBotGame, id, localPlayerId, resources, turn]);

    // Activate the RPS tie-breaker modal for event ties
    const activateEventTieBreaker = useCallback(() => {
        if (!eventResult?.isTie || !eventResult?.tieParticipants || !currentEvent) return;

        const playerName = player.name || '080';
        const participants = eventResult.tieParticipants;
        const playerIsTied = participants.includes(playerName);

        // If the player is NOT tied (only bots are tied), auto-resolve the bot-only tie
        if (!playerIsTied && game?.isBotGame) {
            const choices = ['rock', 'paper', 'scissors'];
            const botResults = participants.map((name: string) => ({
                name,
                choice: choices[Math.floor(Math.random() * 3)]
            }));

            // Ensure at least one unique winner (avoid infinite draws)
            // Force different choices if all are the same
            if (new Set(botResults.map(r => r.choice)).size === 1 && botResults.length > 1) {
                const beats: Record<string, string> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
                botResults[0].choice = Object.keys(beats).find(k => beats[k] === botResults[1].choice) || 'rock';
            }

            botResults.forEach(r => addLog(`Tie-breaker: ${r.name} plays ${r.choice.toUpperCase()}`));

            // Determine winner
            const uniqueChoices = new Set(botResults.map(r => r.choice));
            let winnerName: string | null = null;

            if (uniqueChoices.size === 2) {
                const choiceArr = Array.from(uniqueChoices);
                const beats: Record<string, string> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
                const winningChoice = beats[choiceArr[0]] === choiceArr[1] ? choiceArr[0] : choiceArr[1];
                const winners = botResults.filter(r => r.choice === winningChoice);
                winnerName = winners.length === 1 ? winners[0].name : winners[Math.floor(Math.random() * winners.length)].name;
            }
            if (!winnerName) {
                winnerName = participants[Math.floor(Math.random() * participants.length)];
            }

            addLog(`Tie-breaker resolved! ${winnerName} wins!`);

            // Award the reward to the winning bot
            const winnerBot = dynamicPlayers.find((p: any) => p.name === winnerName);
            if (winnerBot && currentEvent.reward === 'fame') {
                setOpponentsData((prev: any) => {
                    const od = prev[winnerBot.id];
                    if (!od) return prev;
                    const res = { ...od.resources } as any;
                    res.fame = (res.fame || 0) + 1;
                    return { ...prev, [winnerBot.id]: { ...od, resources: res } };
                });
            } else if (winnerBot && currentEvent.reward === 'action_card') {
                const botInv = opponentsData[winnerBot.id]?.inventory || [];
                const deck = ACTION_CARDS.filter(c => !botInv.some((h: any) => h.id === c.id));
                if (deck.length > 0) {
                    const drawn = deck[Math.floor(Math.random() * deck.length)];
                    const instance = { ...drawn, instanceId: `${drawn.id}_${Date.now()}` } as ActionCardInstance;
                    setOpponentsData((prev: any) => {
                        const od = prev[winnerBot.id];
                        if (!od) return prev;
                        return { ...prev, [winnerBot.id]: { ...od, inventory: [...(od.inventory || []), instance] } };
                    });
                    setLocalActionDeckCount(prev => prev !== null ? Math.max(0, prev - 1) : prev);
                }
            }

            const rewardLabel = currentEvent.reward === 'fame' ? '1 Fame' : 'an Action Card';
            setEventResult({
                msg: `Tie-breaker resolved! ${winnerName} wins and earns ${rewardLabel}!`,
                win: false,
                winnerName,
                rewardLabel,
                isTie: false
            });
            return;
        }

        // Player IS tied — show the RPS conflict resolution modal
        const playerActor = {
            actorId: localPlayerId,
            playerId: localPlayerId,
            name: playerName,
            actorType: 'player',
            type: '', // Will be set by player's RPS choice
            avatar: player.avatar || '/avatars/golden_avatar.png',
            headAvatar: player.avatar || '/avatars/golden_avatar.png',
            playerAvatar: player.avatar || '/avatars/golden_avatar.png',
        };

        const opponents = participants
            .filter((name: string) => name !== playerName)
            .map((name: string) => {
                const botPlayer = dynamicPlayers.find((p: any) => p.name === name);
                return {
                    actorId: botPlayer?.id || name,
                    playerId: botPlayer?.id || name,
                    name: name,
                    actorType: 'player',
                    type: '', // Bot RPS will be auto-assigned
                    avatar: botPlayer?.avatar || '/avatars/ghost.png',
                    headAvatar: botPlayer?.avatar || '/avatars/ghost.png',
                    playerAvatar: botPlayer?.avatar || '/avatars/ghost.png',
                };
            });

        const conflict = {
            locId: `event_${currentEvent.id}`,
            locationName: currentEvent.title || 'Event',
            playerActor,
            opponents,
            resourceType: currentEvent.reward === 'fame' ? 'fame' : 'action_card',
        };

        setEventTieBreakerActive({ conflict });
    }, [eventResult, currentEvent, player, localPlayerId, dynamicPlayers, game?.isBotGame, addLog, opponentsData]);

    // Handle the result from the event tie-breaker RPS
    const handleEventTieBreakerResolve = useCallback((result: ConflictResult) => {
        if (!currentEvent || !eventResult) return;

        const playerName = player.name || '080';
        const isPlayerWinner = result.winnerId === localPlayerId;
        const winnerName = isPlayerWinner ? playerName : (
            dynamicPlayers.find((p: any) => p.id === result.winnerId)?.name || 'Unknown'
        );

        // Award the event reward
        if (currentEvent.reward === 'fame') {
            if (isPlayerWinner) {
                updateResource('fame', 1);
            } else {
                const winnerBot = dynamicPlayers.find((p: any) => p.id === result.winnerId);
                if (winnerBot) {
                    setOpponentsData((prev: any) => {
                        const od = prev[winnerBot.id];
                        if (!od) return prev;
                        const res = { ...od.resources } as any;
                        res.fame = (res.fame || 0) + 1;
                        return { ...prev, [winnerBot.id]: { ...od, resources: res } };
                    });
                }
            }
        } else if (currentEvent.reward === 'action_card') {
            if (isPlayerWinner) {
                const deck = ACTION_CARDS.filter(c => !actionHand.some(h => h.id === c.id));
                if (deck.length > 0) {
                    const drawn = deck[Math.floor(Math.random() * deck.length)];
                    const instance = { ...drawn, instanceId: `${drawn.id}_${Date.now()}` } as ActionCardInstance;
                    setActionHand(prev => [...prev, instance]);
                    setLocalActionDeckCount(prev => prev !== null ? Math.max(0, prev - 1) : prev);
                    addLog(`Won an Action Card: ${drawn.title}!`);
                }
            } else {
                const winnerBot = dynamicPlayers.find((p: any) => p.id === result.winnerId);
                if (winnerBot) {
                    const botInv = opponentsData[winnerBot.id]?.inventory || [];
                    const deck = ACTION_CARDS.filter(c => !botInv.some((h: any) => h.id === c.id));
                    if (deck.length > 0) {
                        const drawn = deck[Math.floor(Math.random() * deck.length)];
                        const instance = { ...drawn, instanceId: `${drawn.id}_${Date.now()}` } as ActionCardInstance;
                        setOpponentsData((prev: any) => {
                            const od = prev[winnerBot.id];
                            if (!od) return prev;
                            const inventory = [...(od.inventory || []), instance];
                            return { ...prev, [winnerBot.id]: { ...od, inventory } };
                        });
                        setLocalActionDeckCount(prev => prev !== null ? Math.max(0, prev - 1) : prev);
                        addLog(`${winnerBot.name} won an Action Card!`);
                    }
                }
            }
        }

        const rewardLabel = currentEvent.reward === 'fame' ? '1 Fame' : 'an Action Card';
        addLog(`Event tie-breaker resolved! ${winnerName} wins and earns ${rewardLabel}!`);

        // Clear tie-breaker and set result to resolved (non-tie)
        setEventTieBreakerActive(null);
        setEventResult({
            msg: `Tie-breaker resolved! ${winnerName} wins and earns ${rewardLabel}!`,
            win: isPlayerWinner,
            winnerName,
            rewardLabel,
            isTie: false
        });
    }, [currentEvent, eventResult, player, localPlayerId, dynamicPlayers, updateResource, actionHand, opponentsData, addLog]);

    const handleActorSelect = useCallback((actorId: string) => {
        if (placedActors.find(p => p.actorId === actorId)) return;
        setSelectedActorId(actorId);
        setPendingPlacement(null);
    }, [placedActors]);

    const handleHexClick = useCallback(async (locId: string) => {
        if (disabledLocations.includes(locId)) return;

        // Phase 3 Step 2: Relocation — clicking a hex while an actor is selected for relocation
        if (phase === 3 && p3Step === 2 && relocationSource) {
            const actor = placedActors.find(a => a.actorId === relocationSource);
            if (!actor) return;
            const actorType = (actor.actorType || '').toLowerCase();
            const allowedLocs = (ALLOWED_MOVES as any)[actorType] || [];
            if (!allowedLocs.includes(locId)) {
                const locName = LOCATIONS.find(l => l.id === locId)?.name || locId;
                addLog(`Relocation blocked: ${actor.name || actorType} cannot go to ${locName.toUpperCase()}`);
                return;
            }
            if (actor.locId === locId) {
                addLog(`Actor is already at this location.`);
                return;
            }
            // Apply the relocation: move the actor to the new location
            setPlacedActors(prev => prev.map(a =>
                a.actorId === relocationSource ? { ...a, locId } : a
            ));
            const fromLoc = LOCATIONS.find(l => l.id === actor.locId)?.name || actor.locId;
            const toLoc = LOCATIONS.find(l => l.id === locId)?.name || locId;
            setPendingRelocations(prev => [...prev, { playerId: localPlayerId, actorId: relocationSource, targetLocId: locId }]);
            addLog(`Relocated ${actor.name || actorType} from ${fromLoc.toUpperCase()} to ${toLoc.toUpperCase()}`);
            setRelocationSource(null);
            setSelectedHex(null);
            return;
        }

        // Phase 3 Step 2: Highlight valid locations when relocating
        if (phase === 3 && p3Step === 2 && !relocationSource) {
            return; // No actor selected yet, ignore hex click
        }

        // Phase 2: Normal placement flow
        if (phase !== 2 || isWaiting) return;
        if (selectedActorId) {
            const actor = MY_ACTORS.find(a => a.id === selectedActorId);
            if (!actor) return;
            const type = (actor.type || '').toLowerCase();
            const allowedLocs = (ALLOWED_MOVES as any)[type] || [];
            if (!allowedLocs.includes(locId)) {
                addLog(`Placement blocked: ${actor.name} cannot go to ${locId.toUpperCase()}`);
                return;
            }
            setPendingPlacement({ actorId: selectedActorId, locId });
        }
    }, [disabledLocations, phase, p3Step, isWaiting, selectedActorId, relocationSource, placedActors, localPlayerId, addLog]);

    const handleRelocationActorClick = useCallback((actor: any) => {
        if (phase !== 3 || p3Step !== 2) return;
        const playerRelocationsUsed = pendingRelocations.filter(r => r.playerId === localPlayerId).length;
        const relocCardsSelected = actionHand.filter(c => (c.title || '').toLowerCase().includes('relocation') && (selectedActionCards[c.id] || 0) > 0).length;
        if (playerRelocationsUsed >= relocCardsSelected) {
            addLog("No more relocation cards available.");
            return;
        }
        // Toggle: if already selected, deselect
        if (relocationSource === actor.actorId) {
            setRelocationSource(null);
            setSelectedHex(null);
            return;
        }
        setRelocationSource(actor.actorId);
        setSelectedHex(null);
        addLog(`Selected ${actor.name || actor.actorType || 'actor'} for relocation. Click a valid location.`);
    }, [phase, p3Step, pendingRelocations, localPlayerId, actionHand, selectedActionCards, relocationSource, addLog]);

    const handleRSPSelect = useCallback((choice: string) => {
        setPendingRsp(choice);
    }, []);

    const handleBid = useCallback(async (bidToken: string | null) => {
        if (!pendingPlacement || !pendingRsp) return;
        
        const newPlacedActor: PlacedActor = {
            actorId: pendingPlacement.actorId,
            actorType: MY_ACTORS.find(a => a.id === pendingPlacement.actorId)?.type as ActorType || 'politician',
            locId: pendingPlacement.locId,
            playerId: localPlayerId,
            type: pendingRsp as any, // RPS Argument
            bid: (bidToken || undefined) as any, // Cast to any to bypass strict BetType for now
            name: MY_ACTORS.find(a => a.id === pendingPlacement.actorId)?.name || 'Actor',
            avatar: MY_ACTORS.find(a => a.id === pendingPlacement.actorId)?.avatar || '',
            headAvatar: MY_ACTORS.find(a => a.id === pendingPlacement.actorId)?.headAvatar || ''
        };

        const updatedActors = [...placedActors, newPlacedActor];
        setPlacedActors(updatedActors);
        setPendingPlacement(null);
        setPendingRsp(null);
        setSelectedActorId(null);

        // Deduct resources
        if (bidToken) {
            updateResource(bidToken as any, -1);
        }

        setGame((prev: any) => {
            if (!prev || prev === '404') return prev;
            const nextGameState = { ...(prev.gameState || {}) };
            nextGameState.stagedActors = { ...nextGameState.stagedActors };
            // Only store local player's actors under their key
            nextGameState.stagedActors[localPlayerId] = updatedActors.filter(a => a.playerId === localPlayerId);
            return { ...prev, gameState: nextGameState };
        });

        addLog(`Placed ${newPlacedActor.actorType.toUpperCase()} at ${newPlacedActor.locId.toUpperCase()}`);

        // Sync to backend
        if (game) {
            const syncedResources = { ...resources };
            if (bidToken) {
                syncedResources[bidToken as keyof typeof syncedResources] = Math.max(0, (syncedResources[bidToken as keyof typeof syncedResources] || 0) - 1);
            }

            fetch(`/api/games/${id || game.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync-placement',
                    citizenId: localPlayerId,
                    // Only sync local player's actors to avoid overwriting opponent's
                    placedActors: updatedActors.filter(a => a.playerId === localPlayerId),
                    resources: syncedResources
                })
            }).catch(console.error);
        }
    }, [pendingPlacement, pendingRsp, localPlayerId, placedActors, resources, updateResource, game, id, addLog]);

    const handleRecallActor = useCallback((actorId: string) => {
        if (phase !== 2) return;

        const actorToRecall = placedActors.find(a => a.actorId === actorId && a.playerId === localPlayerId);
        if (!actorToRecall) return;

        // Refund bet if there was one
        if (actorToRecall.bid) {
            updateResource(actorToRecall.bid as any, 1);
        }

        // Remove only the local player's actor with this ID (other players may have the same actorId)
        const updatedActors = placedActors.filter(a => !(a.actorId === actorId && a.playerId === localPlayerId));

        // Optimistic UI update
        setPlacedActors(updatedActors);

        setGame((prev: any) => {
            if (!prev || prev === '404') return prev;
            const nextGameState = { ...(prev.gameState || {}) };
            nextGameState.stagedActors = { ...nextGameState.stagedActors };
            // Only store local player's actors under their key
            nextGameState.stagedActors[localPlayerId] = updatedActors.filter(a => a.playerId === localPlayerId);
            return { ...prev, gameState: nextGameState };
        });

        addLog(`Recalled ${actorToRecall.actorType.toUpperCase()} from ${actorToRecall.locId.toUpperCase()}`);

        if (game) {
            // Need to capture current resources locally plus the refund
            const syncedResources = { ...resources };
            if (actorToRecall.bid) {
                syncedResources[actorToRecall.bid as keyof typeof syncedResources] = (syncedResources[actorToRecall.bid as keyof typeof syncedResources] || 0) + 1;
            }

            fetch(`/api/games/${id || game.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync-placement',
                    citizenId: localPlayerId,
                    // Only sync local player's actors to avoid overwriting opponent's
                    placedActors: updatedActors.filter(a => a.playerId === localPlayerId),
                    resources: syncedResources
                })
            }).catch(console.error);
        }
    }, [phase, placedActors, localPlayerId, updateResource, game, id, addLog, resources]);

    const handleExchangeCommit = useCallback(() => {
        if (!exchangeSourceValue || !exchangeTargetPlayer || !exchangeTargetValue) return;

        // Player gives their value and takes opponent's value
        updateResource(exchangeSourceValue as any, -1);
        updateResource(exchangeTargetValue as any, 1);

        // Update opponent data
        setOpponentsData((prev: Record<string, OpponentData>) => {
            const od = prev[exchangeTargetPlayer];
            if (!od) return prev;
            return {
                ...prev,
                [exchangeTargetPlayer]: {
                    ...od,
                    resources: {
                        ...od.resources,
                        [exchangeTargetValue]: Math.max(0, ((od.resources as any)[exchangeTargetValue] || 0) - 1),
                        [exchangeSourceValue]: ((od.resources as any)[exchangeSourceValue] || 0) + 1
                    }
                }
            };
        });

        const oppName = dynamicPlayers.find((p: any) => p.id === exchangeTargetPlayer)?.name || 'Bot';
        addLog(`Exchanged ${exchangeSourceValue.toUpperCase()} for ${exchangeTargetValue.toUpperCase()} with ${oppName}`);

        // Store result for display
        setExchangeResults(prev => [...(prev || []), {
            pName: player.name || '080',
            targetName: oppName,
            sourceVal: exchangeSourceValue,
            targetVal: exchangeTargetValue
        }]);

        // Reset exchange state for next card
        setExchangeStep(0);
        setExchangeSourceValue(null);
        setExchangeTargetPlayer(null);
        setExchangeTargetValue(null);

        // Check if more exchange cards remain
        const exchangeCardsSelected = actionHand.filter(c =>
            ((c.title || '').toLowerCase().includes('exchange') || (c.title || '').toLowerCase().includes('change'))
            && (selectedActionCards[c.id] || 0) > 0
        ).length;
        const exchangesDone = (exchangeResults?.length || 0) + 1;

        if (exchangesDone >= exchangeCardsSelected) {
            // All exchanges done — auto-advance after brief delay
            setTimeout(() => {
                handleNextPhaseWrapper();
            }, 2000);
        } else {
            // More exchanges to do — restart exchange step
            setExchangeStep(1);
        }
    }, [exchangeSourceValue, exchangeTargetPlayer, exchangeTargetValue, updateResource, dynamicPlayers, addLog, player.name, actionHand, selectedActionCards, exchangeResults, handleNextPhaseWrapper]);

    const handleActionCardToggle = useCallback((cardId: string, count: number) => {
        const card = actionHand.find(c => c.id === cardId);
        if (!card) return;
        const sameTitle = actionHand.filter(c => c.title === card.title);
        setSelectedActionCards(prev => {
            const updated = { ...prev };
            // Deselect all cards of this title first
            sameTitle.forEach(c => { updated[c.id] = 0; });
            // Select the first `count` cards of this title
            for (let i = 0; i < Math.min(count, sameTitle.length); i++) {
                updated[sameTitle[i].id] = 1;
            }
            return updated;
        });
    }, [actionHand]);

    // Deselect exchange/change_values cards so they return to hand instead of being discarded
    const returnUnusedExchangeCards = useCallback(() => {
        setSelectedActionCards(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(cid => {
                const card = actionHand.find(c => c.id === cid);
                if (card && ((card.title || '').toLowerCase().includes('change') || (card.title || '').toLowerCase().includes('exchange'))) {
                    updated[cid] = 0;
                }
            });
            return updated;
        });
    }, [actionHand]);

    const handleSelectConflict = useCallback((locId: string) => {
        setActiveConflictLocId(locId);
    }, []);

    const handleConflictResolve = useCallback((result: ConflictResult, locId: string) => {
        // Prevent duplicate reward claims for already-resolved conflicts
        if (resolvedConflicts.includes(locId)) {
            setActiveConflictLocId(null);
            return;
        }

        setResolvedConflicts(prev => [...prev, locId]);
        setActiveConflictLocId(null);

        const conflict = stickyConflicts.find((c: any) => c.locId === locId);
        if (!conflict) {
            addLog(`Conflict at ${locId.toUpperCase()} resolved.`);
            return;
        }

        const actorType = conflict.playerActor.actorType;
        const realLocId = conflict.realLocId;
        const rewardType = getActorRewardType(actorType, realLocId);

        // Award resources to the local player
        const playerActorId = conflict.playerActor.actorId;
        const isPlayerWinner = result.winnerId === localPlayerId || result.winnerId === playerActorId;
        const isTruce = result.isDraw && result.shareRewards;
        // Player only gets truce rewards if they survived (weren't eliminated in earlier rounds)
        const playerEliminated = result.loserIds?.includes(localPlayerId) || result.loserIds?.includes(playerActorId);
        const playerReward = playerEliminated ? 0 : calculateReward(actorType as ActorType, isPlayerWinner, isTruce, result.successfulBids, playerActorId);

        if (playerReward > 0 && rewardType) {
            updateResource(rewardType as any, playerReward);
            addLog(`Conflict at ${locId.toUpperCase()} resolved: gained ${playerReward} ${rewardType}.`);
        } else {
            addLog(`Conflict at ${locId.toUpperCase()} resolved.`);
        }

        // Award resources to bot opponents (only in bot games — PvP opponents handle their own)
        if (game?.isBotGame) {
            console.log('[DEBUG] Bot reward: isBotGame=true, opponents=', conflict.opponents.length, 'actorType=', actorType, 'rewardType=', rewardType, 'isTruce=', isTruce);
            conflict.opponents.forEach((opp: any) => {
                const isOppWinner = result.winnerId === opp.playerId || result.winnerId === opp.actorId;
                const oppEliminated = result.loserIds?.includes(opp.playerId) || result.loserIds?.includes(opp.actorId);
                const oppReward = oppEliminated ? 0 : calculateReward(actorType as ActorType, isOppWinner, isTruce, result.successfulBids, opp.actorId);
                console.log('[DEBUG] Bot opp:', opp.playerId, 'actorId=', opp.actorId, 'isWinner=', isOppWinner, 'eliminated=', oppEliminated, 'reward=', oppReward, 'winnerId=', result.winnerId, 'loserIds=', result.loserIds);
                if (oppReward > 0 && rewardType) {
                    setOpponentsData((prev: Record<string, OpponentData>) => {
                        const oppData = prev[opp.playerId];
                        console.log('[DEBUG] setOpponentsData: key=', opp.playerId, 'found=', !!oppData, 'prevKeys=', Object.keys(prev));
                        if (!oppData) return prev;
                        return {
                            ...prev,
                            [opp.playerId]: {
                                ...oppData,
                                resources: {
                                    ...oppData.resources,
                                    [rewardType]: ((oppData.resources as any)[rewardType] || 0) + oppReward,
                                },
                            },
                        };
                    });
                }
            });
        }

        // PvP: sync updated resources to server after conflict
        if (!game?.isBotGame && id && playerReward > 0 && rewardType) {
            const updatedResources = { ...resources, [rewardType]: ((resources as any)[rewardType] || 0) + playerReward };
            fetch(`/api/games/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync-resources',
                    citizenId: localPlayerId,
                    resources: updatedResources
                })
            }).catch(console.error);
        }
    }, [addLog, stickyConflicts, localPlayerId, updateResource, setOpponentsData, game?.isBotGame, id, resources, resolvedConflicts]);

    const handleCloseConflict = useCallback(() => {
        setActiveConflictLocId(null);
    }, []);

    const handleMarketOfferConfirm = useCallback((offer: MarketOffer | null) => {
        setPlayerMarketOffer(offer);
        setP5Step(2);
        addLog("Your market offer is set.");
    }, [addLog]);

    const handleMarketRevealComplete = useCallback((tradePartnerId: string | null) => {
        if (tradePartnerId && playerMarketOffer) {
            updateResource(playerMarketOffer.give as any, -playerMarketOffer.amount);
            updateResource(playerMarketOffer.want as any, playerMarketOffer.amount);
            addLog(`Traded with ${dynamicPlayers.find((p: any) => p.id === tradePartnerId)?.name}!`);
        }
        setP5Step(3);
    }, [playerMarketOffer, updateResource, dynamicPlayers, addLog]);

    const handleBuyActionCard = useCallback(async (card: any) => {
        updateResource('product', -1);
        updateResource('electricity', -1);
        updateResource('recycling', -1);

        if (!game?.isBotGame && id) {
            // PvP: draw from server-managed deck to keep decks in sync
            try {
                const res = await fetch(`/api/games/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'draw-action-card', citizenId: localPlayerId })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.cardId) {
                        const cardDef = ACTION_CARDS.find(c => c.id === data.cardId);
                        if (cardDef) {
                            const mappedCard = { ...cardDef, instanceId: `${cardDef.id}_${Date.now()}` };
                            setActionHand(prev => [...prev, mappedCard]);
                            setLocalActionDeckCount(data.remainingCards);
                            addLog(`Purchased action card: ${cardDef.title}`);
                        }
                    }
                }
            } catch (e) { console.error("Failed to draw action card from server", e); }
        } else {
            const mappedCard = { ...card, instanceId: `${card.id}_${Date.now()}` };
            setActionHand(prev => [...prev, mappedCard]);
            setLocalActionDeckCount(prev => prev !== null ? Math.max(0, prev - 1) : prev);
            addLog(`Purchased action card: ${card.title}`);
        }
    }, [updateResource, addLog, game?.isBotGame, id, localPlayerId]);

    const handleSkipBuyActionCard = useCallback(() => {
        addLog("Skipped buying action card.");
        handleNextPhaseWrapper();
    }, [addLog, handleNextPhaseWrapper]);

    return {
        // State
        game, phase, turn, placedActors, disabledLocations, locationsBlockedBy, actionDiscardPile, eventDiscardPile,
        opponentsReady, opponentsData, isGameOver, isTieBreakerScreen, tieWinners,
        isWaitingForTieBreaker, activeConflictLocId, resolvedConflicts,
        currentEvent, discardAmount, eventResult, eventTieBreakerActive,
        selectedActorId, hoveredActorId, selectedHex, isWaiting, pendingPlacement, pendingRsp,
        p3Step, selectedActionCards, actionHand, relocationSource, pendingRelocations,
        exchangeStep, exchangeSourceValue, exchangeTargetPlayer, exchangeTargetValue,
        currentExchangeIndex, pendingExchanges, p3Step1Ready, opponentsP3Step1Ready,
        exchangeDone, exchangeResults, relocResults, playerConflictContext,
        p5Step, playerMarketOffer, botMarketOffers, marketMatchId,
        isInventoryOpen, isWaitingForPlayers, localPlayerId,
        dynamicPlayers, availableActors, usedRSPs, relocationCardsCount, exchangeCardsCount, selectedRelocationCount, remainingRelocations,
        activeConflicts, stickyConflicts, resources, victoryPoints,
        localEventDeckCount, localActionDeckCount,

        // Setters
        setPhase, setTurn, setPlacedActors, setDisabledLocations, setActionDiscardPile,
        setOpponentsReady, setOpponentsData, setIsGameOver, setIsTieBreakerScreen,
        setTieWinners, setIsWaitingForTieBreaker, setActiveConflictLocId, setResolvedConflicts,
        setCurrentEvent, setDiscardAmount, setEventResult, setEventTieBreakerActive,
        setSelectedActorId, setHoveredActorId, setSelectedHex, setIsWaiting, setPendingPlacement, setPendingRsp,
        setP3Step, setSelectedActionCards, setActionHand, setRelocationSource, setPendingRelocations,
        setExchangeStep, setExchangeSourceValue, setExchangeTargetPlayer, setExchangeTargetValue,
        setCurrentExchangeIndex, setPendingExchanges, setP3Step1Ready, setOpponentsP3Step1Ready,
        setExchangeDone, setExchangeResults, setRelocResults, setPlayerConflictContext,
        setP5Step, setPlayerMarketOffer, setBotMarketOffers, setMarketMatchId,
        setIsInventoryOpen, setIsWaitingForPlayers,

        // Logic Helpers
        addLog,
        handleNextPhaseWrapper,
        handleEventConfirm,
        closeEvent,
        activateEventTieBreaker,
        handleEventTieBreakerResolve,
        handleActorSelect,
        handleHexClick,
        handleRSPSelect,
        handleBid,
        handleRecallActor,
        handleRelocationActorClick,
        handleActionCardToggle,
        handleExchangeCommit,
        returnUnusedExchangeCards,
        handleSelectConflict,
        handleConflictResolve,
        handleCloseConflict,
        handleMarketOfferConfirm,
        handleMarketRevealComplete,
        handleBuyActionCard,
        handleSkipBuyActionCard
    };
}
