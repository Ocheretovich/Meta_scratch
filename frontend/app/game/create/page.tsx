"use client";

import ProfileWidget from "@/components/ProfileWidget";
import MetarchyButton from "@/components/MetarchyButton";
import Link from "next/link";
import { Copy, ChevronDown, Check, User, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/context/GameStateContext";
import citizens from "@/data/citizens.json";
import { v4 as uuidv4 } from 'uuid';

const FUTURISTIC_ADJECTIVES = [
    "Neon", "Cyber", "Neural", "Quantum", "Void", "Zenith", "Plasma", "Aura", "Nova", "Vector",
    "Synth", "Orbital", "Hyper", "Solar", "Logic", "Meta", "Prism", "Glitch", "Echo", "Core"
];

const FUTURISTIC_NOUNS = [
    "Nexus", "Spire", "Vortex", "Matrix", "Vault", "Harbor", "Gate", "Pulse", "Shell", "Bridge",
    "Grid", "Node", "Station", "Bastion", "Summit", "Point", "Link", "Zone", "Flow", "Drift"
];

const getRandomRoomName = () => {
    const adj = FUTURISTIC_ADJECTIVES[Math.floor(Math.random() * FUTURISTIC_ADJECTIVES.length)];
    const noun = FUTURISTIC_NOUNS[Math.floor(Math.random() * FUTURISTIC_NOUNS.length)];
    return `${adj}_${noun}`;
};

export default function CreateGamePage() {
    const { player, lobby, createRoom, joinRoom } = useGameState();
    const [roomName, setRoomName] = useState("");
    const [playerCount, setPlayerCount] = useState(3);
    const [isCreating, setIsCreating] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isBotGame, setIsTest] = useState(false);
    const [phaseTimer, setPhaseTimer] = useState<number>(0); // 0 = unlimited, 30/60/180 = seconds
    const [copied, setCopied] = useState(false);
    const [preGeneratedId, setPreGeneratedId] = useState("");
    const router = useRouter();

    // Initialize pre-generated ID and random Room Name on mount
    useEffect(() => {
        setPreGeneratedId(uuidv4());
        setRoomName(getRandomRoomName());
    }, []);

    const handleCreate = async () => {
        if (!preGeneratedId) return;
        setIsCreating(true);
        const gameId = await createRoom(roomName, playerCount, isPrivate, preGeneratedId, isBotGame, phaseTimer);
        if (gameId) {
            router.push(`/game/lobby/${gameId}`);
        }
    };

    const handleStartGame = () => {
        if (lobby.id) {
            router.push(`/game/board/${lobby.id}`);
        }
    };

    const handleCopyInvite = () => {
        if (preGeneratedId) {
            const link = `${window.location.origin}/game/lobby/${preGeneratedId}`;
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Automated joining simulation (Disabled for Real Game Persistence)
    /*
    useEffect(() => {
        if (lobby.status === 'waiting' && lobby.players.length < lobby.maxPlayers) {
            const nextCitizen = citizens.find(c => !lobby.players.find(p => p.citizenId === c.citizenId));
            if (nextCitizen) {
                const timer = setTimeout(() => {
                    joinRoom("simulation-id", nextCitizen); 
                }, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [lobby.status, lobby.players.length, lobby.maxPlayers, joinRoom]);
    */

    return (
        <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
            <div className="absolute inset-0 z-0">
                <img src="/backgrounds/verified_bg.jpg" alt="Background" className="w-full h-full object-cover" />
                <img src="/backgrounds/overlay_bg.png" alt="Overlay" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen" />
                <div className="absolute inset-0 bg-black/40" />
            </div>

            <ProfileWidget />

            <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 pt-20">
                <div className="w-full max-w-2xl">
                    <div className="flex justify-center gap-4 mb-8">
                        <Link href="/game/join">
                            <MetarchyButton variant="blue" className="w-48 opacity-70 hover:opacity-100">JOIN GAME</MetarchyButton>
                        </Link>
                        <MetarchyButton variant="green" className="w-48 pointer-events-none opacity-100 shadow-[0_0_20px_rgba(22,163,74,0.4)]">CREATE GAME</MetarchyButton>
                    </div>

                    <div className="w-full p-10 bg-[#1a1a1c]/90 backdrop-blur-xl border border-[#d4af37]/30 rounded-xl relative overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />

                        <div className="space-y-6 relative z-10">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-gray-400 text-sm font-medium uppercase tracking-wider font-rajdhani">Name of room</label>
                                <div className="col-span-2 relative">
                                    <input
                                        type="text"
                                        value={roomName}
                                        onChange={(e) => setRoomName(e.target.value)}
                                        disabled={isCreating}
                                        className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 pr-12 text-white focus:outline-none focus:border-[#d4af37] transition-colors disabled:opacity-50"
                                    />
                                    <button
                                        onClick={() => !isCreating && setRoomName(getRandomRoomName())}
                                        disabled={isCreating}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#d4af37] transition-colors disabled:opacity-30"
                                        title="Regenerate Name"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-gray-400 text-sm font-medium uppercase tracking-wider font-rajdhani">Number of Players</label>
                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        min="2"
                                        max="7"
                                        value={playerCount}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) {
                                                setPlayerCount(Math.min(7, Math.max(2, val)));
                                            }
                                        }}
                                        disabled={isCreating}
                                        className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-[#d4af37] disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-gray-400 text-sm font-medium uppercase tracking-wider font-rajdhani">Copy Invite link</label>
                                <div className="col-span-2 relative group cursor-pointer" onClick={handleCopyInvite}>
                                    <div className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-gray-500 flex justify-between items-center hover:text-[#d4af37] transition-colors hover:border-[#d4af37]/50">
                                        <span>{copied ? "LINK COPIED!" : preGeneratedId ? "Click to copy invite" : "Press to generate"}</span>
                                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-gray-400 text-sm font-medium uppercase tracking-wider font-rajdhani">Game vs. Bots</label>
                                <div className="col-span-2">
                                    <div
                                        onClick={() => !isCreating && setIsTest(!isBotGame)}
                                        className={`w-full bg-black/50 border border-white/10 rounded px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${!isCreating && 'hover:border-[#d4af37]'}`}
                                    >
                                        <span className={isBotGame ? "text-[#d4af37]" : "text-gray-500"}>{isBotGame ? "ON" : "OFF"}</span>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isBotGame ? "border-[#d4af37] bg-[#d4af37]/20" : "border-gray-600"}`}>
                                            {isBotGame && <Check size={14} className="text-[#d4af37]" />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-gray-400 text-sm font-medium uppercase tracking-wider font-rajdhani">Phase Timer</label>
                                <div className="col-span-2 flex gap-2">
                                    {[
                                        { value: 0, label: 'Unlimited' },
                                        { value: 180, label: '3 min' },
                                        { value: 60, label: '1 min' },
                                        { value: 30, label: '30 sec' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => !isCreating && setPhaseTimer(opt.value)}
                                            disabled={isCreating}
                                            className={`flex-1 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                                                phaseTimer === opt.value
                                                    ? 'bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37]'
                                                    : 'bg-black/50 border border-white/10 text-gray-500 hover:border-[#d4af37]/50 hover:text-gray-300'
                                            } disabled:opacity-50`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-gray-400 text-sm font-medium uppercase tracking-wider font-rajdhani">Private Game</label>
                                <div className="col-span-2">
                                    <div
                                        onClick={() => !isCreating && setIsPrivate(!isPrivate)}
                                        className={`w-full bg-black/50 border border-white/10 rounded px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${!isCreating && 'hover:border-[#d4af37]'}`}
                                    >
                                        <span className={isPrivate ? "text-[#d4af37]" : "text-gray-500"}>{isPrivate ? "Yes" : "No"}</span>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isPrivate ? "border-[#d4af37] bg-[#d4af37]/20" : "border-gray-600"}`}>
                                            {isPrivate && <Check size={14} className="text-[#d4af37]" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isCreating && (
                            <div className="flex items-center justify-center h-[48px] mt-12">
                                {lobby.status === 'ready' ? (
                                    <MetarchyButton onClick={handleStartGame} variant="gold" className="w-[200px] h-[48px] animate-pulse">
                                        START GAME
                                    </MetarchyButton>
                                ) : (
                                    <div className="flex items-center gap-3 px-8 h-[48px] text-[#d4af37] font-bold uppercase tracking-widest text-sm border border-[#d4af37]/30 rounded bg-[#d4af37]/5">
                                        <Loader2 size={18} className="animate-spin" />
                                        WAITING FOR CITIZENS...
                                    </div>
                                )}
                            </div>
                        )}
                        {!isCreating && (
                            <div className="flex justify-center mt-12">
                                <MetarchyButton onClick={handleCreate} variant="gold" className="w-[180px] h-[48px] text-lg font-bold">
                                    CREATE
                                </MetarchyButton>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lobby Slots Visualization */}
                <div className="flex gap-8 mt-12 opacity-80 scale-90">
                    {Array.from({ length: lobby.maxPlayers || playerCount }).map((_, i) => {
                        const joinedPlayer = lobby.players[i];
                        const isHost = i === 0;

                        return (
                            <div key={i} className="relative group">
                                <div className={cn(
                                    "w-20 h-20 rounded-full p-1 bg-black/50 backdrop-blur-sm transition-all duration-500",
                                    joinedPlayer ? "border-2 border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.3)]" : "border border-dashed border-[#d4af37]/30 opacity-40"
                                )}>
                                    <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden relative flex items-center justify-center">
                                        {joinedPlayer ? (
                                            <img src={joinedPlayer.avatar} alt={joinedPlayer.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[#d4af37]/30 text-2xl font-thin">+</span>
                                        )}
                                    </div>
                                </div>
                                {joinedPlayer && (
                                    <>
                                        <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black shadow-[0_0_10px_lime]" />
                                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[#d4af37] text-[10px] font-bold tracking-widest uppercase truncate max-w-[80px]">
                                            {joinedPlayer.name}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}

// Helper for Tailwind classes
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
