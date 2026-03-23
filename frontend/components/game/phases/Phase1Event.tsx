"use client";

import React from 'react';
import Image from 'next/image';
import { EventCardDefinition } from "@/lib/modules/core/types";
import ConflictResolutionView from "../ConflictResolutionView";

interface Phase1EventProps {
    game: any;
    currentEvent: EventCardDefinition | null;
    eventResult: { msg: string; win: boolean; winnerName?: string; rewardLabel?: string; isTie?: boolean; tieParticipants?: string[] } | null;
    discardAmount: number;
    setDiscardAmount: (amount: number | ((prev: number) => number)) => void;
    onConfirm: () => void;
    onClose: () => void;
    eventTieBreakerActive: { conflict: any } | null;
    onTieBreakerResolve: (result: any) => void;
    resources: any;
    onCommitTurn: () => void;
}

const Phase1Event: React.FC<Phase1EventProps> = ({
    game,
    currentEvent,
    eventResult,
    discardAmount,
    setDiscardAmount,
    onConfirm,
    onClose,
    eventTieBreakerActive,
    onTieBreakerResolve,
    resources,
    onCommitTurn
}) => {
    // 1. Tie Breaker Modal
    if (eventTieBreakerActive) {
        return (
            <div className="absolute inset-0 z-[400] pointer-events-auto">
                <ConflictResolutionView
                    game={game}
                    conflict={eventTieBreakerActive.conflict}
                    onResolve={onTieBreakerResolve}
                    onClose={onClose}
                    hasNextConflict={false}
                />
            </div>
        );
    }

    // 2. No Events Remaining
    if (!currentEvent && (game?.gameState?.eventDeck || []).length === 0) {
        return (
            <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
                <div className="relative w-[600px] bg-[#0d0d12] border border-[#d4af37]/30 rounded-xl shadow-2xl p-10 flex flex-col items-center">
                    <h2 className="text-3xl font-black text-[#d4af37] mb-6 uppercase tracking-widest">End of Era</h2>
                    <p className="text-white text-xl text-center mb-8 font-rajdhani">There is no more Events in this game.</p>
                    <button
                        onClick={onCommitTurn}
                        className="px-12 py-4 bg-[#d4af37] text-black font-bold uppercase tracking-widest rounded-lg hover:bg-[#ffe066] transition-all"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        );
    }

    // 3. Event Card Active
    if (currentEvent) {
        const targetRes = currentEvent.targetResource;
        const maxDiscard = targetRes ? (resources[targetRes] || 0) : 0;

        return (
            <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
                <div className="relative w-[600px] bg-[#0d0d12] border border-[#d4af37]/30 rounded-xl shadow-2xl p-6 flex flex-col items-center">
                    <h2 className="text-xl font-bold text-[#d4af37] mb-2">{currentEvent.title}</h2>
                    <div className="relative w-full h-[200px] mb-4 border border-white/10 rounded overflow-hidden">
                        <Image src={currentEvent.image} fill className="object-cover" alt="event" />
                    </div>
                    <p className="italic text-gray-400 text-center mb-4">"{currentEvent.flavor}"</p>
                    <p className="text-white text-center mb-6">{currentEvent.desc}</p>

                    {!eventResult ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex gap-4">
                                {currentEvent.type === "discard" && (
                                    <div className="flex items-center gap-2 text-white">
                                        <button 
                                            onClick={() => setDiscardAmount(d => Math.max(0, d - 1))} 
                                            className="p-2 border rounded hover:bg-white/10"
                                        >-</button>
                                        <span className="font-bold text-xl">{discardAmount}</span>
                                        <button 
                                            onClick={() => setDiscardAmount(d => Math.min(maxDiscard, d + 1))} 
                                            className="p-2 border rounded hover:bg-white/10"
                                        >+</button>
                                    </div>
                                )}
                                <button 
                                    onClick={onConfirm} 
                                    className="px-6 py-2 bg-[#d4af37] text-black font-bold rounded hover:bg-[#ffe066]"
                                >
                                    CONFIRM
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <p className={`text-xl font-bold mb-2 text-center ${
                                eventResult.isTie ? 'text-yellow-400' : eventResult.win ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {eventResult.isTie ? "TIE!" : eventResult.win ? "SUCCESS!" : "FAILED"}
                            </p>
                            {eventResult.isTie && eventResult.tieParticipants && (
                                <p className="text-yellow-300 text-center font-semibold text-sm">
                                    Conflict Resolution needed between: {eventResult.tieParticipants.join(', ')}
                                </p>
                            )}
                            {!eventResult.isTie && eventResult.winnerName && eventResult.rewardLabel && (
                                <p className="text-[#d4af37] text-center font-semibold text-lg">
                                    {eventResult.winnerName} wins and earns {eventResult.rewardLabel}!
                                </p>
                            )}
                            {!eventResult.isTie && !eventResult.win && eventResult.winnerName && eventResult.rewardLabel && (
                                <p className="text-white/50 text-center text-sm">
                                    {eventResult.winnerName} earned {eventResult.rewardLabel}
                                </p>
                            )}
                            <p className="text-white/70 text-sm text-center mb-4">{eventResult.msg}</p>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-[#d4af37] text-black font-bold rounded hover:bg-[#ffe066]"
                            >
                                {eventResult.isTie ? "RESOLVE CONFLICT" : "CONTINUE"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default Phase1Event;
