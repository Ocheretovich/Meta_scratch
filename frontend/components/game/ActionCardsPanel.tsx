"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';

interface ActionCard {
    id: string;
    title: string;
    desc: string;
    type: string;
    icon?: string;
    flavor?: string;
    disables?: string;
}

interface ActionCardsPanelProps {
    cards: ActionCard[];
    selectedCounts: Record<string, number>;
    onToggleCard: (cardId: string, count: number) => void;
    emptyMessage?: string;
    compact?: boolean;
}

export default function ActionCardsPanel({ cards, selectedCounts, onToggleCard, emptyMessage, compact }: ActionCardsPanelProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Group cards by title to show counts
    const uniqueCards = useMemo(() => {
        const groups: { [key: string]: { card: ActionCard, count: number } } = {};
        cards.forEach(card => {
            if (!groups[card.title]) {
                groups[card.title] = { card, count: 0 };
            }
            groups[card.title].count++;
        });
        return Object.values(groups);
    }, [cards]);

    // Ensure currentIndex is valid if cards changed
    React.useEffect(() => {
        if (currentIndex >= uniqueCards.length) {
            setCurrentIndex(Math.max(0, uniqueCards.length - 1));
        }
    }, [uniqueCards.length, currentIndex]);

    if (cards.length === 0) {
        if (!emptyMessage) return null;
        return (
            <div className="absolute top-1/2 right-8 -translate-y-1/2 z-[70] animate-in fade-in slide-in-from-right-5 duration-500 pointer-events-none">
                <div className="px-10 py-4 bg-[#0d0d12]/90 backdrop-blur-md border border-[#d4af37]/30 rounded-2xl flex items-center justify-center shadow-2xl">
                    <span className="text-[#d4af37] font-rajdhani font-bold text-sm uppercase tracking-[0.3em] animate-pulse glow-gold">{emptyMessage}</span>
                </div>
            </div>
        );
    }

    // Compact Mode (Opponent Cards)
    if (compact) {
        return (
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40 animate-in slide-in-from-right-10 duration-500 pointer-events-none">
                {uniqueCards.map(({ card, count }) => (
                    <div
                        key={card.title}
                        className="group relative w-48 h-64 rounded-2xl border-2 border-white/20 bg-[#0d0d12]/95 backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                    >
                        <div className="p-5 flex flex-col h-full bg-[#171B21]/50">
                            <span className="text-[12px] uppercase font-black tracking-[0.2em] text-[#d4af37] mb-1.5">{card.type}</span>
                            <h4 className="font-bold text-white uppercase leading-tight mb-3 font-rajdhani text-lg">{card.title}</h4>

                            <div className="flex-1 rounded-xl border border-white/10 bg-white/5 mb-3 overflow-hidden relative">
                                {card.icon && <Image src={card.icon} fill className="object-cover opacity-90 group-hover:scale-110 transition-transform duration-700" alt={card.title} />}
                            </div>

                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[80%]">
                                <div className="px-3 py-1.5 rounded-full bg-[#d4af37] text-black flex items-center justify-center gap-1 border-2 border-white/20 shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                                    <span className="text-[10px] font-black opacity-70">CARDS:</span>
                                    <span className="text-sm font-black">{count}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const currentGroup = uniqueCards[currentIndex];
    const { card, count } = currentGroup;
    const selectedQty = selectedCounts[card.id] || 0;
    const isActive = selectedQty > 0;

    const nextCard = () => {
        setCurrentIndex((prev) => (prev + 1) % uniqueCards.length);
    };

    const prevCard = () => {
        setCurrentIndex((prev) => (prev - 1 + uniqueCards.length) % uniqueCards.length);
    };

    const handleCardClick = () => {
        let newQty = selectedQty + 1;
        if (newQty > count) newQty = 0;
        onToggleCard(card.id, newQty);
    };

    return (
        <div className="absolute top-[10%] right-10 z-50 flex flex-col items-center animate-in slide-in-from-right-10 duration-700 pointer-events-auto">
            <div className="flex items-center gap-4">
                {/* Prev Button */}
                <button
                    onClick={prevCard}
                    className="p-2 rounded-full bg-black/40 border border-white/10 hover:border-[#d4af37]/50 text-white/50 hover:text-[#d4af37] transition-all"
                >
                    <ChevronLeft size={24} />
                </button>

                {/* Main Card View */}
                <div
                    onClick={handleCardClick}
                    className={`relative w-[310px] h-[720px] rounded-[2.5rem] border transition-all cursor-pointer overflow-hidden
                        ${isActive
                            ? 'border-[#d4af37] bg-[#171B21] shadow-[0_0_80px_rgba(212,175,55,0.35)]'
                            : 'border-white/10 bg-[#0d0d12]/95 backdrop-blur-xl hover:border-[#d4af37]/40'
                        }
                    `}
                >
                    <div className="flex flex-col h-full items-center justify-center text-center">
                        {/* Header Section */}
                        <div className="px-2 pt-4 pb-2 w-full">
                            <span className="block text-base font-medium tracking-[0.2em] text-gray-500 mb-2 font-rajdhani">
                                {card.type}
                            </span>
                            <h3 className="text-3xl font-bold text-white uppercase font-rajdhani leading-tight tracking-tight">
                                {card.title}
                            </h3>
                        </div>

                        {/* Flavor Text Plate - Moved here */}
                        {card.flavor && (
                            <div className="px-3 w-full mb-4">
                                <div className="w-full px-6 py-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-xl">
                                    <p className="text-base text-[#d4af37] italic leading-snug font-serif line-clamp-2">
                                        "{card.flavor}"
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Ultra Large Borderless Image Section - Fixed stable size */}
                        <div className="w-full h-[420px] relative overflow-hidden group">
                            {card.icon && (
                                <Image
                                    key={card.id}
                                    src={card.icon}
                                    fill
                                    className="object-cover transition-transform duration-1000"
                                    alt={card.title}
                                />
                            )}

                            {/* Repositioned Count Badge as Overlay */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                                <div className="px-5 py-2 rounded-full bg-[#171B21] text-white font-black text-sm border-2 border-white/20">
                                    <span className="text-[10px] opacity-70">OWNED:</span> {count}
                                </div>
                                <div className={`px-5 py-2 rounded-full font-black text-sm border-2 shadow-[0_0_30px_rgba(212,175,55,0.5)] flex items-center gap-1 transition-colors ${isActive ? 'bg-[#d4af37] text-black border-[#ffe066]' : 'bg-black/50 text-[#d4af37] border-[#d4af37]/30'}`}>
                                    <span className="text-[10px] opacity-70">SELECTED:</span> {selectedQty}
                                </div>
                            </div>
                        </div>

                        {/* Description Section - NO flavor here */}
                        <div className="px-2 pt-1 pb-1 flex flex-col gap-5 flex-grow items-center justify-center text-center">
                            <p className="text-base text-gray-400 leading-relaxed font-rajdhani font-semibold px-8 line-clamp-2">
                                {card.desc}
                            </p>
                        </div>

                        {/* Interaction Prompt */}
                        <div className={`w-full mt-auto px-6 py-3 transition-colors border-t flex items-center justify-center gap-2 ${isActive ? 'bg-[#d4af37]/20 border-[#d4af37]/50' : 'bg-white/5 border-white/5 group-hover:bg-[#d4af37]/10'}`}>
                            <Zap size={14} className={isActive ? 'text-[#ffe066] animate-pulse' : 'text-[#d4af37]/50'} />
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${isActive ? 'text-[#ffe066]' : 'text-[#d4af37]/80'}`}>
                                {isActive ? 'Card Queued for Phase' : 'Click to Toggle Selection'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Next Button */}
                <button
                    onClick={nextCard}
                    className="p-2 rounded-full bg-black/40 border border-white/10 hover:border-[#d4af37]/50 text-white/50 hover:text-[#d4af37] transition-all"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Pagination Dots */}
            <div className="mt-6 flex gap-2">
                {uniqueCards.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 transition-all rounded-full ${i === currentIndex ? 'w-8 bg-[#d4af37]' : 'w-2 bg-white/10'}`}
                    />
                ))}
            </div>
        </div>
    );
}
