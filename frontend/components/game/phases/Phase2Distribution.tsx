"use client";

import React from 'react';
import { PlacedActor } from "@/lib/modules/core/types";
import ActorsPanel from "../ActorsPanel";
import RSPRadialMenu from "../RSPRadialMenu";
import BidRadialMenu from "../BidRadialMenu";

interface Phase2DistributionProps {
    availableActors: any[];
    selectedActorId: string | null;
    onSelectActor: (id: string) => void;
    pendingPlacement: { actorId: string, locId: string } | null;
    pendingRsp: string | null;
    usedRSPs: string[];
    onRSPSelect: (choice: string) => void;
    onBid: (token: string | null) => void;
    onCancelPlacement: () => void;
    resources: any;
    isWaiting: boolean;
    myActors: any[];
}

const Phase2Distribution: React.FC<Phase2DistributionProps> = ({
    availableActors,
    selectedActorId,
    onSelectActor,
    pendingPlacement,
    pendingRsp,
    usedRSPs,
    onRSPSelect,
    onBid,
    onCancelPlacement,
    resources,
    isWaiting,
    myActors
}) => {
    return (
        <>
            {/* Left Sidebar: Actors / Hand */}
            {!isWaiting && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-[300] pointer-events-none">
                    <div className="pointer-events-auto">
                        <ActorsPanel
                            actors={availableActors}
                            selectedActorId={selectedActorId}
                            onSelect={onSelectActor}
                        />
                    </div>
                </div>
            )}

            {/* Radial RSP Menu */}
            {pendingPlacement && !pendingRsp && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-auto">
                    <RSPRadialMenu
                        actor={myActors.find(a => a.id === pendingPlacement.actorId) || null}
                        usedTokens={usedRSPs}
                        onSelect={onRSPSelect}
                        onCancel={onCancelPlacement}
                    />
                </div>
            )}

            {/* Radial Bid Menu */}
            {pendingPlacement && pendingRsp && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-auto">
                    <BidRadialMenu
                        actor={myActors.find(a => a.id === pendingPlacement.actorId) || null}
                        resources={{
                            product: resources.product,
                            electricity: resources.electricity,
                            recycling: resources.recycling
                        }}
                        onSelect={onBid}
                        onCancel={onCancelPlacement}
                    />
                </div>
            )}
        </>
    );
};

export default Phase2Distribution;
