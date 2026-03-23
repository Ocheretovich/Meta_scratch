/**
 * @module player/playerManager
 * Manages player identity, multi-player sync, and dynamic player lists.
 * Pure functions — no React dependencies.
 */

import type { GamePlayer, PlayerResources } from '@/lib/modules/core/types';
import { DEFAULT_RESOURCES, ACTION_CARDS, DEFAULT_BOT_PLAYERS } from '@/lib/modules/core/constants';

/**
 * Resolves the local player's stable ID from available identifiers.
 */
export function getLocalPlayerId(player: { citizenId?: string; address?: string }): string {
    return player.citizenId || player.address || 'p1';
}

/**
 * Builds the dynamic player list from the game object + local player info.
 * Returns [localPlayer, ...opponents] with consistent `id` fields.
 */
export function buildPlayerList(
    localPlayer: { name?: string; avatar?: string; address?: string; citizenId?: string },
    game: { players: any[]; isBotGame?: boolean } | null
): GamePlayer[] {
    const mainPlayer: GamePlayer = {
        id: getLocalPlayerId(localPlayer),
        name: localPlayer.name || '080',
        avatar: localPlayer.avatar || '/avatars/golden_avatar.png',
        address: localPlayer.address,
    };

    if (!game) {
        return [mainPlayer, ...DEFAULT_BOT_PLAYERS.slice(0, 2)];
    }

    const otherPlayers = game.players
        .filter((p: any) => {
            if (localPlayer.citizenId && p.citizenId === localPlayer.citizenId) return false;
            if (localPlayer.address && p.address === localPlayer.address) return false;
            if (p.name && p.name === (localPlayer.name || '080')) return false;
            if (!localPlayer.citizenId && !localPlayer.address && p === game.players[0]) return false;
            return true;
        })
        .map((p: any, index: number) => ({
            ...p,
            id: p.citizenId || p.address || p.id || `bot-${index + 1}`,
            name: p.name || DEFAULT_BOT_PLAYERS[index]?.name || 'Citizen',
            avatar: p.avatar || DEFAULT_BOT_PLAYERS[index]?.avatar || '/avatars/ghost.png',
        }));

    const finalPlayers = [mainPlayer, ...otherPlayers];

    if (game.isBotGame && finalPlayers.length < 3) {
        if (finalPlayers.length === 1) finalPlayers.push(DEFAULT_BOT_PLAYERS[0], DEFAULT_BOT_PLAYERS[1]);
        else if (finalPlayers.length === 2) finalPlayers.push(DEFAULT_BOT_PLAYERS[1]);
    }

    return finalPlayers;
}

/**
 * Initializes opponent resource data from the game.
 * All players (human and bot) start with the same DEFAULT_RESOURCES.
 */
export function initOpponentData(
    game: { players: any[]; isBotGame?: boolean } | null,
    localCitizenId: string | undefined
): Record<string, { id: string; resources: Record<string, number>; cards: Record<string, number> }> {
    const opponents: Record<string, any> = {};
    const baseResources = { ...DEFAULT_RESOURCES, vp: 0 };

    if (game && game.players) {
        game.players.forEach((p: any) => {
            if (p.citizenId !== localCitizenId) {
                const id = p.citizenId || p.address;
                opponents[id] = {
                    id,
                    resources: { ...baseResources },
                    cards: {},
                };
            }
        });
    } else {
        DEFAULT_BOT_PLAYERS.forEach(opp => {
            opponents[opp.id] = {
                id: opp.id,
                resources: { ...baseResources },
                cards: {},
            };
        });
    }

    return opponents;
}
