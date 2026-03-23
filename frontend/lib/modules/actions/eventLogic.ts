/**
 * @module actions/eventLogic
 * Event card resolution logic.
 * Pure functions — no React dependencies.
 */

import type { EventCardDefinition, PlayerResources } from '@/lib/modules/core/types';
import { EVENTS } from '@/lib/modules/core/constants';

/**
 * Picks a random event card from the deck.
 */
export function pickRandomEvent(): EventCardDefinition {
    return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}

interface EventResult {
    won: boolean;
    message: string;
    reward?: { type: string; amount: number };
    resourceCost?: { type: string; amount: number };
    isTie?: boolean;
    tieParticipants?: string[];
    winnerName?: string;
    rewardLabel?: string; // human-readable reward description e.g. "1 Fame" or "an Action Card"
}

/**
 * Resolves a "compare" event — compares a resource across players.
 */
export function resolveCompareEvent(
    event: EventCardDefinition,
    playerName: string,
    playerResources: PlayerResources,
    opponentStats: { name: string; amount: number }[]
): EventResult {
    let myStat: number;
    if (event.type === 'compare_sum' && event.targetResources) {
        myStat = event.targetResources.reduce((sum: number, r: string) => sum + ((playerResources as any)[r] || 0), 0);
    } else {
        myStat = (playerResources as any)[event.targetResource!] || 0;
    }
    const allStats = [{ name: playerName, amount: myStat }, ...opponentStats];
    
    let targetStat: number;
    if (event.winCondition === 'min') {
        targetStat = Math.min(...allStats.map(s => s.amount));
    } else {
        targetStat = Math.max(...allStats.map(s => s.amount));
    }

    const winners = allStats.filter(s => s.amount === targetStat);
    const isTie = winners.length > 1;
    const amIWinner = winners.some(w => w.name === playerName);
    
    const statsStr = allStats.map(o => `${o.name}: ${o.amount}`).join(', ');
    
    let message = '';
    if (isTie) {
        message = `TIE DETECTED (${targetStat}). Conflict Resolution needed between: ${winners.map(w => w.name).join(', ')}. (Stats: ${statsStr})`;
    } else {
        message = amIWinner
            ? `${playerName} WON Fame! (Stats: ${statsStr})`
            : `${playerName} lost. (Stats: ${statsStr})`;
    }

    const winnerName = !isTie && winners.length === 1 ? winners[0].name : undefined;

    return {
        won: amIWinner,
        message,
        reward: !isTie && event.reward === 'fame' ? { type: 'fame', amount: 1 } : undefined,
        isTie,
        tieParticipants: winners.map(w => w.name),
        winnerName,
        rewardLabel: event.reward === 'fame' ? '1 Fame' : event.reward === 'action_card' ? 'an Action Card' : undefined,
    };
}

/**
 * Resolves a "discard" event — players secretly discard resources.
 */
export function resolveDiscardEvent(
    event: EventCardDefinition,
    playerName: string,
    discardAmount: number,
    opponentDiscards: { name: string; amount: number }[]
): EventResult {
    const allDiscards = [{ name: playerName, amount: discardAmount }, ...opponentDiscards];
    const maxDiscard = Math.max(...allDiscards.map(o => o.amount), 0);
    
    const winners = allDiscards.filter(o => o.amount === maxDiscard && maxDiscard > 0);
    const isTie = winners.length > 1;
    const amIWinner = winners.some(w => w.name === playerName);

    const oppStr = allDiscards.map(o => `${o.name} discarded ${o.amount}`).join(', ');
    
    let message = '';
    if (isTie) {
        message = `TIE DETECTED (${maxDiscard}). Conflict Resolution needed between: ${winners.map(w => w.name).join(', ')}. Discards: ${oppStr}`;
    } else {
        message = amIWinner
            ? `${playerName} discarded ${discardAmount} (Total: ${oppStr}). ${playerName} WON an Action Card!`
            : `${playerName} discarded ${discardAmount} (Total: ${oppStr}). ${playerName} lost.`;
    }

    const winnerName = !isTie && winners.length === 1 ? winners[0].name : undefined;

    return {
        won: amIWinner,
        message,
        resourceCost: { type: event.targetResource!, amount: discardAmount },
        isTie,
        tieParticipants: winners.map(w => w.name),
        winnerName,
        rewardLabel: event.reward === 'fame' ? '1 Fame' : event.reward === 'action_card' ? 'an Action Card' : undefined,
    };
}
