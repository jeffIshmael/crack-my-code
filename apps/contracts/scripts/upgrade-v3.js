// Upgrades GuessMyCode proxy (escrowedStakes liability + safer withdraws).
// Run: npx hardhat run scripts/upgrade-v3.js --network celo

const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

const PROXY_ADDRESS = process.env.GUESSMYCODE_PROXY || '0x0317e55136a46557516aa40EA96d66772767C72C';

async function main() {
  const GuessMyCode = await ethers.getContractFactory('GuessMyCode');
  const [signer] = await ethers.getSigners();
  console.log('Upgrading GuessMyCode proxy at', PROXY_ADDRESS);
  console.log('Signer:', signer.address);

  const proxy = await ethers.getContractAt('GuessMyCode', PROXY_ADDRESS);
  const owner = await proxy.owner();
  console.log('Owner:', owner);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(
      `Signer is not contract owner. Set PRIVATE_KEY to the owner wallet (${owner}) in apps/contracts/.env`,
    );
  }

  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, GuessMyCode);
  await upgraded.waitForDeployment?.();
  const proxyAddress = await upgraded.getAddress();

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('Proxy:', proxyAddress);
  console.log('Implementation:', implementationAddress);

  // New storage starts at 0 — sync if any live Pending/Active paid stakes remain.
  // Ops can override with SYNC_ESCROWED_STAKES (USDT 6-decimal units, e.g. 200000 = 0.2).
  const syncRaw = process.env.SYNC_ESCROWED_STAKES;
  if (syncRaw !== undefined && syncRaw !== '') {
    const amount = BigInt(syncRaw);
    const tx = await upgraded.syncEscrowedStakes(amount);
    await tx.wait();
    console.log('syncEscrowedStakes →', amount.toString());
  } else {
    const current = await upgraded.escrowedStakes();
    console.log('escrowedStakes (post-upgrade):', current.toString());
  }

  require('./sync-abi');

  console.log('\nVerifying implementation on Celoscan...');
  try {
    await hre.run('verify:verify', {
      address: implementationAddress,
      constructorArguments: [],
    });
    console.log('Verification submitted.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('already verified')) {
      console.log('Implementation already verified.');
    } else {
      console.warn('Verify failed (you can retry manually):', msg);
      console.log(`npx hardhat verify --network celo ${implementationAddress}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
