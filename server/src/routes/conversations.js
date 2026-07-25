const express = require('express');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { todayStr, getStatForDate, serializeStat } = require('../utils/lateReply');

const router = express.Router();

// List all conversations for the current user, with the other participant's info,
// last message preview, and unread count.
router.get('/', requireAuth, async (req, res) => {
  const meId = new mongoose.Types.ObjectId(req.userId);

  const conversations = await Conversation.find({ participants: meId })
    .sort({ 'lastMessage.createdAt': -1, updatedAt: -1 })
    .populate('participants', 'username displayName avatarColor isOnline lastSeen');

  const results = await Promise.all(
    conversations.map(async (c) => {
      const other = c.participants.find((p) => p._id.toString() !== req.userId);
      const unreadCount = await Message.countDocuments({
        conversation: c._id,
        receiver: meId,
        seenAt: null,
      });
      const today = todayStr();
      const stat = await getStatForDate(c._id, today);
      return {
        id: c._id,
        otherUser: other
          ? {
              id: other._id,
              username: other.username,
              displayName: other.displayName,
              avatarColor: other.avatarColor,
              isOnline: other.isOnline,
              lastSeen: other.lastSeen,
            }
          : null,
        lastMessage: c.lastMessage,
        unreadCount,
        todayLateStats: serializeStat(stat),
      };
    })
  );

  res.json({ conversations: results });
});

// Get or create a 1:1 conversation with another user (by username).
router.post('/', requireAuth, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });

  const other = await User.findOne({ username: String(username).trim().toLowerCase() });
  if (!other) return res.status(404).json({ error: 'User not found' });
  if (other._id.toString() === req.userId) {
    return res.status(400).json({ error: "You can't start a conversation with yourself" });
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [req.userId, other._id], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({ participants: [req.userId, other._id] });
  }

  res.json({
    conversation: {
      id: conversation._id,
      otherUser: {
        id: other._id,
        username: other.username,
        displayName: other.displayName,
        avatarColor: other.avatarColor,
        isOnline: other.isOnline,
        lastSeen: other.lastSeen,
      },
    },
  });
});

module.exports = router;
