"use client";

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGiveUp: () => void;
    musicVolume: number;
    soundVolume: number;
    onMusicVolumeChange: (val: number) => void;
    onSoundVolumeChange: (val: number) => void;
}

export default function SettingsModal({
    isOpen,
    onClose,
    onGiveUp,
    musicVolume,
    soundVolume,
    onMusicVolumeChange,
    onSoundVolumeChange
}: SettingsModalProps) {
    const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
            <div className="relative w-[420px] bg-[#0d0d12] border-2 border-[#d4af37]/50 rounded-2xl shadow-[0_0_60px_rgba(212,175,55,0.15)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-[#d4af37]/20">
                    <h2 className="text-2xl font-black text-[#d4af37] uppercase tracking-[0.2em] font-rajdhani">Settings</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={18} className="text-white/60 hover:text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 py-6 flex flex-col gap-6">
                    {/* Music Volume */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-white/70 text-sm font-rajdhani uppercase tracking-widest">Music Volume</span>
                            <span className="text-[#d4af37] text-sm font-bold font-mono">{musicVolume}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={musicVolume}
                            onChange={(e) => onMusicVolumeChange(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4af37] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(212,175,55,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
                                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#d4af37] [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
                        />
                    </div>

                    {/* Sound Volume */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-white/70 text-sm font-rajdhani uppercase tracking-widest">Sound Volume</span>
                            <span className="text-[#d4af37] text-sm font-bold font-mono">{soundVolume}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={soundVolume}
                            onChange={(e) => onSoundVolumeChange(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4af37] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(212,175,55,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
                                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#d4af37] [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
                        />
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-white/10 my-1" />

                    {/* Give Up */}
                    {!showGiveUpConfirm ? (
                        <button
                            onClick={() => setShowGiveUpConfirm(true)}
                            className="w-full px-6 py-3 bg-red-900/30 border border-red-500/40 text-red-400 font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-red-900/50 hover:border-red-500/60 transition-all"
                        >
                            Give Up
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                            <p className="text-red-300 text-sm text-center font-rajdhani">
                                Are you sure? Your actors will be removed and the game will continue without you.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowGiveUpConfirm(false)}
                                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/20 text-white/70 font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowGiveUpConfirm(false);
                                        onGiveUp();
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-red-600 border border-red-500 text-white font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-red-500 transition-all"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#f3bd48] text-black font-bold uppercase tracking-widest text-sm rounded-xl hover:from-[#ffe066] hover:to-[#ffd700] transition-all transform hover:scale-[1.02] active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
