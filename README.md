# Mercury ACH Sender

Simple web app for sending ACH payments via the [Mercury Banking API](https://docs.mercury.com/docs/getting-started).

## Features

- View existing Mercury recipients
- Create new recipients with ACH bank details
- Send ACH payments with category and memo
- Confirmation with transaction status and Mercury dashboard link

## Setup

### 1. Get a Mercury API Token

1. Log in to [Mercury](https://app.mercury.com)
2. Go to **Settings → API Tokens**
3. Create a new token with **Read and Write** permissions
4. Add your server's IP address to the token's whitelist (both IPv4 and IPv6 if applicable)

### 2. Configure Environment

Create a `.env` file in the project root:

```
MERCURY_API=secret-token:your_token_here
```

### 3. Install and Run

```bash
npm install
npm start
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
├── server.js          # Express backend (proxies Mercury API)
├── public/
│   ├── index.html     # Two-step wizard UI
│   ├── style.css      # Anthropic-inspired styling
│   └── app.js         # Frontend logic
├── .env               # API token (not committed)
└── package.json
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/accounts` | GET | List Mercury accounts |
| `/api/recipients` | GET | List existing recipients |
| `/api/recipients` | POST | Create a new recipient |
| `/api/send` | POST | Send ACH payment |
