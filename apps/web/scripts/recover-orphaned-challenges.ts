/**
 * Recover Pending on-chain challenges — refund stake to player1.
 * Uses expireMatch when past expiry; otherwise owner cancelChallenge.
 *
 * RECOVER=1 pnpm exec tsx scripts/recover-orphaned-challenges.ts
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import 'dotenv/config';
import { createPublicClient, http, formatUnits, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI, USDT_ADDRESS, ERC20_ABI } from '../blockchain/constants';
import { expireMatchOnChain } from '../blockchain/AgentFunctions';

const RECOVER = process.env.RECOVER === '1';
const STATUS = ['Pending', 'Active', 'Completed', 'Abandoned', 'Expired', 'Refunded', 'Draw'];

const publicClient = createPublicClient({
  chain: celo,
  transport: http('https://forno.celo.org'),
});

function ownerAccount() {
  const pk = process.env.OWNER_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
  if (!pk) throw new Error('Set OWNER_PRIVATE_KEY (contract owner) in env');
  const key = (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`;
  return privateKeyToAccount(key);
}

async function cancelAsOwner(matchId: `0x${string}`) {
  const account = ownerAccount();
  const wallet = createWalletClient({
    account,
    chain: celo,
    transport: http('https://forno.celo.org'),
  });
  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'cancelChallenge',
    args: [matchId],
  });
  const hash = await wallet.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function main() {
  const latest = await publicClient.getBlockNumber();
  // Celo RPC max range ~5000
  const fromBlock = latest - 4990n;

  const createdEv = CONTRACT_ABI.find((x: any) => x.type === 'event' && x.name === 'ChallengeCreated');
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS as `0x${string}`,
    event: createdEv as any,
    fromBlock,
    toBlock: latest,
  });

  const pending: { matchId: `0x${string}`; player: string; stake: string }[] = [];

  for (const l of logs) {
    const a = (l as any).args ?? {};
    const matchId = a.matchId as `0x${string}` | undefined;
    if (!matchId) continue;

    const m = (await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'matches',
      args: [matchId],
    })) as any;
    const status = Number(m.status ?? m[6]);
    const p1 = String(m.player1 ?? m[1] ?? '');
    const stake = formatUnits((m.stakeAmount ?? m[7]) as bigint, 6);
    if (status === 0) {
      console.log('PENDING', { matchId, p1, stake, tx: l.transactionHash });
      pending.push({ matchId, player: p1.toLowerCase(), stake });
    }
  }

  const [contractBal, escrowed] = await Promise.all([
    publicClient.readContract({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [CONTRACT_ADDRESS as `0x${string}`],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'escrowedStakes',
    }) as Promise<bigint>,
  ]);

  console.log({
    pendingCount: pending.length,
    contractUsdt: formatUnits(contractBal, 6),
    escrowedStakes: formatUnits(escrowed, 6),
  });

  if (!RECOVER) {
    console.log('Dry run. Set RECOVER=1 to refund.');
    return;
  }

  for (const { matchId, player, stake } of pending) {
    console.log('Refunding', stake, 'USDT to', player, 'via', matchId);
    try {
      await expireMatchOnChain(matchId);
      console.log('expireMatch ok');
    } catch (err: any) {
      console.warn('expireMatch failed → owner cancelChallenge', (err?.message || '').slice(0, 100));
      const hash = await cancelAsOwner(matchId);
      console.log('cancelChallenge ok', hash);
    }
  }

  for (const { player } of pending) {
    const bal = (await publicClient.readContract({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [player as `0x${string}`],
    })) as bigint;
    console.log('player balance', player, formatUnits(bal, 6));
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
