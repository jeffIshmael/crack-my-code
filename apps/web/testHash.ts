import { keccak256, toHex, stringToBytes } from 'viem';
console.log(keccak256(stringToBytes('createChallenge(bool,uint256)')));
