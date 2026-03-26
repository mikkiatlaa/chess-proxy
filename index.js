const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
app.use(cors());
app.use(express.json());

const API_TOKEN = '99b76973b1ff817fcb0bfb852f48fb4be4aa163ce84d6b755657afd01625e402';
const SITE_ID = '68e69029e8acd25d901194f7';
const BASE_URL = 'https://api.webflow.com/v2';

async function webflowFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      'accept': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

// Get all players
app.get('/players', async (req, res) => {
  try {
    const cols = await webflowFetch(`/sites/${SITE_ID}/collections`);
    const col = cols.data.collections.find(c => c.displayName.toLowerCase().includes('leaderboard'));
    if (!col) return res.status(404).json({ error: 'Collection not found' });
    const items = await webflowFetch(`/collections/${col.id}/items?limit=100`);
    const players = items.data.items.map(item => ({
      id: item.id,
      collectionId: col.id,
      name: item.fieldData.name,
      rank: item.fieldData.rank || '',
      score: item.fieldData.score || 0
    }));
    res.json(players);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a player
app.post('/players', async (req, res) => {
  try {
    const { name, rank } = req.body;
    const cols = await webflowFetch(`/sites/${SITE_ID}/collections`);
    const col = cols.data.collections.find(c => c.displayName.toLowerCase().includes('leaderboard'));
    const result = await webflowFetch(`/collections/${col.id}/items/live`, 'POST', {
      fieldData: { name, rank, score: 0 }
    });
    res.json(result.data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Update score
app.patch('/players/:collectionId/:itemId', async (req, res) => {
  try {
    const { collectionId, itemId } = req.params;
    const { name, rank, score } = req.body;
    const result = await webflowFetch(`/collections/${collectionId}/items/${itemId}/live`, 'PATCH', {
      fieldData: { name, rank, score }
    });
    res.json(result.data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a player
app.delete('/players/:collectionId/:itemId', async (req, res) => {
  try {
    const { collectionId, itemId } = req.params;
    await webflowFetch(`/collections/${collectionId}/items/${itemId}/live`, 'DELETE');
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
