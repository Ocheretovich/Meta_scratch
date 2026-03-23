/**
 * @module phase/phaseEngine
 * Pure state machine for Metarchy game phase advancement.
 * Takes current state → returns next state. No React dependencies.
 */

import type { TurnState, PhaseNumber, Phase3Step } from '@/lib/modules/core/types';
import { MAX_TURNS } from '@/lib/modules/core/constants';

interface PhaseAdvanceInput {
    turn: number;
    phase: PhaseNumber;
    p3Step: Phase3Step;
    playerCount: number;
    hasTie?: boolean; // New flag for tie-breaker check
}

interface PhaseAdvanceResult {
    turn: number;
    phase: PhaseNumber;
    p3Step: Phase3Step;
    isGameOver: boolean;
    logs: string[];
    /** true if we should trigger bot Phase 3 actions at the new step */
    triggerBotP3: boolean;
    triggerBotP3Step: number;
    /** true if opponents should be marked ready (Phase 4, 5) */
    markOpponentsReady: boolean;
    /** true if board should be cleared (entering Phase 5) */
    clearBoard: boolean;
    /** true if disabled locations should be cleared */
    clearDisabledLocations: boolean;
}

/**
 * Calculates the max turns for the current game.
 */
export function getMaxTurns(playerCount: number): number {
    return MAX_TURNS[playerCount] || 5;
}

/**
 * Advances the game by one phase/step.
 * Pure function: takes current state, returns new state + side effect flags.
 */
export function advancePhase(input: PhaseAdvanceInput): PhaseAdvanceResult {
    const { turn, phase, p3Step, playerCount } = input;
    const maxTurns = getMaxTurns(playerCount);
    const logs: string[] = [];

    let result: PhaseAdvanceResult = {
        turn,
        phase,
        p3Step,
        isGameOver: false,
        logs: [],
        triggerBotP3: false,
        triggerBotP3Step: 0,
        markOpponentsReady: false,
        clearBoard: false,
        clearDisabledLocations: false,
    };

    // Check for game over
    // Rule: "The game is finished after Phase 4 (Conflicts Resolution) of the last turn,
    // unless two or more players have the same biggest amount of Victory Points."
    // Note: Phase 5 (Market) is skipped on the last turn unless there's a tie.
    if (turn >= maxTurns && phase === 5 && !input.hasTie) {
        return { ...result, isGameOver: true, logs: ['--- GAME FINISHED ---'] };
    }

    // Phase 3 sub-step advancement
    if (phase === 3) {
        if (p3Step < 3) {
            const nextStep = (p3Step + 1) as Phase3Step;
            const stepNames = ['', 'BLOCKING LOCATIONS', 'RELOCATION', 'CHANGE VALUES'];
            logs.push('All players are ready');
            logs.push(`STEP: ${stepNames[nextStep]}`);

            return {
                ...result,
                p3Step: nextStep,
                logs,
                triggerBotP3: true,
                triggerBotP3Step: nextStep,
            };
        }
    }

    // Linear phase progression
    if (phase < 5) {
        const newPhase = (phase + 1) as PhaseNumber;
        const newP3Step: Phase3Step = 1;

        if (newPhase === 3) {
            logs.push('STEP: BLOCKING LOCATIONS');
        }
        if (newPhase === 4) {
            result.markOpponentsReady = true;
        }
        if (newPhase === 5) {
            result.clearBoard = true;
            result.clearDisabledLocations = true;
            result.markOpponentsReady = true;
        }

        logs.push(`PHASE ${newPhase} BEGINS`);

        return {
            ...result,
            phase: newPhase,
            p3Step: newP3Step,
            logs,
            triggerBotP3: newPhase === 3,
            triggerBotP3Step: newPhase === 3 ? 1 : 0,
        };
    }

    // Phase 5 → next turn
    const newTurn = turn + 1;
    logs.push(`TURN ${newTurn} BEGINS`);

    // According to rulebook: "Event Phase - Starts from Turn 2. (but not on the Turn 1)"
    // Therefore Turn > 1 goes to phase 1 (Event), Turn 1 skips to phase 2 (Distribution).
    const nextPhase: PhaseNumber = newTurn === 1 ? 2 : 1;
    if (nextPhase === 1) logs.push(`PHASE 1 BEGINS`);

    return {
        ...result,
        turn: newTurn,
        phase: nextPhase,
        p3Step: 1,
        logs,
        markOpponentsReady: false,
        clearBoard: true,
        clearDisabledLocations: true,
    };
}
