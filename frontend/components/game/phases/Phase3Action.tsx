"use client";

import React from 'react';
import Image from 'next/image';
import { ActionCardInstance } from '@/lib/modules/core/types';
import { LOCATIONS } from '@/data/gameConstants';
import ActionCardsPanel from '../ActionCardsPanel';

interface Phase3ActionProps {
    p3Step: 0 | 1 | 2 | 3 | 4;
    actionHand: ActionCardInstance[];
    selectedActionCards: Record<string, number>;
    onToggleCard: (cardId: string, count: number) => void;
    onCommit: () => void;
    disabledLocations: string[];
    actionDiscardPile: ActionCardInstance[];
    isWaitingForPlayers: boolean;
    game: any;
    opponentsReady: boolean;
    relocationCardsCount: number;
    exchangeCardsCount: number;
    playerConflictContext: any;
    exchangeResults: any[] | null;
    selectedRelocationCount?: number;
    remainingRelocations?: number;
    relocationSource?: string | null;
    locationsBlockedBy?: Record<string, string>;
}

const Phase3Action: React.FC<Phase3ActionProps> = ({
    p3Step,
    actionHand,
    selectedActionCards,
    onToggleCard,
    onCommit,
    disabledLocations,
    actionDiscardPile,
    isWaitingForPlayers,
    game,
    opponentsReady,
    relocationCardsCount,
    exchangeCardsCount,
    playerConflictContext,
    exchangeResults,
    selectedRelocationCount = 0,
    remainingRelocations = 0,
    relocationSource = null,
    locationsBlockedBy = {}
}) => {
    // Step 0: Select Action Cards
    if (p3Step === 0) {
        return (
            <div className="absolute inset-0 z-[300] pointer-events-none">
                <ActionCardsPanel
                    cards={actionHand as any}
                    selectedCounts={selectedActionCards}
                    onToggleCard={(id, count) => {
                        onToggleCard(id as any, count);
                    }}
                    emptyMessage="No Action Cards — click Next Phase to continue"
                />
            </div>
        );
    }

    // Step 1: Blocked Locations Board
    if (p3Step === 1) {
        return (
            <div className="absolute inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
                <div className="relative w-[500px] bg-[#0d0d12] border border-[#d4af37]/30 rounded-xl shadow-2xl p-8 flex flex-col items-center">
                    <h2 className="text-3xl font-black text-[#d4af37] mb-6 uppercase tracking-widest">Blocked Locations</h2>
                    
                    {disabledLocations.length > 0 ? (
                        <div className="flex flex-col items-center gap-3 mb-8 w-full">
                            {disabledLocations.map(locId => {
                                const locDef = LOCATIONS.find((l: any) => l.id === locId) || { name: locId };
                                const disablingCard = actionHand.find(c => c.disables === locId) || actionDiscardPile.find(c => c.disables === locId);
                                const cardTitle = disablingCard ? disablingCard.title : 'Sabotage';
                                const blockedByName = locationsBlockedBy[locId];
                                return (
                                    <div key={locId} className="w-full bg-[#1a1a24] border border-[#d4af37]/20 rounded-lg px-6 py-3 text-center">
                                        <p className="text-white text-xl font-rajdhani uppercase tracking-wider">
                                            <span className="text-[#d4af37] font-bold">{locDef.name}</span>
                                            <span className="text-white/70"> will not work this turn</span>
                                        </p>
                                        <p className="text-white/40 text-sm mt-1">
                                            {blockedByName
                                                ? <><span className="text-[#e07060] font-semibold">{blockedByName}</span> played <span className="italic">{cardTitle}</span></>
                                                : <>because of the area under construction</>
                                            }
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-white/50 text-xl font-rajdhani mb-8">No locations blocked this turn.</p>
                    )}

                    <button
                        onClick={onCommit}
                        disabled={isWaitingForPlayers || (game?.isBotGame && !opponentsReady)}
                        className={`px-12 py-4 font-bold uppercase tracking-widest rounded-lg transition-all transform hover:scale-105 ${
                            (isWaitingForPlayers || (game?.isBotGame && !opponentsReady))
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-2 border-gray-500'
                                : 'bg-gradient-to-r from-[#d4af37] to-[#f3bd48] text-black hover:from-[#ffe066] hover:to-[#ffd700]'
                        }`}
                    >
                        {(isWaitingForPlayers || (game?.isBotGame && !opponentsReady)) ? "WAITING FOR OTHERS..." : "Get It!"}
                    </button>
                </div>
            </div>
        );
    }

    // Step 2: Relocation
    if (p3Step === 2) {
        // Player has no relocation cards selected — just show waiting
        if (selectedRelocationCount === 0) {
            return (
                <div className="absolute inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
                    <div className="relative w-[500px] bg-[#0d0d12] border border-[#d4af37]/30 rounded-xl shadow-2xl p-12 flex flex-col items-center">
                        <h2 className="text-4xl font-black text-[#d4af37] mb-8 uppercase tracking-widest font-rajdhani drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]">Relocation</h2>
                        <p className="text-white/80 text-xl font-rajdhani uppercase tracking-widest mb-8">No relocations this step.</p>

                        <button
                            onClick={onCommit}
                            disabled={isWaitingForPlayers || (game?.isBotGame && !opponentsReady)}
                            className={`px-12 py-4 font-bold uppercase tracking-widest rounded-lg transition-all transform hover:scale-105 ${
                                (isWaitingForPlayers || (game?.isBotGame && !opponentsReady))
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-2 border-gray-500'
                                    : 'bg-gradient-to-r from-[#d4af37] to-[#f3bd48] text-black hover:from-[#ffe066] hover:to-[#ffd700]'
                            }`}
                        >
                            {(isWaitingForPlayers || (game?.isBotGame && !opponentsReady)) ? "WAITING FOR OTHERS..." : "Get It!"}
                        </button>
                    </div>
                </div>
            );
        }

        // Player has relocation cards — show instruction panel (non-blocking, so they can interact with map)
        return (
            <div className="absolute top-[10%] right-10 z-[400] pointer-events-auto">
                <div className="w-[320px] bg-[#0d0d12]/95 border-2 border-[#d4af37] rounded-2xl shadow-[0_0_40px_rgba(212,175,55,0.2)] p-6 flex flex-col items-center backdrop-blur-md">
                    <h2 className="text-2xl font-black text-[#d4af37] mb-3 uppercase tracking-widest font-rajdhani">Relocation</h2>

                    <p className="text-white/70 text-sm text-center mb-4 font-rajdhani">
                        {relocationSource
                            ? "Now click a valid location to move the actor."
                            : "Click any actor on the board to select it for relocation."
                        }
                    </p>

                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-white/50 text-xs uppercase tracking-widest">Relocations remaining:</span>
                        <span className="text-[#d4af37] text-2xl font-black">{remainingRelocations}</span>
                    </div>

                    {relocationSource && (
                        <div className="text-yellow-400/80 text-xs uppercase tracking-widest animate-pulse mb-4">
                            Actor selected — pick destination
                        </div>
                    )}

                    <button
                        onClick={onCommit}
                        disabled={remainingRelocations > 0}
                        className={`w-full px-8 py-3 font-bold uppercase tracking-widest rounded-xl transition-all text-sm ${
                            remainingRelocations > 0
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#d4af37] to-[#f3bd48] text-black hover:scale-105'
                        }`}
                    >
                        {remainingRelocations > 0 ? `Use ${remainingRelocations} more card${remainingRelocations > 1 ? 's' : ''}` : "Done"}
                    </button>
                </div>
            </div>
        );
    }

    // Step 3: Change Values Results Summary
    if (p3Step === 3 && exchangeResults) {
        return (
            <div className="absolute inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto">
                <div className="relative w-[600px] bg-[#0d0d12] border-2 border-[#d4af37] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.3)] p-10 flex flex-col items-center">
                    <h2 className="text-4xl font-black text-[#d4af37] mb-8 uppercase tracking-[0.3em] font-rajdhani">Exchange Report</h2>
                    
                    <div className="w-full flex flex-col gap-4 mb-10 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {exchangeResults.map((res, i) => (
                            <div key={i} className="flex flex-col p-6 bg-white/5 rounded-2xl border border-white/10 gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#d4af37] font-bold text-xs uppercase tracking-widest">{res.pName}</span>
                                        <span className="text-white/40 text-[10px] uppercase">Gives</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white/40 text-[10px] uppercase">Takes</span>
                                        <span className="text-[#d4af37] font-bold text-xs uppercase tracking-widest">{res.pName}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Image src={`/intangibles/resource_${res.sourceVal === 'knowledge' ? 'wisdom' : res.sourceVal}.png`} width={32} height={32} alt={res.sourceVal} />
                                        <span className="text-white font-black text-xl">{res.sourceVal.toUpperCase()}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M7 10l5 5 5-5"/>
                                            <path d="M17 14l-5-5-5 5"/>
                                        </svg>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-white font-black text-xl">{res.targetVal.toUpperCase()}</span>
                                        <Image src={`/intangibles/resource_${res.targetVal === 'knowledge' ? 'wisdom' : res.targetVal}.png`} width={32} height={32} alt={res.targetVal} />
                                    </div>
                                </div>
                                <div className="text-center text-white/20 text-[10px] uppercase tracking-widest font-bold">
                                    Target: {res.targetName}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-white/40 text-[10px] uppercase font-bold tracking-[0.5em] animate-pulse">
                        Finalizing Action Phase...
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default Phase3Action;
