VM smart wallets
Using smart wallets

Open in Claude

Documentation Index
Fetch the complete documentation index at: https://docs.privy.io/llms.txt

Use this file to discover all available pages before exploring further.

Follow the smart wallets setup guide to configure smart wallets for your application.
​
Get the smart wallet address
Once a smart wallet has been created for a user, you can get the address for the smart wallet by finding the account of type: 'smart_wallet' from the user’s linkedAccounts array.
const {user} = usePrivy();
const smartWallet = user.linkedAccounts.find((account) => account.type === 'smart_wallet');
console.log(smartWallet.address);
// Logs the smart wallet's address
console.log(smartWallet.type);
// Logs the smart wallet type (e.g. 'safe', 'kernel', 'light_account', 'biconomy', 'thirdweb', 'coinbase_smart_wallet')
​
Sign a message
Use the signMessage function from the client returned by useSmartWallets hook in your React component to sign a message using the user’s smart wallet.
signMessage: (input: {message: SignableMessage}, opts?: {uiOptions?: SignMessageModalUIOptions}) => Promise<Hex>
​
Usage
import {useSmartWallets} from '@privy-io/react-auth/smart-wallets';
const {client} = useSmartWallets();
const uiOptions = {
    title: 'Sample title text',
    description: 'Sample description text',
    buttonText: 'Sample button text'
};
client.signMessage({message: 'Hello, world!'}, {uiOptions}).then((signature) => {
    console.log(signature);
});
​
Parameters
The signMessage method accepts the following parameters:
​
input.message
string | {raw: Hex | ByteArray}required
The message to sign by the smart account.
​
opts.uiOptions
SignMessageModalUIOptions
Optional UI customization options for the signature prompt.
​
Returns
​
signature
Hex
The signed message by the smart wallet.
​
Sign typed data
Use the signTypedData function from the client returned by useSmartWallets hook in your React component to sign structured data using the user’s smart wallet.
signTypedData: (input: SignTypedDataParameters, opts?: {uiOptions?: SignMessageModalUIOptions}) => Promise<Hex>
​
Usage
import {useSmartWallets} from '@privy-io/react-auth/smart-wallets';
const {client} = useSmartWallets();
const uiOptions = {
    title: 'Sample title text',
    description: 'Sample description text',
    buttonText: 'Sample button text'
};
client.signTypedData(typedDataRequestParams, {uiOptions}).then((signature) => {
    console.log(signature);
});
​
Parameters
The signTypedData method accepts the following parameters:
​
input
SignTypedDataParametersrequired
The typed data to sign by the smart account.
​
opts.uiOptions
SignMessageModalUIOptions
Optional UI customization options for the signature prompt.
​
Returns
​
signature
Hex
The signed message by the smart wallet.
​
Send a transaction
Use the sendTransaction function from the client returned by useSmartWallets hook in your React component to send a transaction using the user’s smart wallet.
sendTransaction: (input: SendTransactionParameters, opts?: {uiOptions?: SendTransactionModalUIOptions}) => Promise<Hex>
​
Usage
import {useSmartWallets} from '@privy-io/react-auth/smart-wallets';
const {client} = useSmartWallets();
const uiOptions = {
    title: 'Sample title text',
    description: 'Sample description text',
    buttonText: 'Sample button text'
};
client.sendTransaction({
    chain: base,
    to: 'insert-recipient-address',
    value: 0.1
}, {uiOptions}).then((txHash) => {
    console.log(txHash);
});
​
Parameters
The sendTransaction method accepts the following parameters:
​
input
SendTransactionParametersrequired
The transaction to send by the smart account.
​
opts.uiOptions
SendTransactionModalUIOptions
Optional UI customization options for the transaction prompt.
​
Returns
​
txHash
Hex
The transaction hash of the sent transaction.
​
Batch transactions
Smart wallets support sending a batch of transactions in a single, atomic submission to the network.
sendTransaction: (input: {calls: Array<{to: string, value?: bigint, data?: string}>}, opts?: {uiOptions?: SendTransactionModalUIOptions}) => Promise<Hex>
​
Usage
import {useSmartWallets} from '@privy-io/react-auth/smart-wallets';
const {client} = useSmartWallets();
client.sendTransaction({
    calls: [
        // Approve transaction
        {
            to: USDC_ADDRESS,
            data: encodeFunctionData({
                abi: USDC_ABI,
                functionName: 'approve',
                args: ['insert-spender-address', BigInt(1e6)]
            })
        },
        // Transfer transaction
        {
            to: USDC_ADDRESS,
            data: encodeFunctionData({
                abi: USDC_ABI,
                functionName: 'transfer',
                args: ['insert-recipient-address', BigInt(1e6)]
            })
        }
    ]
}).then((txHash) => {
    console.log(txHash);
});
​
Parameters
The sendTransaction method for batching accepts the following parameters:
​
input.calls
Array<{to: string, value?: bigint, data?: string}>required
Array of transactions to batch together.
​
opts.uiOptions
SendTransactionModalUIOptions
Optional UI customization options for the transaction prompt.
​
Returns
​
txHash
Hex
The transaction hash of the batched transaction.
​
Switch chains
Use the getClientForChain method to create a new smart wallet client for a specific chain.
getClientForChain: ({id: number}) => Promise<SmartWalletClient>
​
Usage
import {base} from 'viem/chains';
const {getClientForChain} = useSmartWallets();
const baseClient = await getClientForChain({
    id: base.id,
});
// Client will send transaction on Base
baseClient.sendTransaction({
    ...
});
​
Parameters
The getClientForChain method accepts the following parameters:
​
id
numberrequired
The chain ID to create a client for.
​
Returns
​
client
SmartWalletClient
A new smart wallet client configured for the specified chain.
If configured defaultChain does not have a smart wallet network configuration, the smart wallet client will default to using the first configured chain that has a smart wallet network configuration.