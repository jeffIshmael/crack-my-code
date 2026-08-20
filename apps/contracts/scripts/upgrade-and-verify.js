// Force upgrade to current GuessMyCode and verify implementation.
// Run: npx hardhat run scripts/upgrade-and-verify.js --network celo

const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

const PROXY_ADDRESS = process.env.GUESSMYCODE_PROXY || '0x0317e55136a46557516aa40EA96d66772767C72C';

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address);

  const before = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log('Implementation before:', before);

  const GuessMyCode = await ethers.getContractFactory('GuessMyCode');
  const proxy = await ethers.getContractAt('GuessMyCode', PROXY_ADDRESS);
  const owner = await proxy.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer is not owner (${owner})`);
  }

  console.log('Upgrading proxy...');
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, GuessMyCode);
  await upgraded.waitForDeployment?.();

  // Small delay then re-read slot (Celo sometimes lags)
  await new Promise((r) => setTimeout(r, 3000));
  const after = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log('Implementation after:', after);

  if (after.toLowerCase() === before.toLowerCase()) {
    console.log('NOTE: implementation address unchanged — OZ may have reused identical bytecode.');
  }

  const escrowed = await upgraded.escrowedStakes();
  console.log('escrowedStakes:', escrowed.toString());

  require('./sync-abi');

  console.log('\nVerifying', after);
  try {
    await hre.run('verify:verify', {
      address: after,
      constructorArguments: [],
    });
    console.log('Verification OK');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('already verified')) {
      console.log('Already verified.');
    } else {
      console.warn('Verify failed:', msg);
      console.log(`npx hardhat verify --network celo ${after}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
