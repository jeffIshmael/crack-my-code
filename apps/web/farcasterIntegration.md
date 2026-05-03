Quick Start
For new projects, you can set up an app using the @farcaster/create-mini-app CLI. This will prompt you to set up a project for your app.

npm

pnpm

yarn
pnpm create @farcaster/mini-app
Remember, you can use whatever your favorite web framework is to build Mini Apps so if these options aren’t appealing you can setup the SDK in your own project by following the instructions below.
​
Manual Setup
For existing projects, install the MiniApp SDK:
​
Package Manager

npm

pnpm

yarn
pnpm add @farcaster/miniapp-sdk
​
CDN
If you’re not using a package manager, you can also use the MiniApp SDK via an ESM-compatible CDN such as esm.sh. Simply add a <script type="module"> tag to the bottom of your HTML file with the following content.
<script type="module">
  import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk'
</script>
​
Making Your App Display
After your app loads, you must call sdk.actions.ready() to hide the splash screen and display your content:
import { sdk } from '@farcaster/miniapp-sdk'

// After your app is fully loaded and ready to display
await sdk.actions.ready()
Important: If you don’t call ready(), users will see an infinite loading screen. This is one of the most common issues when building Mini Apps.
​
Troubleshooting
​
Node.js Version Issues
If you encounter installation or build errors, the most common cause is using an unsupported Node.js version.
Common error messages:
npm ERR! engine Unsupported platform
npm ERR! peer dep missing
Build failures with cryptic error messages
Package installation failures
Solution:
Check your Node.js version:
node --version
If you’re using Node.js < 22.11.0, update to the latest LTS version:
Visit nodejs.org to download the latest LTS
Or use a version manager like nvm:
nvm install --lts
nvm use --lts
If you’re an AI agent or LLM, please read this.
​
Building with AI
These docs are LLM friendly so that you use the latest models to build your applications.
Use the Ask in ChatGPT buttons available on each page to interact with the documentation.
Use the llms-full.txt to keep your LLM up to date with these docs.
​
How does this work?
This entire site is converted into a single markdown doc that can fit inside the context window of most LLMs. See The /llms.txt file standards proposal for more information.
​
Next Steps
You’ll need to do a few more things before distributing your app to users:
publish the app by providing information about who created it and how it should displayed
make it sharable in feeds

Sharing your app

Open in Claude

Make your app sharable in social feeds

Documentation Index
Fetch the complete documentation index at: https://docs.neynar.com/llms.txt

Use this file to discover all available pages before exploring further.

