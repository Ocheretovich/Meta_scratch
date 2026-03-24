import { LOCATIONS, ALLOWED_MOVES, ACTION_CARDS } from '@/data/gameConstants';
import { ActionCardInstance } from '@/lib/modules/core/types';
import { calculateVictoryPoints, calculateReward } from '@/lib/modules/resources/resourceManager';

// ─── Bot Inventory Helpers ────────────────────────────────────────

/** Get a bot's action card inventory from opponentsData */
export const getBotInventory = (opponentsData: any, botId: string): ActionCardInstance[] => {
    return opponentsData?.[botId]?.inventory || [];
};

/** Add a card to bot inventory */
export const addCardToBotInventory = (
    setOpponentsData: (cb: (prev: any) => any) => void,
    botId: string,
    card: ActionCardInstance
) => {
    setOpponentsData((prev: any) => {
        const od = prev[botId];
        if (!od) return prev;
        const inventory = [...(od.inventory || []), card];
        return { ...prev, [botId]: { ...od, inventory } };
    });
};

/** Remove used cards from bot inventory, add to per-bot pile AND the shared global discard pile */
const consumeBotCards = (
    setOpponentsData: (cb: (prev: any) => any) => void,
    botId: string,
    cards: ActionCardInstance[],  // full card objects — known synchronously at the call site
    setActionDiscardPile?: (cb: (prev: ActionCardInstance[]) => ActionCardInstance[]) => void
) => {
    const cardIds = cards.map(c => c.id);
    setOpponentsData((prev: any) => {
        const od = prev[botId];
        if (!od) return prev;
        const inventory = (od.inventory || []).filter((c: ActionCardInstance) => !cardIds.includes(c.id));
        const discardPile = [...(od.discardPile || []), ...cards];
        return { ...prev, [botId]: { ...od, inventory, discardPile } };
    });
    // Push synchronously to the shared global discard pile (cards are already known here)
    if (setActionDiscardPile && cards.length > 0) {
        setActionDiscardPile(prev => [...prev, ...cards]);
    }
};

// ─── Bot Card Selection Logic (Phase 3 Step 0) ───────────────────

interface BotCardDecision {
    blockCards: ActionCardInstance[];
    relocationCards: ActionCardInstance[];
    exchangeCards: ActionCardInstance[];
    steps: number[];
}

/**
 * Decides which action cards a bot will play this turn.
 * Rules:
 * - Block location cards: 100% play (bot avoids sending actors there in Phase 2)
 * - Change Values cards: 100% play
 * - Relocation cards: 1 card = 70%, 2 cards = 100%+50%, 3 cards = 100%+70%+50%
 * - If bot has both Block + Relocation: Relocation becomes 100% (to rescue own actor from disabled location)
 */
export const decideBotCardSelection = (
    botInventory: ActionCardInstance[],
    hasBlockCard: boolean
): BotCardDecision => {
    const blockCards = botInventory.filter(c => c.type === 'turn off location' && c.disables);
    const relocationAll = botInventory.filter(c => (c.title || '').toLowerCase().includes('relocation'));
    const exchangeCards = botInventory.filter(c =>
        (c.title || '').toLowerCase().includes('change') || (c.title || '').toLowerCase().includes('exchange')
    );

    // Block cards: always play all
    const selectedBlock = [...blockCards];

    // Exchange cards: always play all
    const selectedExchange = [...exchangeCards];

    // Relocation cards: probability-based
    const relocProbs = hasBlockCard || selectedBlock.length > 0
        ? [1.0, 0.7, 0.5]   // If has block card, first relocation is 100%
        : [0.7, 0.5, 0.3];  // Default probabilities

    // Override: if bot has 2+ relocation cards, first is always 100%
    if (relocationAll.length >= 2) {
        relocProbs[0] = 1.0;
    }

    const selectedRelocation: ActionCardInstance[] = [];
    for (let i = 0; i < relocationAll.length && i < relocProbs.length; i++) {
        if (Math.random() < relocProbs[i]) {
            selectedRelocation.push(relocationAll[i]);
        }
    }

    // Build steps array
    const steps: number[] = [];
    if (selectedBlock.length > 0) steps.push(1);
    if (selectedRelocation.length > 0) steps.push(2);
    if (selectedExchange.length > 0) steps.push(3);

    return { blockCards: selectedBlock, relocationCards: selectedRelocation, exchangeCards: selectedExchange, steps };
};

