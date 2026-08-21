/**
 * Utility to parse complex blockchain and API errors into human-readable messages.
 */

/** True when the user dismissed / rejected the wallet prompt (not a real failure). */
export function isUserRejectedTransaction(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'string') {
    return /user rejected|user denied|rejected the request|request rejected|user cancelled|user canceled/i.test(
      error,
    );
  }

  const err = error as {
    code?: number | string;
    name?: string;
    message?: string;
    shortMessage?: string;
    details?: string;
    cause?: unknown;
  };

  // EIP-1193 / common wallet codes
  if (err.code === 4001 || err.code === 'ACTION_REJECTED') return true;
  if (err.name === 'UserRejectedRequestError') return true;

  const text = [err.message, err.shortMessage, err.details]
    .filter(Boolean)
    .join(' ');
  if (
    /user rejected|user denied|rejected the request|request rejected|user cancelled|user canceled/i.test(
      text,
    )
  ) {
    return true;
  }

  if (err.cause) return isUserRejectedTransaction(err.cause);
  return false;
}

export function getErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';

  // If it's a string, return it
  if (typeof error === 'string') return error;

  const message = error.message || '';
  const data = error.data || (error.cause as any)?.data || (error.cause as any)?.cause?.data;

  // Handle Viem/Wagmi User Rejected
  if (isUserRejectedTransaction(error)) {
    return 'Transaction cancelled by user.';
  }

  // Handle Insufficient Funds for Network Fees (Native Token)
  if (message.includes('insufficient funds') || message.includes('exceeds the balance of the account')) {
    return 'Insufficient balance for network fees.';
  }

  // Handle ERC20: transfer amount exceeds balance (Hex or String)
  // Hex for "ERC20: transfer amount exceeds balance" often appears in AA reverts
  if (
    message.includes('transfer amount exceeds balance') || 
    message.includes('insufficient balance') ||
    message.includes('524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e6365') ||
    (data && typeof data === 'string' && data.includes('524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e6365'))
  ) {
    return 'Insufficient USDT balance to join this challenge.';
  }

  // Handle Contract Custom Errors (CB: ...) — check before AA/ERC20 heuristics
  if (message.includes('CB:')) {
    const cbMatch = message.match(/CB:\s*([^"\n.]+)/i);
    if (cbMatch) {
      const reason = cbMatch[1].trim().toLowerCase();
      if (reason.includes('match not pending') || reason.includes('match already started')) {
        return 'This challenge is already closed.';
      }
      if (reason.includes('stake transfer failed')) {
        return 'Insufficient USDT balance or allowance.';
      }
      return `CB: ${cbMatch[1].trim()}`;
    }
  }

  if (message.includes('CB: stake transfer failed')) {
    return 'Insufficient USDT balance or allowance.';
  }

  // Handle Account Abstraction / UserOperation Reverts
  if (message.includes('UserOperation reverted during simulation')) {
    if (message.includes('ERC20') || message.includes('balance')) {
       return 'Insufficient USDT balance to join this challenge.';
    }
    // Try to find a readable part in the message
    const matches = message.match(/reason:\s*([^]+)/);
    if (matches && matches[1] && matches[1].length < 100 && !matches[1].startsWith('0x')) {
      return matches[1].trim();
    }
    return 'The transaction failed during simulation. Ensure you have enough USDT.';
  }

  // Handle Contract Execution Reverted
  if (message.includes('execution reverted')) {
    const reasonMatch = message.match(/reverted with the following reason:\s*(.+)/);
    if (reasonMatch) return reasonMatch[1];
    
    if (message.includes('CB:')) {
      const cbMatch = message.match(/CB:\s*([^"\n]+)/);
      if (cbMatch) return cbMatch[0];
    }
    
    return 'The transaction was reverted by the contract.';
  }

  // Handle Network Mismatch
  if (message.includes('Chain mismatch')) {
    return 'Please switch to the correct network.';
  }

  // Handle API response errors
  if (error.error && typeof error.error === 'string') {
    return error.error;
  }

  // Standard generic fallbacks
  if (message.includes('fetch')) {
    return 'Network error. Please check your connection.';
  }

  // Return the original message if it's short, otherwise generic
  return message.length < 80 ? message : 'A system error occurred. Please try again.';
}

