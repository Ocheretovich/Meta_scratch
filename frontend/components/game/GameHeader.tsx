import React, { useState } from 'react';
import Image from 'next/image';

interface DiscardCard {
    id: string;
    title: string;
    image?: string;
    icon?: string;
}

interface GameHeaderProps {
    turn: number;
    phase: number;
    phaseName: string;
    eventDeckCount?: number;
    actionDeckCount?: number;
    eventDiscardPile?: DiscardCard[];
    actionDiscardPile?: DiscardCard[];
    onMenuClick?: () => void;
}

export default function GameHeader({
    turn, phase, phaseName,
    eventDeckCount = 0, actionDeckCount = 0,
    eventDiscardPile = [], actionDiscardPile = [],
    onMenuClick
}: GameHeaderProps) {
    const [showDiscard, setShowDiscard] = useState<'event' | 'action' | null>(null);

    return (
        <div className="absolute top-0 left-0 w-full z-50 pointer-events-none">
            {/* Full-width dark bar background */}
            <div className="w-full h-[36px] bg-gradient-to-b from-[#171B21] via-[#1C1F26] to-[#23262D] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
                <div className="w-full h-full flex items-center justify-end gap-0">

                    {/* Spacer — pushes everything to the right */}
                    <div className="flex-1" />

                    {/* DECK COUNTS — positioned right before Phase box */}
                    <div className="flex items-center gap-4 px-4 h-full border-l border-[#514D44]">
                        {/* EVENT DECK */}
                        <div
                            className="flex items-center gap-1.5 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setShowDiscard(showDiscard === 'event' ? null : 'event')}
                        >
                            <Image src="/decks/event_deck_v2.png" width={20} height={20} className="object-contain" alt="Event Deck" priority />
                            <span className="text-[#a08c5c] font-bold text-sm font-mono">{eventDeckCount}</span>
                        </div>

                        {/* ACTION DECK */}
                        <div
                            className="flex items-center gap-1.5 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setShowDiscard(showDiscard === 'action' ? null : 'action')}
                        >
                            <Image src="/decks/action_deck_v2.png" width={20} height={20} className="object-contain" alt="Action Deck" priority />
                            <span className="text-[#a08c5c] font-bold text-sm font-mono">{actionDeckCount}</span>
                        </div>
                    </div>

                    {/* PHASE NAME + NUMBER */}
                    <div className="flex flex-col items-center justify-center px-5 h-full bg-gradient-to-r from-[#12161E] via-[#171A22] to-[#24272E] border-l border-[#514D44]">
                        <span className="text-gray-400 font-bold text-[9px] tracking-tighter opacity-70 leading-none">PHASE {phase}</span>
                        <span className="text-white font-bold text-xs uppercase tracking-wider leading-tight">{phaseName}</span>
                    </div>

                    {/* TURN BOX */}
                    <div className="flex flex-col items-center justify-center px-6 h-full bg-gradient-to-r from-[#12161E] via-[#171A22] to-[#2F3238] border-l border-[#514D44]">
                        <span className="text-gray-400 font-bold text-[9px] tracking-tighter opacity-70 leading-none">TURN</span>
                        <span className="text-white font-bold text-lg font-sans leading-tight">{turn}</span>
                    </div>

                    {/* Menu Button */}
                    <div
                        className="relative w-[36px] h-full flex items-center justify-center bg-[#23262D] border-l border-[#514D44] pointer-events-auto cursor-pointer hover:bg-[#2a2e36] transition-colors"
                        onClick={onMenuClick}
                    >
                        <div className="flex flex-col gap-[3px]">
                            <div className="w-[14px] h-[1.5px] bg-[#a08c5c]" />
                            <div className="w-[14px] h-[1.5px] bg-[#a08c5c]" />
                            <div className="w-[14px] h-[1.5px] bg-[#a08c5c]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* DISCARD PILE DROPDOWN */}
            {showDiscard && (
                <div className="absolute right-[180px] top-[36px] pointer-events-auto z-[100]">
                    <div className="bg-[#1a1d24] border border-[#514D44] rounded-b-lg shadow-2xl min-w-[220px] max-h-[320px] overflow-y-auto">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[#514D44]">
                            <span className="text-[#a08c5c] font-bold text-xs uppercase tracking-wider">
                                {showDiscard === 'event' ? 'Event' : 'Action'} Discard Pile
                            </span>
                            <button
                                className="text-gray-500 hover:text-white text-sm"
                                onClick={() => setShowDiscard(null)}
                            >
                                X
                            </button>
                        </div>
                        {(showDiscard === 'event' ? eventDiscardPile : actionDiscardPile).length === 0 ? (
                            <div className="px-3 py-4 text-gray-500 text-xs text-center">
                                No cards played yet
                            </div>
                        ) : (
                            <div className="p-2 flex flex-col gap-1">
                                {(showDiscard === 'event' ? eventDiscardPile : actionDiscardPile).map((card, i) => (
                                    <div key={`${card.id}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#23262D] hover:bg-[#2a2e36] transition-colors">
                                        {(card.image || card.icon) && (
                                            <Image src={card.image || card.icon || ''} width={28} height={28} className="object-contain rounded" alt={card.title} />
                                        )}
                                        <span className="text-white text-xs font-medium">{card.title}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
