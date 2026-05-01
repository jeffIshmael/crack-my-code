# PVP System Changes — Crack My Code

## Context
This is a Mastermind/Wordle-style game where two players race to guess each other's secret code. The winner is the one who solves it first. 

Currently, when two users open a free PVP separately, Pusher auto-pairs them. This works. The changes below build on top of this.

---

## Change 1: Matchmaking Queue with Search Timer (Free Matches)

### What to build
When a user starts a free PVP, show a **"Searching for opponent..."** screen with:
- An animated spinner or pulsing indicator
- A live timer counting up (e.g. `0:05... 0:10...`)
- A **Cancel** button that removes them from the queue

### Pusher Events to use
- `client-join-queue` → user enters the matchmaking pool
- `client-leave-queue` → user cancels search
- `match-found` → server triggers this when two users are paired, sends both players the `roomId`

### Timeout Logic
- If no match is found within **60 seconds**, stop searching automatically
- Show message: `"No opponents found. Try again or invite a friend."`
- Unsubscribe the user from the queue channel

### UI States
```
idle → searching (timer running) → matched (redirect to game room) 
                                 → timed out (show retry/invite options)
```

---

## Change 2: Invite Link System (Free & Paid Matches)

### What to build
Add an **"Invite a Friend"** button on the PVP creation screen. When clicked:
1. Create a game room with a unique `roomId` (UUID)
2. Generate a shareable link: `https://yourdomain.com/pvp/join/{roomId}`
3. Show a **"Waiting for opponent..."** screen with:
   - The shareable link displayed + a **Copy Link** button
   - A **5-minute countdown timer** (if opponent doesn't join, cancel and refund if paid)
   - Option to also share via WhatsApp/Telegram using the Web Share API

### Pusher Events to use
- Creator subscribes to `private-room-{roomId}`
- When opponent visits the link and joins, trigger `client-opponent-joined`
- Creator receives the event and both are redirected into the game

### Timeout Logic
- If no one joins within **5 minutes**:
  - For free: cancel the room, return user to home
  - For paid: trigger smart contract refund of deposit
  - Show message: `"Your invite expired. No one joined in time."`

---

## Change 3: Pre-Game Countdown (Both Match Types) ==> Optional because it doesnt affect our game flow

### What to build
Once both players are in the room and confirmed ready, show a **synchronized countdown** before the game starts so neither player has a head start.

### Flow
```
Both players in room → "Get Ready!" screen → 3...2...1...GO → game starts simultaneously
```

### Pusher Events to use
- When second player joins: server triggers `game-starting` event to both players
- Both clients start the same countdown locally (no need to sync each tick)
- On `GO`, both players' boards unlock and the game timer starts

### Important
- The creator's code input must be **locked/hidden** until countdown ends
- Do not allow any guesses before `GO`

---

## Change 4: Paid Match Flow 

### Rules
- Both players must deposit before the game room is created


### UI to add
- On the invite join page, show: `"This is a paid match. Stake: 0.2 USDT. Winner takes 0.396 USDT."`
- Show a **Confirm & Deposit** button before joining
- Show a loading state while the transaction confirms on-chain

### Timeout & Forfeit Rules
- If Player B doesn't join within 5 minutes → refund Player A automatically via contract
- If a player abandons mid-game (closes tab, disconnects for >30 seconds) → they forfeit, opponent wins
- Use Pusher `member-removed` event on a presence channel to detect disconnection

---

## Change 5: Lobby (Free Casual Only)

### What to keep
- The existing public lobby where open free challenges are listed is fine

### What to add
- Show each challenge with: creator username, time waiting, and a **Join** button
- Add a **"Ready" confirmation modal** after clicking Join:
  - `"You're about to join [username]'s game. Ready?"`
  - Confirm → triggers Pusher pairing → pre-game countdown starts
- This prevents joining and immediately abandoning


---

## Summary of New Pusher Events Needed

| Event Name | Direction | Purpose |
|---|---|---|
| `client-join-queue` | Client → Server | User enters matchmaking pool |
| `client-leave-queue` | Client → Server | User cancels search |
| `match-found` | Server → Client | Pair found, sends roomId |
| `client-opponent-joined` | Client → Server | Opponent joined invite room |
| `game-starting` | Server → Client | Triggers pre-game countdown |
| `member-removed` | Pusher presence | Detect player disconnect/forfeit |

---

## Notes for Agent
- Do not break the existing Pusher auto-pairing for free matches — build the new flows alongside it
- The invite link system is a **new parallel flow**, not a replacement
- All timers on the frontend should be visual only; game state must be validated server-side
- For paid match smart contract interactions, preserve existing deposit/payout logic and only add the refund-on-timeout case

## Additional changes
During the testing, I have noticed the following:-

- When playing the game, its taking long to analyse, I dont know whether its the pusherjs logic, could we make it fast.
- My opponents code wasnt shown to me after I waas defeated.
- The connected wallet with metamask has no liberty of seeing the profile it says not signed in.
- we didn't minus the points or add after the game in the database.