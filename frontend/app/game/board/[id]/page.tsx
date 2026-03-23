"use client";

import React from 'react';
import Image from 'next/image';
import { Crown, Briefcase, Info } from 'lucide-react';

import { useBoardSession } from "@/hooks/useBoardSession";
import { TooltipProvider } from "@/context/TooltipContext";
import CursorTooltip from "@/components/ui/CursorTooltip";

// Components
import MapContainer from "@/components/game/MapContainer";
import GameHeader from "@/components/game/GameHeader";
import GameResources from "@/components/game/GameResources";
import NewPlayersPanel from "@/components/game/NewPlayersPanel";
import InventoryStatsModal from "@/components/game/InventoryStatsModal";
import SettingsModal from "@/components/game/SettingsModal";

// Phase Components
import Phase1Event from "@/components/game/phases/Phase1Event";
import Phase2Distribution from "@/components/game/phases/Phase2Distribution";
import Phase3Action from "@/components/game/phases/Phase3Action";
import Phase3Exchange from "@/components/game/phases/Phase3Exchange";
import Phase4Conflict from "@/components/game/phases/Phase4Conflict";
import Phase5Market from "@/components/game/phases/Phase5Market";

import { LOCATIONS } from '@/data/gameConstants';
import { useRouter } from 'next/navigation';

