const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { applyMessageToLateReplyStats, getStatForDate, todayStr, serializeStat } = require('../utils/lateReply');

function userRoom(userId) {
  return `user:${userId}`;
}

async function getConversationPartnerIds(userId) {
  const conversations = await Conversation.find({ participants: userId }).select('participants');
  const ids = new Set();
  for (const c of conversations) {
    for (const p of c.participants) {
      const id = p.toString();
      if (id !== userId) ids.add(id);
    }
  }
  return Array.from(ids);
}

function initSockets(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing auth token'));
      const payload = verifyToken(token);
      socket.userId = payload.sub;
      socket.username = payload.username;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    socket.join(userRoom(userId));

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

    const partnerIds = await getConversationPartnerIds(userId);
    for (const pid of partnerIds) {
      io.to(userRoom(pid)).emit('presence:update', { userId, isOnline: true, lastSeen: null });
    }

    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(conversationId).emit('typing', { conversationId, userId, isTyping: !!isTyping });
    });

    socket.on('conversation:join', async (conversationId) => {
      if (!conversationId) return;
      const conversation = await Conversation.findById(conversationId).select('participants');
      if (conversation && conversation.participants.some((p) => p.toString() === userId)) {
        socket.join(conversationId);
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      if (conversationId) socket.leave(conversationId);
    });

    socket.on('message:send', async ({ conversationId, text }, ack) => {
      try {
        text = String(text || '').trim();
        if (!text || !conversationId) return ack?.({ error: 'Invalid message' });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.some((p) => p.toString() === userId)) {
          return ack?.({ error: 'Conversation not found' });
        }

        const otherUserId = conversation.participants.find((p) => p.toString() !== userId);
        const now = new Date();

        const { delayMs } = await applyMessageToLateReplyStats({
          conversationId: conversation._id,
          senderId: userId,
          otherUserId,
          text,
          sentAt: now,
        });

        const message = await Message.create({
          conversation: conversation._id,
          sender: userId,
          receiver: otherUserId,
          text,
          delayMs,
          createdAt: now,
        });

        conversation.lastMessage = { text, sender: userId, createdAt: now };
        await conversation.save();

        const payload = {
          id: message._id,
          conversation: conversation._id,
          sender: userId,
          receiver: otherUserId,
          text,
          createdAt: message.createdAt,
          seenAt: null,
          delayMs,
        };

        io.to(userRoom(userId)).to(userRoom(otherUserId.toString())).emit('message:new', payload);
        ack?.({ message: payload });

        const stat = await getStatForDate(conversation._id, todayStr(now));
        io.to(userRoom(userId))
          .to(userRoom(otherUserId.toString()))
          .emit('late-stats:update', serializeStat(stat));
      } catch (err) {
        console.error('message:send error', err);
        ack?.({ error: 'Failed to send message' });
      }
    });

    socket.on('message:seen', async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.some((p) => p.toString() === userId)) return;

        const now = new Date();
        const result = await Message.updateMany(
          { conversation: conversationId, receiver: userId, seenAt: null },
          { $set: { seenAt: now } }
        );

        if (result.modifiedCount > 0) {
          const otherUserId = conversation.participants.find((p) => p.toString() !== userId);
          io.to(userRoom(otherUserId.toString())).emit('message:seen', {
            conversationId,
            seenBy: userId,
            seenAt: now,
          });
        }
      } catch (err) {
        console.error('message:seen error', err);
      }
    });

    socket.on('disconnect', async () => {
      const remainingSockets = await io.in(userRoom(userId)).fetchSockets();
      if (remainingSockets.length === 0) {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        const ids = await getConversationPartnerIds(userId);
        for (const pid of ids) {
          io.to(userRoom(pid)).emit('presence:update', { userId, isOnline: false, lastSeen });
        }
      }
    });
  });
}

module.exports = initSockets;
