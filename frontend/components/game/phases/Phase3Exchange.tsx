"use client";

import React, { useMemo } from 'react';
import Image from 'next/image';

interface Phase3ExchangeProps {
    resources: any;
    exchangeStep: 0 | 1 | 2;
    exchangeSourceValue: string | null;
    exchangeTargetPlayer: string | null;
    exchangeTargetValue: string | null;
    opponentsData: any;
    dynamicPlayers: any[];
    localPlayerId: string;
    setExchangeStep: (step: 0 | 1 | 2) => void;
    setExchangeSourceValue: (val: any) => void;
    setExchangeTargetPlayer: (id: string | null) => void;
    setExchangeTargetValue: (val: any) => void;
    onCommit: () => void;
    onNextPhase: () => void;
    addLog: (msg: string) => void;
}

const Phase3Exchange: React.FC<Phase3ExchangeProps> = ({
    resources,
    exchangeStep,
    exchangeSourceValue,
    exchangeTargetPlayer,
    exchangeTargetValue,
    opponentsData,
    dynamicPlayers,
    localPlayerId,
    setExchangeStep,
    setExchangeSourceValue,
    setExchangeTargetPlayer,
    setExchangeTargetValue,
    onCommit,
    onNextPhase,
    addLog
}) => {
    const hasExchangeableValues = useMemo(() => {
        return (resources.power || 0) > 0 || (resources.knowledge || 0) > 0 || (resources.art || 0) > 0;
    }, [resources]);

    const hasOpponentExchangeableValues = useMemo(() => {
        return dynamicPlayers.filter(p => p.id !== localPlayerId).some(p => {
            const oppRes = opponentsData[p.id]?.resources || {};
            return (oppRes.power || 0) > 0 || (oppRes.knowledge || 0) > 0 || (oppRes.art || 0) > 0;
        });
    }, [dynamicPlayers, localPlayerId, opponentsData]);

    return (
        <div className="absolute inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
            <div className="relative w-[600px] bg-[#0d0d12] border-2 border-[#d4af37] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.2)] p-10 flex flex-col items-center animate-in zoom-in duration-300">
                <h2 className="text-3xl font-black text-[#d4af37] mb-2 uppercase tracking-widest font-rajdhani">Change Values</h2>
                <p className="text-white/60 text-sm mb-8 uppercase tracking-[0.2em]">
                    {exchangeStep === 1 ? "Choose one of your values to give" : 
                     exchangeStep === 2 ? "Choose an opponent's value to take" : 
                     "Initializing Exchange..."}
                </p>

                <div className="w-full flex flex-col gap-8">
                    {/* Modal Step 1: My Values */}
                    {exchangeStep === 1 && (
                        <div className="flex justify-center gap-6">
                            {['power', 'knowledge', 'art'].map(res => {
                                const val = resources[res] || 0;
                                const isSelected = exchangeSourceValue === res;
                                return (
                                    <button
                                        key={res}
                                        disabled={val <= 0}
                                        onClick={() => setExchangeSourceValue(res)}
                                        className={`flex flex-col items-center p-6 rounded-2xl border-2 transition-all ${
                                            val <= 0 ? 'opacity-30 grayscale cursor-not-allowed' : 
                                            isSelected ? 'bg-[#d4af37] border-[#ffe066] scale-110 shadow-[0_0_30px_#d4af37]' : 
                                            'bg-white/5 border-white/10 hover:border-[#d4af37]/50'
                                        }`}
                                    >
                                        <Image src={res === 'knowledge' ? '/intangibles/resource_wisdom.png' : res === 'art' ? '/intangibles/resource_Art.png' : `/intangibles/resource_${res}.png`} width={48} height={48} alt={res} />
                                        <span className={`mt-3 font-bold uppercase ${isSelected ? 'text-black' : 'text-white'}`}>{res}</span>
                                        <span className={`text-xl font-black ${isSelected ? 'text-black' : 'text-[#d4af37]'}`}>{val}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Modal Step 2: Opponent Values */}
                    {exchangeStep === 2 && (
                        <div className="flex flex-col gap-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {dynamicPlayers.filter(p => p.id !== localPlayerId).map(p => {
                                const oppRes = opponentsData[p.id]?.resources || {};
                                return (
                                    <div key={p.id} className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <Image src={p.avatar} width={32} height={32} className="rounded-full border border-[#d4af37]" alt={p.name} />
                                            <span className="text-white font-bold uppercase text-xs">{p.name}</span>
                                        </div>
                                        <div className="flex gap-4">
                                            {['power', 'knowledge', 'art'].map(res => {
                                                const val = oppRes[res] || 0;
                                                const isSelected = exchangeTargetPlayer === p.id && exchangeTargetValue === res;
                                                return (
                                                    <button
                                                        key={res}
                                                        disabled={val <= 0}
                                                        onClick={() => {
                                                            setExchangeTargetPlayer(p.id);
                                                            setExchangeTargetValue(res);
                                                        }}
                                                        className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                                            val <= 0 ? 'opacity-30 grayscale cursor-not-allowed' : 
                                                            isSelected ? 'bg-[#d4af37] border-[#ffe066] scale-105' : 
                                                            'bg-black/40 border-white/10 hover:border-[#d4af37]/30'
                                                        }`}
                                                    >
                                                        <Image src={res === 'knowledge' ? '/intangibles/resource_wisdom.png' : res === 'art' ? '/intangibles/resource_Art.png' : `/intangibles/resource_${res}.png`} width={20} height={20} alt={res} />
                                                        <span className={`text-sm font-bold ${isSelected ? 'text-black' : 'text-white'}`}>{val}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-10 flex gap-4 w-full justify-center">
                    {!hasExchangeableValues ? (
                        <div className="flex flex-col items-center gap-6 p-8 bg-red-500/10 border border-red-500/30 rounded-2xl w-full">
                            <p className="text-white text-xl font-bold text-center">
                                You have no Values for exchange.<br/>
                                <span className="text-red-400 text-sm font-normal uppercase tracking-widest font-bold">Change Values cards are returned to your hand.</span>
                            </p>
                            <button
                                onClick={() => {
                                    addLog("No values to exchange. Change Values cards returned to hand.");
                                    onNextPhase();
                                }}
                                className="px-12 py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                            >
                                Get It!
                            </button>
                        </div>
                    ) : !hasOpponentExchangeableValues ? (
                        <div className="flex flex-col items-center gap-6 p-8 bg-red-500/10 border border-red-500/30 rounded-2xl w-full">
                            <p className="text-white text-xl font-bold text-center">
                                Opponents have no Values for exchange.<br/>
                                <span className="text-red-400 text-sm font-normal uppercase tracking-widest font-bold">Change Values card is returned to your hand.</span>
                            </p>
                            <button
                                onClick={() => {
                                    addLog("Opponents have no values to exchange. Change Values card returned to hand.");
                                    onNextPhase();
                                }}
                                className="px-12 py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                            >
                                Get It!
                            </button>
                        </div>
                    ) : (
                        <>
                            {exchangeStep === 1 && (
                                <button
                                    disabled={!exchangeSourceValue}
                                    onClick={() => setExchangeStep(2)}
                                    className="px-12 py-4 bg-gradient-to-r from-[#d4af37] to-[#f3bd48] text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 disabled:grayscale disabled:opacity-50 transition-all font-rajdhani"
                                >
                                    Choose Value
                                </button>
                            )}
                            {exchangeStep === 2 && (
                                <>
                                    <button onClick={() => setExchangeStep(1)} className="px-8 py-4 border border-white/20 text-white font-bold uppercase rounded-xl hover:bg-white/5 font-rajdhani">Back</button>
                                    <button
                                        disabled={!exchangeTargetValue || !exchangeTargetPlayer}
                                        onClick={onCommit}
                                        className="px-12 py-4 bg-gradient-to-r from-[#d4af37] to-[#f3bd48] text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 disabled:grayscale disabled:opacity-50 transition-all font-rajdhani"
                                    >
                                        Change Values
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Phase3Exchange;