// ─── Bot Phase 2: Block-Aware Distribution ───────────────────────

/**
 * Get locations the bot plans to block (from its block cards).
 * Used in Phase 2 to avoid sending own actors to those locations.
 */
export const getBotBlockedLocations = (botInventory: ActionCardInstance[]): string[] => {
    return botInventory
        .filter(c => c.type === 'turn off location' && c.disables)
        .map(c => c.disables!);
};

// ─── Bot Phase 3 Step 3: Smart Exchange Logic ────────────────────

/**
 * Decides the best exchange for a bot to maximize its VP and minimize the leader's VP.
 * Returns { sourceVal, targetPlayerId, targetVal } or null if no valid exchange.
 */
const decideBotExchange = (
    botId: string,
    botResources: any,
    allPlayers: { id: string; name: string; resources: any }[],
    localPlayerId: string,
    localResources: any
): { sourceVal: string; targetPlayerId: string; targetVal: string } | null => {
    const valueTypes = ['power', 'art', 'knowledge'];

    // Build full player list with resources
    const everyone = [
        { id: localPlayerId, resources: localResources },
        ...allPlayers.filter(p => p.id !== botId).map(p => ({ id: p.id, resources: p.resources }))
    ];

    const botVP = calculateVictoryPoints(botResources);

    // Find the leader (not the bot itself)
    let leaderId = '';
    let leaderVP = -1;
    for (const p of everyone) {
        const vp = calculateVictoryPoints(p.resources);
        if (vp > leaderVP) {
            leaderVP = vp;
            leaderId = p.id;
        }
    }

    // Try all possible exchanges and pick the one that maximizes bot VP gain
    // while minimizing the leader's VP
    let bestExchange: { sourceVal: string; targetPlayerId: string; targetVal: string } | null = null;
    let bestScore = -Infinity;

    for (const give of valueTypes) {
        if ((botResources[give] || 0) <= 0) continue;

        for (const target of everyone) {
            for (const take of valueTypes) {
                if (take === give) continue;
                if (((target.resources as any)?.[take] || 0) <= 0) continue;

                // Simulate the exchange
                const newBotRes = { ...botResources, [give]: botResources[give] - 1, [take]: (botResources[take] || 0) + 1 };
                const newTargetRes = { ...target.resources, [take]: (target.resources as any)[take] - 1, [give]: ((target.resources as any)[give] || 0) + 1 };

                const newBotVP = calculateVictoryPoints(newBotRes);
                const newTargetVP = calculateVictoryPoints(newTargetRes);
                const oldTargetVP = calculateVictoryPoints(target.resources);

                // Score: maximize bot VP gain, prefer hurting the leader
                let score = (newBotVP - botVP) * 10;
                if (target.id === leaderId) {
                    score += (oldTargetVP - newTargetVP) * 5;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestExchange = { sourceVal: give, targetPlayerId: target.id, targetVal: take };
                }
            }
        }
    }

    return bestExchange;
};

// ─── Main Bot Phase 3 Actions ────────────────────────────────────

/**
 * Simulates bot actions during Phase 3 (Action Cards Phase).
 */
