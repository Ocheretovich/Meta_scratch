import { NextRequest, NextResponse } from 'next/server';
import { gameService } from '@/lib/services';
import { formatLog } from '@/lib/logUtils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const game = await gameService.getById(params.id);
        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }
        return NextResponse.json(game);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const { action, player, updates } = body;

        let game = await gameService.getById(params.id);
        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        if (action === 'join') {
            if (!player) {
                return NextResponse.json({ error: 'Player data required' }, { status: 400 });
            }
            try {
                const logs = [...(game.logs || []), formatLog(game.displayId || game.id, `${player.name} joined`)];
                const result = await gameService.addPlayer(params.id, { ...player, joinedAt: Date.now() });
                game = result || game;

                // Initialize player resources on server for PvP visibility
                const playerId = player.citizenId || player.address || player.name;
                const state: any = game.gameState || {};
                if (!state.playerResources) state.playerResources = {};
                if (!state.playerResources[playerId]) {
                    state.playerResources[playerId] = {
                        gato: 1000, product: 1, electricity: 1, recycling: 1,
                        power: 0, art: 0, knowledge: 0, fame: 0
                    };
                }
                const updateResult = await gameService.update(params.id, { logs, gameState: state });
                game = updateResult || game;
            } catch (e: any) {
                return NextResponse.json({ error: e.message }, { status: 400 });
            }
        } else if (action === 'add-log' && body.message) {
            const formattedMsg = formatLog(game.displayId || game.id, body.message);
            const updateResult = await gameService.update(params.id, {
                logs: [...(game.logs || []), formattedMsg]
            });
            game = updateResult || game;
        } else if (action === 'sync-turn' && body.citizenId) {
            const state: any = game.gameState || {
                phaseTicker: 0,
                playerReady: {},
                stagedActors: {},
                playerResources: {}
            };

            state.playerReady[body.citizenId] = true;
            if (body.placedActors) {
                state.stagedActors[body.citizenId] = body.placedActors;
            }
            if (body.resources) {
                if (!state.playerResources) state.playerResources = {};
                state.playerResources[body.citizenId] = body.resources;
            }
            if (body.decisions) {
                if (!state.decisions) state.decisions = {};
                Object.assign(state.decisions, body.decisions);
            }
            if (body.playerInventories) {
                if (!state.playerInventories) state.playerInventories = {};
                Object.assign(state.playerInventories, body.playerInventories);
            }
            if (body.discardPile) {
                state.discardPile = body.discardPile;
            }

            if (body.currentPhase !== undefined) state.currentPhase = body.currentPhase;
            if (body.turn !== undefined) state.turn = body.turn;
            if (body.clearBoard) {
                state.stagedActors = {};
            }

            // Consensus check: only required for active players (handles tie-breaker elimination)
            const activePlayerIds = state.activePlayerIds || game.players.map((p: any) => p.citizenId || p.address || p.id);
            const readyPlayers = Object.keys(state.playerReady).filter(id => activePlayerIds.includes(id));
            const readyCount = readyPlayers.length;

            if (readyCount > 0 && readyCount >= activePlayerIds.length) {
                state.phaseTicker += 1;
                state.playerReady = {};
                // BUG FIX: Clear board state (stagedActors) when moving to next phase
                state.stagedActors = {};
                console.log(`[API] Phase ${state.phaseTicker} consensus reached. Phase: ${state.currentPhase}, Turn: ${state.turn}`);
            }

            const updateResult = await gameService.update(params.id, { gameState: state });
            game = updateResult || game;
        } else if (action === 'sync-decision' && body.citizenId && body.decisions) {
            const state: any = game.gameState || {
                phaseTicker: 0,
                playerReady: {},
                stagedActors: {},
                playerResources: {}
            };
            
            if (!state.decisions) state.decisions = {};
            // Group decisions by player for easier management
            if (!state.decisions[body.citizenId]) state.decisions[body.citizenId] = {};
            Object.assign(state.decisions[body.citizenId], body.decisions);

            const updateResultFinal = await gameService.update(params.id, { gameState: state });
            game = updateResultFinal || game;
        } else if (action === 'sync-placement' && body.citizenId && body.placedActors) {
            const state: any = game.gameState || {
                phaseTicker: 0,
                playerReady: {},
                stagedActors: {},
                playerResources: {}
            };
            
            if (!state.stagedActors) state.stagedActors = {};
            state.stagedActors[body.citizenId] = body.placedActors;
            
            if (body.resources) {
                if (!state.playerResources) state.playerResources = {};
                state.playerResources[body.citizenId] = body.resources;
            }

            const updateResultFinal = await gameService.update(params.id, { gameState: state });
            game = updateResultFinal || game;
        } else if (action === 'draw-event' && body.citizenId) {
            // Server-side event card draw — ensures all players see the same event
            const state: any = game.gameState || { phaseTicker: 0, playerReady: {}, stagedActors: {}, playerResources: {} };
            if (!state.eventDeck || state.eventDeck.length === 0) {
                return NextResponse.json({ error: 'Event deck is empty' }, { status: 400 });
            }
            // Only draw if no currentEventId is set (first player to request triggers draw)
            if (!state.currentEventId) {
                const drawnId = state.eventDeck.shift();
                state.currentEventId = drawnId;
                const updateResult = await gameService.update(params.id, { gameState: state });
                game = updateResult || game;
            }
            return NextResponse.json({ eventId: state.currentEventId, game });

        } else if (action === 'phase-ready' && body.citizenId) {
            // Player signals they've completed the current phase
            const state: any = game.gameState || { phaseTicker: 0, playerReady: {}, stagedActors: {}, playerResources: {} };

            state.playerReady[body.citizenId] = true;

            // Sync resources if provided
            if (body.resources) {
                if (!state.playerResources) state.playerResources = {};
                state.playerResources[body.citizenId] = body.resources;
            }
            // Sync inventory if provided
            if (body.inventory) {
                if (!state.playerInventories) state.playerInventories = {};
                state.playerInventories[body.citizenId] = body.inventory;
            }
            // Sync disabled locations if provided
            if (body.disabledLocations) {
                // Merge disabled locations from all players
                const existing = state.disabledLocations || [];
                const merged = Array.from(new Set([...existing, ...body.disabledLocations]));
                state.disabledLocations = merged;
            }

            // Clear currentEventId when moving past Phase 1
            if (body.clearEvent) {
                state.currentEventId = null;
            }

            // Consensus check
            const activePlayerIds = state.activePlayerIds || game.players.map((p: any) => p.citizenId || p.address || p.id);
            const readyPlayers = Object.keys(state.playerReady).filter(id => activePlayerIds.includes(id));

            if (readyPlayers.length >= activePlayerIds.length) {
                state.phaseTicker += 1;
                state.playerReady = {};
                if (body.nextPhase !== undefined) state.currentPhase = body.nextPhase;
                if (body.nextTurn !== undefined) state.turn = body.nextTurn;
                if (body.clearBoard) state.stagedActors = {};
                console.log(`[API] Consensus reached (phase-ready). phaseTicker: ${state.phaseTicker}, Phase: ${state.currentPhase}, Turn: ${state.turn}`);
            }

            const updateResult = await gameService.update(params.id, { gameState: state });
            game = updateResult || game;

        } else if (action === 'submit-rps' && body.citizenId && body.conflictId) {
            // Store hidden RPS choice for a conflict (PvP)
            const state: any = game.gameState || { phaseTicker: 0, playerReady: {}, stagedActors: {}, playerResources: {} };
            if (!state.rpsChoices) state.rpsChoices = {};
            if (!state.rpsChoices[body.conflictId]) state.rpsChoices[body.conflictId] = {};
            state.rpsChoices[body.conflictId][body.citizenId] = {
                choice: body.choice,
                bid: body.bid || null,
                submittedAt: Date.now()
            };

            const updateResult = await gameService.update(params.id, { gameState: state });
            game = updateResult || game;

            // Return whether all participants have submitted (without revealing choices)
            const submissions = state.rpsChoices[body.conflictId];
            const submittedCount = Object.keys(submissions).length;
            const expectedCount = body.expectedParticipants || 2;
            const allSubmitted = submittedCount >= expectedCount;

            // Only reveal choices when all have submitted
            return NextResponse.json({
                allSubmitted,
                submittedCount,
                choices: allSubmitted ? submissions : undefined,
                game
            });

        } else if (action === 'get-rps' && body.conflictId) {
            // Check if all RPS choices are in for a conflict
            const state: any = game.gameState || {};
            const submissions = state.rpsChoices?.[body.conflictId] || {};
            const submittedCount = Object.keys(submissions).length;
            const expectedCount = body.expectedParticipants || 2;
            const allSubmitted = submittedCount >= expectedCount;

            return NextResponse.json({
                allSubmitted,
                submittedCount,
                choices: allSubmitted ? submissions : undefined
            });

        } else if (action === 'clear-rps') {
            // Clear RPS choices after conflict resolution
            const state: any = game.gameState || {};
            if (body.conflictId && state.rpsChoices) {
                delete state.rpsChoices[body.conflictId];
            } else if (!body.conflictId) {
                state.rpsChoices = {};
            }
            const updateResult = await gameService.update(params.id, { gameState: state });
            game = updateResult || game;

        } else if (action === 'sync-disabled-locations' && body.citizenId) {
            // Sync block card disabled locations for PvP
            const state: any = game.gameState || { phaseTicker: 0, playerReady: {}, stagedActors: {}, playerResources: {} };
            const existing = state.disabledLocations || [];
            const newLocations = body.disabledLocations || [];
            state.disabledLocations = Array.from(new Set([...existing, ...newLocations]));

            const updateResult = await gameService.update(params.id, { gameState: state });
            game = updateResult || game;

        } else if (action === 'draw-action-card' && body.citizenId) {
            // Draw from shared action deck (PvP)
            const state: any = game.gameState || { phaseTicker: 0, playerReady: {}, stagedActors: {}, playerResources: {} };
            if (!state.actionDeck || state.actionDeck.length === 0) {
                return NextResponse.json({ error: 'Action deck is empty', cardId: null });
            }
            const drawnId = state.actionDeck.shift();
            const updateResult = await gameService.update(params.id, { gameState: state });
            game = updateResult || game;
            return NextResponse.json({ cardId: drawnId, remainingCards: state.actionDeck.length, game });

        } else if (action === 'sync-resources' && body.citizenId && body.resources) {
            // Sync player resources to server for PvP visibility
            const state: any = game.gameState || { phaseTicker: 0, playerReady: {}, stagedActors: {}, playerResources: {} };
            if (!state.playerResources) state.playerResources = {};
            state.playerResources[body.citizenId] = body.resources;

            const updateResult = await gameService.update(params.id, { gameState: state });
            game = updateResult || game;

        } else if (action === 'update' && updates) {
            const updateResult = await gameService.update(params.id, updates);
            game = updateResult || game;
        }

        return NextResponse.json(game);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }
}
