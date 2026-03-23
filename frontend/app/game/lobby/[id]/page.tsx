"use client";

import { useEffect, useState, useRef } from "react";
import { useGameState } from "@/context/GameStateContext";
import MetarchyButton from "@/components/MetarchyButton";
import { Smile, Send, Check, Copy } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Game, Player, ChatMessage } from "@/lib/types";

export default function LobbyPage() {
    const { id } = useParams();
    const { player } = useGameState();
    const router = useRouter();

    // Local state for game data to avoid context lag/complexities
    const [game, setGame] = useState<Game | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleCopyLink = () => {
        const link = `${window.location.origin}/game/lobby/${id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Fetch Game Data Polling
    useEffect(() => {
        const fetchGame = async () => {
            try {
                const res = await fetch(`/api/games/${id}`);
                if (res.ok) {
                    const data: Game = await res.json();
                    setGame(data);
                    setMessages(data.messages || []);

                    // Handle Start Trigger
                    if (data.status === 'playing') {
                        router.push(`/game/board/${id}`);
                    } else if (data.status === 'waiting') {
                        setCountdown(null);
                    }
                }
            } catch (e) {
                console.error("Fetch game error", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGame();
        const interval = setInterval(fetchGame, 1000); // 1s polling
        return () => clearInterval(interval);
    }, [id, router]);

    // Simulation Effect
    const simulationStarted = useRef(false);

    useEffect(() => {
        if (!game || simulationStarted.current || game.status !== 'waiting') return;

        // ONLY trigger simulation if it's a bot game
        if (!game.isBotGame) return;

        simulationStarted.current = true;

        const simulate = async () => {
            const ghost = { name: "Ghost", citizenId: "bot-2", avatar: "/avatars/ghost.png", address: "0xBotGhost" };
            const viper = { name: "Viper", citizenId: "bot-1", avatar: "/avatars/viper.png", address: "0xBotViper" };

            // 1. Ghost Joins
            await new Promise(r => setTimeout(r, 2000));
            await fetch(`/api/games/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', player: ghost }) });

            // 2. Ghost Chats
            await new Promise(r => setTimeout(r, 1500));
            await fetch(`/api/games/${id}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: ghost.name, avatar: ghost.avatar, content: "Hello citizens!" }) });

            // 3. Ghost Ready
            await new Promise(r => setTimeout(r, 1500));
            await fetch(`/api/games/${id}/ready`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ citizenId: ghost.citizenId }) });

            // 4. Viper Joins
            await new Promise(r => setTimeout(r, 2000));
            await fetch(`/api/games/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', player: viper }) });

            // 5. Viper Chats
            await new Promise(r => setTimeout(r, 1500));
            await fetch(`/api/games/${id}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: viper.name, avatar: viper.avatar, content: "Ready to strategize." }) });

            // 6. Viper Ready
            await new Promise(r => setTimeout(r, 1500));
            await fetch(`/api/games/${id}/ready`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ citizenId: viper.citizenId }) });
        };

        simulate();
    }, [game, id]);

    // Auto scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !game) return;

        try {
            await fetch(`/api/games/${id}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: player.name,
                    avatar: player.avatar,
                    content: chatInput
                })
            });
            setChatInput("");
        } catch (e) {
            console.error("Send message error", e);
        }
    };

    const handleToggleReady = async () => {
        if (!game || !player.citizenId) return;

        try {
            await fetch(`/api/games/${id}/ready`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ citizenId: player.citizenId })
            });
            // State update will happen on next poll
        } catch (e) {
            console.error("Ready error", e);
        }
    };

    if (isLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
    if (!game) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Game not found</div>;

    const currentPlayer = game.players.find(p => p.citizenId === player.citizenId);
    const hasJoined = !!currentPlayer;
    const isReady = currentPlayer?.isReady || false;

    const handleJoinGame = async () => {
        if (!game || !player.citizenId) return;
        try {
            await fetch(`/api/games/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'join', player: player })
            });
            // State update will happen on next poll
        } catch (e) {
            console.error("Join error", e);
        }
    };

    return (
        <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans flex items-center justify-center">
            {/* Backgrounds */}
            <div className="absolute inset-0 z-0">
                <img src="/backgrounds/verified_bg.jpg" alt="Background" className="w-full h-full object-cover" />
                <img src="/backgrounds/overlay_bg.png" alt="Overlay" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen" />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            </div>

            {/* Main Window Frame */}
            <div className="relative z-10 w-[1000px] h-[700px] bg-[#1a1a1c]/95 border border-[#d4af37]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col">

                {/* Header */}
                <div className="h-16 border-b border-[#d4af37]/20 flex items-center px-8">
                    <h1 className="text-xl font-bold font-rajdhani tracking-widest text-white uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#d4af37] shadow-[0_0_8px_#d4af37]" />
                        {game.roomId}
                    </h1>
                </div>

                {/* Content Grid */}
                <div className="flex-1 grid grid-cols-12 p-8 gap-8">

                    {/* Chat Section (Left, col-5) */}
                    <div className="col-span-5 flex flex-col bg-black/40 rounded-xl border border-white/5 overflow-hidden">
                        {/* Messages Area */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
                            {messages.map((msg, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden border border-[#d4af37]/30">
                                        <img src={msg.avatar || '/avatars/default.png'} alt="av" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[#d4af37] font-bold uppercase tracking-wider">{msg.sender}</span>
                                        <p className="text-sm text-gray-300 leading-tight">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="h-12 border-t border-white/10 flex items-center px-2 bg-white/5">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Message..."
                                className="flex-1 bg-transparent border-none outline-none text-sm text-white px-2 placeholder-gray-600"
                            />
                            <button className="text-gray-400 hover:text-white p-2"><Smile size={18} /></button>
                        </div>
                    </div>

                    {/* Info & Players Section (Right, col-7) */}
                    <div className="col-span-7 flex flex-col gap-6">

                        {/* Game Stats */}
                        <div className="grid grid-cols-2 gap-y-4 text-sm font-rajdhani">
                            <div className="text-gray-400 uppercase tracking-widest">Number of Players</div>
                            <div className="font-bold">{game.players.length}</div>

                            <div className="text-gray-400 uppercase tracking-widest">Copy Invite link</div>
                            <div
                                onClick={handleCopyLink}
                                className="font-bold flex items-center gap-2 cursor-pointer hover:text-[#d4af37] transition-colors"
                            >
                                {copied ? (
                                    <span className="text-green-500 flex items-center gap-2">LINK COPIED! <Check size={16} /></span>
                                ) : (
                                    <>
                                        <span>Click to copy</span>
                                        <Copy size={14} />
                                    </>
                                )}
                            </div>

                            <div className="text-gray-400 uppercase tracking-widest">Player's turn timeout</div>
                            <div className="font-bold">Off</div>

                            <div className="text-gray-400 uppercase tracking-widest">Private</div>
                            <div className="font-bold">{game.isPrivate ? "Yes" : "No"}</div>
                        </div>

                        {/* Player List */}
                        <div className="flex-1 border border-[#d4af37]/30 rounded-xl p-4 bg-black/20 space-y-2 overflow-y-auto">
                            {game.players.map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border border-[#d4af37]/50 overflow-hidden">
                                            <img src={p.avatar || '/avatars/default.png'} alt={p.name} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="font-bold text-sm tracking-wide">{p.name}</span>
                                    </div>

                                    <div className={`px-4 py-1 rounded border text-[10px] font-bold tracking-[0.2em] uppercase w-32 text-center
                                        ${p.isReady
                                            ? "border-green-500/50 text-green-500 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                                            : "border-red-500/50 text-red-500 bg-red-500/10"
                                        }
                                    `}>
                                        {p.isReady ? "IM READY" : "NOT READY"}
                                    </div>
                                </div>
                            ))}
                            {/* Empty Slots */}
                            {Array.from({ length: Math.max(0, game.maxPlayers - game.players.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="flex items-center justify-between p-2 opacity-30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border border-dashed border-gray-500 flex items-center justify-center">
                                            <span className="text-lg font-thin">+</span>
                                        </div>
                                        <span className="text-sm font-thin italic">Waiting...</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Status / Countdown */}
                        <div className="h-24 flex flex-col items-center justify-center">
                            {countdown !== null ? (
                                <div className="text-center animate-pulse">
                                    <div className="text-6xl font-bold font-rajdhani text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                                        {countdown}
                                    </div>
                                    <div className="text-xs tracking-[0.5em] text-[#d4af37] uppercase mt-2">Starting Game</div>
                                </div>
                            ) : !hasJoined ? (
                                <MetarchyButton
                                    variant="gold"
                                    className="w-48 h-12 text-lg tracking-widest"
                                    onClick={handleJoinGame}
                                >
                                    JOIN GAME
                                </MetarchyButton>
                            ) : (
                                <MetarchyButton
                                    variant={isReady ? "blue" : "gold"}
                                    className="w-48 h-12 text-lg tracking-widest"
                                    onClick={handleToggleReady}
                                >
                                    {isReady ? "CANCEL" : "READY"}
                                </MetarchyButton>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Decor */}
                <div className="h-8 border-t border-[#d4af37]/20 flex justify-center items-center bg-black/40">
                    <span className="text-[10px] text-[#d4af37] tracking-[0.3em] font-rajdhani opacity-50">METARCHY PROTOCOL // WAITING FOR SYNC</span>
                </div>
            </div>

            {/* Global Waiting Pill (Bottom) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-2 bg-[#1a1a1c] border border-[#d4af37]/30 rounded text-[#d4af37] text-xs font-bold tracking-[0.2em] shadow-lg">
                WAITING
            </div>
        </main>
    );
}