export const triggerBotPhase3Actions = async (
    game: any,
    step: number,
    opponents: any[],
    placedActors: any[],
    addLog: (msg: string) => Promise<void>,
    setDisabledLocations: (cb: (prev: string[]) => string[]) => void,
    setPlacedActors: (cb: (prev: any[]) => any[]) => void,
    setOpponentsReady: (ready: boolean) => void,
    setPendingRelocations?: (cb: (prev: any[]) => any[]) => void,
    botActionCommits?: Record<string, number[]>,
    opponentsData?: any,
    setOpponentsData?: (cb: (prev: any) => any) => void,
    localPlayerId?: string,
    localResources?: any,
    botCardSelections?: Record<string, BotCardDecision>,
    setActionDiscardPile?: (cb: (prev: ActionCardInstance[]) => ActionCardInstance[]) => void,
    setLocationsBlockedBy?: (cb: (prev: Record<string, string>) => Record<string, string>) => void
) => {
    if (!game?.isBotGame) return;

    for (const opp of opponents) {
        const botCommits = botActionCommits?.[opp.id] || [];
        const botHasCardForStep = botCommits.includes(step);
        const selection = botCardSelections?.[opp.id];

        if (!botHasCardForStep) {
            await new Promise(r => setTimeout(r, 300));
            continue;
        }

        if (step === 1 && selection?.blockCards) {
            // Step 1: Block Locations — execute all selected block cards
            for (const card of selection.blockCards) {
                if (!card.disables) continue;
                setDisabledLocations(prev => {
                    if (prev.includes(card.disables!)) return prev;
                    return [...prev, card.disables!];
                });
                // Record who blocked this location for the UI
                if (setLocationsBlockedBy) {
                    const blockerName = opp.name || 'Bot';
                    const locId = card.disables!;
                    setLocationsBlockedBy(prev => ({ ...prev, [locId]: blockerName }));
                }
                const locName = LOCATIONS.find(l => l.id === card.disables)?.name || card.disables;
                await addLog(`${opp.name} activated ${card.title} — ${locName.toUpperCase()} is now DISABLED`);
            }
            // Consume used block cards
            if (setOpponentsData) {
                consumeBotCards(setOpponentsData, opp.id, selection.blockCards, setActionDiscardPile);
            }
        } else if (step === 2 && selection?.relocationCards) {
            // Step 2: Relocation
            const botActors = placedActors.filter(a => a.playerId === opp.id);

            for (const card of selection.relocationCards) {
                // Priority: relocate own actor from a disabled location
                let actorToMove: any = null;
                let targetLocId: string | null = null;

                // Check if any own actor is in a disabled location
                const disabledActors = botActors.filter(a => {
                    // Get current disabled locations from the state
                    const locDisabled = selection.blockCards.some(bc => bc.disables === a.locId);
                    return locDisabled;
                });

                if (disabledActors.length > 0) {
                    actorToMove = disabledActors[0];
                    // Find valid location with fewest actors of same type
                    const allowed = ALLOWED_MOVES[actorToMove.actorType as keyof typeof ALLOWED_MOVES] || [];
                    const validLocs = allowed.filter((lid: string) =>
                        lid !== actorToMove.locId &&
                        !selection.blockCards.some(bc => bc.disables === lid)
                    );
                    if (validLocs.length > 0) {
                        // Pick location with fewest actors of same type
                        let minCount = Infinity;
                        for (const lid of validLocs) {
                            const count = placedActors.filter(a => a.locId === lid && a.actorType === actorToMove.actorType).length;
                            if (count < minCount) {
                                minCount = count;
                                targetLocId = lid;
                            }
                        }
                    }
                }

                if (!actorToMove) {
                    // No actor in disabled location — pick random own actor
                    if (botActors.length > 0) {
                        actorToMove = botActors[Math.floor(Math.random() * botActors.length)];
                        const allowed = ALLOWED_MOVES[actorToMove.actorType as keyof typeof ALLOWED_MOVES] || [];
                        const validLocs = allowed.filter((lid: string) =>
                            lid !== actorToMove.locId &&
                            !selection.blockCards.some(bc => bc.disables === lid)
                        );
                        if (validLocs.length > 0) {
                            targetLocId = validLocs[Math.floor(Math.random() * validLocs.length)];
                        }
                    }
                }

                if (actorToMove && targetLocId) {
                    const fromLoc = LOCATIONS.find(l => l.id === actorToMove.locId)?.name || actorToMove.locId;
                    const toLoc = LOCATIONS.find(l => l.id === targetLocId)?.name || targetLocId;

                    setPlacedActors(prev => prev.map(a =>
                        a.actorId === actorToMove.actorId ? { ...a, locId: targetLocId } : a
                    ));

                    if (setPendingRelocations) {
                        setPendingRelocations(prev => [...prev, {
                            playerId: opp.id,
                            actorId: actorToMove.actorId,
                            targetLocId
                        }]);
                    }

                    await addLog(`${opp.name} relocated ${actorToMove.name || actorToMove.actorType} from ${fromLoc.toUpperCase()} to ${toLoc.toUpperCase()}`);
                }
            }
            // Consume used relocation cards
            if (setOpponentsData) {
                consumeBotCards(setOpponentsData, opp.id, selection.relocationCards, setActionDiscardPile);
            }
        } else if (step === 3 && selection?.exchangeCards) {
            // Step 3: Change Values — smart exchange
            const botRes = opponentsData?.[opp.id]?.resources || {};

            for (const card of selection.exchangeCards) {
                const allPlayersForExchange = opponents
                    .filter(o => o.id !== opp.id)
                    .map(o => ({
                        id: o.id,
                        name: o.name,
                        resources: opponentsData?.[o.id]?.resources || {}
                    }));

                const exchange = decideBotExchange(
                    opp.id,
                    botRes,
                    allPlayersForExchange,
                    localPlayerId || '',
                    localResources || {}
                );

                if (exchange) {
                    const targetName = opponents.find(o => o.id === exchange.targetPlayerId)?.name
                        || (exchange.targetPlayerId === localPlayerId ? 'You' : 'Player');

                    // Apply the exchange
                    if (setOpponentsData) {
                        setOpponentsData((prev: any) => {
                            const next = { ...prev };

                            // Bot loses sourceVal, gains targetVal
                            const botOd = next[opp.id];
                            if (botOd) {
                                const botR = { ...botOd.resources };
                                botR[exchange.sourceVal] = Math.max(0, (botR[exchange.sourceVal] || 0) - 1);
                                botR[exchange.targetVal] = (botR[exchange.targetVal] || 0) + 1;
                                next[opp.id] = { ...botOd, resources: botR };
                            }

                            // Target loses targetVal, gains sourceVal
                            if (exchange.targetPlayerId !== localPlayerId) {
                                const targetOd = next[exchange.targetPlayerId];
                                if (targetOd) {
                                    const targetR = { ...targetOd.resources };
                                    targetR[exchange.targetVal] = Math.max(0, (targetR[exchange.targetVal] || 0) - 1);
                                    targetR[exchange.sourceVal] = (targetR[exchange.sourceVal] || 0) + 1;
                                    next[exchange.targetPlayerId] = { ...targetOd, resources: targetR };
                                }
                            }

                            return next;
                        });
                    }

                    // If target is the local player, update their resources too
                    // (This is handled by the caller — we just log it)

                    await addLog(`${opp.name} used Change Values: exchanged ${exchange.sourceVal.toUpperCase()} for ${targetName}'s ${exchange.targetVal.toUpperCase()}`);

                    // Update local botRes for next card iteration
                    botRes[exchange.sourceVal] = Math.max(0, (botRes[exchange.sourceVal] || 0) - 1);
                    botRes[exchange.targetVal] = (botRes[exchange.targetVal] || 0) + 1;
                }
            }
            // Consume used exchange cards
            if (setOpponentsData) {
                consumeBotCards(setOpponentsData, opp.id, selection.exchangeCards, setActionDiscardPile);
            }
        }

        await new Promise(r => setTimeout(r, 800));
    }

    setOpponentsReady(true);
};

