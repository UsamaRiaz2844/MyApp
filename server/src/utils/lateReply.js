const LateReplyStat = require('../models/LateReplyStat');

const GREETING_RE = /^(hi+|hello+|hey+|yo|hiya|sup)[!.\s]*$/i;
const FAREWELL_RE = /^(bye+|goodbye|good\s*bye|bbye|cya|see\s*ya|farewell|gn|good\s*night)[!.\s]*$/i;

function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC calendar day)
}

function isGreeting(text) {
  return GREETING_RE.test(text.trim());
}

function isFarewell(text) {
  return FAREWELL_RE.test(text.trim());
}

// Applies one new message to the day's late-reply session state machine.
// Returns the updated (saved) stat doc plus the delayMs counted for this message, if any.
async function applyMessageToLateReplyStats({ conversationId, senderId, otherUserId, text, sentAt }) {
  const date = todayStr(sentAt);
  let stat = await LateReplyStat.findOne({ conversation: conversationId, date });
  if (!stat) {
    stat = new LateReplyStat({ conversation: conversationId, date, active: false, lateMs: {} });
  }

  const senderKey = senderId.toString();
  let delayMs = null;

  if (!stat.active) {
    if (isGreeting(text)) {
      const already = new Set(stat.greetedBy.map((id) => id.toString()));
      already.add(senderKey);
      stat.greetedBy = Array.from(already).map((id) => id);
      const otherKey = otherUserId.toString();
      if (already.has(otherKey) && already.has(senderKey)) {
        stat.active = true;
        stat.greetedBy = [];
        stat.byedBy = [];
      }
    }
    // messages outside an active session are not counted, but still recorded as normal chat
  } else {
    if (isFarewell(text)) {
      const already = new Set(stat.byedBy.map((id) => id.toString()));
      already.add(senderKey);
      stat.byedBy = Array.from(already).map((id) => id);
      const otherKey = otherUserId.toString();
      if (already.has(otherKey) && already.has(senderKey)) {
        stat.active = false;
        stat.byedBy = [];
        stat.greetedBy = [];
      }
    } else if (stat.lastMessageAt && stat.lastSender && stat.lastSender.toString() === otherUserId.toString()) {
      // this message is a reply to the other user's last message -> count the delay
      delayMs = Math.max(0, sentAt.getTime() - stat.lastMessageAt.getTime());
      const current = stat.lateMs.get(senderKey) || 0;
      stat.lateMs.set(senderKey, current + delayMs);
    }
  }

  stat.lastMessageAt = sentAt;
  stat.lastSender = senderId;
  await stat.save();

  return { stat, delayMs };
}

async function getStatForDate(conversationId, date) {
  return LateReplyStat.findOne({ conversation: conversationId, date });
}

async function getHistory(conversationId, limit = 30) {
  return LateReplyStat.find({ conversation: conversationId }).sort({ date: -1 }).limit(limit);
}

function serializeStat(stat) {
  if (!stat) return null;
  const lateMs = {};
  for (const [key, value] of stat.lateMs.entries()) lateMs[key] = value;
  return {
    conversation: stat.conversation,
    date: stat.date,
    active: stat.active,
    lateMs,
  };
}

module.exports = {
  todayStr,
  isGreeting,
  isFarewell,
  applyMessageToLateReplyStats,
  getStatForDate,
  getHistory,
  serializeStat,
};
