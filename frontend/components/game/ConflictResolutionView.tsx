"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// Types
import { ConflictResult } from '@/lib/modules/core/types';
import { resolveConflictLogic } from '@/lib/modules/conflict/conflictResolver';
import { calculateReward } from '@/lib/modules/resources/resourceManager';

interface ConflictResolutionViewProps {
    game: any;
    conflict: {
        locId: string;
        locationName: string;
        playerActor: any;
        opponents: any[]; // { actorId, name, avatar, type, bid? }
        resourceType: string;
    };
    isResolved?: boolean;
    hasNextConflict?: boolean;
    onResolve: (result: ConflictResult) => void;
    onClose: () => void;
}

import { LOCATION_IMAGES, RSP_ICONS, BID_ICONS, RESOURCE_ICONS, ACTOR_IMAGES } from '@/data/assetManifest';

import { useGameState } from '@/context/GameStateContext';

export default function ConflictResolutionView({ game, conflict, isResolved, hasNextConflict, onResolve, onClose }: ConflictResolutionViewProps) {
    const { player } = useGameState();
    const [step, setStep] = useState<'intro' | 'reveal' | 'outcome_rsp' | 'outcome_bid'>('intro');

    // State for choices. Player uses their placed type.
    const [playerChoice, setPlayerChoice] = useState<string>(conflict.playerActor.type || '');
    const [opponentChoices, setOpponentChoices] = useState<{ [id: string]: string }>({});

    // Calculated Result
    const [result, setResult] = useState<ConflictResult | null>(null);
    const [survivorIds, setSurvivorIds] = useState<string[]>([]);
    const [reRollCount, setReRollCount] = useState(0);

    const isRoundTwo = reRollCount > 0;
    const [rewardAccumulator, setRewardAccumulator] = useState<Record<string, number>>({});

    const localPlayerId = (player.citizenId && player.citizenId !== '0000') ? player.citizenId : (player.address || 'p1');

    const renderSummaryList = (isRestartMode: boolean) => {
        // Deduplicate: Ensure the local player is not accidentally included in the opponents
        const filteredOpponents = conflict.opponents.filter(o => (o.actorId || o.playerId || o.id) !== localPlayerId);
        
        const participants = [
            {
                id: localPlayerId,
                name: conflict.playerActor?.name || player.name || '080',
                actorType: conflict.playerActor?.actorType || 'actor',
                bid: conflict.playerActor?.bid
            },
            ...filteredOpponents
        ];

        return (
            <div className="w-full p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                {participants.map(participant => {
                    const id = participant.actorId || participant.id;
                    const isWinner = result?.winnerId === id;
                    const isSharer = result?.isDraw && result?.shareRewards && result?.survivorIds.includes(id);
                    const isTie = result?.tieIds?.includes(id);
                    const isLoser = result?.loserIds.includes(id);
                    const isSurvivor = result?.survivorIds.includes(id);
                    const wasSavedByBid = result?.successfulBids?.some(b => b.actorId === id && b.bid === 'electricity');
                    
                    const pHasRecycling = result?.successfulBids?.some(b => b.actorId === id && b.bid === 'recycling');
                    
                    // If they were a participant but didn't win and aren't survivors, they are losers
                    const isExitedEarly = !isWinner && !isSurvivor;

                    let status = "DRAW";
                    let rewardText = "nothing";
                    let statusColor = "text-blue-400";

                    // True round winner: won this round but can't end conflict (opponent saved by bet)
                    const isRoundWinner = result?.roundWinnerIds?.includes(id) ?? false;

                    if (isRestartMode) {
                        if (wasSavedByBid) {
                            status = "SAVED";
                            statusColor = "text-purple-400";
                            rewardText = "Lose, saved by Bid, resolve again";
                        } else if (isWinner || isRoundWinner) {
                            status = "WIN";
                            statusColor = "text-[#d4af37]";
                            rewardText = "Win → resolve again because of Bet Rules";
                        } else if (isLoser || isExitedEarly) {
                            status = "LOSE";
                            statusColor = "text-red-500";
                            rewardText = "leave the conflict";
                        } else if (isSurvivor) {
                            status = "DRAW";
                            statusColor = "text-blue-400";
                            rewardText = "continues the conflict";
                        }
                    } else {
                        // Regular Outcome Mode
                        if (isWinner || (isSharer && pHasRecycling)) {
                            status = "WIN";
                            statusColor = "text-[#d4af37]";
                            const isRobot = participant.actorType?.toLowerCase() === 'robot';
                            const base = isRobot ? 3 : 1;
                            const bonus = rewardAccumulator[id] || 0;
                            const total = base + bonus;

                            const actorType = participant.actorType?.toLowerCase();
                            let resName = conflict.resourceType || '';
                            if (actorType === 'politician') resName = 'power';
                            else if (actorType === 'scientist') resName = 'knowledge';
                            else if (actorType === 'artist') resName = 'art';

                            const label = isRobot ? (total === 1 ? 'Resource' : 'Resources') : (resName === 'action_card' ? 'Action Card' : (total === 1 ? 'Value' : 'Values'));
                            const capitalizedResName = resName === 'action_card' ? '' : resName.charAt(0).toUpperCase() + resName.slice(1);
                            rewardText = resName === 'action_card' ? `${total} Action Card` : `${total} ${label}${capitalizedResName ? ` (${capitalizedResName})` : ''}`;
                        } else if (isSharer || isTie) {
                            status = "DRAW";
                            statusColor = "text-blue-400";
                            
                            if (isSharer) {
                                const actorType = participant.actorType?.toLowerCase();
                                let resName = conflict.resourceType || '';
                                if (actorType === 'politician') resName = 'power';
                                else if (actorType === 'scientist') resName = 'knowledge';
                                else if (actorType === 'artist') resName = 'art';
                                
                                const isRobot = actorType === 'robot';
                                const bids = (result?.successfulBids || []);
                                // Use the same calculateReward logic as the state update
                                const total = calculateReward(actorType as any, false, true, bids, id);
                                
                                const label = isRobot ? (total === 1 ? 'Resource' : 'Resources') : (resName === 'action_card' ? 'Action Card' : (total === 1 ? 'Value' : 'Values'));
                                const capitalizedResName = resName === 'action_card' ? '' : resName.charAt(0).toUpperCase() + resName.slice(1);
                                rewardText = resName === 'action_card' ? `${total} Action Card` : `${total} ${label}${capitalizedResName ? ` (${capitalizedResName})` : ''}`;
                            }
                        } else if (isLoser || isExitedEarly) {
                            status = "LOSE";
                            statusColor = "text-red-500";
                        }
                    }

                    return (
                        <div key={id} className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold">
                                    {id === localPlayerId ? 'YOU' : (participant.name || 'Citizen')}'s {participant.actorType.charAt(0).toUpperCase() + participant.actorType.slice(1)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`font-black uppercase italic ${statusColor}`}>{status}</span>
                                <span className="text-white/40">→</span>
                                <span className="text-white font-medium">{isRestartMode ? rewardText : `${participant.actorType?.toLowerCase() === 'robot' ? 'produces' : 'creates'} ${rewardText}`}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // 1. Initialize Opponent Choices (Random for bots, Synced for humans)
    const [lastLocId, setLastLocId] = useState<string | null>(null);

    useEffect(() => {
        if (isResolved) {
            setStep('outcome_rsp');
            return;
        }

        // Fresh initialization for a new location
        if (conflict.locId !== lastLocId) {
            setLastLocId(conflict.locId);
            setRewardAccumulator({});
            const filteredOppRefs = conflict.opponents.filter(o => (o.actorId || o.playerId || o.id) !== localPlayerId);
            setSurvivorIds([localPlayerId, ...filteredOppRefs.map(o => o.actorId)]);
            
            const choices: { [id: string]: string } = {};
            conflict.opponents.forEach(opp => {
                choices[opp.actorId] = opp.type || 'rock';
            });
            setOpponentChoices(choices);

            // Special case: peaceful location
            if (conflict.opponents.length === 0) {
                const res = resolveConflictLogic(
                    localPlayerId,
                    conflict.playerActor.type || 'rock',
                    true,
                    { ...conflict, opponents: [] },
                    {},
                    { id: localPlayerId, name: conflict.playerActor?.name || player.name || '080' }
                );
                setResult(res);
                setStep('outcome_rsp');
            } else {
                setStep('intro');
                setResult(null);
            }
            return;
        }

        // If we're already mid-conflict at the SAME location, don't re-initialize
        // Human choices will still sync via the second useEffect
    }, [conflict.locId, isResolved, conflict.opponents, lastLocId, localPlayerId]);

    // 2. Real-time Sync for PvP Choices
    const [pvpAllSubmitted, setPvpAllSubmitted] = useState(false);

    useEffect(() => {
        if (game?.isBotGame || step !== 'intro') return;

        // PvP: Poll for opponent RPS submissions via get-rps
        const gameId = game?.id || (window.location.pathname.split('/').pop());
        if (!gameId) return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/games/${gameId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'get-rps',
                        conflictId: conflict.locId,
                        expectedParticipants: conflict.opponents.length + 1
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.allSubmitted && data.choices) {
                        // All players submitted — update opponent choices (hidden until now)
                        const newOppChoices: { [id: string]: string } = {};
                        conflict.opponents.forEach(opp => {
                            const oppPlayerId = opp.playerId || opp.actorId;
                            if (data.choices[oppPlayerId]) {
                                newOppChoices[opp.actorId] = data.choices[oppPlayerId].choice;
                            }
                        });
                        setOpponentChoices(prev => ({ ...prev, ...newOppChoices }));
                        setPvpAllSubmitted(true);
                        clearInterval(pollInterval);
                    }
                }
            } catch (e) { console.error("Failed to poll RPS choices", e); }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [game?.isBotGame, game?.id, step, conflict.locId, conflict.opponents]);

    // Legacy: Sync for bot games via decisions
    useEffect(() => {
        if (!game?.isBotGame || !game?.gameState?.decisions || step !== 'intro') return;

        const decisions = game.gameState.decisions;
        const newOppChoices = { ...opponentChoices };
        let changed = false;

        conflict.opponents.forEach(opp => {
            if (decisions[opp.actorId]?.conflictChoices?.[conflict.locId]) {
                const remoteChoice = decisions[opp.actorId].conflictChoices[conflict.locId];
                if (newOppChoices[opp.actorId] !== remoteChoice) {
                    newOppChoices[opp.actorId] = remoteChoice;
                    changed = true;
                }
            }
        });

        if (changed) {
            setOpponentChoices(newOppChoices);
        }
    }, [game?.gameState?.decisions, game?.isBotGame, conflict.locId, conflict.opponents, step, opponentChoices]);

    // 3. Logic: Resolve the Conflict
    const resolveConflict = (pChoice: string, applyBids: boolean = true): ConflictResult => {
        // Filter conflict for current survivors
        const currentConflictInput = {
            ...conflict,
            playerActor: {
                ...conflict.playerActor,
                isParticipant: survivorIds.includes(localPlayerId)
            },
            opponents: conflict.opponents.filter(o => survivorIds.includes(o.actorId))
        };

        return resolveConflictLogic(
            localPlayerId,
            pChoice,
            applyBids,
            currentConflictInput,
            opponentChoices,
            { id: localPlayerId, name: player.name || 'Player' }
        );
    };

    // Broadcast local choice to server
    const broadcastChoice = async (choice: string) => {
        const gameId = game?.id || (window.location.pathname.split('/').pop());
        if (!gameId || game?.isBotGame) return; // Don't sync in bot games

        try {
            // Use submit-rps for hidden-until-all-submit PvP
            await fetch(`/api/games/${gameId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit-rps',
                    citizenId: localPlayerId,
                    conflictId: conflict.locId,
                    choice: choice,
                    bid: conflict.playerActor.bid || null,
                    expectedParticipants: conflict.opponents.length + 1
                })
            });
        } catch (e) {
            console.error("Failed to broadcast RSP choice", e);
        }
    };

    const handleChoiceSelect = (token: string) => {
        setPlayerChoice(token);
        broadcastChoice(token);
    };


    // Handler: "Reveal" Button Click
    const handleReveal = () => {
        // Bids only active on Round 1
        const areBidsActive = !isRoundTwo;
        const res = resolveConflict(playerChoice, areBidsActive);

        setResult(res);
        setStep('reveal');

        // PRODUCT BET ACCUMULATION: If anyone (including bots) won a Product bet this round, add to accumulator
        if (res.successfulBids) {
            setRewardAccumulator(prev => {
                const next = { ...prev };
                res.successfulBids?.forEach(b => {
                    if (b.bid === 'product') {
                        next[b.actorId] = (next[b.actorId] || 0) + 1;
                    }
                });
                return next;
            });
        }

        // Auto-advance to Outcome Modal after animation
        setTimeout(() => setStep('outcome_rsp'), 2000);
    };

    // Handler: Trigger a Re-Roll (from Tied Winners, Draw, or Electricity Bid)
    const handleReRollRequest = () => {
        setReRollCount(prev => prev + 1);
        if (!result) return;

        // Update survivors for next iteration
        const newSurvivors = result.survivorIds;
        setSurvivorIds(newSurvivors);

        // Reset the player's choice ONLY if they are still in the conflict
        if (newSurvivors.includes(localPlayerId)) {
            setPlayerChoice('');
        }

        const newOppChoices: { [id: string]: string } = {};
        conflict.opponents.forEach(opp => {
            if (newSurvivors.includes(opp.actorId)) {
                // If bot, randomize. If human, it will be synced via useEffect.
                const isBot = (opp.playerId || opp.actorId).startsWith('bot');
                if (isBot) {
                    const roll = Math.random();
                    newOppChoices[opp.actorId] = roll < 0.33 ? 'rock' : roll < 0.66 ? 'paper' : 'scissors';
                } else {
                    newOppChoices[opp.actorId] = opponentChoices[opp.actorId]; // Keep previous until synced
                }
            }
        });
        setOpponentChoices(newOppChoices);

        setResult(null);
        setStep('intro');
    };

    // Handler: Next (Check Bids or Close)
    const handleNext = () => {
        if (!result) return;

        // Bids logic that forces modal steps
        // Energy/Restart logic (Energy bid or Politician Draw)
        if (result.restart) {
            // Need to show "outcome_bid" first if it was an energy bid to explain the restart
            const hasEnergyBid = result.successfulBids?.some(b => b.bid === 'electricity');
            if (hasEnergyBid && step === 'outcome_rsp') {
                // First click: show the bid outcome explanation
                setStep('outcome_bid');
                return;
            }
            // After showing bid outcome (or if it's a Politician draw), transition to 'outcome_rsp' to show Re-Roll buttons
            if (step !== 'outcome_rsp') {
                setStep('outcome_rsp');
                return;
            }
            // If already on outcome_rsp, let user click the Re-Roll button (don't call onResolve)
            return;
        }

        // Product Bid logic (Win)
        const hasProductBid = result.successfulBids?.some(b => b.bid === 'product' && b.actorId === localPlayerId);
        if (hasProductBid && result.winnerId === localPlayerId) {
            if (step !== 'outcome_bid') {
                // Add the log dynamically right before showing
                const updatedLogs = [...result.logs, "Product Bid: DOUBLE PRIZE!"];
                setResult({ ...result, logs: updatedLogs });
                setStep('outcome_bid');
                return;
            }
        }

        // If no bid effect pending or already showed it -> Confirm & Close
        // Send the usedBid back to page.tsx so it knows whether to double the reward, independent of the initial actor bid state!
        // We pass the final result but augmented with the accumulated reward
        const additionalBids: { actorId: string; bid: string }[] = [];
        Object.entries(rewardAccumulator).forEach(([aId, count]) => {
            for (let i = 0; i < count; i++) {
                additionalBids.push({ actorId: aId, bid: 'product' });
            }
        });

        const finalResult: ConflictResult = {
            ...result,
            // We pass the final result augmented with ALL accumulated rewards for ALL participants
            successfulBids: [
                ...(result.successfulBids || []),
                ...additionalBids
            ]
        };
        onResolve(finalResult);
    };

    const bgImage = LOCATION_IMAGES[conflict.locId] || LOCATION_IMAGES['square'];

    // Helper: Determine grayscale
    const isActorLoser = (actorId: string) => {
        if (step === 'intro' || step === 'reveal') {
            return !survivorIds.includes(actorId); // If they didn't survive previous round
        }
        if (!result) return !survivorIds.includes(actorId);

        // In outcome view
        if (result.isDraw || result.shareRewards) return false;
        if (result.winnerId === actorId) return false;

        // If it's a tied winner scenario, they are NOT losers
        if (result.restart && result.survivorIds.includes(actorId)) return false;

        return true;
    };

    return (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-black">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <Image src={bgImage} fill className="object-cover opacity-80" alt="Backdrop" priority />
            </div>

            {/* SCENE: Actors & Tokens */}
            <div className="relative z-10 w-full max-w-[1400px] h-full flex items-end justify-between px-10 pb-0">

                {/* Left: Player - Only show if survivor */}
                {survivorIds.includes(localPlayerId) ? (
                    <div className={`relative w-[350px] h-[550px] flex items-end justify-center transition-all duration-1000 ${isActorLoser(localPlayerId) ? 'grayscale opacity-60' : ''}`}>
                        {/* Stack Above Head (Bottom to Top: Avatar -> RSP -> Bid) */}
                        <div className="absolute bottom-[100%] mb-4 flex flex-col-reverse items-center gap-3 z-30">
                            {/* 1. Player Avatar */}
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.4)] relative bg-[#1a1a1c]">
                                <Image
                                    src={conflict.playerActor.playerAvatar || player?.avatar || '/avatars/golden_avatar.png'}
                                    fill
                                    className="object-cover"
                                    alt="Player"
                                />
                            </div>
                            {/* 2. RSP Token */}
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-24 h-24 relative"
                            >
                                {playerChoice ? (
                                    <Image src={RSP_ICONS[playerChoice] || RSP_ICONS['rock']} fill className="object-contain drop-shadow-[0_0_20px_rgba(255,255,0,0.5)]" alt="Player Choice" />
                                ) : (
                                    <div className="w-full h-full rounded-full border-2 border-white/20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                        <span className="text-4xl font-bold text-white/50">?</span>
                                    </div>
                                )}
                            </motion.div>
                            {/* 3. Bid Token (Hide on re-roll - bets are burned) */}
                            {conflict.playerActor.bid && !isRoundTwo && (
                                <div className="w-12 h-12 relative animate-bounce">
                                    <Image src={BID_ICONS[conflict.playerActor.bid]} fill className="object-contain drop-shadow-lg" alt="Bid" />
                                </div>
                            )}
                        </div>

                        {/* Actor Body */}
                        <div className="relative w-full h-[120%]">
                            {conflict.playerActor?.actorType === 'player' ? (
                                <div className="absolute inset-0 flex items-center justify-center p-12">
                                    <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-[#d4af37] shadow-[0_0_50px_rgba(212,175,55,0.3)]">
                                        <Image
                                            src={conflict.playerActor.avatar || player?.avatar || '/avatars/golden_avatar.png'}
                                            fill
                                            className="object-cover"
                                            alt="Player Avatar"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <Image
                                    src={ACTOR_IMAGES[conflict.playerActor?.actorType?.toLowerCase()] || ACTOR_IMAGES['politician']}
                                    fill
                                    className="object-contain object-bottom drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                                    alt="Player Actor"
                                />
                            )}
                        </div>

                        {/* Tag */}
                        <div className="absolute bottom-8 bg-black/80 px-6 py-2 rounded-full border border-[#d4af37] text-[#d4af37] font-bold text-lg uppercase tracking-widest z-20">
                            YOU
                        </div>
                    </div>
                ) : (
                    <div className="w-[350px]" /> // Maintain spacing
                )}

                {/* Center: VS (Only Intro/Reveal) */}
                {(step === 'intro' || step === 'reveal') && (
                    <div className="mb-48">
                        <h1 className="text-[120px] font-black italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 drop-shadow-[0_0_30px_rgba(255,0,0,0.6)] font-rajdhani">
                            VS
                        </h1>
                    </div>
                )}

                {/* Right: Opponents - Only show survivors and ignore duplicate local player */}
                <div className="flex gap-10">
                    {conflict.opponents
                        .filter(opp => survivorIds.includes(opp.actorId) && opp.actorId !== localPlayerId)
                        .map((opp, idx) => (
                            <div key={opp.actorId} className={`relative w-[350px] h-[550px] flex items-end justify-center transition-all duration-1000 ${isActorLoser(opp.actorId) ? 'grayscale opacity-60' : ''}`}>

                                {/* Stack Above Head */}
                                <div className="absolute bottom-[100%] mb-4 flex flex-col-reverse items-center gap-3 z-30">
                                    {/* 1. Opponent Player Avatar */}
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/40 relative bg-[#1a1a1c]">
                                        {opp.playerAvatar ? (
                                            <Image src={opp.playerAvatar} fill className="object-cover" alt={opp.name} />
                                        ) : (
                                            <div className="w-full h-full bg-gray-800" />
                                        )}
                                    </div>
                                    {/* 2. RSP Token */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: step === 'intro' ? 0.9 : 1, opacity: 1 }}
                                        className="w-24 h-24 relative"
                                    >
                                        {step === 'intro' ? (
                                            <div className="w-full h-full bg-white/10 backdrop-blur-md rounded-full border border-white/20 animate-pulse flex items-center justify-center">
                                                <span className="text-3xl font-bold text-white/50">?</span>
                                            </div>
                                        ) : (
                                            <Image src={RSP_ICONS[opponentChoices[opp.actorId]] || RSP_ICONS['rock']} fill className="object-contain drop-shadow-2xl" alt="Opponent Choice" />
                                        )}
                                    </motion.div>
                                    {/* 3. Bid Token */}
                                    {opp.bid && !isRoundTwo && (
                                        <div className="w-12 h-12 relative animate-bounce">
                                            <Image src={BID_ICONS[opp.bid]} fill className="object-contain drop-shadow-lg" alt="Bid" />
                                        </div>
                                    )}
                                </div>

                                {/* Actor Body */}
                                <div className="relative w-full h-[120%]">
                                    {opp.actorType === 'player' ? (
                                        <div className="absolute inset-0 flex items-center justify-center p-12">
                                            <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-white/40 shadow-2xl">
                                                <Image
                                                    src={opp.playerAvatar || '/avatars/viper.png'}
                                                    fill
                                                    className="object-cover"
                                                    alt="Opponent Avatar"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <Image
                                            src={ACTOR_IMAGES[opp.actorType?.toLowerCase()] || ACTOR_IMAGES['robot']}
                                            fill
                                            className={`object-contain object-bottom drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] ${idx % 2 === 0 ? 'sepia-0' : 'sepia'}`}
                                            alt="Opponent Actor"
                                        />
                                    )}
                                </div>

                                {/* Tag */}
                                <div className="absolute bottom-8 bg-black/80 px-4 py-1 rounded-full border border-white/30 text-white font-bold tracking-wider z-20">
                                    {opp.name}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* BUTTON / SELECTION: Intro Only */}
            {step === 'intro' && (
                <div className="absolute bottom-10 z-[60] flex flex-col items-center gap-4">
                    {!playerChoice ? (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <p className="text-white font-rajdhani text-xl uppercase tracking-widest bg-black/50 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                {isRoundTwo ? "Tie-Breaker: Select New Argument" : "Select Argument"}
                            </p>
                            <div className="flex gap-6 bg-black/80 p-4 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
                                {['rock', 'paper', 'scissors'].map(token => (
                                    <button
                                        key={token}
                                        onClick={() => handleChoiceSelect(token)}
                                        className={`w-20 h-20 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110 shadow-lg ${playerChoice === token ? 'border-[#d4af37] bg-[#d4af37]/40 scale-110' : 'border-white/20 hover:border-[#d4af37] hover:bg-[#d4af37]/20'}`}
                                    >
                                        <Image src={RSP_ICONS[token]} width={40} height={40} alt={token} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleReveal}
                            disabled={(() => {
                                if (!game?.isBotGame) {
                                    // PvP: require player to have chosen AND all opponents to have submitted
                                    return !playerChoice || !pvpAllSubmitted;
                                }
                                // Bot game: only the local player needs to commit (bots auto-choose)
                                // Filter to surviving human opponents only
                                const survivingHumanOpps = conflict.opponents
                                    .filter(o => survivorIds.includes(o.actorId) && !(o.playerId || o.actorId).startsWith('bot'));
                                const humanIds = [localPlayerId, ...survivingHumanOpps.map(o => o.actorId)];
                                return humanIds.some(id => id === localPlayerId ? !playerChoice : !opponentChoices[id]);
                            })()}
                            className="px-16 py-4 bg-[#d4af37] text-black font-black text-2xl uppercase tracking-[0.2em] rounded-sm hover:bg-[#ffe066] shadow-[0_0_40px_rgba(212,175,55,0.4)] transition-transform hover:scale-105 active:scale-95 animate-in zoom-in duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
                        >
                            {(() => {
                                if (!game?.isBotGame) {
                                    if (!playerChoice) return 'SELECT YOUR CHOICE';
                                    if (!pvpAllSubmitted) return 'WAITING FOR OPPONENT...';
                                    return 'Reveal Conflict';
                                }
                                // Only count surviving human participants
                                const survivingHumanOpps = conflict.opponents
                                    .filter(o => survivorIds.includes(o.actorId) && !(o.playerId || o.actorId).startsWith('bot'));
                                const humanIds = [localPlayerId, ...survivingHumanOpps.map(o => o.actorId)];
                                const pendingCount = humanIds.filter(id => id === localPlayerId ? !playerChoice : !opponentChoices[id]).length;
                                return pendingCount > 0 ? `WAITING (${pendingCount}/${humanIds.length})` : 'Reveal Conflict';
                            })()}
                        </button>
                    )}
                </div>
            )}

            {/* MODAL: Outcome & Interaction */}
            <AnimatePresence>
                {(step === 'outcome_rsp' || step === 'outcome_bid') && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-[600px] bg-[#0d0d12] border border-[#d4af37]/30 rounded-2xl p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)]"
                        >
                            {/* Header */}
                            <div className="bg-[#1a1a20] p-6 border-b border-white/5 text-center">
                                {(() => {
                                    const isSurvivor = result?.survivorIds.includes(localPlayerId);
                                    const isLoser = result?.loserIds.includes(localPlayerId);
                                    const isWinner = result?.winnerId === localPlayerId;
                                    const isDrawTrue = result?.isDraw;
                                    const isRestart = result?.restart;
                                    
                                    const playerHasRecycling = result?.successfulBids?.some(b => b.actorId === localPlayerId && b.bid === 'recycling');

                                    let header = "DRAW";
                                    let textColor = "text-blue-400";
                                    let subtext = "";

                                    if (isWinner || (isDrawTrue && playerHasRecycling && result?.shareRewards)) {
                                        const isActionCard = conflict.resourceType === 'action_card';
                                        header = isActionCard ? "ACTION CARD SECURED" : (conflict.opponents.length === 0 ? "SECURED" : "WIN");
                                        textColor = "text-[#d4af37]";
                                        subtext = conflict.opponents.length === 0 ? "Mining operations secured without opposition." : (playerHasRecycling ? "Recycling Bid: Argument elevated to WIN!" : "Your arguments prevailed over the opposition.");
                                    } else if (isLoser) {
                                        header = "LOSE";
                                        textColor = "text-red-500";
                                        subtext = "You failed to convince the assembly.";
                                    } else if (isRestart) {
                                        header = isDrawTrue ? "DRAW" : "RESTART";
                                        textColor = isDrawTrue ? "text-blue-400" : "text-purple-400";
                                        subtext = isDrawTrue ? "The negotiation stalled. A new argument is required." : "The confrontation continues. Prepare for another round.";
                                    } else if (isDrawTrue) {
                                        header = "DRAW";
                                        textColor = "text-blue-400";
                                        subtext = result?.evictAll ? "Refusing to compromise, all Artists leave the location." : "Mutual advancement: individual research leads to success.";
                                    }

                                    return (
                                        <>
                                            <h2 className={`font-rajdhani font-bold text-4xl tracking-widest uppercase ${textColor}`}>
                                                {header}
                                            </h2>
                                            <p className="text-white/60 text-sm mt-2 italic font-mono">
                                                {subtext}
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Body */}
                            <div className="p-8 flex flex-col items-center gap-8">

                                {/* RE-ROLL STATE: Caused by Draw (Politician) OR Energy Bid (Loss) */}
                                {step === 'outcome_rsp' && result?.restart && (
                                    <div className="flex flex-col items-center gap-4 w-full">
                                        <p className="text-white text-lg uppercase tracking-widest mb-2 text-center">
                                            {result.isDraw ? "Resolve the Conflict. Confrontation restarted:" : "Energy Bid active: Confrontation restarted!"}
                                        </p>
                                        
                                        {/* PER-ACTOR SUMMARY LIST (Restart Mode) */}
                                        {renderSummaryList(true)}

                                        <div className="flex gap-6 mt-4">
                                            <button
                                                onClick={handleReRollRequest}
                                                className="px-8 py-3 bg-[#d4af37] text-black font-bold uppercase tracking-widest hover:bg-[#ffe066] rounded shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                                            >
                                                Select New Argument
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* WIN/DRAW: Reward Display (Local Player) */}
                                {step === 'outcome_rsp' && !result?.restart && (
                                    <div className="w-full">
                                        {(result?.winnerId === localPlayerId || (result?.isDraw && result?.shareRewards && survivorIds.includes(localPlayerId))) && (
                                            <div className="flex flex-col items-center mb-6">
                                                <div className="w-24 h-24 mx-auto mb-4 relative flex items-center justify-center bg-white/5 rounded-full border border-white/10">
                                                    <div className="relative w-16 h-16">
                                                        <Image
                                                            src={(() => {
                                                                const actorType = conflict.playerActor?.actorType?.toLowerCase();
                                                                if (actorType === 'politician') return RESOURCE_ICONS['power'];
                                                                if (actorType === 'scientist') return RESOURCE_ICONS['knowledge'];
                                                                if (actorType === 'artist') return RESOURCE_ICONS['art'];
                                                                if (conflict.resourceType === 'action_card') return '/actions/Teleportation.png';
                                                                if (conflict.resourceType) return RESOURCE_ICONS[conflict.resourceType] || RESOURCE_ICONS['fame'];
                                                                return RESOURCE_ICONS['fame'];
                                                            })()}
                                                            fill className="object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]" alt="Outcome"
                                                        />
                                                    </div>
                                                    <div className="absolute -bottom-2 right-0 bg-[#d4af37] text-black font-black text-xl px-2 py-0.5 rounded-md border-2 border-black shadow-lg shadow-[#d4af37]/50">
                                                        +{(() => {
                                                            const actorType = conflict.playerActor?.actorType?.toLowerCase();
                                                            const bids = (result?.successfulBids || []);
                                                            return calculateReward(actorType as any, result?.winnerId === localPlayerId, !!(result?.isDraw && result?.shareRewards), bids, localPlayerId);
                                                        })()}
                                                    </div>
                                                </div>
                                                <p className="text-xl font-bold uppercase text-white">
                                                    {conflict.resourceType === 'action_card' ? 'Action Card Secured' : (conflict.playerActor?.actorType?.toLowerCase() === 'robot' ? 'Resource Produced' : 'Value Secured')}
                                                </p>
                                            </div>
                                        )}

                                        {/* PER-ACTOR SUMMARY LIST (Outcome Mode) */}
                                        {renderSummaryList(false)}

                                        <button
                                            onClick={handleNext}
                                            className="w-full px-10 py-3 bg-[#d4af37] text-black font-bold uppercase tracking-widest rounded hover:bg-[#ffe066] mt-4"
                                        >
                                            {hasNextConflict ? 'Next Step' : 'Next Phase'}
                                        </button>
                                    </div>
                                )}

                                {/* BID OUTCOME STAGE */}
                                {step === 'outcome_bid' && (
                                    <div className="text-center w-full">
                                        <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 p-6 rounded-xl border border-white/10 mb-6">
                                            <h3 className="text-[#d4af37] font-bold text-2xl mb-2">BID EFFECT TRIGGERED</h3>
                                            <ul className="text-left text-sm text-gray-300 space-y-2">
                                                {result?.logs.map((log, i) => (
                                                    <li key={i} className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />
                                                        {log}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <button
                                            onClick={handleNext}
                                            className="w-full px-10 py-3 border border-white/30 text-white font-bold uppercase tracking-widest rounded hover:bg-white/10"
                                        >
                                            Close
                                        </button>
                                    </div>
                                )}

                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
