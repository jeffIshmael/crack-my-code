// scripts/deploy.js
// Deploys the GuessMyCode UUPS proxy to Celo.
// Run: npx hardhat run scripts/deploy.js --network celo

const { ethers, upgrades } = require("hardhat");

// ─── Celo Mainnet addresses ──────────────────────────────────────────────────
// const CUSD_CELO     = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // cUSD
const USDT_CELO     = "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e"; // USDT (check current)
const TREASURY_ADDR = process.env.TREASURY_ADDRESS;                  // your multisig


async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "CELO");

  const GuessMyCode = await ethers.getContractFactory("GuessMyCode");

  console.log("Deploying proxy...");
  const proxy = await upgrades.deployProxy(
    GuessMyCode,
    [USDT_CELO],
    {
      initializer: "initialize",
    }
  );

  await proxy.waitForDeployment();
  const proxyAddress       = await proxy.getAddress();
  const implementationAddr = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("✅ Proxy deployed at:          ", proxyAddress);
  console.log("   Implementation deployed at: ", implementationAddr);

  // Save addresses to a file for the upgrade script
  // const fs = require("fs");
  // fs.writeFileSync("./deployments/celo-mainnet.json", JSON.stringify({
  //   proxy:          proxyAddress,
  //   implementation: implementationAddr,
  //   token:          USDT_CELO,
  //   deployedAt:     new Date().toISOString(),
  //   deployer:       deployer.address,
  // }, null, 2));

  // console.log("Deployment info saved to deployments/celo-mainnet.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
