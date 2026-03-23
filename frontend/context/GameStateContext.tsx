"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const PLAYER_STORAGE_KEY = 'metarchy_player';

function loadPlayerFromStorage(): Player | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(PLAYER_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.name && (parsed.citizenId || parsed.address)) return parsed;
        }
    } catch {}
    return null;
}

function savePlayerToStorage(player: Player) {
    if (typeof window === 'undefined') return;
    try {
        if (player.name || (player.citizenId && player.citizenId !== '0000') || player.address) {
            localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
        }
    } catch {}
}

// Define the shape of the game state
interface Player {
    name: string;
    address: string;
    citizenId?: string;
    avatar?: string;
}

interface Lobby {
    id?: string;
    roomName: string;
    maxPlayers: number;
    players: Player[];
    status: 'idle' | 'waiting' | 'ready';
}

interface GameState {
    resources: {
        gato: number;
        product: number; electricity: number; recycling: number;
        power: number; art: number; knowledge: number; fame: number;
    };
    player: Player;
    lobby: Lobby;
    games: any[];
    updateResource: (resource: string, amount: number) => void;
    setResources: (resources: any) => void;
    setPlayerName: (name: string) => void;
    setPlayerAddress: (address: string) => void;
    setCitizenId: (id: string) => void;
    setPlayerAvatar: (avatar: string) => void;
    setPlayer: (player: Player) => void;
    createRoom: (name: string, maxPlayers: number, isPrivate: boolean, id?: string, isBotGame?: boolean, phaseTimer?: number) => Promise<any>;
    joinRoom: (gameId: string, player: Player) => Promise<void>;
    leaveRoom: () => void;
    eventDeck: any[];
    setEventDeck: React.Dispatch<React.SetStateAction<any[]>>;
}

const initialState: GameState = {
    resources: {
        gato: 1000,
        product: 1, electricity: 1, recycling: 1,
        power: 0, art: 0, knowledge: 0, fame: 0
    },
    player: {
        name: "",
        address: "",
        citizenId: "0000",
        avatar: "",
    },
    lobby: {
        id: "",
        roomName: "",
        maxPlayers: 4,
        players: [],
        status: 'idle'
    },
    games: [],
    updateResource: () => { },
    setResources: () => { },
    setPlayerName: () => { },
    setPlayerAddress: () => { },
    setCitizenId: () => { },
    setPlayerAvatar: () => { },
    setPlayer: () => { },
    createRoom: async () => { },
    joinRoom: async () => { },
    leaveRoom: () => { },
    eventDeck: [],
    setEventDeck: () => { },
};

const GameStateContext = createContext<GameState>(initialState);

export function GameStateProvider({ children }: { children: ReactNode }) {
    const [resources, setResources] = useState(initialState.resources);
    const [player, setPlayer] = useState<Player>(() => loadPlayerFromStorage() || initialState.player);
    const [lobby, setLobby] = useState(initialState.lobby);
    const [eventDeck, setEventDeck] = useState<any[]>(initialState.eventDeck);

    // Persist player identity to localStorage whenever it changes
    useEffect(() => {
        savePlayerToStorage(player);
    }, [player]);

    // updateResource: adds `delta` to the resource (positive or negative).
    // The resource can never go below 0.
    const updateResource = useCallback((resource: string, delta: number) => {
        setResources(prev => {
            const current = (prev[resource as keyof typeof prev] || 0);
            const next = Math.max(0, current + delta);
            console.log(`[RESOURCE SYNC] ${resource}: ${current} -> ${next} (delta: ${delta})`);
            return {
                ...prev,
                [resource]: next,
            };
        });
    }, []);

    const setPlayerName = useCallback((name: string) => {
        setPlayer(prev => ({ ...prev, name }));
    }, []);

    const setPlayerAddress = useCallback((address: string) => {
        setPlayer(prev => ({ ...prev, address }));
    }, []);

    const setCitizenId = useCallback((id: string) => {
        setPlayer(prev => ({ ...prev, citizenId: id }));
    }, []);

    const setPlayerAvatar = useCallback((avatar: string) => {
        setPlayer(prev => ({ ...prev, avatar }));
    }, []);

    const setPlayerUpdate = useCallback((newPlayer: Player) => {
        setPlayer(newPlayer);
    }, []);

    const [games, setGames] = useState<any[]>([]);

    // Poll for games list
    React.useEffect(() => {
        const fetchGames = async () => {
            try {
                const res = await fetch('/api/games');
                if (res.ok) {
                    const data = await res.json();
                    setGames(data);
                }
            } catch (error) {
                console.error("Failed to fetch games", error);
            }
        };

        fetchGames();
        const interval = setInterval(fetchGames, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, []);

    const createRoom = useCallback(async (name: string, maxPlayers: number, isPrivate: boolean, id?: string, isBotGame?: boolean, phaseTimer?: number) => {
        try {
            const res = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, roomName: name, maxPlayers, hostPlayer: player, isPrivate, isBotGame, phaseTimer: phaseTimer || 0 })
            });

            if (res.ok) {
                const game = await res.json();
                setLobby({
                    id: game.id,
                    roomName: game.roomId,
                    maxPlayers: game.maxPlayers,
                    players: game.players,
                    status: 'waiting'
                });
                return game.id;
            }
        } catch (error) {
            console.error("Failed to create room", error);
        }
    }, [player]);

    const joinRoom = useCallback(async (gameId: string, joinPlayer: Player) => {
        try {
            const res = await fetch(`/api/games/${gameId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'join', player: joinPlayer })
            });

            if (res.ok) {
                const game = await res.json();
                setLobby({
                    id: game.id,
                    roomName: game.roomId,
                    maxPlayers: game.maxPlayers,
                    players: game.players,
                    status: game.players.length >= game.maxPlayers ? 'ready' : 'waiting'
                });
            }
        } catch (error) {
            console.error("Failed to join room", error);
        }
    }, []);

    const leaveRoom = useCallback(() => {
        setLobby(initialState.lobby);
    }, []);

    const contextValue = React.useMemo(() => ({
        resources, player, lobby, games, eventDeck,
        updateResource, setResources, setPlayerName, setPlayerAddress, setCitizenId, setPlayerAvatar, setPlayer: setPlayerUpdate,
        createRoom, joinRoom, leaveRoom, setEventDeck
    }), [
        resources, player, lobby, games, eventDeck,
        updateResource, setPlayerName, setPlayerAddress, setCitizenId, setPlayerAvatar, setPlayerUpdate,
        createRoom, joinRoom, leaveRoom, setEventDeck
    ]);

    return (
        <GameStateContext.Provider value={contextValue}>
            {children}
        </GameStateContext.Provider>
    );
}

export function useGameState() {
    const context = useContext(GameStateContext);
    if (!context) {
        throw new Error("useGameState must be used within a GameStateProvider");
    }
    return context;
}
