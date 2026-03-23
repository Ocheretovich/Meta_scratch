"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Briefcase, Activity, Trophy, Layers } from 'lucide-react';
import { ACTION_CARDS } from '@/data/gameConstants';
import { RESOURCE_ICONS } from '@/data/assetManifest';

interface InventoryStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    actionHand: any[];
    players: any[];
    localPlayerId: string;
    resources: any;
    victoryPoints: number;
    opponentsData: Record<string, any>;
    actionDiscardPile?: any[];
}

export default function InventoryStatsModal({
    isOpen,
    onClose,
    actionHand,
    players,
    localPlayerId,
    resources,
    victoryPoints,
    opponentsData,
    actionDiscardPile = []
}: InventoryStatsModalProps) {
    const [activeTab, setActiveTab] = useState<'inventory' | 'stats'>('inventory');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto">
            <div className="relative w-full max-w-4xl h-[80vh] bg-[#0d0d12] border-2 border-[#d4af37]/30 rounded-[2rem] shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col overflow-hidden">
                
                {/* Header & Tabs */}
                <div className="flex items-center justify-between px-10 py-8 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
                    <div className="flex items-center gap-12">
                        <button 
                            onClick={() => setActiveTab('inventory')}
                            className={`group relative py-2 flex items-center gap-3 transition-all ${activeTab === 'inventory' ? 'text-[#d4af37]' : 'text-white/40 hover:text-white/70'}`}
                        >
                            <Briefcase size={20} className={activeTab === 'inventory' ? 'animate-pulse' : ''} />
                            <span className="font-rajdhani font-bold uppercase tracking-[0.2em] text-lg">My Inventory</span>
                            {activeTab === 'inventory' && <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-[#d4af37] shadow-[0_0_10px_#d4af37]" />}
                        </button>
                        
                        <button 
                            onClick={() => setActiveTab('stats')}
                            className={`group relative py-2 flex items-center gap-3 transition-all ${activeTab === 'stats' ? 'text-[#d4af37]' : 'text-white/40 hover:text-white/70'}`}
                        >
                            <Activity size={20} className={activeTab === 'stats' ? 'animate-pulse' : ''} />
                            <span className="font-rajdhani font-bold uppercase tracking-[0.2em] text-lg">Global Stats</span>
                            {activeTab === 'stats' && <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-[#d4af37] shadow-[0_0_10px_#d4af37]" />}
                        </button>
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all transform hover:rotate-90"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {activeTab === 'inventory' ? (
                        <>
                            <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                            {actionHand.length > 0 ? (
                                actionHand.map((card, idx) => (
                                    <div 
                                        key={`${card.id}-${idx}`}
                                        className="relative group p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#d4af37]/40 hover:bg-[#d4af37]/5 transition-all"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-24 relative rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/40">
                                                <Image src={card.icon || '/cards/action_placeholder.png'} fill className="object-cover" alt={card.title} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-[#d4af37] font-bold font-rajdhani uppercase tracking-wider mb-1">{card.title}</h3>
                                                <p className="text-white/60 text-sm leading-relaxed">{card.desc}</p>
                                                {card.type && (
                                                    <div className="mt-3 inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-black tracking-widest text-white/40">
                                                        {card.type}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 flex flex-col items-center justify-center py-20 opacity-20">
                                    <Layers size={64} className="mb-4" />
                                    <p className="font-rajdhani font-bold uppercase tracking-[0.3em] text-xl text-center">Your inventory is empty</p>
                                    <p className="text-sm mt-2">Purchase cards at the Market during Phase 5</p>
                                </div>
                            )}
                        </div>

                        {/* Action Discard Pile Section */}
                        <div className="mt-16 animate-in slide-in-from-bottom-4 duration-700">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-px flex-1 bg-white/10" />
                                <h2 className="font-rajdhani font-black uppercase tracking-[0.4em] text-white/40 text-sm">Action Discard Pile</h2>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>

                            {actionDiscardPile && actionDiscardPile.length > 0 ? (
                                <div className="grid grid-cols-2 gap-6 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                                    {actionDiscardPile.map((card: any, idx: number) => (
                                        <div 
                                            key={`discard-${card.id}-${idx}`}
                                            className="relative group p-4 rounded-xl bg-white/[0.01] border border-white/5"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-16 relative rounded overflow-hidden border border-white/5 bg-black/40">
                                                    <Image src={card.icon || '/cards/action_placeholder.png'} fill className="object-cover" alt={card.title} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-white/60 font-bold font-rajdhani uppercase tracking-wider text-xs">{card.title}</h3>
                                                    <p className="text-white/30 text-[10px] leading-tight mt-1 truncate">{card.desc}</p>
                                                    <span className="mt-2 inline-block px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[8px] uppercase font-black tracking-widest text-red-500/60">
                                                        PLAYED
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 opacity-10">
                                    <p className="font-rajdhani font-bold uppercase tracking-[0.3em] text-sm text-center">No cards discarded yet</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                                <div>Citizen</div>
                                <div className="text-center">Resources</div>
                                <div className="text-center">Values</div>
                                <div className="text-center">Cards</div>
                                <div className="text-center">Final VP</div>
                            </div>

                            {players.map((p) => {
                                const isMain = p.id === localPlayerId;
                                const data = (() => {
                                    const res = isMain ? resources : (opponentsData[p.id]?.resources || {});
                                    const { power = 0, knowledge = 0, art = 0, fame = 0 } = res;
                                    let currP = power, currK = knowledge, currA = art, currF = fame;
                                    while (currF > 0) {
                                        if (currP <= currK && currP <= currA) currP++;
                                        else if (currK <= currP && currK <= currA) currK++;
                                        else currA++;
                                        currF--;
                                    }
                                    const vp = Math.min(currP, currK, currA);
                                    
                                    return {
                                        resources: res,
                                        victoryPoints: vp,
                                        cardsCount: isMain ? actionHand.length : (opponentsData[p.id]?.inventory?.length || 0)
                                    };
                                })();
                                
                                const res = data.resources as any;
                                
                                return (
                                    <div 
                                        key={p.id}
                                        className={`grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] items-center px-6 py-6 rounded-2xl border transition-all ${isMain ? 'bg-[#d4af37]/10 border-[#d4af37]/40 shadow-[0_0_30px_rgba(212,175,55,0.1)]' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-12 h-12 rounded-full border-2 border-[#d4af37]/50 p-0.5 overflow-hidden">
                                                <Image src={p.avatar || '/avatars/golden_avatar.png'} fill className="object-cover rounded-full" alt={p.name} />
                                            </div>
                                            <div>
                                                <span className="block font-bold font-rajdhani text-white uppercase tracking-wider">{p.name || '080'}</span>
                                                {isMain && <span className="text-[10px] text-[#d4af37] font-black uppercase tracking-tighter">Identity (You)</span>}
                                            </div>
                                        </div>

                                        {/* Resources */}
                                        <div className="flex justify-center gap-4">
                                            <div className="flex flex-col items-center group">
                                                <div className="relative w-6 h-6 mb-1">
                                                    <Image src={RESOURCE_ICONS['product']} fill className="object-contain" alt="Product" />
                                                </div>
                                                <span className="text-sm font-black">{res.product || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-center group">
                                                <div className="relative w-6 h-6 mb-1">
                                                    <Image src={RESOURCE_ICONS['electricity']} fill className="object-contain" alt="Electricity" />
                                                </div>
                                                <span className="text-sm font-black">{res.electricity || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-center group">
                                                <div className="relative w-6 h-6 mb-1">
                                                    <Image src={RESOURCE_ICONS['recycling']} fill className="object-contain" alt="Recycling" />
                                                </div>
                                                <span className="text-sm font-black">{res.recycling || 0}</span>
                                            </div>
                                        </div>

                                        {/* Values */}
                                        <div className="flex justify-center gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="relative w-6 h-6 mb-1">
                                                    <Image src={RESOURCE_ICONS['power']} fill className="object-contain" alt="Power" />
                                                </div>
                                                <span className="text-sm font-black">{res.power || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="relative w-6 h-6 mb-1">
                                                    <Image src={RESOURCE_ICONS['art']} fill className="object-contain" alt="Art" />
                                                </div>
                                                <span className="text-sm font-black">{res.art || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="relative w-6 h-6 mb-1">
                                                    <Image src={RESOURCE_ICONS['knowledge']} fill className="object-contain" alt="Knowledge" />
                                                </div>
                                                <span className="text-sm font-black">{res.knowledge || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="relative w-6 h-6 mb-1">
                                                    <Image src={RESOURCE_ICONS['fame']} fill className="object-contain" alt="Fame" />
                                                </div>
                                                <span className="text-sm font-black">{res.fame || 0}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-center">
                                            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-white/10">
                                                <Layers size={14} className="text-white/40" />
                                                <span className="text-sm font-black">{(data.cardsCount as any)}</span>
                                            </div>
                                        </div>

                                        {/* VP */}
                                        <div className="flex justify-center">
                                            <div className="flex items-center gap-2">
                                                <Trophy size={18} className="text-[#d4af37]" />
                                                <span className="text-xl font-black text-[#d4af37] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">
                                                    {(data.victoryPoints as any) || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="px-10 py-6 border-t border-white/5 bg-black/40 text-[10px] uppercase font-black tracking-[0.3em] text-white/20 flex justify-between items-center">
                    <span>Metarchy Central Information Bureau</span>
                    <span>Confidential Data Layer 02</span>
                </div>
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(212, 175, 55, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(212, 175, 55, 0.4);
                }
            `}</style>
        </div>
    );
}
