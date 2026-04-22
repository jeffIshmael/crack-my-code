// scripts/upgrade.js
// Upgrades the Codebreaker proxy to a new implementation.
// Run: npx hardhat run scripts/upgrade.js --network celo

const { ethers, upgrades } = require("hardhat");
// const fs = require("fs");

async function main() {
const PROXY_ADDRESS = "0x24c3ccE29F3882cf59aA110E9CAba87A3aB7c845";
  
  const GuessMyCodeV2 = await ethers.getContractFactory("GuessMyCode");
  console.log("Upgrading GuessMyCode...");
  
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, GuessMyCodeV2);
  
  console.log("GuessMyCode upgraded at:", await upgraded.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });

// implementaion - 0xED89FAdA7393577A1af888fDeB3684937E92A58b
