const { ethers } = require('hardhat');

const PROXY = '0x0317e55136a46557516aa40EA96d66772767C72C';

async function main() {
  const [signer] = await ethers.getSigners();
  const contract = await ethers.getContractAt('GuessMyCode', PROXY);
  const owner = await contract.owner();
  console.log('Proxy:', PROXY);
  console.log('Owner:', owner);
  console.log('Signer:', signer.address);
  console.log('Owner matches signer:', owner.toLowerCase() === signer.address.toLowerCase());
}

main().catch(console.error);
