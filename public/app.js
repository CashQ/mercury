let recipients = [];
let accounts = [];
let selectedRecipient = null;
let mode = 'existing';

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadAccounts();
  loadRecipients();
});

async function loadAccounts() {
  try {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    const badge = document.getElementById('account-badge');
    accounts = (data.accounts || []).filter(a => a.status === 'active');

    if (accounts.length > 0) {
      badge.textContent = accounts[0].nickname || accounts[0].name;
      // Populate account dropdown on step 2
      const select = document.getElementById('p-account');
      const wrap = document.getElementById('account-select-wrap');
      if (select) {
        select.innerHTML = accounts.map(a => {
          const label = `${a.nickname || a.name} — $${a.availableBalance.toFixed(2)}`;
          return `<option value="${a.id}">${escapeHtml(label)}</option>`;
        }).join('');
        // Only show dropdown when multiple accounts
        if (accounts.length > 1 && wrap) wrap.classList.remove('hidden');
      }
    } else {
      badge.textContent = 'No account';
    }
  } catch {
    document.getElementById('account-badge').textContent = 'Error';
  }
}

async function loadRecipients() {
  const loading = document.getElementById('recipients-loading');
  const list = document.getElementById('recipients-list');
  const empty = document.getElementById('recipients-empty');

  loading.classList.remove('hidden');
  list.classList.add('hidden');
  empty.classList.add('hidden');

  try {
    const res = await fetch('/api/recipients');
    const data = await res.json();
    recipients = data.recipients || data || [];

    loading.classList.add('hidden');

    if (recipients.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    list.innerHTML = '';
    recipients.forEach(r => {
      const hasACH = r.electronicRoutingInfo;
      const lastFour = hasACH ? `••${r.electronicRoutingInfo.accountNumber?.slice(-4) || ''}` : 'No ACH info';
      const item = document.createElement('div');
      item.className = 'recipient-item';
      if (!hasACH) item.style.opacity = '0.5';
      item.innerHTML = `
        <div>
          <div class="name">${escapeHtml(r.name)}</div>
          <div class="detail">${escapeHtml(lastFour)}</div>
        </div>
      `;
      if (hasACH) {
        item.onclick = () => selectRecipient(r, item);
      }
      list.appendChild(item);
    });

    list.classList.remove('hidden');
  } catch (err) {
    loading.classList.add('hidden');
    showAlert('alert-area', `Failed to load recipients: ${err.message}`);
  }
}

// --- Toggle ---
function toggleMode(m) {
  mode = m;
  document.getElementById('toggle-existing').classList.toggle('active', m === 'existing');
  document.getElementById('toggle-new').classList.toggle('active', m === 'new');
  document.getElementById('existing-panel').classList.toggle('hidden', m !== 'existing');
  document.getElementById('new-panel').classList.toggle('hidden', m !== 'new');

  selectedRecipient = null;
  document.querySelectorAll('.recipient-item').forEach(el => el.classList.remove('selected'));
  updateNextButton();
}

// --- Select existing ---
function selectRecipient(r, el) {
  selectedRecipient = r;
  document.querySelectorAll('.recipient-item').forEach(item => item.classList.remove('selected'));
  el.classList.add('selected');
  updateNextButton();
}

function updateNextButton() {
  const btn = document.getElementById('btn-next');
  if (mode === 'existing') {
    btn.disabled = !selectedRecipient;
  } else {
    btn.disabled = false;
  }
}

// --- Step 2 ---
async function goToStep2() {
  clearAlert('alert-area');

  if (mode === 'new') {
    const name = document.getElementById('r-name').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const routing = document.getElementById('r-routing').value.trim();
    const account = document.getElementById('r-account').value.trim();
    const type = document.getElementById('r-type').value;
    const address1 = document.getElementById('r-address').value.trim();
    const city = document.getElementById('r-city').value.trim();
    const state = document.getElementById('r-state').value.trim();
    const zip = document.getElementById('r-zip').value.trim();
    const country = document.getElementById('r-country').value.trim();

    if (!name || !email || !routing || !account || !address1 || !city || !state || !zip) {
      showAlert('alert-area', 'Please fill in all required fields.');
      return;
    }

    const btn = document.getElementById('btn-next');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Creating recipient...';

    try {
      const res = await fetch('/api/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          emails: [email],
          electronicRoutingInfo: {
            accountNumber: account,
            routingNumber: routing,
            electronicAccountType: type,
            address: { address1, city, region: state, postalCode: zip, country },
          },
        }),
      });

      const data = await res.json();
      btn.innerHTML = 'Next';
      btn.disabled = false;

      if (!res.ok) {
        const errMsg = data.errors?.notFound?.[0] || data.errors?.[0]?.message || data.error || JSON.stringify(data);
        showAlert('alert-area', errMsg);
        return;
      }

      selectedRecipient = data;
    } catch (err) {
      btn.innerHTML = 'Next';
      btn.disabled = false;
      showAlert('alert-area', err.message);
      return;
    }
  }

  // Show step 2
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step2').classList.remove('hidden');
  document.getElementById('step1-indicator').classList.remove('active');
  document.getElementById('step1-indicator').classList.add('done');
  document.getElementById('step-line').classList.add('done');
  document.getElementById('step2-indicator').classList.add('active');

  document.getElementById('sel-name').textContent = selectedRecipient.name;
  const ach = selectedRecipient.electronicRoutingInfo;
  document.getElementById('sel-detail').textContent = ach
    ? `ACH ••${ach.accountNumber?.slice(-4) || ''}`
    : '';
}

