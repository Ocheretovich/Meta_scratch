// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MetarchyTokens.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MetarchyGame is ReentrancyGuard {
    MetarchyTokens public tokens;

    enum GamePhase {
        EVENT,          // 1
        DISTRIBUTION,   // 2 (Commit)
        DISTRIBUTION_REVEAL, // 2 (Reveal)
        ACTION,         // 3
        CONFLICT,       // 4
        MARKET          // 5
    }

    struct Player {
        address addr;
        bool hasJoined;
        uint256 victoryPoints;
        bytes32 commitHash; // Stores the secret move hash
        bool revealed;      // Tracks if player has revealed for current phase
    }

    struct GameSession {
        uint256 id;
        uint256 playerCount;
        uint256 currentTurn;
        GamePhase currentPhase;
        address[] playerList;
        bool isActive;
        uint256 creationTime;
        uint256 revealedCount; // Count players who revealed in current phase
        uint256 committedCount; // Count players who committed
    }

    // Game ID -> Session
    mapping(uint256 => GameSession) public games;
    // Game ID -> Player Address -> Player Data
    mapping(uint256 => mapping(address => Player)) public gamePlayers;

    uint256 public nextGameId;

    event GameCreated(uint256 indexed gameId, address indexed creator);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event PhaseChanged(uint256 indexed gameId, GamePhase newPhase);
    event MoveCommitted(uint256 indexed gameId, address indexed player);
    event MoveRevealed(uint256 indexed gameId, address indexed player);

    constructor(address _tokenContract) {
        tokens = MetarchyTokens(_tokenContract);
    }

    // --- Lobby Logic ---

    function createGame() external returns (uint256) {
        uint256 gameId = nextGameId++;
        GameSession storage game = games[gameId];
        game.id = gameId;
        game.currentTurn = 1;
        game.currentPhase = GamePhase.EVENT; // Start at Event
        game.isActive = true;
        game.creationTime = block.timestamp;
        
        _joinGame(gameId, msg.sender);

        emit GameCreated(gameId, msg.sender);
        return gameId;
    }

    function joinGame(uint256 gameId) external {
        require(games[gameId].isActive, "Game not active");
        require(games[gameId].playerCount < 6, "Game full"); 
        _joinGame(gameId, msg.sender);
    }

    function _joinGame(uint256 gameId, address playerAddr) internal {
        require(!gamePlayers[gameId][playerAddr].hasJoined, "Already joined");
        
        games[gameId].playerList.push(playerAddr);
        games[gameId].playerCount++;
        
        gamePlayers[gameId][playerAddr] = Player({
            addr: playerAddr,
            hasJoined: true,
            victoryPoints: 0,
            commitHash: bytes32(0),
            revealed: false
        });

        // 4 Actors (IDs 0-3)
        uint256[] memory ids = new uint256[](4);
        uint256[] memory amounts = new uint256[](4);
        ids[0] = 0; ids[1] = 1; ids[2] = 2; ids[3] = 3; 
        amounts[0] = 1; amounts[1] = 1; amounts[2] = 1; amounts[3] = 1;
        
        tokens.mintBatch(playerAddr, ids, amounts, "");

        emit PlayerJoined(gameId, playerAddr);
    }

    // --- Commit-Reveal Scheme (Phase 2) ---

    function commitMove(uint256 gameId, bytes32 moveHash) external {
        GameSession storage game = games[gameId];
        require(game.isActive, "Game finished");
        require(gamePlayers[gameId][msg.sender].hasJoined, "Not in game");
        require(game.currentPhase == GamePhase.DISTRIBUTION, "Wrong phase");
        require(gamePlayers[gameId][msg.sender].commitHash == bytes32(0), "Already committed");

        gamePlayers[gameId][msg.sender].commitHash = moveHash;
        game.committedCount++;

        emit MoveCommitted(gameId, msg.sender);

        // If all players committed, move to Reveal
        if (game.committedCount == game.playerCount) {
            game.currentPhase = GamePhase.DISTRIBUTION_REVEAL;
            emit PhaseChanged(gameId, GamePhase.DISTRIBUTION_REVEAL);
        }
    }

    // moveData: Encoded data of (ActorID -> LocationID, ActorID -> RSP_TokenID)
    // salt: Random string/number user used to generate hash
    function revealMove(uint256 gameId, bytes memory moveData, string memory salt) external {
        GameSession storage game = games[gameId];
        Player storage player = gamePlayers[gameId][msg.sender];

        require(game.currentPhase == GamePhase.DISTRIBUTION_REVEAL, "Not reveal phase");
        require(!player.revealed, "Already revealed");
        
        // Verify Hash
        bytes32 expectedHash = keccak256(abi.encodePacked(gameId, game.currentTurn, GamePhase.DISTRIBUTION, moveData, salt));
        require(player.commitHash == expectedHash, "Invalid hash/move");

        // Logic to process the moveData would go here (e.g., storing temp state for Conflict phase)
        // For prototype, we just validate the reveal.

        player.revealed = true;
        game.revealedCount++;

        emit MoveRevealed(gameId, msg.sender);

        // If all players revealed, move to next phase (Action)
        if (game.revealedCount == game.playerCount) {
             _advanceToNextPhase(gameId);
        }
    }

    function _advanceToNextPhase(uint256 gameId) internal {
        GameSession storage game = games[gameId];
        // Reset counters
        game.committedCount = 0;
        game.revealedCount = 0;
        
        // Reset player states for next phase/turn
        for (uint i=0; i<game.playerList.length; i++) {
            address pAddr = game.playerList[i];
            gamePlayers[gameId][pAddr].commitHash = bytes32(0);
            gamePlayers[gameId][pAddr].revealed = false;
        }

        // Simple transition logic
        if (game.currentPhase == GamePhase.DISTRIBUTION_REVEAL) {
            game.currentPhase = GamePhase.ACTION;
        } else if (game.currentPhase == GamePhase.ACTION) {
            game.currentPhase = GamePhase.CONFLICT;
        } else if (game.currentPhase == GamePhase.CONFLICT) {
            game.currentPhase = GamePhase.MARKET;
        } else if (game.currentPhase == GamePhase.MARKET) {
            // End of Turn
            game.currentTurn++;
            game.currentPhase = GamePhase.EVENT;
        }

        emit PhaseChanged(gameId, game.currentPhase);
    }
}