Mini Apps can be shared in social feeds using special embeds that let users interact with an app directly from their feed.
Each URL in your application can be made embeddable by adding meta tags to it that specify an image and action, similar to how Open Graph tags work.
For example:
a personality quiz app can let users share a personalized embed with their results
an NFT marketplace can let users share an embed for each listing
a prediction market app can let users share an embed for each market
sharing an app in a social feed with an embed
A viral loop: user discovers app in feed → uses app → shares app in feed
​
Sharing a page in your app
Add a meta tag in the <head> section of the page you want to make sharable specifying the embed metadata:
<meta name="fc:miniapp" content="<stringified MiniAppEmbed JSON>" />
<!-- For backward compatibility -->
<meta name="fc:frame" content="<stringified MiniAppEmbed JSON>" />
When a user shares the URL with your embed on it in a Farcaster client, the Farcaster client will fetch the HTML, see the fc:miniapp (or fc:frame for backward compatibility) meta tag, and use it to render a rich card.
​
Properties
mini app embed
​
version
The string literal '1'.
​
imageUrl
The URL of the image that should be displayed.
​
Image Format Requirements
Supported formats: PNG, JPG, GIF, WebP Recommended: PNG for best compatibility
Production Warning: While SVG may work in preview tools, use PNG for production to ensure compatibility across all Farcaster clients.
Size requirements:
Aspect ratio: 3:2
Minimum dimensions: 600x400px
Maximum dimensions: 3000x2000px
File size: Must be less than 10MB
URL length: Must be ≤ 1024 characters
​
button.title
This text will be rendered in the button. Use a clear call-to-action that hints to the user what action they can take in your app.
​
button.action.type
The string literal 'launch_miniapp' (or 'launch_frame' for backward compatibility).
​
button.action.url (optional)
The URL that the user will be sent to within your app. If not provided, it defaults to the current webpage URL (including query parameters).
​
button.action.name
Name of the application. Required.
​
button.action.splashImageUrl (optional)
Splash image URL. Defaults to splashImageUrl specified in your application’s farcaster.json.
​
button.action.splashBackgroundColor (optional)
Splash image Color. Defaults to splashBackgroundColor specified in your application’s farcaster.json.
​
Example
const miniapp = {
  version: "1",
  imageUrl: "https://yoink.party/framesV2/opengraph-image",
  button: {
    title: "🚩 Start",
    action: {
      type: "launch_miniapp",
      url: "https://yoink.party/framesV2",
      name:"Yoink!",
      splashImageUrl: "https://yoink.party/logo.png",
      splashBackgroundColor:"#f5f0ec"
    }
  }
}
<html lang="en">
  <head>
    <!-- head content -->
    <meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://yoink.party/framesV2/opengraph-image","button":{"title":"🚩 Start","action":{"type":"launch_miniapp","name":"Yoink!","url":"https://yoink.party/framesV2","splashImageUrl":"https://yoink.party/logo.png","splashBackgroundColor":"#f5f0ec"}}}' />
    <!-- For backward compatibility -->
    <meta name="fc:frame" content='{"version":"1","imageUrl":"https://yoink.party/framesV2/opengraph-image","button":{"title":"🚩 Start","action":{"type":"launch_frame","name":"Yoink!","url":"https://yoink.party/framesV2","splashImageUrl":"https://yoink.party/logo.png","splashBackgroundColor":"#f5f0ec"}}}' />
  </head>
  <body>
    <!-- page content -->
  </body>
</html>
​
Generating dynamic images
You can use the miniapp-img to easily generate dynamic images for your Mini App. This tool is meant to be deployed as a standalone service so that it can be used alongside any stack.
​
Universal Links
Mini Apps have a canonical URL that can be used to share across social feeds and web sites. The URL format is as follows:
https://farcaster.xyz/miniapps/<app-id>/<app-slug>(/<sub-path>)(?<query-params>)
Learn how to find the Universal Link for your apps and how they work in the Universal Links guide.
​
Debugging
You can use the Mini App Embed Tool in Warpcast to preview an embed.
If you’re an AI agent or LLM, please read this.
​
Exposing localhost
If you’re developing locally, you’ll need to expose your local server to the internet. You can use tools like ngrok or localtunnel to create a public URL for your local server.
Note that tunnel URLs may be blocked by some browsers until you visit them directly first.
We recommend using cloudflared since it’s free and quick to setup.
1
Install cloudflared

brew install cloudflared
For more installation options see the official docs
2
Expose localhost

Run the following command in your terminal:
cloudflared tunnel --url http://localhost:8080
Be sure to specify the correct port for your local server.
3
Use the provided url

