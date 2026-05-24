# Blackjack

> A full-stack browser-based Blackjack game with user accounts, persistent stats, a global leaderboard, a basic strategy trainer, and real-time multiplayer.

**Live:** [blackjack.paulkuehn.ch](https://blackjack.paulkuehn.ch)

---

## Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15 |
| UI | React | 19 |
| Auth | NextAuth.js | v4 |
| ORM | Prisma | 7 |
| Database | PostgreSQL (Neon) | — |
| Multiplayer | PartyKit | 0.0.115 |
| Password hashing | bcryptjs | 3 |
| Styling | Plain CSS | — |
| Hosting | Vercel | — |

---

## Features

### Gameplay
- Full Blackjack loop — bet, deal, hit, stand, double down, split (incl. double after split), resign
- Animated card dealing from a 4-deck shoe that reshuffles at <25% remaining
- Natural Blackjack pays 3:2
- Dealer stands on soft 17
- Resign on first two cards (lose half the bet)
- No re-split after split
- Keyboard shortcuts — `W` Hit · `S` Stand · `D` Double · `A` Split · `R` Resign

### Accounts & Stats
- Register, log in, change username/password, delete account
- Persistent bankroll and session stats: hands played, wins, losses, pushes, blackjacks, total income
- Game progress auto-saved to the database after each hand

### Leaderboard
- Global leaderboard with three tabs: **Income**, **Training**, and **Resets**
- Top 10 per category with ranking badges

### Basic Strategy Trainer
- Toggle training mode to practice against the correct basic strategy
- Real-time feedback after each decision (correct / incorrect)
- Configurable hand type filter: hard hands, soft hands, pairs

### Multiplayer
- Real-time sessions via PartyKit WebSockets
- Create or join a lobby, wait room, then play at a shared table

### Other
- Strategy reference table modal (full HARD / SOFT / PAIRS grid)
- Sound effects with volume slider (chip, deal, stand, win, bust)
- Mobile-responsive UI with dynamic viewport scaling

---

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database — [Neon](https://neon.tech) free tier works

### Install

```bash
git clone https://github.com/endodod/BlackJack.git
cd BlackJack
npm install
```

### Environment variables

Create `.env.local` in the project root:

```env
DATABASE_URL="your-postgres-connection-string"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_PARTYKIT_HOST="localhost:1999"
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon (or any PostgreSQL) connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Base URL of the app (`http://localhost:3000` for local dev) |
| `NEXT_PUBLIC_PARTYKIT_HOST` | Multiplayer only | PartyKit dev server host (`localhost:1999`) |

### Database setup

```bash
npx prisma generate
npx prisma migrate deploy
```

### Run

```bash
# Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For multiplayer, run the PartyKit server in a second terminal:

```bash
npm run party:dev
```

---

## Tests

```bash
npm test
```

224 tests across 13 suites:

| Suite | What it covers |
|---|---|
| `logic/getHandTotal` | Ace soft/hard switching, face cards, bust totals |
| `logic/checkWinner` | Dealer bust, player bust, higher hand wins, push |
| `logic/drawCard` | Card added to hand, removed from deck, immutability |
| `api/register` | Username/password validation, duplicate check, hashing, SQL injection/XSS edge cases |
| `api/login` | Correct credentials, wrong password, missing fields, case sensitivity, JWT strategy |
| `api/changePassword` | Auth guard, current password check, new password validation |
| `api/changeUsername` | Auth guard, duplicate check, password verification, whitespace edge case |
| `api/deleteAccount` | Auth guard, password confirmation, Prisma delete called |
| `api/resetStats` | Auth guard, bankroll reset to 1000, all stats zeroed, resets counter incremented |
| `components/BettingPanel` | Chip buttons, bet accumulation, Deal/Clear enable state, balance guards |
| `components/AuthModal` | Login/register flows, error messages, guest mode, HTML required validation |
| `components/ProfilePage` | Reset game, change username/password, delete account (two-step UI), stats display |
| `hooks/useBlackjackGame` | Deal, hit, stand, double down, split, natural blackjack payout, edge cases |

---

## Project Structure

```
BlackJack/
├── app/                        # Next.js App Router
│   ├── layout.js               # Root layout + viewport scaling
│   ├── page.js                 # Home page (server component)
│   ├── icon.svg                # Favicon
│   ├── profile/page.js         # User profile & settings
│   └── api/
│       ├── auth/               # NextAuth + registration
│       ├── game/save-progress/ # Save hand results to DB
│       ├── leaderboard/        # Public leaderboard data
│       └── user/               # Account management endpoints
├── src/
│   ├── App.js                  # Main game shell (header, modals, nav)
│   ├── GameClient.js           # Auth wrapper for App
│   ├── components/             # 29 UI components (cards, panels, modals)
│   ├── hooks/useBlackjackGame.js # Core game state machine
│   ├── logic/                  # Pure game functions (totals, winners, deck)
│   ├── context/                # DeckContext (bankroll, current bet)
│   ├── lib/                    # auth.js, prisma.js, sound.js
│   ├── multiplayer/            # PartyKit client (lobby, table, socket)
│   ├── theory/                 # Basic strategy lookup tables
│   └── __tests__/              # Jest test suites
├── party/                      # PartyKit server
├── prisma/                     # Schema & migrations
├── public/                     # Favicon, logos, sound files
├── next.config.js
└── package.json
```

---

## Deployment

The app is deployed on Vercel with Neon PostgreSQL and PartyKit.

```bash
# Deploy multiplayer server
npm run party:deploy

# Vercel deployment is triggered automatically on push to main
```

Set the same environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_PARTYKIT_HOST`) in your Vercel project settings.

---

## License

MIT
