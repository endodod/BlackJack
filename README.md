# Blackjack

A multiplayer blackjack game built with Next.js, Prisma, NextAuth, and PartyKit.

## Running Locally

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root with the following variables:
   ```env
   DATABASE_URL="your-postgres-connection-string"
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

### Start the App

You need **two terminals running simultaneously**:

**Terminal 1 — Next.js app**
```bash
npm run dev
```
Available at `http://localhost:3000`

**Terminal 2 — PartyKit multiplayer server**
```bash
npm run party:dev
```
Available at `http://127.0.0.1:1999`

The Next.js app connects to the PartyKit server for real-time multiplayer functionality. Both must be running for multiplayer to work.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run party:dev` | Start PartyKit server locally |
| `npm run party:deploy` | Deploy PartyKit server |
