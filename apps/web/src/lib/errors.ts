/**
 * Utility to parse complex blockchain and API errors into human-readable messages.
 */

export function getErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';

  // If it's a string, return it
  if (typeof error === 'string') return error;

  // Handle Viem/Wagmi User Rejected
  const message = error.message || '';
  if (
    message.includes('User rejected') || 
    message.includes('User denied') || 
    message.includes('rejected the request')
  ) {
    return 'Transaction cancelled by user.';
  }

  // Handle Insufficient Funds
  if (message.includes('insufficient funds')) {
    return 'Insufficient CELO for gas fees.';
  }

  // Handle Contract Execution Reverted
  if (message.includes('execution reverted')) {
    // Try to extract a specific reason if it's there
    const reasonMatch = message.match(/reverted with the following reason:\s*(.+)/);
    if (reasonMatch) return reasonMatch[1];
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
  return message.length < 60 ? message : 'A system error occurred. Please try again.';
}