// ─── Bot Phase 4: Resolve Bot-Only Conflicts ─────────────────────

/**
 * Resolves conflicts where ONLY bots are present in a location (Phase 4).
 */
export const resolveBotOnlyConflicts = async (
    placedActors: any[],
    disabledLocations: string[],
    resolvedConflicts: string[],
    dynamicPlayers: any[],
    localPlayerId: string,
    addLog: (msg: string) => Promise<void>,
    setOpponentsData: (cb: (prev: any) => any) => void,
    setPlacedActors: (cb: (prev: any[]) => any[]) => void,
    setResolvedConflicts: (cb: (prev: string[]) => string[]) => void
) => {
    const groups: { [key: string]: any[] } = {};
    placedActors.forEach(p => {
        if (disabledLocations.includes(p.locId)) return;
        const key = `${p.locId}_${p.actorType}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    });

    for (const [key, actors] of Object.entries(groups)) {
        if (resolvedConflicts.includes(key)) continue;
        if (actors.some(a => a.playerId === localPlayerId)) continue;

        // Split on LAST underscore only since locId can contain underscores (e.g., 'power_plant')
        const lastUnderscoreIdx = key.lastIndexOf('_');
        const locId = key.substring(0, lastUnderscoreIdx);
        const actorType = key.substring(lastUnderscoreIdx + 1);
        const locDef = LOCATIONS.find(l => l.id === locId);
        const realLocName = locDef?.name || locId.toUpperCase();

        if (actors.length === 1) {
            const bot = actors[0];
            const botName = dynamicPlayers.find(p => p.id === bot.playerId)?.name || 'Bot';
            const actorTypeName = bot.actorType.charAt(0).toUpperCase() + bot.actorType.slice(1);

            const rewardTypeRaw = bot.actorType === 'robot'
                ? (locDef?.resource || 'product')
                : bot.actorType === 'politician' ? 'power'
                : bot.actorType === 'scientist' ? 'knowledge'
                : bot.actorType === 'artist' ? 'art' : 'fame';
            const resource = rewardTypeRaw.charAt(0).toUpperCase() + rewardTypeRaw.slice(1);
            // Uncontested win: actor always wins; apply bet bonus via calculateReward
            const successfulBids = bot.bid ? [{ actorId: bot.actorId, bid: bot.bid }] : [];
            const amount = calculateReward(bot.actorType, true, false, successfulBids, bot.actorId);

            await addLog(`${botName}'s ${actorTypeName} has no rivals at ${realLocName}. They secured ${amount} ${resource}!`);

            setOpponentsData(prev => {
                const next = { ...prev };
                if (!next[bot.playerId]) return prev;
                const res = { ...next[bot.playerId].resources } as any;
                const resKey = resource.toLowerCase();
                res[resKey] = (res[resKey] || 0) + amount;
                next[bot.playerId] = { ...next[bot.playerId], resources: res };
                return next;
            });
        } else {
            const tokens = ['ROCK', 'PAPER', 'SCISSORS'];
            const bot1 = actors[0];
            const bot2 = actors[1];

            const t1 = tokens[Math.floor(Math.random() * 3)];
            // Ensure bot2 picks a DIFFERENT token to avoid infinite draw loops
            let t2 = tokens[Math.floor(Math.random() * 3)];
            if (t2 === t1) {
                const others = tokens.filter(t => t !== t1);
                t2 = others[Math.floor(Math.random() * others.length)];
            }

            const b1Name = dynamicPlayers.find(p => p.id === bot1.playerId)?.name || 'Bot 1';
            const b2Name = dynamicPlayers.find(p => p.id === bot2.playerId)?.name || 'Bot 2';

            const actorTypeName = bot1.actorType.charAt(0).toUpperCase() + bot1.actorType.slice(1);

            await addLog(`Conflict at ${realLocName}: ${b1Name}'s ${actorTypeName} (${t1}) vs ${b2Name}'s ${actorTypeName} (${t2})`);

            if (t1 === t2) {
                await addLog(`It's a DRAW at ${realLocName}! Both ${actorTypeName}s were evicted.`);
                setPlacedActors(prev => prev.filter(a => !(a.locId === locId && a.actorType === bot1.actorType)));
            } else {
                const wins: any = { 'ROCK': 'SCISSORS', 'SCISSORS': 'PAPER', 'PAPER': 'ROCK' };
                const winner = wins[t1] === t2 ? bot1 : bot2;
                const winnerName = dynamicPlayers.find(p => p.id === winner.playerId)?.name || 'Bot';

                const winnerRewardTypeRaw = winner.actorType === 'robot'
                    ? (locDef?.resource || 'product')
                    : winner.actorType === 'politician' ? 'power'
                    : winner.actorType === 'scientist' ? 'knowledge'
                    : winner.actorType === 'artist' ? 'art' : 'fame';
                const resource = winnerRewardTypeRaw.charAt(0).toUpperCase() + winnerRewardTypeRaw.slice(1);
                const successfulBids = winner.bid ? [{ actorId: winner.actorId, bid: winner.bid }] : [];
                const amount = calculateReward(winner.actorType, true, false, successfulBids, winner.actorId);

                await addLog(`${winnerName}'s ${actorTypeName} WON at ${realLocName} and secured ${amount} ${resource}!`);

                setOpponentsData(prev => {
                    const next = { ...prev };
                    if (!next[winner.playerId]) return prev;
                    const res = { ...next[winner.playerId].resources } as any;
                    const resKey = resource.toLowerCase();
                    res[resKey] = (res[resKey] || 0) + amount;
                    next[winner.playerId] = { ...next[winner.playerId], resources: res };
                    return next;
                });
            }
        }
        setResolvedConflicts(prev => [...prev, key]);
        await new Promise(r => setTimeout(r, 800));
    }
};

