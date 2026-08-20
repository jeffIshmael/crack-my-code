/**
 * Audit expire refunds: who received USDT vs match.player1 vs contract owner.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import 'dotenv/config';
import { createPublicClient, http, formatUnits, parseAbiItem } from 'viem';
import { celo } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI, USDT_ADDRESS } from '../blockchain/constants';

const publicClient = createPublicClient({ chain: celo, transport: http() });
const STATUS = ['Pending', 'Active', 'Completed', 'Abandoned', 'Expired', 'Refunded', 'Draw'];
const CREATOR = '0x4821ced48Fb4456055c86E42587f61c1F39c6315'.toLowerCase();
const E645 = '0xE645d2C1C3d665Ac84BFDe272DaE11c81bA0dbF6';

async function main() {
  const owner = (await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'owner',
  })) as string;
  console.log('contract', CONTRACT_ADDRESS);
  console.log('owner()', owner);
  console.log('deployer', CREATOR);

  const matchIds = [
    '0x3e4fa3b5dfbfcca91b91af4a2e0eb9c713c5919b0d40f4406c705a336a15a468',
    '0x4bd36bd114ea77e51f14c534457e6a422b39a16ebecec077d74df6250186c4d4',
    '0x7e30d036e3a4815cf5f01b9829455321de12a14c5c8d70c2d2bfab83bae9abd6',
    '0x1aa5f82dcbc04f5bd60c45ceccf7619ec5d1519313e475fe627457e0fccfc7c9',
  ] as const;

  console.log('\n--- known matches ---');
  for (const id of matchIds) {
    const m = (await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'matches',
      args: [id],
    })) as any;
    console.log(id.slice(0, 14), {
      p1: m.player1 ?? m[1],
      status: STATUS[Number(m.status ?? m[6])],
      stake: formatUnits((m.stakeAmount ?? m[7]) as bigint, 6),
      createdAt: Number(m.createdAt ?? m[9]),
    });
  }

  const latest = await publicClient.getBlockNumber();
  const fromBlock = latest - 4000n;

  const createdEv = CONTRACT_ABI.find((x: any) => x.type === 'event' && x.name === 'ChallengeCreated');
  console.log('\nChallengeCreated abi inputs', createdEv?.inputs?.map((i: any) => `${i.name}:${i.type}`));

  const created = await publicClient.getLogs({
    address: CONTRACT_ADDRESS as `0x${string}`,
    event: createdEv as any,
    fromBlock,
    toBlock: latest,
  });
  console.log(`ChallengeCreated recent: ${created.length}`);
  for (const l of created.slice(-20)) {
    const a = l.args as any;
    console.log({
      tx: l.transactionHash,
      player: a.player1 ?? a.player ?? a[0],
      stake: formatUnits((a.stakeAmount ?? a.stake ?? a[2] ?? 0n) as bigint, 6),
      matchId: a.matchId,
    });
  }

  for (const to of [E645, CREATOR, '0xA4690e6bB56D85ca7C48a72B37A650c6F7f438e1', '0xb16BD3f244E00E0A7dB125f8f2321900A89b494c'] as const) {
    const logs = await publicClient.getLogs({
      address: USDT_ADDRESS,
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
      args: {
        from: CONTRACT_ADDRESS as `0x${string}`,
        to: to as `0x${string}`,
      },
      fromBlock,
      toBlock: latest,
    });
    console.log(`\nUSDT contract→${to.slice(0, 10)}… : ${logs.length}`);
    for (const l of logs) {
      console.log({
        tx: l.transactionHash,
        amount: formatUnits(l.args.value as bigint, 6),
      });
    }
  }

  const allOut = await publicClient.getLogs({
    address: USDT_ADDRESS,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
    args: { from: CONTRACT_ADDRESS as `0x${string}` },
    fromBlock,
    toBlock: latest,
  });
  console.log('\n--- all recent USDT outs from contract ---');
  for (const l of allOut) {
    console.log({
      tx: l.transactionHash,
      to: l.args.to,
      amount: formatUnits(l.args.value as bigint, 6),
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
