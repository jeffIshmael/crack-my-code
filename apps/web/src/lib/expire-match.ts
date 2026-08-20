/** Classify on-chain expireMatch revert reasons. */

export function getExpireErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err ?? '');
}

/** Timer slightly ahead of chain — safe to retry. */
export function isNotYetExpiredError(err: unknown): boolean {
  return getExpireErrorMessage(err).toLowerCase().includes('not yet expired');
}

/**
 * Match is no longer Pending on-chain (already expired/cancelled/joined).
 * Stake refund (if any) already happened — treat as settled success.
 * Covers expireMatch ("match not pending") and cancelChallenge ("match already started").
 */
export function isMatchAlreadySettledError(err: unknown): boolean {
  const msg = getExpireErrorMessage(err).toLowerCase();
  return (
    msg.includes('match not pending') ||
    msg.includes('match already started') ||
    msg.includes('match not found')
  );
}