// ─── Bot Phase 2: Placement ──────────────────────────────────────

/**
 * Triggers initial opponent token placement (Phase 2).
 * Now aware of block cards — bots avoid sending actors to locations they plan to block.
 */
export const triggerOpponentPlacements = async (
    game: any,
    _deprecated_AUTO_PLACEMENTS: any[],
    PLAYERS: any[],
    setOpponentsReady: (ready: boolean) => void,
    setPlacedActors: (cb: (prev: any[]) => any[]) => void,
    setOpponentsData: (cb: (prev: any) => any) => void,
    addLog: (msg: string) => Promise<void>,
    opponentsData: any
) => {
    if (!game || !game.isBotGame) return;

    setOpponentsReady(false);
    await new Promise(r => setTimeout(r, 1500));

    // Use actual player IDs from the passed-in PLAYERS list so actor playerId
    // matches opponentsData keys (which are keyed by citizenId from game.players)
    const activeBots = PLAYERS.map((p: any) => ({
        id: p.id,
        name: p.name,
        playerAvatar: p.avatar
    }));

    const actorDefinitions = [
        { type: "politician", name: "Politician", avatar: "/actors/Polotican.png", headAvatar: "/actors/Politican_head.png" },
        { type: "robot", name: "Robot", avatar: "/actors/Robot.png", headAvatar: "/actors/Robot_head.png" },
        { type: "scientist", name: "Scientist", avatar: "/actors/Scientist.png", headAvatar: "/actors/Scientist_head.png" },
        { type: "artist", name: "Artist", avatar: "/actors/Artist.png", headAvatar: "/actors/Artist_head.png" }
    ];

    const rspTokens = ['rock', 'paper', 'scissors'];
    const bidTypes = ['product', 'electricity', 'recycling'];

    for (const bot of activeBots) {
        const botId = bot.id;
        const botName = bot.name;

        // Get bot's block cards to know which locations to avoid
        const botInventory = getBotInventory(opponentsData, botId);
        const locationsToAvoid = getBotBlockedLocations(botInventory);

        const availableArgs = [...rspTokens, 'dummy'].sort(() => Math.random() - 0.5);
        const botResources = opponentsData[botId]?.resources || {};

        for (let i = 0; i < actorDefinitions.length; i++) {
            const def = actorDefinitions[i];

            const allowedIds = ALLOWED_MOVES[def.type as keyof typeof ALLOWED_MOVES] || [];
            // Filter out locations the bot plans to block
            const validLocIds = allowedIds.filter((lid: string) => !locationsToAvoid.includes(lid));
            // Fallback: if all valid locations are blocked, use any allowed location
            const finalLocIds = validLocIds.length > 0 ? validLocIds : allowedIds;
            const validLocs = LOCATIONS.filter(l => finalLocIds.includes(l.id));
            const loc = validLocs[Math.floor(Math.random() * validLocs.length)] || LOCATIONS[0];

            const token = availableArgs.pop()!;

            let bid = null;
            const skipBidProb = Math.random() < 0.5;

            if (!skipBidProb) {
                if (token === 'dummy') {
                    const targetBid = def.type === 'robot' ? 'recycling' : 'electricity';
                    if ((botResources[targetBid] || 0) > 0) {
                        bid = targetBid;
                    }
                } else {
                    const possibleBids = bidTypes.filter(bt => (botResources[bt] || 0) > 0);
                    if (possibleBids.length > 0) {
                        bid = possibleBids[Math.floor(Math.random() * possibleBids.length)];
                    }
                }
            }

            const deterministicId = `${botId}_${def.type}`;

            const action = {
                actorId: deterministicId,
                playerId: botId,
                locId: loc.id,
                type: token,
                isOpponent: true,
                name: def.name,
                actorType: def.type,
                avatar: def.avatar,
                headAvatar: def.headAvatar,
                bid: bid,
                // Embed owner info so MapContainer can show avatars without lookup
                ownerName: botName,
                ownerAvatar: bot.playerAvatar
            };

            setPlacedActors(prev => {
                const filtered = prev.filter(a => a.actorId !== deterministicId);
                return [...filtered, action];
            });

            if (bid) {
                setOpponentsData(prev => {
                    const next = { ...prev };
                    if (!next[botId]) return prev;
                    const oppRes = { ...next[botId].resources };
                    oppRes[bid] = Math.max(0, (oppRes[bid] || 0) - 1);
                    next[botId] = { ...next[botId], resources: oppRes };
                    return next;
                });
            }

            const betText = bid ? ` (Bet on ${bid === 'product' ? 'WIN' : bid === 'electricity' ? 'LOSE' : 'DRAW'})` : "";
            const tokenIcon = token === 'dummy' ? '🎭 DUMMY' : token.toUpperCase();
            await addLog(`${botName} placed ${def.name} with ${tokenIcon} to ${loc.id.toUpperCase()}${betText}`);

            await new Promise(r => setTimeout(r, 600));
        }
    }

    await new Promise(r => setTimeout(r, 600));
    setOpponentsReady(true);
};

