import { NextResponse } from 'next/server';
import { getAgentTreasurySnapshot } from '../../../../../blockchain/AgentFunctions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await getAgentTreasurySnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Agent not initialized') ? 503 : 500;
    console.error('[api/agent/balances]', error);
    return NextResponse.json({ error: message }, { status });
  }
}
