// scripts/upgrade.js
// Upgrades the Codebreaker proxy to a new implementation.
// Run: npx hardhat run scripts/upgrade.js --network celo

const { ethers, upgrades } = require("hardhat");
// const fs = require("fs");

async function main() {
const PROXY_ADDRESS = "0x0317e55136a46557516aa40EA96d66772767C72C";
  
  const GuessMyCodeV2 = await ethers.getContractFactory("GuessMyCode");
  console.log("Upgrading GuessMyCode...");
  
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, GuessMyCodeV2);

  // Verify + set matchExpiry to 300 seconds (5 minutes).
  // The contract already exposes setMatchExpiry(uint256) as onlyOwner.
  const matchBefore = await upgraded.matchExpiry();
  console.log("matchExpiry before:", matchBefore.toString());

  const tx = await upgraded.setMatchExpiry(300);
  await tx.wait();

  const matchAfter = await upgraded.matchExpiry();
  console.log("matchExpiry after:", matchAfter.toString());

  console.log("GuessMyCode upgraded at:", await upgraded.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });

// implementation - 0x99f781D7e2869d780d6C52c0762d980F43Ea99E4