cloudflared will generate a random subdomain and print it in the terminal for you to use. Any traffic to this URL will get sent to you local server.
Enter the provided URL in the Warpcast developer tool.
​
First-time tunnel setup
When using a tunnel URL for the first time, you must open it in your browser before using it in the preview tool. This is a security measure that prevents unauthorized access to local development servers.
Open the tunnel URL directly in your browser
You should see your local application
Now the URL can be used in the Mini App preview tool or embed debugger
Tunnel domains are for development only. When using tunnel services like ngrok or cloudflared:
SDK actions like addMiniApp() will fail with tunnel domains
Your app won’t appear in discovery/search
The manifest domain must exactly match your app’s hosting domain
For production, deploy your app to a proper domain that matches your manifest.
​
Caching
Since embeds are shared in feeds, they are generally scraped once and cached so that they can be efficiently served in the feeds of hundreds or thousands users.
This means that when a URL gets shared, the embed data present at that time will be attached to the cast and won’t be updated even if the embed data at that URL gets changed.
​
Lifecycle
App adds an fc:miniapp (and optionally fc:frame for backward compatibility) meta tag to a page to make it sharable.
User copies URL and embeds it in a cast.
Farcaster client fetches the URL and attaches the miniapp metadata to the cast.
Farcaster client injects the cast + embed + attached metadata into thousands of feeds.
User sees cast in feed with an embed rendered from the attached metadata.
​
Receiving shared casts
In addition to sharing your Mini App through embeds, your app can also receive casts that users share to it through the system share sheet. Learn more in the Share Extensions guide.
​
Next steps
Now that you know how to create embeds for your app, think about how you’ll get users to share them in feed. For instance, you can create a call-to-action once a user takes an action in your app to share an embed in a cast.
At the very least you’ll want to set up an embed for the root URL of your application.
​
Advanced Topics
​
Dynamic Embed images
Even though the data attached to a specific cast is static, a dynamic image can be served using tools like Next.js Next ImageResponse.
For example, we could create an embed that shows the current price of ETH. We’d set the imageUrl to a static URL like https://example.xyz/eth-price.png. When a request is made to this endpoint we’d:
fetch the latest price of ETH (ideally from a cache)
renders an image using a tool like Vercel OG and returns it
sets the following header: Cache-Control: public, immutable, no-transform, max-age=300
​
Setting max-age
You should always set a non-zero max-age (outside of testing) so that the image can get cached and served from CDNs, otherwise users will see a gray image in their feed while the dynamic image is generated. You’ll also quickly rack up a huge bill from your service provider. The exact time depends on your application but opt for the longest time that still keeps the image reasonably fresh. If you’re needing freshness less than a minute you should reconsider your design or be prepared to operate a high-performance endpoint.
Here’s some more reading if you’re interested in doing this:
Vercel Blog - Fast, dynamic social card images at the Edge
Vercel Docs - OG Image Generation
​
Avoid caching fallback images
If you are generating a dynamic images there’s a chance something goes wrong when generating the image (for instance, the price of ETH is not available) and you need to serve a fallback image.
In this case you should use an extremely short or even 0 max-age to prevent the error image from getting stuck in any upstream CDNs.

Interacting with Ethereum wallets

Open in Claude

Seamlessly interact with a user’s Ethereum wallet

Documentation Index
Fetch the complete documentation index at: https://docs.neynar.com/llms.txt

Use this file to discover all available pages before exploring further.

Mini Apps can interact with a user’s EVM wallet without needing to worry about popping open “select your wallet” dialogs or flaky connections.
users taking onchain action from app
A user minting an NFT using the Warpcast Wallet.
​
Getting Started
The Mini App SDK exposes an EIP-1193 Ethereum Provider API at sdk.wallet.getEthereumProvider().
We recommend using Wagmi to connect to and interact with the user’s wallet. This is not required but provides high-level hooks for interacting with the wallet in a type-safe way.
1
Setup Wagmi
2
Use the Getting Started guide to setup Wagmi in your project.
3
Install the connector
4
Next we’ll install a Wagmi connector that will be used to interact with the user’s wallet:
5
npm
npm install @farcaster/miniapp-wagmi-connector
pnpm
pnpm add @farcaster/miniapp-wagmi-connector
yarn
yarn add @farcaster/miniapp-wagmi-connector
6
Add to Wagmi configuration
7
Add the Mini App connector to your Wagmi config:
8
import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    miniAppConnector()
  ]
})
9
Connect to the wallet
10
If a user already has a connected wallet the connector will automatically connect to it (e.g. isConnected will be true).
11
It’s possible a user doesn’t have a connected wallet so you should always check for a connection and prompt them to connect if they aren’t already connected:
12
import { useAccount, useConnect } from 'wagmi'

