// scripts/print-match-expiry.js
// Run:
//   npx hardhat run scripts/print-match-expiry.js --network celo

const { ethers } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = "0x0317e55136a46557516aa40EA96d66772767C72C";
  const contract = await ethers.getContractAt("GuessMyCode", PROXY_ADDRESS);
  const matchExpiry = await contract.matchExpiry();
  console.log("matchExpiry (seconds):", matchExpiry.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

