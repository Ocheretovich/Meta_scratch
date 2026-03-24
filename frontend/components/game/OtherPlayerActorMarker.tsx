"use client";

import Image from 'next/image';
import { useState } from 'react';
import { useTooltip } from '@/context/TooltipContext';

interface OtherPlayerActorMarkerProps {
    actor: { type: string, avatar: string, headAvatar?: string, id: string, name?: string }; // The actor
    playerAvatar?: string; // The player's citizen avatar
    playerName?: string; // The player's name (for fallback initial)
    bid?: string; // Attached resource type
    hasSecretBid?: boolean; // New: indicates a bid exists but is hidden
    phase?: number;
    p3Step?: number;
    availableExchangeCards?: number;
    availableRelocationCards?: number;
    hudScale?: number;
    isDisabled?: boolean;
    isRelocating?: boolean;
    onClick?: (e: React.MouseEvent) => void;
}

const Resource_Icons: { [key: string]: string } = {
    'product': '/resources/resource_product.png',
    'energy': '/resources/resource_energy.png',
    'electricity': '/resources/resource_energy.png',
    'recycle': '/resources/resource_Recycle.png',
    'recycling': '/resources/resource_Recycle.png'
};

export default function OtherPlayerActorMarker({ actor, playerAvatar, playerName, bid, hasSecretBid, phase, p3Step, availableExchangeCards, availableRelocationCards, hudScale = 1, isDisabled = false, isRelocating = false, onClick }: OtherPlayerActorMarkerProps) {
    const { showTooltip, hideTooltip } = useTooltip();
    const [avatarError, setAvatarError] = useState(false);
    const phaseScaleAdjust = phase && phase >= 3 ? 1.44 : 1.0;

    const showExchange = phase === 3 && p3Step === 4 && availableExchangeCards && availableExchangeCards > 0;
    const canRelocate = phase === 3 && p3Step === 2 && availableRelocationCards && availableRelocationCards > 0 && !isRelocating;

    return (
        <div
            className={`relative w-[129px] h-[127px] cursor-pointer transition-all duration-700 hover:scale-110 group origin-center ${isRelocating ? 'scale-110' : ''} ${canRelocate ? 'drop-shadow-[0_0_15px_white]' : ''}`}
            style={{
                transform: `scale(${hudScale * phaseScaleAdjust})`
            }}
            onClick={onClick}
            onMouseEnter={() => showTooltip(actor.name || actor.type)}
            onMouseLeave={hideTooltip}
        >
            {/* Bid Icon Overlay - Styled like GameResources panel */}
            {(bid || hasSecretBid) && (
                <div
                    className="absolute -top-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 group/bid animate-in zoom-in duration-300"
                >
                    {/* Background Plate */}
                    <div className="absolute inset-x-[-10px] inset-y-[-4px] bg-[#171B21]/90 backdrop-blur-sm border border-[#514D44] rounded-full -z-10 shadow-xl" />

                    {/* Icon */}
                    <div className="relative w-[28px] h-[28px]">
                        {hasSecretBid ? (
                            <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-full border border-white/10">
                                <span className="text-[#d4af37] text-xs font-bold font-rajdhani">?</span>
                            </div>
                        ) : (
                            <Image
                                src={Resource_Icons[bid || ""] || ""}
                                fill
                                className="object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                                alt={bid || "bid"}
                            />
                        )}
                    </div>

                    {!hasSecretBid && <span className="text-white font-bold text-sm drop-shadow-md pr-1">1</span>}
                </div>
            )}
            {/* Layer 0: Background Fills */}
            <svg width="129" height="127" viewBox="0 0 129 127" fill="none" className="absolute inset-0 z-0 pointer-events-none">
                <path d="M78.77 99.04C105.981 99.04 128.04 76.9811 128.04 49.77C128.04 22.5589 105.981 0.5 78.77 0.5C51.5589 0.5 29.5 22.5589 29.5 49.77C29.5 76.9811 51.5589 99.04 78.77 99.04Z" fill="#380B0B" fillOpacity="0.8" />
                <path d="M31.5 126.5C48.6208 126.5 62.5 112.621 62.5 95.5C62.5 78.3792 48.6208 64.5 31.5 64.5C14.3792 64.5 0.5 78.3792 0.5 95.5C0.5 112.621 14.3792 126.5 31.5 126.5Z" fill="#23262D" />
            </svg>

            {/* Layer 1: Actor Avatar (Magenta Ring Area) */}
            {/* Center approx 78, 50. Radius approx 39 */}
            <div
                className="absolute z-10 rounded-full overflow-hidden border border-transparent"
                style={{
                    left: '39px',
                    top: '11px',
                    width: '79px',
                    height: '79px',
                    backgroundColor: '#1a1a1c'
                }}
            >
                <Image
                    src={actor.headAvatar || actor.avatar}
                    fill
                    className="object-cover"
                    alt={actor.type}
                />
            </div>

            {/* Layer 1b: Player Avatar (Blue Ring Area) */}
            {/* Center approx 31.5, 95.5. Radius approx 25? */}
            {/* Top-Left = 31.5 - 26 = 5.5, 95.5 - 26 = 69.5 */}
            <div
                className={`absolute z-30 rounded-full overflow-hidden border ${showExchange ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.5)] scale-110' : 'border-blue-500/30'} transition-all duration-300`}
                style={{
                    left: '5.5px',
                    top: '69.5px',
                    width: '52px',
                    height: '52px'
                }}
            >
                <div className="relative w-full h-full">
                    {playerAvatar && !avatarError ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={playerAvatar}
                            className="absolute inset-0 w-full h-full object-cover"
                            alt={playerName || "player"}
                            onError={() => setAvatarError(true)}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
                            <span className="text-white font-bold text-lg drop-shadow-md">
                                {(playerName || '?')[0].toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Layer 2: Foreground Strokes - Affected by grayscale */}
            <div className="absolute inset-0 z-20 pointer-events-none" style={{ filter: isDisabled ? 'grayscale(0.5) opacity(0.8)' : 'none' }}>
                <svg width="129" height="127" viewBox="0 0 129 127" fill="none" className="absolute inset-0 z-20 pointer-events-none">
                    <path d="M78.7704 89.9299C100.95 89.9299 118.93 71.9496 118.93 49.7699C118.93 27.5901 100.95 9.60986 78.7704 9.60986C56.5906 9.60986 38.6104 27.5901 38.6104 49.7699C38.6104 71.9496 56.5906 89.9299 78.7704 89.9299Z" stroke={isRelocating ? "#10B981" : "#A08C5C"} strokeWidth={isRelocating ? "4" : "2"} strokeMiterlimit="10" className={`transition-all duration-500 ${isRelocating ? "drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" : ""}`} />
                    <path d="M78.7701 93.2101C102.761 93.2101 122.21 73.7613 122.21 49.7701C122.21 25.7788 102.761 6.33008 78.7701 6.33008C54.7788 6.33008 35.3301 25.7788 35.3301 49.7701C35.3301 73.7613 54.7788 93.2101 78.7701 93.2101Z" stroke={isRelocating ? "#10B981" : "#C1272D"} strokeMiterlimit="10" />
                    <path d="M78.77 99.04C105.981 99.04 128.04 76.9811 128.04 49.77C128.04 22.5589 105.981 0.5 78.77 0.5C51.5589 0.5 29.5 22.5589 29.5 49.77C29.5 76.9811 51.5589 99.04 78.77 99.04Z" stroke={isRelocating ? "#10B981" : "#C1272D"} strokeMiterlimit="10" />
                    <path d="M31.5 122.5C46.4117 122.5 58.5 110.412 58.5 95.5C58.5 80.5883 46.4117 68.5 31.5 68.5C16.5883 68.5 4.5 80.5883 4.5 95.5C4.5 110.412 16.5883 122.5 31.5 122.5Z" stroke={isRelocating ? "#10B981" : "#A08C5C"} strokeMiterlimit="10" />
                    <path d="M31.5 126.5C48.6208 126.5 62.5 112.621 62.5 95.5C62.5 78.3792 48.6208 64.5 31.5 64.5C14.3792 64.5 0.5 78.3792 0.5 95.5C0.5 112.621 14.3792 126.5 31.5 126.5Z" stroke={isRelocating ? "#10B981" : "#A08C5C"} strokeMiterlimit="10" />
                </svg>
            </div>
        </div>
    );
}
