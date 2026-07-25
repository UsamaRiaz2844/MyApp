const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { requireAuth } = require('../middleware/auth');
const { todayStr, getStatForDate, getHistory, serializeStat } = require('../utils/lateReply');

const router = express.Router();

async function assertParticipant(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return null;
  if (!conversation.participants.some((p) => p.toString() === userId)) return null;
  return conversation;
}

function serializeMessage(m) {
  return {
    id: m._id,
    conversation: m.conversation,
    sender: m.sender,
    receiver: m.receiver,
    text: m.text,
    createdAt: m.createdAt,
    seenAt: m.seenAt,
    delayMs: m.delayMs,
  };
}

// Message history for a conversation (paginated, oldest-first per page, newest page first).
router.get('/:conversationId', requireAuth, async (req, res) => {
  const { conversationId } = req.params;
  const conversation = await assertParticipant(conversationId, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const before = req.query.before ? new Date(req.query.before) : null;

  const query = { conversation: conversationId };
  if (before) query.createdAt = { $lt: before };

  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit);

  res.json({ messages: messages.reverse().map(serializeMessage) });
});

// Mark all messages sent TO me in this conversation as seen (REST fallback; socket does this live).
router.post('/:conversationId/seen', requireAuth, async (req, res) => {
  const { conversationId } = req.params;
  const conversation = await assertParticipant(conversationId, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const now = new Date();
  await Message.updateMany(
    { conversation: conversationId, receiver: req.userId, seenAt: null },
    { $set: { seenAt: now } }
  );

  res.json({ ok: true, seenAt: now });
});

router.get('/:conversationId/late-stats', requireAuth, async (req, res) => {
  const { conversationId } = req.params;
  const conversation = await assertParticipant(conversationId, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const date = req.query.date ? String(req.query.date) : todayStr();
  const stat = await getStatForDate(conversationId, date);
  res.json({ stat: serializeStat(stat) || { conversation: conversationId, date, active: false, lateMs: {} } });
});

router.get('/:conversationId/late-stats/history', requireAuth, async (req, res) => {
  const { conversationId } = req.params;
  const conversation = await assertParticipant(conversationId, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const stats = await getHistory(conversationId, 30);
  res.json({ stats: stats.map(serializeStat) });
});

module.exports = router;
