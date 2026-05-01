Configure smart wallets in the SDK

Open in Claude

Documentation Index
Fetch the complete documentation index at: https://docs.privy.io/llms.txt

Use this file to discover all available pages before exploring further.

Once you have configured smart wallets in the Privy Dashboard, you can use them in your application with just a few lines of code.
Looking to get started quickly? Check out our Smart Wallets starter repo. You can see a deployed version of the starter app here.
​
Setup
First install the necessary peer dependencies:
npm install permissionless viem
To set up your app with smart wallets, first import the SmartWalletsProvider component from @privy-io/react-auth/smart-wallets and wrap your app with it.
The SmartWalletsProvider must wrap any component or page that will use smart wallets. We recommend rendering it as close to the root of your application as possible, nested within your PrivyProvider.
import {PrivyProvider} from '@privy-io/react-auth';
import {SmartWalletsProvider} from '@privy-io/react-auth/smart-wallets';

export default function Providers({children}: {children: React.ReactNode}) {
  return (
    <PrivyProvider appId="your-privy-app-id">
      <SmartWalletsProvider>{children}</SmartWalletsProvider>
    </PrivyProvider>
  );
}
Make sure that the networks you’ve configured for smart wallets in the Dashboard are also configured for your app’s defaultChain and supportedChains.
​
Creating smart wallets
Once the SmartWalletsProvider component is rendered and a smart wallet configuration has been set up for your app in the Dashboard, Privy will automatically generate smart wallets for your users once they have an embedded wallet. The embedded wallet is used as the primary signer controlling the smart wallet.
You can configure your app to create embedded wallets automatically on login or manually; smart wallets will be created following the same configuration.
​
Deploying smart wallets
By default, smart wallets are lazily deployed, meaning the smart contract is deployed onchain when the user sends their first transaction. This is the recommended approach as it optimizes costs—you only pay deployment fees when the wallet is actually used.
However, if you need the smart wallet to be deployed immediately after creation (for example, to enable certain integrations or to ensure the wallet address is active onchain), you can trigger deployment by sending a “dummy transaction” right after the wallet is created:
import {useSmartWallets} from '@privy-io/react-auth/smart-wallets';
import {useWallets} from '@privy-io/react-auth';

function DeploySmartWallet() {
  const {client} = useSmartWallets();
  const {wallets} = useWallets();

  const deployWallet = async () => {
    if (!client) return;

    // Send a minimal transaction to trigger deployment
    // This sends 0 ETH to the wallet's own address
    const hash = await client.sendTransaction({
      to: client.account.address,
      value: 0n,
      data: '0x'
    });

    console.log('Smart wallet deployed with transaction:', hash);
  };

  return <button onClick={deployWallet}>Deploy Smart Wallet</button>;
}
Keep in mind that immediate deployment incurs gas costs upfront. Only use this approach if your use case specifically requires the smart contract to be deployed before the user’s first actual transaction.
​
Overriding paymaster context
Certain paymasters, like Alchemy and Biconomy, use an additional paymasterContext for gas sponsorship. Privy constructs this paymaster context based on either dashboard provided gas policy ID for Alchemy or a default set of values for Biconomy. However, you can override these defaults by passing a paymasterContext prop to the SmartWalletsProvider. See an example of how to set this below:
<SmartWalletsProvider
  config={{
    paymasterContext: {
      mode: 'SPONSORED',
      calculateGasLimits: true,
      expiryDuration: 300,
      sponsorshipInfo: {
        webhookData: {},
        smartAccountInfo: {
          name: 'BICONOMY',
          version: '2.0.0'
        }
      }
    }
  }}
>
  {children}
</SmartWalletsProvider>