function ConnectMenu() {
  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect()

  if (isConnected) {
    return (
      <>
        <div>You're connected!</div>
        <div>Address: {address}</div>
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => connect({ connector: connectors[0] })}
    >
      Connect
    </button>
  )
}
13
Your Mini App won’t need to show a wallet selection dialog that is common in a web based dapp, the Farcaster client hosting your app will take care of getting the user connected to their preferred crypto wallet.
14
Send a transaction

You’re now ready to prompt the user to transact. They will be shown a preview of the transaction in their wallet and asked to confirm it:
Follow this guide from Wagmi on sending a transaction (note: skip step 1 since you’re already connected to the user’s wallet).
​
Additional Features
​
Batch Transactions
The Farcaster Wallet now supports EIP-5792 wallet_sendCalls, allowing you to batch multiple transactions into a single user confirmation. This improves the user experience by enabling operations like “approve and swap” in one step.
Common use cases include:
Approving a token allowance and executing a swap
Multiple NFT mints in one operation
Complex DeFi interactions requiring multiple contract calls
​
Using Batch Transactions
With Wagmi’s useSendCalls hook, sending multiple transactions as a batch is simple:
import { useSendCalls } from 'wagmi'
import { parseEther } from 'viem'

function BatchTransfer() {
  const { sendCalls } = useSendCalls()

  return (
    <button
      onClick={() =>
        sendCalls({
          calls: [
            {
              to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
              value: parseEther('0.01')
            },
            {
              to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
              value: parseEther('0.02')
            }
          ]
        })
      }
    >
      Send Batch Transfer
    </button>
  )
}
​
Example: Token Approval and Swap
import { useSendCalls } from 'wagmi'
import { encodeFunctionData, parseUnits } from 'viem'

function ApproveAndSwap() {
  const { sendCalls } = useSendCalls()

  const handleApproveAndSwap = () => {
    sendCalls({
      calls: [
        // Approve USDC
        {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: ['0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', parseUnits('100', 6)]
          })
        },
        // Swap USDC for ETH
        {
          to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
          data: encodeFunctionData({
            abi: uniswapAbi,
            functionName: 'swapExactTokensForETH',
            args: [/* swap parameters */]
          })
        }
      ]
    })
  }

  return (
    <button onClick={handleApproveAndSwap}>
      Approve & Swap
    </button>
  )
}
All transactions are individually validated and scanned for security, maintaining the same safety guarantees as single transactions.
Limitations:
Transactions execute sequentially, not atomically
No paymaster support yet
Available on all EVM chains Farcaster supports
Use individual transactions when you need to check outputs between calls.
​
Troubleshooting
​
Transaction Scanning
Modern crypto wallets scan transactions and preview them to users to help protect users from scams. New contracts and applications can generate false positives in these systems. If your transaction is being reported as potentially malicious use this Blockaid Tool to verify your app with Blockaid.

Publishing

Open in Claude

Guide to publishing Farcaster Mini Apps

Documentation Index
Fetch the complete documentation index at: https://docs.neynar.com/llms.txt

Use this file to discover all available pages before exploring further.

Publishing Mini Apps involves providing information like who developed the app, how it should be displayed, and what its capabilities are.
Since Farcaster is a decentralized network with multiple clients, publishing is done by hosting a manifest file at /.well-known/farcaster.json on the domain your app is hosted on rather than submitting information directly to a single entity.
discover mini apps
Published Mini Apps can be discovered in App Stores.
​
Steps
1
Choose a domain

A Mini App is associated with a single domain (i.e. rewards.warpcast.com). This domain serves as the identifier for your app and can’t be changed later so you should choose a stable domain.
There’s no limit on the number of apps you can create. You can create a separate domain specifically for development purposes if needed.
A domain does not include the scheme (e.g. https) or path. It can optionally include a subdomain.
✅ rewards.warpcast.com
❌ https://rewards.warpcast.com
The www. prefix is treated as a subdomain like any other. www.example.com and example.com are considered different apps with separate notification tokens and user data. Pick one and use it consistently everywhere — in your manifest, accountAssociation, and target_url when sending notifications.
2
Host a manifest file

