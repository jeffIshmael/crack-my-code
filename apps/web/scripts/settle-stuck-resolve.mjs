/**
 * Settle a completed DB cash game whose on-chain match is still Active.
 * Uses contracts owner/backend key (PRIVATE_KEY or AGENT_PRIVATE_KEY).
 *
 * SETTLE=1 pnpm exec node scripts/settle-stuck-resolve.mjs
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createPublicClient, createWalletClient, formatUnits, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTLE = process.env.SETTLE === '1';
const GAME_ID = process.env.GAME_ID || 'cmt1eyf42000novop17axv3f3';

function loadEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* missing file ok */
  }
  return out;
}

const webEnv = loadEnv(resolve(__dirname, '../.env'));
const contractsEnv = loadEnv(resolve(__dirname, '../../contracts/.env'));
Object.assign(process.env, webEnv);

const CONTRACT_ADDRESS = '0x0317e55136a46557516aa40EA96d66772767C72C';
const USDT_ADDRESS = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e';

const abi = [
  {
    name: 'resolveMatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'winner', type: 'address' },
      { name: 'player2', type: 'address' },
      { name: 'p1Guesses', type: 'uint256' },
      { name: 'p2Guesses', type: 'uint256' },
      { name: 'p1Code', type: 'string' },
      { name: 'p2Code', type: 'string' },
      { name: 'historyHash', type: 'string' },
      { name: 'guesses', type: 'string[]' },
    ],
    outputs: [],
  },
  {
    name: 'getMatch',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'matchId', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'bytes32' },
          { name: 'player1', type: 'address' },
          { name: 'player2', type: 'address' },
          { name: 'winner', type: 'address' },
          { name: 'quitter', type: 'address' },
          { name: 'matchType', type: 'uint8' },
          { name: 'status', type: 'uint8' },
          { name: 'stakeAmount', type: 'uint256' },
          { name: 'totalPool', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'startedAt', type: 'uint256' },
          { name: 'endedAt', type: 'uint256' },
          { name: 'player1Guesses', type: 'uint256' },
          { name: 'player2Guesses', type: 'uint256' },
          { name: 'player1Code', type: 'string' },
          { name: 'player2Code', type: 'string' },
          { name: 'historyHash', type: 'string' },
        ],
      },
    ],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  { name: 'escrowedStakes', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

const pkRaw = contractsEnv.PRIVATE_KEY || webEnv.OWNER_PRIVATE_KEY || webEnv.AGENT_PRIVATE_KEY;
if (!pkRaw) throw new Error('Need contracts PRIVATE_KEY (backend/owner)');
const account = privateKeyToAccount((pkRaw.startsWith('0x') ? pkRaw : `0x${pkRaw}`));

const publicClient = createPublicClient({
  chain: celo,
  transport: http('https://forno.celo.org'),
});
const walletClient = createWalletClient({
  account,
  chain: celo,
  transport: http('https://forno.celo.org'),
});

const { default: pg } = await import('pg');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const { rows } = await pool.query('SELECT * FROM "Game" WHERE id = $1', [GAME_ID]);
const game = rows[0];
if (!game) throw new Error(`Game ${GAME_ID} not found`);

console.log({
  gameId: game.id,
  status: game.status,
  winnerAddress: game.winnerAddress,
  onChainMatchId: game.onChainMatchId,
  signer: account.address,
});

const match = await publicClient.readContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getMatch',
  args: [game.onChainMatchId],
});

const STATUS = ['Pending', 'Active', 'Completed', 'Abandoned', 'Expired', 'Refunded', 'Draw'];
console.log('before', {
  status: STATUS[Number(match.status)],
  player1: match.player1,
  player2: match.player2,
  winner: match.winner,
  totalPool: formatUnits(match.totalPool, 6),
});

const winner = game.winnerAddress;
if (!winner || winner === 'DRAW' || winner === 'AI') {
  throw new Error(`Cannot settle: winnerAddress=${winner}`);
}

const { rows: guessRows } = await pool.query(
  'SELECT digits, "isPlayer" FROM "Guess" WHERE "gameId" = $1 ORDER BY "createdAt" ASC',
  [GAME_ID],
);
const p1Guesses = guessRows.filter((g) => g.isPlayer).length;
const p2Guesses = guessRows.filter((g) => !g.isPlayer).length;
const guessArray = guessRows.map((g) => g.digits);

console.log({ p1Guesses, p2Guesses, guessCount: guessArray.length, settle: SETTLE });

if (!SETTLE) {
  console.log('Dry run. Re-run with SETTLE=1 to pay winner.');
  await pool.end();
  process.exit(0);
}

const { request } = await publicClient.simulateContract({
  account,
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'resolveMatch',
  args: [
    game.onChainMatchId,
    winner,
    game.player2Address,
    BigInt(p1Guesses),
    BigInt(p2Guesses),
    game.player1Code || '',
    game.player2Code || '',
    '',
    guessArray,
  ],
});

const hash = await walletClient.writeContract(request);
console.log('tx', hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log('receipt', receipt.status);

const after = await publicClient.readContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getMatch',
  args: [game.onChainMatchId],
});
console.log('after', {
  status: STATUS[Number(after.status)],
  winner: after.winner,
  totalPool: formatUnits(after.totalPool, 6),
});

const escrow = await publicClient.readContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'escrowedStakes',
});
const winnerBal = await publicClient.readContract({
  address: USDT_ADDRESS,
  abi,
  functionName: 'balanceOf',
  args: [winner],
});
console.log({
  escrowedStakes: formatUnits(escrow, 6),
  winnerUsdt: formatUnits(winnerBal, 6),
  celoscan: `https://celoscan.io/tx/${hash}`,
});

await pool.end();
