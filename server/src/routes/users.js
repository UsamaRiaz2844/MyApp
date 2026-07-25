const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/search', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ users: [] });

  const users = await User.find({
    username: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    _id: { $ne: req.userId },
  })
    .select('username displayName avatarColor isOnline lastSeen')
    .limit(20);

  res.json({ users });
});

module.exports = router;
