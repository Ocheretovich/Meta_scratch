"use client";

import React from 'react';
import MarketOfferModal from "../MarketOfferModal";
import MarketRevealModal from "../MarketRevealModal";
import BuyActionCardModal from "../BuyActionCardModal";
import { ACTION_CARDS } from '@/data/gameConstants';

interface Phase5MarketProps {
    p5Step: 1 | 2 | 3;
    resources: any;
    playerMarketOffer: any;
    dynamicPlayers: any[];
    botMarketOffers: any;
    marketMatchId: string | null;
    localPlayerId: string;
    onMarketOfferConfirm: (offer: any) => void;
    onMarketRevealComplete: (tradePartnerId: string | null) => void;
    onBuyActionCard: (card: any) => void;
    onSkipBuyActionCard: () => void;
}

const Phase5Market: React.FC<Phase5MarketProps> = ({
    p5Step,
    resources,
    playerMarketOffer,
    dynamicPlayers,
    botMarketOffers,
    marketMatchId,
    localPlayerId,
    onMarketOfferConfirm,
    onMarketRevealComplete,
    onBuyActionCard,
    onSkipBuyActionCard
}) => {
    return (
        <>
            {p5Step === 1 && (
                <MarketOfferModal
                    isOpen={true}
                    playerResources={{
                        product: resources.product,
                        electricity: resources.electricity,
                        recycling: resources.recycling
                    }}
                    onConfirm={onMarketOfferConfirm}
                />
            )}

            {p5Step === 2 && (
                <MarketRevealModal
                    isOpen={true}
                    playerOffer={playerMarketOffer}
                    opponents={dynamicPlayers
                        .filter(p => p.id !== localPlayerId)
                        .map(p => ({
                            ...p,
                        }))
                    }
                    botOffers={botMarketOffers}
                    matchId={marketMatchId}
                    onComplete={onMarketRevealComplete}
                />
            )}

            {p5Step === 3 && (
                <BuyActionCardModal
                    isOpen={true}
                    onClose={onSkipBuyActionCard}
                    onBuy={onBuyActionCard}
                    canAfford={resources.product >= 1 && resources.electricity >= 1 && resources.recycling >= 1}
                    availableCards={ACTION_CARDS}
                />
            )}
        </>
    );
};

export default Phase5Market;