export default function GameBoardPage() {
    const router = useRouter();
    const session = useBoardSession();
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [musicVolume, setMusicVolume] = React.useState(50);
    const [soundVolume, setSoundVolume] = React.useState(50);

    const handleGiveUp = React.useCallback(async () => {
        const { id } = session.game || {};
        if (id) {
            try {
                await fetch(`/api/games/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'give-up',
                        citizenId: session.localPlayerId
                    })
                });
            } catch (e) { console.error("Give up sync failed", e); }
        }
        setIsSettingsOpen(false);
        router.push('/');
    }, [session.game, session.localPlayerId, router]);

    const {
        game, phase, turn, placedActors, disabledLocations, 
        opponentsReady, opponentsData, isGameOver, isTieBreakerScreen,
        activeConflictLocId, resolvedConflicts,
        currentEvent, eventResult, eventTieBreakerActive,
        selectedActorId, hoveredActorId, selectedHex, isWaiting, pendingPlacement, pendingRsp,
        p3Step, selectedActionCards, actionHand, relocationSource, pendingRelocations,
        exchangeStep, exchangeSourceValue, exchangeTargetPlayer, exchangeTargetValue,
        exchangeResults, p5Step, playerMarketOffer, botMarketOffers, marketMatchId,
        isInventoryOpen, isWaitingForPlayers, localPlayerId,
        dynamicPlayers, stickyConflicts, resources, actionDiscardPile, eventDiscardPile,
        discardAmount, availableActors, usedRSPs, relocationCardsCount, exchangeCardsCount, selectedRelocationCount, remainingRelocations,
        victoryPoints, localEventDeckCount, localActionDeckCount
    } = session;

    // Loading & Error States ... (Same as before)
    if (game === '404') {
        return (
            <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans flex items-center justify-center p-10">
                <div className="flex flex-col items-center gap-10 p-16 border-[3px] border-red-500/50 bg-gradient-to-b from-[#1a1a24] to-[#0d0d12] rounded-[3rem] shadow-[0_0_150px_rgba(255,0,0,0.2)] max-w-2xl w-full">
                    <div className="text-center">
                        <h1 className="text-6xl font-black uppercase tracking-[0.2em] text-red-500 drop-shadow-[0_0_40px_rgba(255,0,0,0.8)]">GAME NOT FOUND</h1>
                        <p className="text-white/50 text-xl font-rajdhani uppercase tracking-[0.4em] mt-4">Simulation ID invalid or expired</p>
                    </div>
                </div>
            </main>
        );
    }

    if (!game) {
        return (
            <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(212,175,55,0.4)]"></div>
                    <p className="text-[#d4af37] font-bold font-rajdhani tracking-[0.3em] uppercase animate-pulse">Initializing Board...</p>
                </div>
            </main>
        );
    }

    return (
        <TooltipProvider>
            <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans select-none">
                <CursorTooltip />

                <MapContainer
                    phase={phase}
                    p3Step={p3Step}
                    placedActors={placedActors}
                    selectedActorId={selectedActorId}
                    hoveredActorId={hoveredActorId}
                    disabledLocations={disabledLocations}
                    relocationSource={relocationSource}
                    selectedHex={selectedHex}
                    playerActorsV2={availableActors} 
                    players={dynamicPlayers}
                    localPlayerId={localPlayerId}
                    pendingRelocations={pendingRelocations}
                    availableRelocationCards={relocationCardsCount}
                    availableExchangeCards={exchangeCardsCount}
                    onHexClick={session.handleHexClick}
                    onPlayerClick={(actor) => {
                        if (phase === 3 && p3Step === 2) {
                            session.handleRelocationActorClick(actor);
                        } else if (phase === 2 && actor.playerId === localPlayerId) {
                            session.handleRecallActor(actor.actorId);
                        }
                    }}
                />

                <div className="absolute inset-0 z-[200] pointer-events-none">
                    <GameHeader
                        turn={turn}
                        phase={phase}
                        eventDeckCount={localEventDeckCount ?? game?.gameState?.eventDeck?.length ?? 0}
                        actionDeckCount={localActionDeckCount ?? game?.gameState?.actionDeck?.length ?? 0}
                        eventDiscardPile={eventDiscardPile}
                        actionDiscardPile={actionDiscardPile}
                        onMenuClick={() => setIsSettingsOpen(true)}
                        phaseName={
                            phase === 1 ? "EVENT STAGE" :
                            phase === 2 ? "DISTRIBUTION" :
                            phase === 3 ? "ACTION PHASE" :
                            phase === 4 ? "CONFLICTS REVEAL" : "MARKET & CARDS"
                        }
                    />

                    <GameResources resources={resources} victoryPoints={victoryPoints} />

                    <NewPlayersPanel players={dynamicPlayers} p3Step={p3Step} opponentsData={opponentsData} />

                    {/* Phase Specific UI */}
                    {phase === 1 && (
                        <Phase1Event 
                            game={game}
                            currentEvent={currentEvent}
                            eventResult={eventResult}
                            discardAmount={discardAmount}
                            setDiscardAmount={session.setDiscardAmount}
                            onConfirm={session.handleEventConfirm}
                            onClose={session.closeEvent}
                            eventTieBreakerActive={eventTieBreakerActive}
                            onTieBreakerResolve={() => {}} 
                            resources={resources}
                            onCommitTurn={() => session.handleNextPhaseWrapper()}
                        />
                    )}

                    {phase === 2 && (
                        <Phase2Distribution 
                            availableActors={availableActors}
                            selectedActorId={selectedActorId}
                            onSelectActor={session.handleActorSelect}
                            pendingPlacement={pendingPlacement}
                            pendingRsp={pendingRsp}
                            usedRSPs={usedRSPs}
                            onRSPSelect={session.handleRSPSelect}
                            onBid={session.handleBid}
                            onCancelPlacement={() => session.setPendingPlacement(null)}
                            resources={resources}
                            isWaiting={isWaiting}
                            myActors={availableActors} 
                        />
                    )}

                    {phase === 3 && (
                        <>
                            <Phase3Action
                                p3Step={p3Step}
                                actionHand={actionHand}
                                selectedActionCards={selectedActionCards}
                                onToggleCard={session.handleActionCardToggle}
                                onCommit={() => session.handleNextPhaseWrapper()}
                                disabledLocations={disabledLocations}
                                actionDiscardPile={actionDiscardPile}
                                isWaitingForPlayers={isWaitingForPlayers}
                                game={game}
                                opponentsReady={opponentsReady}
                                relocationCardsCount={relocationCardsCount}
                                exchangeCardsCount={exchangeCardsCount}
                                playerConflictContext={null}
                                exchangeResults={exchangeResults}
                                selectedRelocationCount={selectedRelocationCount}
                                remainingRelocations={remainingRelocations}
                                relocationSource={relocationSource}
                            />
                            {p3Step === 3 && !exchangeResults && exchangeCardsCount > 0 && (
                                <Phase3Exchange 
                                    resources={resources}
                                    exchangeStep={exchangeStep}
                                    exchangeSourceValue={exchangeSourceValue}
                                    exchangeTargetPlayer={exchangeTargetPlayer}
                                    exchangeTargetValue={exchangeTargetValue}
                                    opponentsData={opponentsData}
                                    dynamicPlayers={dynamicPlayers}
                                    localPlayerId={localPlayerId}
                                    setExchangeStep={session.setExchangeStep}
                                    setExchangeSourceValue={session.setExchangeSourceValue}
                                    setExchangeTargetPlayer={session.setExchangeTargetPlayer}
                                    setExchangeTargetValue={session.setExchangeTargetValue}
                                    onCommit={() => session.handleExchangeCommit()}
                                    onNextPhase={() => session.handleNextPhaseWrapper()}
                                    addLog={session.addLog}
                                />
                            )}
                        </>
                    )}

                    {phase === 4 && (
                        <Phase4Conflict 
                            game={game}
                            stickyConflicts={stickyConflicts}
                            resolvedConflicts={resolvedConflicts}
                            activeConflictLocId={activeConflictLocId}
                            onSelectConflict={session.handleSelectConflict}
                            onResolveConflict={session.handleConflictResolve}
                            onCloseConflict={session.handleCloseConflict}
                        />
                    )}

                    {phase === 5 && (
                        <Phase5Market 
                            p5Step={p5Step}
                            resources={resources}
                            playerMarketOffer={playerMarketOffer}
                            dynamicPlayers={dynamicPlayers}
                            botMarketOffers={botMarketOffers}
                            marketMatchId={marketMatchId}
                            localPlayerId={localPlayerId}
                            onMarketOfferConfirm={session.handleMarketOfferConfirm}
                            onMarketRevealComplete={session.handleMarketRevealComplete}
                            onBuyActionCard={session.handleBuyActionCard}
                            onSkipBuyActionCard={session.handleSkipBuyActionCard}
                        />
                    )}

                    {/* Bottom Right: Next Phase Button */}
                    <div className="absolute bottom-10 right-10 z-[300] pointer-events-auto">
                        {!isGameOver && ((phase !== 2 || availableActors.length === 0) && (phase !== 4 || stickyConflicts.filter(c => c.hasPlayer && !resolvedConflicts.includes(c.locId)).length === 0)) && (
                            <button
                                onClick={() => session.handleNextPhaseWrapper()}
                                disabled={isWaitingForPlayers || (game?.isBotGame && !opponentsReady)}
                                className={`px-8 py-3 font-bold rounded-lg uppercase tracking-widest text-xs transition-all ${(isWaitingForPlayers || (game?.isBotGame && !opponentsReady)) ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-2 border-gray-500' : 'bg-[#d4af37] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:bg-[#ffe066] transform hover:scale-105 active:scale-95'}`}
                            >
                                {(isWaitingForPlayers || (game?.isBotGame && !opponentsReady)) ? "WAITING FOR OTHERS..." : "Next Phase"}
                            </button>
                        )}
                    </div>
                </div>

                {/* --- Inventory & Stats Trigger --- */}
                <div className="fixed bottom-10 left-10 z-[300] pointer-events-auto">
                    <button
                        onClick={() => session.setIsInventoryOpen(true)}
                        className="group flex items-center gap-4 px-6 py-3 bg-black/40 border border-[#d4af37]/30 hover:border-[#d4af37] rounded-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                    >
                        <Briefcase size={20} className="text-[#d4af37] group-hover:animate-bounce" />
                        <span className="font-rajdhani font-bold uppercase tracking-[0.2em] text-xs text-white/70 group-hover:text-[#d4af37]">Inventory</span>
                    </button>
                </div>

                <InventoryStatsModal 
                    isOpen={isInventoryOpen}
                    onClose={() => session.setIsInventoryOpen(false)}
                    actionHand={actionHand}
                    players={dynamicPlayers}
                    localPlayerId={localPlayerId}
                    resources={resources}
                    victoryPoints={victoryPoints}
                    opponentsData={opponentsData}
                    actionDiscardPile={actionDiscardPile}
                />

                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    onGiveUp={handleGiveUp}
                    musicVolume={musicVolume}
                    soundVolume={soundVolume}
                    onMusicVolumeChange={setMusicVolume}
                    onSoundVolumeChange={setSoundVolume}
                />
            </main>
        </TooltipProvider>
    );
}
