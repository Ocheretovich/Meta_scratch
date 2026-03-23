"use client";

import React from 'react';
import ConflictsSidebar from "../ConflictsSidebar";
import ConflictResolutionView from "../ConflictResolutionView";

interface Phase4ConflictProps {
    game: any;
    stickyConflicts: any[];
    resolvedConflicts: string[];
    activeConflictLocId: string | null;
    onSelectConflict: (locId: string) => void;
    onResolveConflict: (result: any, locId: string) => void;
    onCloseConflict: () => void;
}

const Phase4Conflict: React.FC<Phase4ConflictProps> = ({
    game,
    stickyConflicts,
    resolvedConflicts,
    activeConflictLocId,
    onSelectConflict,
    onResolveConflict,
    onCloseConflict
}) => {
    const currentConflict = stickyConflicts.find(c => c.locId === activeConflictLocId);

    return (
        <>
            {/* Phase 4: Conflicts Sidebar */}
            <ConflictsSidebar
                conflicts={stickyConflicts.filter(c => c.hasPlayer)}
                resolvedIds={resolvedConflicts}
                activeConflictLocId={activeConflictLocId}
                onSelectConflict={onSelectConflict}
                isVisible={!activeConflictLocId}
            />

            {/* Phase 4: Conflict Resolution Modal */}
            {activeConflictLocId && currentConflict && (
                <div className="absolute inset-0 z-0 pointer-events-auto">
                    <ConflictResolutionView
                        game={game}
                        conflict={currentConflict}
                        onResolve={(result) => onResolveConflict(result, currentConflict.locId)}
                        onClose={onCloseConflict}
                        hasNextConflict={stickyConflicts.filter(c => c.hasPlayer && !resolvedConflicts.includes(c.locId)).length > 1}
                    />
                </div>
            )}
        </>
    );
};

export default Phase4Conflict;
