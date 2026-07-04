// Set Cipher win reward on the deployed GuessMyCode proxy (0.1 USDT = 100_000).
// Run: npx hardhat run scripts/set-cipher-reward.js --network celo

const { ethers } = require('hardhat');

const PROXY_ADDRESS = process.env.GUESSMYCODE_PROXY || '0x0317e55136a46557516aa40EA96d66772767C72C';
const REWARD_USDT = process.env.CIPHER_WIN_REWARD_USDT || '0.1';

async function main() {
  const [signer] = await ethers.getSigners();
  const rewardRaw = ethers.parseUnits(REWARD_USDT, 6);

  const contract = await ethers.getContractAt('GuessMyCode', PROXY_ADDRESS, signer);
  const before = await contract.cipherWinReward();
  console.log('Current cipherWinReward:', ethers.formatUnits(before, 6), 'USDT');

  if (before === rewardRaw) {
    console.log('Already set — nothing to do.');
    return;
  }

  const tx = await contract.setCipherWinReward(rewardRaw);
  console.log('setCipherWinReward tx:', tx.hash);
  await tx.wait();

  const after = await contract.cipherWinReward();
  console.log('Updated cipherWinReward:', ethers.formatUnits(after, 6), 'USDT');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
