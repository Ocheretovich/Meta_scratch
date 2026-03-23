import { NextRequest, NextResponse } from 'next/server';
import { gameService } from '@/lib/services';
import { Game } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { formatLog } from '@/lib/logUtils';
import { EVENTS, ACTION_CARDS } from '@/data/gameConstants';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const all = searchParams.get('all') === 'true';
        const games = await gameService.getAll();
        return NextResponse.json(all ? games : games.filter(g => g.status !== 'deleted'));
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, roomName, maxPlayers, hostPlayer, isPrivate, isBotGame } = body;

        if (!roomName || !hostPlayer) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const allGames = await gameService.getAll();
        const displayId = (allGames.length + 1).toString().padStart(3, '0');

        const gameId = id || uuidv4();

        const players = [
            { ...hostPlayer, joinedAt: Date.now() }
        ];

        const newGame: Game = {
            id: gameId,
            displayId,
            roomId: roomName,
            status: 'waiting',
            isPrivate: !!isPrivate,
            isBotGame: !!isBotGame,
            phaseTimer: body.phaseTimer || 0, // 0 = unlimited, 30/60/180 = seconds per phase
            createdAt: Date.now(),
            players: players,
            maxPlayers: isBotGame ? 3 : (maxPlayers || 4),
            bidAmount: 0,
            logs: [formatLog(displayId, `GAME CREATED BY ${hostPlayer.name}${isBotGame ? ' [VS BOTS]' : ''}`)],
            transactions: [],
            messages: [],
            gameState: {
                phaseTicker: 0,
                playerReady: {},
                stagedActors: {},
                currentPhase: 2, // Turn 1 starts at Phase 2 (Distribution)
                turn: 1,
                disabledLocations: [],
                playerResources: {
                    [hostPlayer.citizenId || hostPlayer.address || hostPlayer.name]: {
                        gato: 1000, product: 1, electricity: 1, recycling: 1,
                        power: 0, art: 0, knowledge: 0, fame: 0
                    }
                },
                eventDeck: [...EVENTS].map(e => e.id).sort(() => Math.random() - 0.5),
                actionDeck: [...ACTION_CARDS].map(c => c.id).sort(() => Math.random() - 0.5)
            }
        };

        const createdGame = await gameService.create(newGame);
        return NextResponse.json(createdGame, { status: 201 });
    } catch (error) {
        console.error("Error creating game:", error);
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
    }
}
