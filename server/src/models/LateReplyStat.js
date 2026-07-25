const mongoose = require('mongoose');

// One document per conversation per calendar day (server-local date, YYYY-MM-DD).
// Tracks the "hi/hi ... bye/bye" late-reply session described in the product spec:
//   - a session starts once BOTH participants have sent a greeting ("hi"/"hello"/"hey")
//   - while active, every reply's delay (time since the other user's last message)
//     is added to that sender's lateMs total for the day
//   - a session ends once BOTH participants have sent a farewell ("bye"/"bye bye"/"goodbye")
//   - a new session can start again later the same day (hi/hi again), stats keep accumulating
const lateReplyStatSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    active: { type: Boolean, default: false },
    greetedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    byedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessageAt: { type: Date, default: null },
    lastSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // lateMs is a Map keyed by userId (string) -> accumulated milliseconds of reply delay
    lateMs: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

lateReplyStatSchema.index({ conversation: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('LateReplyStat', lateReplyStatSchema);
