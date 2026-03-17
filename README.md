# BlackJack

A browser-based Blackjack card game with user accounts, a leaderboard, and a basic strategy trainer.

🌐 **Live:** [blackjack.paulkuehn.ch](https://blackjack.paulkuehn.ch)

---

## Stack

| | |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **UI** | React 19 |
| **Auth** | NextAuth.js v4 |
| **ORM** | Prisma 5 |
| **Database** | PostgreSQL |
| **Password hashing** | bcryptjs |
| **Styling** | Plain CSS |
| **Hosting** | Vercel |

---

## Features

- Full Blackjack gameplay — bet, hit, stand, double down, split (incl. double after split)
- Animated card dealing with a 4-deck shoe (reshuffles at <25% remaining)
- Keyboard shortcuts — `W` Hit · `S` Stand · `D` Double · `A` Split
- User accounts — register, login, change username/password, delete account
- Persistent bankroll & stats (hands, wins, losses, pushes, blackjacks, income)
- Global leaderboard
- Basic strategy trainer with real-time feedback
- Strategy reference table modal
- Sound effects (chip, draw, win, bust, clear bet)
- Cross-monitor scaling fix via `ScaleInit.js`

---

## Rules

- Dealer stands on soft 17
- No surrender
- No re-split after split

---

## Getting Started

```bash
git clone https://github.com/endodod/BlackJack.git
cd BlackJack
npm install
```

Set up your environment variables:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

Then run:

```bash
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Tests

```bash
npm test
```

224 tests across 13 suites covering:

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

## Planned

- Fix Ace logic edge case (2×A)
- Pro mode — card counting training
- Mobile support
- Multiplayer (?)