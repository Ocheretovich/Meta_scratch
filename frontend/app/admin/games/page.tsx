"use client";

import React, { useState, useEffect } from 'react';
import { Game } from '@/lib/types';
import {
    Trash2, ScrollText, X, Clock, AlertCircle, CheckCircle2,
    Gamepad2, RotateCcw, Skull, PlayCircle, Hourglass
} from 'lucide-react';

type TabId = 'waiting' | 'playing' | 'finished' | 'deleted';

const TABS: { id: TabId; label: string; icon: React.ReactNode; color: string; pulse?: boolean }[] = [
    { id: 'waiting', label: 'Waiting', icon: <Hourglass size={14} />, color: 'text-blue-400', pulse: false },
    { id: 'playing', label: 'Playing', icon: <PlayCircle size={14} />, color: 'text-green-400', pulse: true },
    { id: 'finished', label: 'Finished', icon: <CheckCircle2 size={14} />, color: 'text-gray-400', pulse: false },
    { id: 'deleted', label: 'Deleted', icon: <Skull size={14} />, color: 'text-red-400', pulse: false },
];

export default function AdminGamesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabId>('waiting');
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const fetchGames = async () => {
        try {
            const res = await fetch('/api/games?all=true');
            if (res.ok) setGames(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
        const interval = setInterval(fetchGames, 3000);
        return () => clearInterval(interval);
    }, []);

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleDelete = async (id: string, alreadyDeleted: boolean) => {
        const confirm_msg = alreadyDeleted
            ? 'Delete permanently? This action is irreversible.'
            : 'Move game to trash?';

        if (!confirm(confirm_msg)) return;

        // Final safeguard for permanent deletion
        if (alreadyDeleted && !confirm('ARE YOU SURE? Data will be wiped from the system.')) return;

        const res = await fetch(`/api/admin/games/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showMsg(alreadyDeleted ? 'Game deleted permanently' : 'Game moved to trash', 'success');
            fetchGames();
        } else {
            showMsg('Error during deletion', 'error');
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Move ALL active games to trash?')) return;

        try {
            const res = await fetch('/api/admin/games', { method: 'DELETE' });
            if (res.ok) {
                showMsg('All games moved to trash', 'success');
                fetchGames();
            } else {
                showMsg('Error clearing list', 'error');
            }
        } catch (e) {
            showMsg('Network error during clearing', 'error');
        }
    };

    const handleRestore = async (id: string) => {
        const res = await fetch(`/api/admin/games/${id}`, { method: 'PATCH' });
        if (res.ok) {
            showMsg('Game restored', 'success');
            fetchGames();
        } else {
            showMsg('Error during restoration', 'error');
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const res = await fetch(`/api/admin/games/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
            showMsg(`Status updated`, 'success');
            fetchGames();
        } else {
            showMsg('Error updating status', 'error');
        }
    };

    const tabGames = games.filter(g => g.status === tab);
    const selectedGame = games.find(g => g.id === selectedGameId);

    const counts: Record<TabId, number> = {
        waiting: games.filter(g => g.status === 'waiting').length,
        playing: games.filter(g => g.status === 'playing').length,
        finished: games.filter(g => g.status === 'finished').length,
        deleted: games.filter(g => g.status === 'deleted').length,
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <header className="flex justify-between items-end border-b border-[#d4af37]/10 pb-6">
                <div>
                    <h2 className="text-4xl font-bold font-rajdhani text-[#d4af37] uppercase tracking-wider">Game Management</h2>
                    <p className="text-gray-400 font-medium tracking-widest mt-2 uppercase text-[10px]">Oversee and control active game sessions</p>
                </div>
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2 bg-[#d4af37]/5 border border-[#d4af37]/20 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(212,175,55,0.05)]">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] text-green-400 font-bold uppercase tracking-[0.2em] font-rajdhani">Live Neural Link</span>
                    </div>
                    <div className="text-right">
                        <span className="text-gray-500 text-[10px] uppercase tracking-widest block font-rajdhani">Total Nodes</span>
                        <span className="text-3xl font-bold font-rajdhani text-white">{games.filter(g => g.status !== 'deleted').length}</span>
                    </div>
                </div>
            </header>

            {/* Actions Bar */}
            <div className="flex justify-between items-center">
                <div className="flex-1" />
                <button
                    onClick={handleClearAll}
                    disabled={counts.waiting + counts.playing + counts.finished === 0}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 font-bold font-rajdhani uppercase tracking-widest text-xs rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                    <Trash2 size={16} className="group-hover:animate-bounce" />
                    Clear List
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded border font-rajdhani uppercase tracking-widest text-sm flex items-center justify-between transition-all ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)}>&times;</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 font-rajdhani text-xs font-bold uppercase tracking-widest
                            ${tab === t.id
                                ? 'bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.1)]'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                    >
                        <span className={tab === t.id ? 'text-[#d4af37]' : t.color}>
                            {t.icon}
                        </span>
                        {t.label}
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                            ${tab === t.id ? 'bg-[#d4af37]/20 text-[#d4af37]' :
                                t.id === 'deleted' ? 'bg-red-500/10 text-red-400' :
                                    'bg-white/5 text-gray-500'
                            }`}>
                            {counts[t.id]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-[#0d0d12]/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 hover:border-[#d4af37]/20">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-[#d4af37] text-[10px] uppercase tracking-[0.2em] font-bold font-rajdhani">
                            <th className="px-8 py-5">Game Details</th>
                            <th className="px-8 py-5 text-center">Created At</th>
                            {tab !== 'deleted' && <th className="px-8 py-5 text-center">Status</th>}
                            {tab === 'deleted' && <th className="px-8 py-5 text-center">Deleted At</th>}
                            <th className="px-8 py-5 text-center">Players</th>
                            <th className="px-8 py-5 text-center">Privacy</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-20 text-center text-gray-500 uppercase tracking-widest font-rajdhani animate-pulse">Scanning Neural Network...</td>
                            </tr>
                        ) : tabGames.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-20 text-center text-gray-500 uppercase tracking-widest font-rajdhani">
                                    {tab === 'deleted' ? 'Trash is empty' : 'No games in this category'}
                                </td>
                            </tr>
                        ) : (
                            tabGames.map(game => (
                                <tr key={game.id} className={`hover:bg-white/[0.02] transition-colors group ${tab === 'deleted' ? 'opacity-60' : ''}`}>
                                    {/* Game Details */}
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-bold font-rajdhani text-white uppercase tracking-wider group-hover:text-[#d4af37] transition-colors">
                                                {game.roomId || <span className="text-gray-600 italic">no name</span>}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-gray-500 font-mono tracking-tight opacity-50">{game.id}</span>
                                                {game.isBotGame && (
                                                    <span className="text-[8px] bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Bots</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Created At */}
                                    <td className="px-8 py-6 text-center text-[10px] text-gray-400 font-mono">
                                        {game.createdAt ? new Date(game.createdAt).toLocaleString('en-US') : '—'}
                                    </td>

                                    {/* Status / Deleted At */}
                                    {tab !== 'deleted' ? (
                                        <td className="px-8 py-6 text-center">
                                            <select
                                                value={game.status}
                                                onChange={e => updateStatus(game.id, e.target.value)}
                                                className="bg-black/50 border border-white/10 rounded px-2 py-1 text-[10px] uppercase tracking-widest font-bold font-rajdhani text-gray-400 focus:text-white focus:border-[#d4af37]/50 outline-none cursor-pointer"
                                            >
                                                <option value="waiting">Waiting</option>
                                                <option value="playing">Playing</option>
                                                <option value="finished">Finished</option>
                                            </select>
                                        </td>
                                    ) : (
                                        <td className="px-8 py-6 text-center text-[10px] text-red-400 font-mono">
                                            {game.deletedAt ? new Date(game.deletedAt).toLocaleString('en-US') : '—'}
                                        </td>
                                    )}

                                    {/* Players */}
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-white font-mono font-bold text-lg">{(game.players || []).length} / {game.maxPlayers}</span>
                                            <div className="flex -space-x-2 mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                {(game.players || []).map((p, i) => (
                                                    <div key={i} className="w-6 h-6 rounded-full border border-[#d4af37]/30 overflow-hidden bg-black" title={p.name}>
                                                        <img src={p.avatar || '/avatars/default.png'} alt={p.name} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Privacy */}
                                    <td className="px-8 py-6 text-center">
                                        <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${game.isPrivate ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                            {game.isPrivate ? 'Private' : 'Public'}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {tab !== 'deleted' && (
                                                <button
                                                    onClick={() => setSelectedGameId(game.id)}
                                                    className={`p-3 rounded-xl transition-all ${selectedGameId === game.id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#d4af37] hover:bg-[#d4af37]/10'}`}
                                                    title="View Logs"
                                                >
                                                    <ScrollText size={20} />
                                                </button>
                                            )}
                                            {tab === 'deleted' && (
                                                <button
                                                    onClick={() => handleRestore(game.id)}
                                                    className="p-3 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-xl transition-all"
                                                    title="Restore"
                                                >
                                                    <RotateCcw size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(game.id, tab === 'deleted')}
                                                className={`p-3 rounded-xl transition-all ${tab === 'deleted' ? 'text-gray-500 hover:text-red-500 hover:bg-red-500/20' : 'text-gray-500 hover:text-red-500 hover:bg-red-500/10'}`}
                                                title={tab === 'deleted' ? 'Delete permanently' : 'To Trash'}
                                            >
                                                {tab === 'deleted' ? <Skull size={20} /> : <Trash2 size={20} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Log Viewer Modal */}
            {selectedGameId && selectedGame && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#0d0d12] border border-[#d4af37]/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <header className="px-8 py-6 border-b border-[#d4af37]/10 flex justify-between items-center bg-[#d4af37]/5">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold font-rajdhani text-[#d4af37] uppercase tracking-wider">Game Command History</h3>
                                    <p className="text-gray-500 font-mono text-[10px] tracking-tight">{selectedGameId}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedGameId(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X size={24} className="text-gray-400 hover:text-white" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-black/20 font-rajdhani">
                            {selectedGame.logs && selectedGame.logs.length > 0 ? (
                                [...selectedGame.logs].reverse().map((log, i) => (
                                    <div key={i} className="flex gap-4 group animate-in slide-in-from-left-2 duration-300">
                                        <span className="text-[#d4af37]/30 text-[10px] font-mono mt-1 shrink-0">#{String(selectedGame.logs.length - i).padStart(3, '0')}</span>
                                        <p className="text-gray-300 font-medium tracking-wide leading-relaxed border-l border-white/5 pl-4 group-hover:border-[#d4af37]/30 transition-colors">{log}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20">
                                    <p className="text-gray-600 uppercase tracking-[0.2em] font-rajdhani">No telemetry data recorded</p>
                                </div>
                            )}
                        </div>

                        <footer className="px-8 py-4 border-t border-[#d4af37]/10 flex justify-end bg-black/40">
                            <button
                                onClick={() => setSelectedGameId(null)}
                                className="px-6 py-2 bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] font-bold font-rajdhani uppercase tracking-widest text-xs rounded hover:bg-[#d4af37]/20 transition-all active:scale-95"
                            >
                                Close Uplink
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
