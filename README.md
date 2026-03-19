# Mercury ACH Sender

Simple web app for sending ACH payments via the [Mercury Banking API](https://docs.mercury.com/docs/getting-started).

## Features

- **Self-service setup** — enter API token in the browser, validates and saves automatically
- **Existing recipients** — browse and select from your Mercury recipient list
- **New recipients** — create with full ACH bank details (routing, account, address)
- **Account selection** — choose which Mercury account to send from (auto-selects if only one)
- **Transaction categories** — defaults to Contractor, with all Mercury categories available
- **Confirmation** — shows status, transaction ID, estimated delivery, and Mercury dashboard link
- **Error handling** — specific messages for invalid tokens, IP whitelist issues, etc.

## Setup

### 1. Install and Run

```bash
npm install
npm start
```

### 2. Configure API Token

Open [http://localhost:3000](http://localhost:3000) — if no API token is configured, the app shows an interactive setup page where you can:

1. Paste your Mercury API token
2. The app validates it against the Mercury API
3. On success, saves to `.env` and restarts automatically

To get a token: log in to [Mercury](https://app.mercury.com) → **Settings → API Tokens** → create a **Read and Write** token.

> **Note:** Mercury requires IP whitelisting for Read/Write tokens. Add your server's IP address to the token's whitelist. The setup page will show your IP if it's not whitelisted.

### Manual Setup (alternative)

Create a `.env` file in the project root:

```
MERCURY_API=secret-token:your_token_here
```

Then run `npm start`.

## Project Structure

```
├── server.js          # Express backend (proxies Mercury API)
├── public/
│   ├── index.html     # Two-step wizard UI
│   ├── style.css      # Anthropic-inspired styling
│   └── app.js         # Frontend logic
├── .env               # API token (created by setup, not committed)
└── package.json
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/accounts` | GET | List Mercury accounts |
| `/api/recipients` | GET | List existing recipients |
| `/api/recipients` | POST | Create a new recipient |
| `/api/send` | POST | Send ACH payment |
