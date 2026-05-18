import { NextRequest, NextResponse } from 'next/server';
import { trackGameOnChain, getAgentBalance, getAgentAddress } from '../../../../../blockchain/AgentFunctions';
import { formatEther } from 'viem';

export const dynamic = 'force-dynamic';

// Alert threshold: If the agent wallet drops below this CELO amount, we return an error status
// to trigger a failure alert email on cronjobs.com.
// 0.1 CELO is enough for ~1,000 transactions on Celo, giving you days of advance warning!
const MIN_CELO_BALANCE_ALERT = 0.1; 

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization check to prevent unauthorized wallet drain
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    const url = new URL(req.url);
    const tokenParam = url.searchParams.get('token');

    if (cronSecret) {
      const expectedAuth = `Bearer ${cronSecret}`;
      if (authHeader !== expectedAuth && tokenParam !== cronSecret) {
        console.warn('[Cron] Unauthorized call attempt to game tracking endpoint');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 2. Fetch Agent Wallet Details
    const agentAddress = getAgentAddress();
    let balanceWei = 0n;
    let balanceCelo = '0';
    
    try {
      balanceWei = await getAgentBalance();
      balanceCelo = formatEther(balanceWei);
    } catch (balErr) {
      console.error('[Cron] Failed to fetch agent wallet balance:', balErr);
    }

    const currentBalanceNum = parseFloat(balanceCelo);

    // 3. Pre-emptively check for complete out-of-gas
    const isOutOfGas = currentBalanceNum <= 0.0005; // Below transaction fee requirement
    const isLowGas = currentBalanceNum < MIN_CELO_BALANCE_ALERT;

    if (isOutOfGas) {
      const errorMsg = `CRITICAL: Agent wallet is OUT OF GAS! Current balance: ${balanceCelo} CELO. Please deposit CELO immediately to: ${agentAddress}`;
      console.error(`[Cron] ${errorMsg}`);
      return NextResponse.json({
        success: false,
        error: 'OUT_OF_GAS',
        message: errorMsg,
        agentAddress,
        balance: balanceCelo
      }, { status: 503 }); // 503 Service Unavailable triggers cronjobs.com email notification
    }

    // 4. Randomize parameters to simulate organic game metrics
    const matchType = 1;
    const isAI = true; 

    console.log(`[Cron] Triggering on-chain game tracking: matchType=${matchType}, isAI=${isAI}`);

    // 5. Trigger transaction
    const receipt = await trackGameOnChain(matchType, isAI);
    console.log(`[Cron] On-chain transaction successful! Hash: ${receipt.transactionHash}`);

    // Fetch updated balance after transaction
    let updatedBalanceCelo = balanceCelo;
    try {
      const updatedBalanceWei = await getAgentBalance();
      updatedBalanceCelo = formatEther(updatedBalanceWei);
    } catch (e) {}

    // 6. Return response
    // If gas is low (e.g. < 0.1 CELO), return a non-200 status code *after* successful tx
    // so the cron provider registers a failure and alerts you, while the transaction itself succeeds.
    if (isLowGas) {
      const warningMsg = `LOW GAS WARNING: Agent wallet balance has dropped to ${updatedBalanceCelo} CELO (Threshold: ${MIN_CELO_BALANCE_ALERT} CELO). Please top up agent wallet at address: ${agentAddress}`;
      console.warn(`[Cron] ${warningMsg}`);
      return NextResponse.json({
        success: true,
        warning: 'LOW_GAS_WARNING',
        message: warningMsg,
        transactionHash: receipt.transactionHash,
        matchType,
        isAI,
        blockNumber: receipt.blockNumber.toString(),
        agentAddress,
        balance: updatedBalanceCelo
      }, { status: 502 }); // 502 Bad Gateway triggers cronjobs.com notification while tx succeeded
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt.transactionHash,
      matchType,
      isAI,
      blockNumber: receipt.blockNumber.toString(),
      agentAddress,
      balance: updatedBalanceCelo
    });
  } catch (error: any) {
    console.error('[Cron] Failed to track game on-chain:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred during contract call',
    }, { status: 500 });
  }
}

// Enable GET requests to make integrations with basic cron services easier
export async function GET(req: NextRequest) {
  return POST(req);
}
