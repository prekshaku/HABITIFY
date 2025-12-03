// server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./db');
const authRequired = require('./authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- helpers ----------
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Default habits (same as your front-end HABITS)
const DEFAULT_HABITS = [
  { key:'exercise', title:'30 min Exercise', emoji:'🏃' },
  { key:'sleep', title:'7–8 hrs Sleep', emoji:'😴' },
  { key:'water', title:'Drink 2L Water', emoji:'💧' },
  { key:'walk', title:'Walk / Transport', emoji:'🚶' },
  { key:'meal', title:'Healthy Meal', emoji:'🥗' },
  { key:'meditate', title:'5-min Meditation', emoji:'🧘' },
  { key:'screen', title:'Limit Screen Time', emoji:'📵' },
  { key:'study', title:'Study / Learn 30m', emoji:'📚' },
  { key:'nojunk', title:'Avoid Junk Food', emoji:'🚫' },
  { key:'reusable', title:'Use Reusable Bottle/Bag', emoji:'🔁' },
  { key:'segregate', title:'Segregate Waste', emoji:'🗑️' },
  { key:'savepower', title:'Save Electricity', emoji:'💡' },
  { key:'noPlastic', title:'Avoid Plastic Bag', emoji:'🛍️' },
  { key:'compost', title:'Compost / Reduce Waste', emoji:'🌿' },
];

// ---------- AUTH ----------

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hash = await bcrypt.hash(password, 10);
    const userRes = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email',
      [name, email, hash]
    );
    const user = userRes.rows[0];

    // init points row
    await db.query('INSERT INTO points (user_id, total) VALUES ($1, 0)', [user.id]);

    // insert default habits
    const habitValues = [];
    const placeholders = [];
    DEFAULT_HABITS.forEach((h, i) => {
      habitValues.push(user.id, h.key, h.title, h.emoji);
      const base = i * 4;
      placeholders.push(`($${base+1}, $${base+2}, $${base+3}, $${base+4})`);
    });
    await db.query(
      `INSERT INTO habits (user_id, key, title, emoji) VALUES ${placeholders.join(',')}`,
      habitValues
    );

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error('signup error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Current user
app.get('/api/auth/me', authRequired, async (req, res) => {
  res.json({ user: req.user });
});

// ---------- HABITS & CHECKINS ----------

// Get habits
app.get('/api/habits', authRequired, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, key, title, emoji FROM habits WHERE user_id = $1 ORDER BY id',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('get habits error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save daily checkins and score, award points & badges
app.post('/api/checkins', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, checks, score } = req.body || {};
    if (!date || typeof score !== 'number' || !checks) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // upsert checkin
    await db.query(
      `INSERT INTO checkins (user_id, date, checks_json, score)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, date)
       DO UPDATE SET checks_json = $3, score = $4`,
      [userId, date, checks, score]
    );

    // points: similar to your formula — 10 points per habit at 100%
    let delta = Math.round(score); // simple: 0–100
    const ptsRes = await db.query('UPDATE points SET total = total + $1 WHERE user_id = $2 RETURNING total', [delta, userId]);
    const totalPoints = ptsRes.rows[0].total;

    // simple badges: Perfect Day (score 100), Consistent (7 days >= 60)
    const badgesUnlocked = [];

    if (score === 100) {
      const existing = await db.query(
        'SELECT id FROM badges WHERE user_id = $1 AND name = $2',
        [userId, 'Perfect Day']
      );
      if (!existing.rows.length) {
        await db.query('INSERT INTO badges (user_id, name) VALUES ($1,$2)', [userId, 'Perfect Day']);
        badgesUnlocked.push('Perfect Day');
      }
    }

    const streakRes = await db.query(
      `SELECT date, score FROM checkins
       WHERE user_id = $1 AND date <= $2
       ORDER BY date DESC LIMIT 7`,
      [userId, date]
    );
    if (streakRes.rows.length === 7 && streakRes.rows.every(r => r.score >= 60)) {
      const existing = await db.query(
        'SELECT id FROM badges WHERE user_id = $1 AND name = $2',
        [userId, '1-Week Consistency']
      );
      if (!existing.rows.length) {
        await db.query('INSERT INTO badges (user_id, name) VALUES ($1,$2)', [userId, '1-Week Consistency']);
        badgesUnlocked.push('1-Week Consistency');
      }
    }

    res.json({ ok: true, totalPoints, badgesUnlocked });
  } catch (err) {
    console.error('checkins error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Weekly scores (last 7 days, for chart)
app.get('/api/checkins/weekly', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT date, score FROM checkins
       WHERE user_id = $1
         AND date >= (CURRENT_DATE - INTERVAL '6 days')
       ORDER BY date`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('weekly error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Points + badges
app.get('/api/profile', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const ptsRes = await db.query('SELECT total FROM points WHERE user_id = $1', [userId]);
    const total = ptsRes.rows.length ? ptsRes.rows[0].total : 0;

    const badgesRes = await db.query(
      'SELECT name, unlocked_at FROM badges WHERE user_id = $1 ORDER BY unlocked_at',
      [userId]
    );
    res.json({ points: total, badges: badgesRes.rows });
  } catch (err) {
    console.error('profile error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- TODOS ----------

app.get('/api/todos', authRequired, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, text, done, due_date, priority, created_at FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('get todos error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/todos', authRequired, async (req, res) => {
  try {
    const { text, dueDate, priority } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Text required' });
    const result = await db.query(
      `INSERT INTO todos (user_id, text, due_date, priority)
       VALUES ($1,$2,$3,$4)
       RETURNING id, text, done, due_date, priority, created_at`,
      [req.user.id, text, dueDate || null, priority || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('create todo error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/todos/:id', authRequired, async (req, res) => {
  try {
    const id = req.params.id;
    const { text, done, dueDate, priority } = req.body || {};
    const result = await db.query(
      `UPDATE todos
       SET text = COALESCE($1, text),
           done = COALESCE($2, done),
           due_date = COALESCE($3, due_date),
           priority = COALESCE($4, priority)
       WHERE id = $5 AND user_id = $6
       RETURNING id, text, done, due_date, priority, created_at`,
      [text || null, typeof done === 'boolean' ? done : null, dueDate || null, priority ?? null, id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('update todo error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/todos/:id', authRequired, async (req, res) => {
  try {
    await db.query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete todo error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- start ----------
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
