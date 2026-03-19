require('dotenv').config();
const dns = require('dns');
// Force IPv4 — Mercury IP whitelist only has IPv4
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MERCURY_BASE = 'https://api.mercury.com/api/v1';
const TOKEN = process.env.MERCURY_API;

if (!TOKEN) {
  console.error('MERCURY_API token not found in .env');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// Get all accounts (to find accountId for sending)
app.get('/api/accounts', async (req, res) => {
  try {
    const resp = await fetch(`${MERCURY_BASE}/accounts`, { headers });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List existing recipients
app.get('/api/recipients', async (req, res) => {
  try {
    const resp = await fetch(`${MERCURY_BASE}/recipients`, { headers });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new recipient
app.post('/api/recipients', async (req, res) => {
  try {
    const resp = await fetch(`${MERCURY_BASE}/recipients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send ACH payment
app.post('/api/send', async (req, res) => {
  try {
    // Get first active account
    const acctResp = await fetch(`${MERCURY_BASE}/accounts`, { headers });
    const acctData = await acctResp.json();
    if (!acctResp.ok) return res.status(acctResp.status).json(acctData);

    const account = acctData.accounts.find(a => a.status === 'active');
    if (!account) return res.status(400).json({ error: 'No active Mercury account found' });

    const { recipientId, amount, memo, category, categoryInfo } = req.body;

    const payload = {
      recipientId,
      amount: parseFloat(amount),
      paymentMethod: 'ach',
      idempotencyKey: uuidv4(),
    };
    if (memo) payload.externalMemo = memo;
    if (category) {
      payload.purpose = { category };
    }

    const resp = await fetch(`${MERCURY_BASE}/account/${account.id}/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mercury ACH app running at http://localhost:${PORT}`);
});
