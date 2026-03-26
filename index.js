const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
app.use(cors());
app.use(express.json());

const API_TOKEN = 'dfb03e9a153135334537e0c44b683cc54474868fae45005b4094ac8accd66b40';
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

async function findCollection(keyword) {
  const cols = await webflowFetch(`/sites/${SITE_ID}/collections`);
  const col = cols.data.collections.find(c =>
    c.displayName.toLowerCase().includes(keyword.toLowerCase())
  );
  if (!col) throw new Error(`Collection not found for keyword: ${keyword}`);
  return col;
}

app.get('/players', async (req, res) => {
  try {
    const keyword = req.query.collection || 'leaderboard';
    const col = await findCollection(keyword);
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

app.post('/players', async (req, res) => {
  try {
    const keyword = req.query.collection || 'leaderboard';
    const col = await findCollection(keyword);
    const { name, rank, score } = req.body;
    const fieldData = { name, score: score || 0 };
    if (rank) fieldData.rank = rank;
    const result = await webflowFetch(`/collections/${col.id}/items/live`, 'POST', { fieldData });
    res.json(result.data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/players/:collectionId/:itemId', async (req, res) => {
  try {
    const { collectionId, itemId } = req.params;
    const { name, rank, score } = req.body;
    const fieldData = { name, score };
    if (rank) fieldData.rank = rank;
    const result = await webflowFetch(`/collections/${collectionId}/items/${itemId}/live`, 'PATCH', { fieldData });
    res.json(result.data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/players/:collectionId/:itemId', async (req, res) => {
  try {
    const { collectionId, itemId } = req.params;
    await webflowFetch(`/collections/${collectionId}/items/${itemId}/live`, 'DELETE');
    await webflowFetch(`/collections/${collectionId}/items/${itemId}`, 'DELETE');
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