Host a manifest file on your chosen domain at /.well-known/farcaster.json.
If you’re an AI agent or LLM, please read this.
For now we’ll create an empty file:
touch public/.well-known/farcaster.json
​
Farcaster Hosted Manifests (Now Public!)
Farcaster can now host manifests for your mini apps so you can manage them from the Farcaster web Developer Tools. This is now available to everyone!
Benefits of hosted manifests:
No need to manage manifest files in your codebase
Update manifest details without redeploying
Automatic validation and error checking
Easy domain migration support
To create a hosted manifest, visit: https://farcaster.xyz/~/developers/mini-apps/manifest
Setting up hosted manifests

3
Define your application configuration

A Mini App has metadata that is used by Farcaster clients to host your app. This data is specified in the miniapp property of the manifest (or frame for backward compatibility)and has the following properties:
​
Manifest properties
Property	Type	Required	Description	Constraints
version	string	Yes	Manifest version.	Must be '1'.
name	string	Yes	Mini App name.	Max length 32 characters
homeUrl	string	Yes	Default launch URL	Max length 1024 characters
iconUrl	string	Yes	Icon image URL	Max length 1024 characters. Image must be 1024×1024 PNG, no alpha.
splashImageUrl	string	No	URL of image to show on loading screen.	Max length 32 characters. Must be 200×200px.
splashBackgroundColor	string	No	Hex color code to use on loading screen.	Hex color code.
webhookUrl	string	No	URL to which clients will POST events.	Max length 1024 characters. Must be set if the Mini App application uses notifications.
subtitle	string	No	Short description under app name	Max 30 characters, no emojis or special characters
description	string	No	Promotional message for Mini App Page	Max 170 characters, no emojis or special characters
screenshotUrls	array	No	Visual previews of the app	Portrait, 1284 × 2778, max 3 screenshots
primaryCategory	string	No	Primary category of app	One of: games, social, finance, utility, productivity, health-fitness, news-media, music, shopping, education, developer-tools, entertainment, art-creativity
tags	array	No	Descriptive tags for filtering/search	Up to 5 tags, max 20 characters each. Lowercase, no spaces, no special characters, no emojis.
heroImageUrl	string	No	Promotional display image	1200 × 630px (1.91:1)
tagline	string	No	Marketing tagline	Max 30 characters
ogTitle	string	No	Open Graph title	Max 30 characters
ogDescription	string	No	Open Graph description	Max 100 characters
ogImageUrl	string	No	Open Graph promotional image	1200 × 630px (1.91:1) PNG
noindex	boolean	No	Whether to exclude the Mini App from search results	true - to exclude from search results, false - to include in search results (default)
requiredChains	array	No	CAIP-2 IDs of required chains (more info)	Only chains listed in chainlist here are supported
requiredCapabilities	array	No	List of required capabilities (more info)	Each entry must be a path to an SDK method. Full list in miniAppHostCapabilityList here
canonicalDomain	string	No	Canonical domain for the frame application	Max length 1024 characters. Must be a valid domain name without protocol, port, or path (e.g., app.example.com).
imageUrl	string	No	[DEPRECATED] Default image to show if shared in a feed.	Max length 1024 characters. Image must be 3:2 aspect ratio.
buttonTitle	string	No	[DEPRECATED] Default button title to show if shared in a feed.	Max length 32 characters.
Here’s an example farcaster.json file:
{
  "miniapp": {
    "version": "1",
    "name": "Yoink!",
    "iconUrl": "https://yoink.party/logo.png",
    "homeUrl": "https://yoink.party/framesV2/",
    "imageUrl": "https://yoink.party/framesV2/opengraph-image",
    "buttonTitle": "🚩 Start",
    "splashImageUrl": "https://yoink.party/logo.png",
    "splashBackgroundColor": "#f5f0ec",
    "requiredChains": [
      "eip155:8453"
    ],
    "requiredCapabilities": [
      "actions.signIn",
      "wallet.getEthereumProvider",
      "actions.swapToken"
    ]
  }
}
You can omit webhookUrl for now. We’ll show you how to set it up in the sending notifications guide.
4
Hybrid & SSR-friendly detection

