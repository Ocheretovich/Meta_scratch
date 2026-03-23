export interface Player {
    name: string;
    address: string;
    citizenId?: string;
    avatar?: string;
    joinedAt: number;
    isReady?: boolean; // New: Ready status
}

export interface ChatMessage {
    sender: string;
    avatar: string;
    content: string;
    timestamp: number;
}

export interface GameTransaction {
    id: string;
    type: string;
    timestamp: number;
    details: any;
}

export interface Game {
    id: string; // Game Hash
    displayId?: string; // Sequential ID (e.g. 001)
    roomId: string; // Readable name
    status: 'waiting' | 'playing' | 'finished' | 'deleted';
    isPrivate: boolean;
    createdAt: number;
    players: Player[];
    maxPlayers: number;
    bidAmount: number; // GATO
    winner?: string; // CitizenId or Address
    logs: string[];
    transactions: GameTransaction[];
    messages: ChatMessage[]; // New: Chat history
    startTime?: number; // New: Game start timestamp
    isBotGame?: boolean;
    phaseTimer?: number; // 0 = unlimited, 30/60/180 = seconds per phase
    deletedAt?: number; // Soft delete timestamp
    gameState?: {
        phaseTicker: number;
        playerReady: Record<string, boolean>;
        stagedActors: Record<string, any[]>;
        playerResources?: Record<string, any>;
        playerInventories?: Record<string, any[]>;
        decisions?: Record<string, any>;
        eventDeck?: string[];
        actionDeck?: string[];
        currentEventId?: string;
        currentPhase?: number;
        turn?: number;
        disabledLocations?: string[];
        rpsChoices?: Record<string, Record<string, { choice: string; bid: string | null; submittedAt: number }>>;
        activePlayerIds?: string[];
        isTieBreaker?: boolean;
    };
}
