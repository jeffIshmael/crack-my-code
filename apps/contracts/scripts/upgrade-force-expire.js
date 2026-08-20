// Upgrade + verify + force-expire insolvent Pending match (already repaid off-chain).
// Run: npx hardhat run scripts/upgrade-force-expire.js --network celo

const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

const PROXY_ADDRESS = process.env.GUESSMYCODE_PROXY || '0x0317e55136a46557516aa40EA96d66772767C72C';
const FORCE_EXPIRE_MATCH_ID =
  process.env.FORCE_EXPIRE_MATCH_ID ||
  '0x3e4fa3b5dfbfcca91b91af4a2e0eb9c713c5919b0d40f4406c705a336a15a468';

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address);

  const GuessMyCode = await ethers.getContractFactory('GuessMyCode');
  const proxy = await ethers.getContractAt('GuessMyCode', PROXY_ADDRESS);
  const owner = await proxy.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer is not owner (${owner})`);
  }

  console.log('Upgrading…');
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, GuessMyCode);
  await upgraded.waitForDeployment?.();
  await new Promise((r) => setTimeout(r, 2500));

  const impl = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log('Implementation:', impl);

  require('./sync-abi');

  console.log('Verifying…');
  try {
    await hre.run('verify:verify', { address: impl, constructorArguments: [] });
    console.log('Verified');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('already verified')) console.log('Already verified');
    else {
      console.warn(msg);
      console.log(`npx hardhat verify --network celo ${impl}`);
    }
  }

  const match = await upgraded.matches(FORCE_EXPIRE_MATCH_ID);
  const status = Number(match.status);
  console.log('Target match status before:', status, 'stake:', match.stakeAmount.toString());

  if (status === 0) {
    console.log('forceExpireMatch', FORCE_EXPIRE_MATCH_ID);
    const tx = await upgraded.forceExpireMatch(FORCE_EXPIRE_MATCH_ID);
    const receipt = await tx.wait();
    console.log('forceExpire tx', receipt.hash);
  } else {
    console.log('Match not Pending — skip forceExpire');
  }

  console.log('escrowedStakes', (await upgraded.escrowedStakes()).toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
