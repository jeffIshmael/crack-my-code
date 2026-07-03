import { encodeFunctionData, parseUnits, type Hash, type PublicClient } from 'viem';
import { ERC20_ABI, USDT_ADDRESS } from '../../blockchain/constants';

export const USDT_DECIMALS = 6;

type WriteContractAsync = (args: {
  address: `0x${string}`;
  abi: typeof ERC20_ABI;
  functionName: 'transfer';
  args: readonly [`0x${string}`, bigint];
}) => Promise<Hash>;

export async function sendUsdtToAddress({
  recipient,
  amount,
  smartWalletClient,
  writeContractAsync,
  publicClient,
}: {
  recipient: `0x${string}`;
  amount: number;
  smartWalletClient?: unknown;
  writeContractAsync: WriteContractAsync;
  publicClient: PublicClient;
}): Promise<Hash> {
  const amountWei = parseUnits(amount.toString(), USDT_DECIMALS);

  if (smartWalletClient) {
    const client = smartWalletClient as {
      sendTransaction: (input: {
        to: `0x${string}`;
        data: `0x${string}`;
        value: bigint;
        type?: string;
      }) => Promise<Hash>;
    };
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient, amountWei],
    });
    const txHash = await client.sendTransaction({
      to: USDT_ADDRESS,
      data,
      value: BigInt(0),
      type: 'legacy',
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  const hash = await writeContractAsync({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [recipient, amountWei],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