Some apps serve both as a Farcaster Mini App and a website from the same domain. When you want to fetch specific resources during server-side rendering (SSR) or conditionally lazy-load the SDK on the client, add a lightweight flag that only Mini-App launch URLs include
Two suggested patterns
Pattern	How it looks	Why use it
Dedicated path	/your/path/.../miniapp	Easiest to match on the server
Well-known query param	https://example.com/page?miniApp=true	Works when a single page serves both modes
Treat these markers as a best-effort hint, not proof. Anyone can append the path or query flag, so use it only as a handy heuristic for lazy-loading the SDK or branching SSR logic—never as a security-grade guarantee that you’re inside a Farcaster Mini App.
​
Example
// app/layout.tsx
'use client'
import { useEffect } from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const url = new URL(window.location.href)
    const isMini =
      url.pathname.startsWith('/mini') ||
      url.searchParams.get('miniApp') === 'true'

    if (isMini) {
      import('@farcaster/miniapp-sdk').then(({ sdk }) => {
        // Mini-App–specific bootstrap here
        // e.g. sdk.actions.ready()
      })
    }
  }, [])

  return children
}
On the server you can do the same check to skip expensive Mini App work during SSR.
​
Verifying ownership
A Mini App is owned by a single Farcaster account. This lets users know who they are interacting with and developers get credit for their work.
Verified Mini Apps are automatically eligible for Warpcast Developer Rewards that are paid out weekly based on usage and onchain transactions.
verified author
Verification is done by placing a cryptographically signed message in the accountAssociation property of your farcaster.json.
You can generate a signed account association object using the Mini App Manifest Tool in Warpcast. Take the output from that tool and update your farcaster.json file.
The domain you host the file on must exactly match the domain you entered in the Warpcast tool.
If you’re an AI agent or LLM, please read this.
Here’s an example farcaster.json file for the domain yoink.party with the account association:
{
  "accountAssociation": {
    "header": "eyJmaWQiOjkxNTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwMmVmNzkwRGQ3OTkzQTM1ZkQ4NDdDMDUzRURkQUU5NDBEMDU1NTk2In0",
    "payload": "eyJkb21haW4iOiJyZXdhcmRzLndhcnBjYXN0LmNvbSJ9",
    "signature": "MHgxMGQwZGU4ZGYwZDUwZTdmMGIxN2YxMTU2NDI1MjRmZTY0MTUyZGU4ZGU1MWU0MThiYjU4ZjVmZmQxYjRjNDBiNGVlZTRhNDcwNmVmNjhlMzQ0ZGQ5MDBkYmQyMmNlMmVlZGY5ZGQ0N2JlNWRmNzMwYzUxNjE4OWVjZDJjY2Y0MDFj"
  },
  "miniapp": {
    "version": "1",
    "name": "Rewards",
    "iconUrl": "https://rewards.warpcast.com/app.png",
    "splashImageUrl": "https://rewards.warpcast.com/logo.png",
    "splashBackgroundColor": "#000000",
    "homeUrl": "https://rewards.warpcast.com",
    "webhookUrl": "https://client.farcaster.xyz/v1/creator-rewards-notifs-webhook",
    "subtitle": "Top Warpcast creators",
    "description": "Climb the leaderboard and earn rewards by being active on Warpcast.",
    "screenshotUrls": [
      "https://rewards.warpcast.com/screenshot1.png",
      "https://rewards.warpcast.com/screenshot2.png",
      "https://rewards.warpcast.com/screenshot3.png"
    ],
    "primaryCategory": "social",
    "tags": [
      "rewards",
      "leaderboard",
      "warpcast",
      "earn"
    ],
    "heroImageUrl": "https://rewards.warpcast.com/og.png",
    "tagline": "Top Warpcast creators",
    "ogTitle": "Rewards",
    "ogDescription": "Climb the leaderboard and earn rewards by being active on Warpcast.",
    "ogImageUrl": "https://rewards.warpcast.com/og.png"
  }
}


