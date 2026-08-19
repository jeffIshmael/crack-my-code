// Syncs compiled GuessMyCode ABI to abi.json and apps/web/blockchain/constants.ts
const fs = require('fs');
const path = require('path');

const artifactPath = path.join(
  __dirname,
  '../artifacts/contracts/GuessMyCode.sol/GuessMyCode.json',
);
const abiOut = path.join(__dirname, '../abi.json');
const constantsPath = path.join(__dirname, '../../web/blockchain/constants.ts');

const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
fs.writeFileSync(abiOut, JSON.stringify(artifact.abi, null, 2) + '\n');

const constants = fs.readFileSync(constantsPath, 'utf8');
const abiBlock = `export const CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)} as const;`;
const marker = 'export const CONTRACT_ABI';
const start = constants.indexOf(marker);
if (start === -1) {
  throw new Error('Could not find CONTRACT_ABI in constants.ts');
}
const updated = constants.slice(0, start) + abiBlock + '\n';
if (updated === constants) {
  console.log('ABI already in sync — no constants.ts changes needed.');
} else {
  fs.writeFileSync(constantsPath, updated);
  console.log('Synced ABI to abi.json and constants.ts');
}
