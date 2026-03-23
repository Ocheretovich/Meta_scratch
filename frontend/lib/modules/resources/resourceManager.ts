/**
 * @module resources/resourceManager
 * Victory Points calculation, resource rewards, and spending.
 * Pure functions — no React dependencies.
 */

import type { PlayerResources, PlacedActor, ActorType } from '@/lib/modules/core/types';
import { LOCATIONS } from '@/lib/modules/core/constants';

/**
 * Calculates Victory Points using the Metarchy formula:
 * VP = min(power, art, knowledge) after optimally distributing fame.
 * Fame fills the lowest value first.
 */
export function calculateVictoryPoints(resources: PlayerResources): number {
    let { power, knowledge, art, fame } = resources;
    let p = power, k = knowledge, a = art, f = fame;

    while (f > 0) {
        if (p <= k && p <= a) p++;
        else if (k <= p && k <= a) k++;
        else a++;
        f--;
    }

    return Math.min(p, k, a);
}

/**
 * Determines what resource an actor earns based on its type and location.
 */
export function getActorRewardType(actorType: string, locId: string): string {
    const type = actorType?.toLowerCase() || '';
    if (type === 'politician') return 'power';
    if (type === 'scientist') return 'knowledge';
    if (type === 'artist') return 'art';
    if (type === 'robot') {
        const locDef = LOCATIONS.find(l => l.id === locId);
        return locDef?.resource || '';
    }
    return '';
}

/**
 * Calculates the final reward amount for an actor based on conflict outcome and bids.
 * 
 * Rules:
 * - Win (winnerId): Robot (3), Others (1).
 * - Truce (shareRewards): Robot (1), Others (1).
 * - Robot 3-3-3 Rule: If Robot Truce + Recycling Bid, reward is 3.
 * - Product Bid: +1 bonus on top of Win reward.
 */
export function calculateReward(
    actorType: ActorType,
    isWinner: boolean,
    isTruce: boolean,
    successfulBids: { actorId: string; bid: string }[],
    actorId: string
): number {
    const type = actorType?.toLowerCase() || '';
    const hasProductBid = successfulBids.some(b => b.actorId === actorId && b.bid === 'product');
    const hasRecyclingBid = successfulBids.some(b => b.actorId === actorId && b.bid === 'recycling');

    if (isWinner || (isTruce && hasRecyclingBid)) {
        const base = type === 'robot' ? 3 : 1;
        return hasProductBid ? base + 1 : base;
    }

    if (isTruce) {
        return hasProductBid ? 1 + 1 : 1;
    }

    return 0;
}

/**
 * Calculates rewards for all surviving actors of a player at end of Phase 4.
 * Returns a map of { resourceKey: amountToAdd }.
 */
export function calculatePhase4Rewards(
    playerId: string,
    placedActors: PlacedActor[],
    disabledLocations: string[]
): Record<string, number> {
    const rewards: Record<string, number> = {};

    placedActors
        .filter(actor => actor.playerId === playerId && !disabledLocations.includes(actor.locId))
        .forEach(actor => {
            const earnedResource = getActorRewardType(actor.actorType, actor.locId);
            if (!earnedResource) return;

            const isProductBet = actor.bid === 'product';
            // Robot gets 3 of the location's resource; others get 1
            const base = actor.actorType?.toLowerCase() === 'robot' ? 3 : 1;
            const finalReward = isProductBet ? base + 1 : base;

            rewards[earnedResource] = (rewards[earnedResource] || 0) + finalReward;
        });

    return rewards;
}

/**
 * Checks if a player can afford a specific resource cost.
 */
export function canAfford(
    resources: PlayerResources,
    costs: Partial<Record<string, number>>
): boolean {
    return Object.entries(costs).every(
        ([key, amount]) => (resources[key as keyof PlayerResources] ?? 0) >= (amount ?? 0)
    );
}

/**
 * Deducts resources. Returns new resources object.
 */
export function spendResources(
    resources: PlayerResources,
    costs: Partial<Record<string, number>>
): PlayerResources {
    const updated = { ...resources };
    Object.entries(costs).forEach(([key, amount]) => {
        const k = key as keyof PlayerResources;
        (updated as any)[k] = Math.max(0, ((updated as any)[k] || 0) - (amount || 0));
    });
    return updated;
}
