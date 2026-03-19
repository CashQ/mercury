require('dotenv').config();
const dns = require('dns');
// Force IPv4 — Mercury IP whitelist only has IPv4
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(express.json());

const MERCURY_BASE = 'https://api.mercury.com/api/v1';
const TOKEN = process.env.MERCURY_API;

if (!TOKEN) {
  const fs = require('fs');

  console.error('\x1b[33m');
  console.error('  Mercury API key not configured — open http://localhost:' + (process.env.PORT || 3000) + ' to set up');
  console.error('\x1b[0m');

  // Validate key against Mercury API
  app.post('/api/setup/validate', async (req, res) => {
    const { token } = req.body;
    if (!token || !token.trim()) {
      return res.json({ ok: false, error: 'Please enter an API token.' });
    }

    try {
      const resp = await fetch(`${MERCURY_BASE}/accounts`, {
        headers: { 'Authorization': `Bearer ${token.trim()}`, 'Content-Type': 'application/json' },
      });
      const data = await resp.json();

      if (!resp.ok) {
        const err = data.errors || data;
        if (err.errorCode === 'ipNotWhitelisted') {
          return res.json({
            ok: false,
            error: `Your IP address (${err.ip}) is not whitelisted. Add it to your API token's whitelist in Mercury Dashboard → Settings → API Tokens.`,
            errorCode: err.errorCode,
            ip: err.ip,
            helpUrl: err.documentationUrl,
          });
        }
        if (resp.status === 401 || resp.status === 403) {
          return res.json({
            ok: false,
            error: 'Invalid API token. Check that you copied the full token including the "secret-token:" prefix.',
          });
        }
        return res.json({
          ok: false,
          error: err.message || JSON.stringify(err),
        });
      }

      // Token works — save to .env
      const envPath = path.join(__dirname, '.env');
      fs.writeFileSync(envPath, `MERCURY_API=${token.trim()}\n`);

      const acct = data.accounts?.find(a => a.status === 'active');
      return res.json({
        ok: true,
        account: acct ? `${acct.name} ($${acct.availableBalance})` : 'Connected',
        message: 'API key saved. Restarting server...',
      });
    } catch (err) {
      return res.json({ ok: false, error: `Connection failed: ${err.message}` });
    }
  });

  // Restart server after key is saved
  app.post('/api/setup/restart', (req, res) => {
    res.json({ ok: true });
    setTimeout(() => process.exit(0), 500);
  });

  // Setup page
  const setupPage = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Mercury ACH — Setup</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F5EDE4;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{background:#fff;border-radius:12px;border:1px solid #E0D6CC;padding:40px;max-width:520px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
  .icon{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 16px}
  .icon-warn{background:#FDEDEC;color:#C0392B}
  .icon-ok{background:#E8F5ED;color:#2E7D52}
  h1{font-size:22px;margin-bottom:8px;color:#1A1714;text-align:center}
  .subtitle{color:#6B5E54;font-size:14px;text-align:center;margin-bottom:24px}
  label{display:block;font-size:13px;font-weight:500;color:#6B5E54;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
  input{width:100%;padding:12px 14px;border:1px solid #E0D6CC;border-radius:8px;font-size:14px;background:#FAF7F4;color:#1A1714;font-family:monospace;margin-bottom:16px}
  input:focus{outline:none;border-color:#D97757;box-shadow:0 0 0 3px rgba(217,119,87,.12)}
  .btn{width:100%;padding:14px;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
  .btn-primary{background:#D97757;color:#fff}
  .btn-primary:hover{background:#C4623F}
  .btn-primary:disabled{background:#CBBFB5;cursor:not-allowed}
  .link{display:block;text-align:center;margin-top:12px;color:#D97757;font-size:14px;text-decoration:none;font-weight:500}
  .link:hover{text-decoration:underline}
  .alert{padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:16px;line-height:1.5}
  .alert-error{background:#FDEDEC;color:#C0392B;border:1px solid #F5C6CB}
  .alert-success{background:#E8F5ED;color:#2E7D52;border:1px solid #C3E6CB}
  .alert a{color:inherit;font-weight:600}
  .spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:8px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .help{font-size:12px;color:#B8ADA3;margin-top:4px;margin-bottom:16px}
  .hidden{display:none}
</style></head><body>
<div class="card">
  <div class="icon icon-warn" id="icon">!</div>
  <h1 id="title">Connect Mercury API</h1>
  <p class="subtitle" id="subtitle">Enter your API token to get started</p>

  <div id="alert-area"></div>

  <div id="form-area">
    <label for="token">API Token</label>
    <input type="password" id="token" placeholder="secret-token:mercury_production_..." autocomplete="off">
    <div class="help">Find this in Mercury Dashboard → Settings → API Tokens</div>

    <button class="btn btn-primary" id="btn-validate" onclick="validateKey()">Validate & Save</button>
    <a class="link" href="https://docs.mercury.com/docs/getting-started" target="_blank">Get API Token →</a>
  </div>

  <div id="success-area" class="hidden">
    <button class="btn btn-primary" id="btn-restart" onclick="restartServer()">Launch App</button>
  </div>
</div>

<script>
async function validateKey() {
  const token = document.getElementById('token').value.trim();
  const btn = document.getElementById('btn-validate');
  const alert = document.getElementById('alert-area');

  if (!token) { alert.innerHTML = '<div class="alert alert-error">Please enter your API token.</div>'; return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Validating...';
  alert.innerHTML = '';

  try {
    const res = await fetch('/api/setup/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();

    btn.innerHTML = 'Validate & Save';
    btn.disabled = false;

    if (!data.ok) {
      let msg = data.error;
      if (data.helpUrl) msg += ' <a href="' + data.helpUrl + '" target="_blank">Documentation →</a>';
      if (data.ip) msg += '<br><br><strong>Your IP:</strong> ' + data.ip + '<br>Copy this and add it to your token whitelist.';
      alert.innerHTML = '<div class="alert alert-error">' + msg + '</div>';
      return;
    }

    // Success
    alert.innerHTML = '<div class="alert alert-success">Connected to ' + data.account + '</div>';
    document.getElementById('icon').className = 'icon icon-ok';
    document.getElementById('icon').textContent = '✓';
    document.getElementById('title').textContent = 'API Key Saved';
    document.getElementById('subtitle').textContent = 'Token validated and saved to .env';
    document.getElementById('form-area').classList.add('hidden');
    document.getElementById('success-area').classList.remove('hidden');
  } catch (err) {
    btn.innerHTML = 'Validate & Save';
    btn.disabled = false;
    alert.innerHTML = '<div class="alert alert-error">' + err.message + '</div>';
  }
}

async function restartServer() {
  const btn = document.getElementById('btn-restart');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Restarting...';

  try { await fetch('/api/setup/restart', { method: 'POST' }); } catch {}

  // Poll until server is back
  const poll = setInterval(async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) { clearInterval(poll); window.location.href = '/'; }
    } catch {}
  }, 1000);

  // Timeout after 15s
  setTimeout(() => {
    clearInterval(poll);
    btn.innerHTML = 'Launch App';
    btn.disabled = false;
    document.getElementById('alert-area').innerHTML =
      '<div class="alert alert-error">Server restart timed out. Please run <strong>npm start</strong> manually and refresh this page.</div>';
  }, 15000);
}
</script>
</body></html>`;

  app.use((req, res) => {
    res.status(503).send(setupPage);
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT} (setup mode)`);
  });
  return;
}

app.use(express.static(path.join(__dirname, 'public')));

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
