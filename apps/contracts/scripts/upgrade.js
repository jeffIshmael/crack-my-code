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
  
  console.log("GuessMyCode upgraded at:", await upgraded.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });

// implementation - 0x99f781D7e2869d780d6C52c0762d980F43Ea99E4
