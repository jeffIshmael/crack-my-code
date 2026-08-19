// scripts/set-match-expiry.js
// Run:
//   npx hardhat run scripts/set-match-expiry.js --network celo
//
// Requires the PRIVATE_KEY in hardhat.config.ts to be the contract owner.

const { ethers } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = "0x0317e55136a46557516aa40EA96d66772767C72C";
  const TARGET_SECONDS = 300;

  const contract = await ethers.getContractAt("GuessMyCode", PROXY_ADDRESS);
  const [signer] = await ethers.getSigners();

  console.log("Signer:", signer.address);
  const before = await contract.matchExpiry();
  console.log("matchExpiry before:", before.toString());

  const tx = await contract.setMatchExpiry(TARGET_SECONDS);
  console.log("tx hash:", tx.hash);
  await tx.wait();

  const after = await contract.matchExpiry();
  console.log("matchExpiry after:", after.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

