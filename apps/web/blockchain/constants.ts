export const CONTRACT_ADDRESS = "0x0317e55136a46557516aa40EA96d66772767C72C";
export const USDT_ADDRESS = "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e" as `0x${string}`;

export const ERC20_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "_owner", "type": "address" },
      { "name": "_spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  }
] as const;

export const CONTRACT_ABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "previousAdmin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "newAdmin",
          "type": "address"
        }
      ],
      "name": "AdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "beacon",
          "type": "address"
        }
      ],
      "name": "BeaconUpgraded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "challenger",
          "type": "address"
        }
      ],
      "name": "ChallengeCancelled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "challenger",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "enum GuessMyCode.MatchType",
          "name": "matchType",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stakeAmount",
          "type": "uint256"
        }
      ],
      "name": "ChallengeCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "challenger",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "opponent",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "startedAt",
          "type": "uint256"
        }
      ],
      "name": "ChallengeJoined",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "FeesWithdrawn",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "enum GuessMyCode.MatchType",
          "name": "matchType",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isAI",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "totalAI",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "totalPvPPaid",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "totalPvPFree",
          "type": "uint256"
        }
      ],
      "name": "GameTracked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "player1Guesses",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "player2Guesses",
          "type": "uint256"
        }
      ],
      "name": "GuessCountsUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "version",
          "type": "uint8"
        }
      ],
      "name": "Initialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "quitter",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "winner",
          "type": "address"
        }
      ],
      "name": "MatchAbandoned",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "loser",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "payout",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "fee",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum GuessMyCode.MatchType",
          "name": "matchType",
          "type": "uint8"
        }
      ],
      "name": "MatchCompleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "challenger",
          "type": "address"
        }
      ],
      "name": "MatchExpired",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "PlayerRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "oldPoints",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newPoints",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "PointsUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "oldToken",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newToken",
          "type": "address"
        }
      ],
      "name": "TokenUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "implementation",
          "type": "address"
        }
      ],
      "name": "Upgraded",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "MIN_POINTS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_STAKE",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "POINTS_LOSS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "POINTS_QUIT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "POINTS_START",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "POINTS_WIN",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "accumulatedFees",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "activeMatchOf",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        }
      ],
      "name": "cancelChallenge",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "challengeBoard",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "contractBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bool",
          "name": "isPaid",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "stakeAmt",
          "type": "uint256"
        }
      ],
      "name": "createChallenge",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        }
      ],
      "name": "emergencyWithdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        }
      ],
      "name": "expireMatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        }
      ],
      "name": "getMatch",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "id",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "player1",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "player2",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "winner",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "quitter",
              "type": "address"
            },
            {
              "internalType": "enum GuessMyCode.MatchType",
              "name": "matchType",
              "type": "uint8"
            },
            {
              "internalType": "enum GuessMyCode.MatchStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "stakeAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "totalPool",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "createdAt",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startedAt",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endedAt",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "player1Guesses",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "player2Guesses",
              "type": "uint256"
            }
          ],
          "internalType": "struct GuessMyCode.Match",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "wallet",
          "type": "address"
        }
      ],
      "name": "getMatchCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "challenger",
          "type": "address"
        }
      ],
      "name": "getOpenChallenge",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "id",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "player1",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "player2",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "winner",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "quitter",
              "type": "address"
            },
            {
              "internalType": "enum GuessMyCode.MatchType",
              "name": "matchType",
              "type": "uint8"
            },
            {
              "internalType": "enum GuessMyCode.MatchStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "stakeAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "totalPool",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "createdAt",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startedAt",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endedAt",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "player1Guesses",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "player2Guesses",
              "type": "uint256"
            }
          ],
          "internalType": "struct GuessMyCode.Match",
          "name": "m",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "wallet",
          "type": "address"
        }
      ],
      "name": "getPlayer",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "points",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gamesPlayed",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gamesWon",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gamesLost",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gamesQuit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "registeredAt",
              "type": "uint256"
            },
            {
              "internalType": "bytes32[]",
              "name": "matchIds",
              "type": "bytes32[]"
            }
          ],
          "internalType": "struct GuessMyCode.PlayerProfile",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "wallet",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "offset",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "limit",
          "type": "uint256"
        }
      ],
      "name": "getPlayerMatches",
      "outputs": [
        {
          "internalType": "bytes32[]",
          "name": "result",
          "type": "bytes32[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_usdToken",
          "type": "address"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "player",
          "type": "address"
        }
      ],
      "name": "isInMatch",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "challenger",
          "type": "address"
        }
      ],
      "name": "joinChallenge",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "matchExpiry",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "matches",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "id",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "player1",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "player2",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "quitter",
          "type": "address"
        },
        {
          "internalType": "enum GuessMyCode.MatchType",
          "name": "matchType",
          "type": "uint8"
        },
        {
          "internalType": "enum GuessMyCode.MatchStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "stakeAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalPool",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "startedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "player1Guesses",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "player2Guesses",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "players",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "points",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "gamesPlayed",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "gamesWon",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "gamesLost",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "gamesQuit",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "registeredAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proxiableUUID",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "quitter",
          "type": "address"
        }
      ],
      "name": "recordQuit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "register",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "p1Guesses",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "p2Guesses",
          "type": "uint256"
        }
      ],
      "name": "resolveMatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_seconds",
          "type": "uint256"
        }
      ],
      "name": "setMatchExpiry",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_bps",
          "type": "uint256"
        }
      ],
      "name": "setTreasuryFeeBps",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        }
      ],
      "name": "setUsdToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalAIGames",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalPvPFreeGames",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalPvPPaidGames",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum GuessMyCode.MatchType",
          "name": "mType",
          "type": "uint8"
        },
        {
          "internalType": "bool",
          "name": "isAI",
          "type": "bool"
        }
      ],
      "name": "trackGame",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "treasuryFeeBps",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "matchId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "p1Guesses",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "p2Guesses",
          "type": "uint256"
        }
      ],
      "name": "updateGuessCounts",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        }
      ],
      "name": "upgradeTo",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "upgradeToAndCall",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "usdToken",
      "outputs": [
        {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        }
      ],
      "name": "withdrawAllFees",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "withdrawFees",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const;