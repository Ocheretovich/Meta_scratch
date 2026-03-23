/**
 * @module core/types
 * Shared type definitions for the entire Metarchy game.
 * All modules import types from here — never define game types elsewhere.
 */

// ─── Actor Types ───────────────────────────────────────────────────
export type ActorType = 'politician' | 'scientist' | 'artist' | 'robot';

export interface ActorDefinition {
    id: string;
    type: ActorType;
    name: string;
    avatar: string;
    headAvatar: string;
}

// ─── Arguments (RPS) ──────────────────────────────────────────────
export type ArgumentType = 'rock' | 'paper' | 'scissors' | 'dummy';

// ─── Resources & Values ───────────────────────────────────────────
export type ResourceType = 'product' | 'electricity' | 'recycling';
export type ValueType = 'power' | 'art' | 'knowledge';
export type FameType = 'fame';

/** All trackable resource/value keys */
export type ResourceKey = ResourceType | ValueType | FameType | 'gato';

export interface PlayerResources {
    gato: number;
    product: number;
    electricity: number;
    recycling: number;
    power: number;
    art: number;
    knowledge: number;
    fame: number;
    victoryPoints?: number;
}

// ─── Locations ────────────────────────────────────────────────────
export type LocationType = 'intangible' | 'material';

export interface LocationDefinition {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    image: string;
    hint: string | null;
    activeHint: string | null;
    resource: string;
    type: LocationType;
    nonPlayable?: boolean;
}

// ─── Bets ─────────────────────────────────────────────────────────
/** Bet type maps to the resource spent */
export type BetType = 'product' | 'electricity' | 'recycling';

// ─── Placed Actors (Board State) ──────────────────────────────────
export interface PlacedActor {
    actorId: string;
    playerId: string;
    locId: string;
    type: ArgumentType;        // The RPS argument assigned
    actorType: ActorType;
    name: string;
    avatar: string;
    headAvatar: string;
    isOpponent?: boolean;
    bid?: BetType;
}

// ─── Conflicts ────────────────────────────────────────────────────
export type ConflictStatus = 'pending' | 'resolved';

export interface Conflict {
    id: string;
    locId: string;             // Unique conflict key: `${locationId}_${actorType}`
    realLocId: string;         // Actual location ID on the board
    actorType: ActorType;
    locationName: string;
    playerActor: PlacedActor;
    opponents: (PlacedActor & { name: string; playerAvatar?: string })[];
    resourceType: string;
    isPeaceful: boolean;       // No opponents at this location
    hasPlayer: boolean;        // Does the local player have an actor here?
    status: ConflictStatus;
}

export interface ConflictResult {
    winnerId: string | null;      // If null and shareRewards=false, conflict continues or draw
    loserIds: string[];           // IDs of actors that must leave immediately
    survivorIds: string[];        // IDs of actors that stay for the next iteration
    tieIds?: string[];            // IDs of actors who tied for the top (Used for UI DRAW status)
    isDraw: boolean;
    restart: boolean;             // If true, everyone in survivorIds must re-pick argument
    evictAll: boolean;
    shareRewards: boolean;
    successfulBids: { actorId: string; bid: string }[];
    usedBid?: string;
    logs: string[];
}

// ─── Action Cards ─────────────────────────────────────────────────
export type ActionCardType = 'turn off location' | 'action';

export interface ActionCardDefinition {
    id: string;
    title: string;
    icon: string;
    type: ActionCardType;
    disables?: string;         // Location ID this card disables
    desc: string;
    flavor: string;
}

export interface ActionCardInstance extends ActionCardDefinition {
    instanceId: string;        // Unique instance (e.g., "relocation_1")
}

// ─── Event Cards ──────────────────────────────────────────────────
export type EventType = 'compare' | 'compare_sum' | 'discard';

export interface EventCardDefinition {
    id: string;
    title: string;
    flavor: string;
    desc: string;
    image: string;
    type: EventType;
    targetResource?: string;        // For 'compare' and 'discard' events
    targetResources?: string[];     // For 'compare_sum' events (e.g. Revolution sums power+knowledge+art)
    winCondition?: 'min' | 'max';
    reward: string;
}

// ─── Players ──────────────────────────────────────────────────────
export interface GamePlayer {
    id: string;
    name: string;
    address?: string;
    citizenId?: string;
    avatar: string;
    color?: string;
    joinedAt?: number;
    isReady?: boolean;
}

export interface OpponentData {
    id: string;
    resources: PlayerResources;
    cards: Record<string, number>;
    inventory?: ActionCardInstance[];
    discardPile?: ActionCardInstance[];
}

// ─── Game Phases ──────────────────────────────────────────────────
export type PhaseNumber = 1 | 2 | 3 | 4 | 5;
export type Phase3Step = 1 | 2 | 3;       // Block Location | Relocation | Change Values
export type Phase5Step = 1 | 2 | 3;       // Market Offer | Market Reveal | Buy Cards

export interface TurnState {
    turn: number;
    phase: PhaseNumber;
    p3Step: Phase3Step;
    p5Step: Phase5Step;
    isGameOver: boolean;
}

// ─── Game (Server-side record) ────────────────────────────────────
export interface Game {
    id: string;
    displayId?: string;
    roomId: string;
    status: 'waiting' | 'playing' | 'finished' | 'deleted';
    isPrivate: boolean;
    createdAt: number;
    players: GamePlayer[];
    maxPlayers: number;
    bidAmount: number;
    winner?: string;
    logs: string[];
    transactions: GameTransaction[];
    messages: ChatMessage[];
    startTime?: number;
    isBotGame?: boolean;
    deletedAt?: number;
    gameState?: {
        phaseTicker: number;
        playerReady: Record<string, boolean>;
        stagedActors: Record<string, PlacedActor[]>;
        playerResources: Record<string, PlayerResources>;
        playerInventories?: Record<string, ActionCardInstance[]>;
        discardPile?: ActionCardInstance[];
        disabledLocations?: string[];
        eventDeck: string[];
        actionDeck: string[];
        eventDeckTurn?: number;
        currentEventId?: string;
        activePlayerIds?: string[]; // IDs of players in the tie-breaker
        isTieBreaker?: boolean;
    };
}

export interface GameTransaction {
    id: string;
    type: string;
    timestamp: number;
    details: any;
}

export interface ChatMessage {
    sender: string;
    avatar: string;
    content: string;
    timestamp: number;
}

// ─── Market ───────────────────────────────────────────────────────
export interface MarketOffer {
    give: ResourceKey;
    want: ResourceKey;
    amount: number;
}