// ─── Bot Market Phase: Buy Action Cards ──────────────────────────

/**
 * Bots try to buy action cards during Market Phase.
 * 60% chance to buy if they have 1 Product + 1 Electricity + 1 Recycling.
 */
export const botMarketBuy = (
    opponentsData: any,
    opponents: any[],
    setOpponentsData: (cb: (prev: any) => any) => void,
    addLog: (msg: string) => Promise<void>,
    setLocalActionDeckCount?: (cb: (prev: number | null) => number | null) => void
) => {
    for (const opp of opponents) {
        const botRes = opponentsData[opp.id]?.resources || {};
        const canBuy = (botRes.product || 0) >= 1 && (botRes.electricity || 0) >= 1 && (botRes.recycling || 0) >= 1;

        if (canBuy && Math.random() < 0.6) {
            // Pick a random card from the deck
            const botInv = getBotInventory(opponentsData, opp.id);
            const usedIds = new Set(botInv.map((c: ActionCardInstance) => c.id));
            const availableCards = ACTION_CARDS.filter(c => !usedIds.has(c.id));

            if (availableCards.length > 0) {
                const drawn = availableCards[Math.floor(Math.random() * availableCards.length)];
                const instance = { ...drawn, instanceId: `${drawn.id}_${Date.now()}` } as ActionCardInstance;

                // Deduct resources and add card
                setOpponentsData((prev: any) => {
                    const od = prev[opp.id];
                    if (!od) return prev;
                    const res = { ...od.resources };
                    res.product = Math.max(0, (res.product || 0) - 1);
                    res.electricity = Math.max(0, (res.electricity || 0) - 1);
                    res.recycling = Math.max(0, (res.recycling || 0) - 1);
                    const inventory = [...(od.inventory || []), instance];
                    return { ...prev, [opp.id]: { ...od, resources: res, inventory } };
                });

                if (setLocalActionDeckCount) {
                    setLocalActionDeckCount(prev => prev !== null ? Math.max(0, prev - 1) : prev);
                }

                addLog(`${opp.name} purchased an Action Card from the market.`);
            }
        }
    }
};