function backToStep1() {
  document.getElementById('step2').classList.add('hidden');
  document.getElementById('step1').classList.remove('hidden');
  document.getElementById('step2-indicator').classList.remove('active');
  document.getElementById('step1-indicator').classList.remove('done');
  document.getElementById('step1-indicator').classList.add('active');
  document.getElementById('step-line').classList.remove('done');
}

// --- Category toggle ---
document.addEventListener('DOMContentLoaded', () => {
  const catSelect = document.getElementById('p-category');
  if (catSelect) {
    catSelect.addEventListener('change', () => {
      const needsInfo = ['vendor', 'contractor', 'other'];
      const wrap = document.getElementById('category-info-wrap');
      wrap.classList.toggle('hidden', !needsInfo.includes(catSelect.value));
    });
  }
});

// --- Send Payment ---
async function sendPayment() {
  clearAlert('alert-area-2');

  const amount = parseFloat(document.getElementById('p-amount').value);
  const memo = document.getElementById('p-memo').value.trim();
  const category = document.getElementById('p-category').value;
  const categoryInfo = document.getElementById('p-category-info').value.trim();
  const accountId = document.getElementById('p-account').value;

  if (!amount || amount < 0.01) {
    showAlert('alert-area-2', 'Enter a valid amount (min $0.01).');
    return;
  }

  const body = {
    recipientId: selectedRecipient.id,
    accountId,
    amount,
    memo: memo || undefined,
  };

  if (category) {
    body.category = category;
    if (categoryInfo) body.categoryInfo = categoryInfo;
  }

  const btn = document.getElementById('btn-send');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Sending...';

  try {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    btn.innerHTML = 'Send ACH Payment';
    btn.disabled = false;

    if (!res.ok) {
      showAlert('alert-area-2', data.errors?.[0]?.message || data.error || JSON.stringify(data));
      return;
    }

    showConfirmation(data);
  } catch (err) {
    btn.innerHTML = 'Send ACH Payment';
    btn.disabled = false;
    showAlert('alert-area-2', err.message);
  }
}

function showConfirmation(tx) {
  document.getElementById('step2').classList.add('hidden');
  document.getElementById('step3').classList.remove('hidden');
  document.getElementById('step2-indicator').classList.remove('active');
  document.getElementById('step2-indicator').classList.add('done');

  const isSuccess = tx.status !== 'failed' && tx.status !== 'cancelled';

  document.getElementById('confirmation-content').innerHTML = `
    <div class="icon ${isSuccess ? 'success' : 'error'}">${isSuccess ? '&#10003;' : '&#10007;'}</div>
    <h3>${isSuccess ? 'Payment Initiated' : 'Payment Failed'}</h3>
    <p style="color: var(--text-secondary); font-size: 14px;">
      ${isSuccess ? 'Your ACH transfer is being processed.' : (tx.reasonForFailure || 'Something went wrong.')}
    </p>
    <div class="amount">$${Math.abs(Number(tx.amount)).toFixed(2)}</div>
    <div class="details">
      <div class="row-item">
        <span class="row-label">Recipient</span>
        <span>${escapeHtml(tx.counterpartyName || selectedRecipient.name)}</span>
      </div>
      <div class="row-item">
        <span class="row-label">Status</span>
        <span>${escapeHtml(tx.status)}</span>
      </div>
      <div class="row-item">
        <span class="row-label">Transaction ID</span>
        <span style="font-size:12px; word-break:break-all;">${escapeHtml(tx.id)}</span>
      </div>
      ${tx.estimatedDeliveryDate ? `
      <div class="row-item">
        <span class="row-label">Est. Delivery</span>
        <span>${new Date(tx.estimatedDeliveryDate).toLocaleDateString()}</span>
      </div>` : ''}
      ${tx.dashboardLink ? `
      <div class="row-item">
        <span class="row-label">Dashboard</span>
        <span><a href="${escapeHtml(tx.dashboardLink)}" target="_blank" style="color: var(--accent);">View in Mercury</a></span>
      </div>` : ''}
    </div>
  `;
}

// --- Reset ---
function reset() {
  document.getElementById('step3').classList.add('hidden');
  document.getElementById('step1').classList.remove('hidden');

  document.getElementById('step1-indicator').classList.add('active');
  document.getElementById('step1-indicator').classList.remove('done');
  document.getElementById('step2-indicator').classList.remove('active');
  document.getElementById('step2-indicator').classList.remove('done');
  document.getElementById('step-line').classList.remove('done');

  selectedRecipient = null;
  document.getElementById('p-amount').value = '';
  document.getElementById('p-memo').value = '';

  document.querySelectorAll('.recipient-item').forEach(el => el.classList.remove('selected'));
  updateNextButton();
  loadRecipients();
}

// --- Helpers ---
function showAlert(containerId, msg) {
  document.getElementById(containerId).innerHTML = `<div class="alert alert-error">${escapeHtml(msg)}</div>`;
}

function clearAlert(containerId) {
  document.getElementById(containerId).innerHTML = '';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
