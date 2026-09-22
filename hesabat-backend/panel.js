const express = require('express');
const fs = require('fs');
const path = require('path');

/* API Client برای ارتباط با Backend
   - timeout 20 ثانیه
   - 2 بار retry برای خطاهای transient
   - تشخیص وضعیت اتصال */
class ApiClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.token = null;
    this.connected = false;
  }

  async request(method, path, body = null) {
    const url = this.baseURL + path;
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      ...(body && { body: JSON.stringify(body) })
    };

    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const res = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(timeout);

        this.connected = true;
        const json = await res.json();
        
        if (!res.ok) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }

        return json;
      } catch (err) {
        lastErr = err;
        this.connected = false;

        // transient errors: timeout, connection refused, etc.
        const isTransient = err.name === 'AbortError' || 
                           /ECONNREFUSED|ETIMEDOUT|network/.test(err.message);
        
        if (!isTransient || attempt === 2) throw err;
        
        // exponential backoff
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)));
      }
    }
    throw lastErr;
  }

  setToken(token) {
    this.token = token;
  }

  isConnected() {
    return this.connected;
  }
}

/* پنل مدیریتی */
const app = express();
app.use(express.static('public'));
app.use(express.json());

const API = new ApiClient(process.env.BACKEND_URL || 'http://localhost:3000');

/* API Proxy with Error Handling */
app.all('/api/*', async (req, res) => {
  try {
    const path = req.path.replace('/api', '');
    const method = req.method;
    const body = ['GET', 'HEAD'].includes(method) ? null : req.body;

    const result = await API.request(method, path, body);
    res.json(result);
  } catch (err) {
    console.error('[Panel] API error:', err.message);
    res.status(503).json({ error: err.message });
  }
});

/* Serve panel.html */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

/* Start Panel */
const PORT = process.env.PANEL_PORT || 8000;
app.listen(PORT, () => {
  console.log(`[Panel] listening on port ${PORT}`);
});

module.exports = { ApiClient };
