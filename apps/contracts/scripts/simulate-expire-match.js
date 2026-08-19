// scripts/simulate-expire-match.js
// Run (celo):
//   npx hardhat run scripts/simulate-expire-match.js --network celo
//
// This is a gas-free simulation (eth_call) to see if expireMatch would revert.

const { ethers } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = "0x0317e55136a46557516aa40EA96d66772767C72C";

  // matchId from your server logs
  const matchId =
    "0x0003b0bc04c01e15ba29329d2b78febcc795fb7d574232fb0e4a4feeb624d14b";

  const contract = await ethers.getContractAt("GuessMyCode", PROXY_ADDRESS);

  console.log("Simulating expireMatch for matchId:", matchId);
  await contract.expireMatch.staticCall(matchId);
  console.log("✅ expireMatch would succeed right now (no revert).");
}

main().catch((e) => {
  console.error("❌ expireMatch would revert:", e?.reason || e?.message || e);
  process.exit(1);
});

