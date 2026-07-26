// Conversation-starter packs for the Fun hub. Pure content — a random line gets
// dropped into the composer so you can send / edit it.

export interface Pack {
  id: string;
  label: string;
  icon: string;
  lines: string[];
}

export const PACKS: Pack[] = [
  {
    id: 'wyr',
    label: 'Would You Rather',
    icon: '🤔',
    lines: [
      '🤔 Would you rather never use your phone again or never watch TV again?',
      '🤔 Would you rather be able to fly or be invisible?',
      '🤔 Would you rather always be 10 minutes late or 20 minutes early?',
      '🤔 Would you rather have unlimited food or unlimited wifi?',
      '🤔 Would you rather fight one horse-sized duck or 100 duck-sized horses?',
      '🤔 Would you rather never eat pizza again or never eat biryani again?',
      '🤔 Would you rather read minds or predict the future?',
      '🤔 Would you rather live without music or without movies?',
      '🤔 Would you rather be famous or be rich but unknown?',
      '🤔 Would you rather time travel to the past or the future?',
      '🤔 Would you rather have no phone for a week or no AC for a month?',
      '🤔 Would you rather always tell the truth or always have to lie?',
    ],
  },
  {
    id: 'tot',
    label: 'This or That',
    icon: '⚔️',
    lines: [
      '⚔️ Pizza 🍕 or Burger 🍔?',
      '⚔️ Tea ☕ or Coffee 🥤?',
      '⚔️ Beach 🏖️ or Mountains ⛰️?',
      '⚔️ Netflix 📺 or YouTube ▶️?',
      '⚔️ Call 📞 or Text 💬?',
      '⚔️ Morning person 🌅 or Night owl 🌙?',
      '⚔️ Sweet 🍫 or Spicy 🌶️?',
      '⚔️ iPhone 🍎 or Android 🤖?',
      '⚔️ Cats 🐱 or Dogs 🐶?',
      '⚔️ Summer ☀️ or Winter ❄️?',
      '⚔️ Cricket 🏏 or Football ⚽?',
      '⚔️ Window seat 🪟 or Aisle seat 🚶?',
    ],
  },
  {
    id: 'truth',
    label: 'Truth',
    icon: '😯',
    lines: [
      '😯 Truth: What’s the most embarrassing thing you did this week?',
      '😯 Truth: What’s a secret you’ve never told me?',
      '😯 Truth: Who was your first crush?',
      '😯 Truth: What’s the last lie you told?',
      '😯 Truth: What’s your most-used app (be honest)?',
      '😯 Truth: What’s something you’re weirdly proud of?',
      '😯 Truth: What’s the pettiest reason you’ve been mad at someone?',
      '😯 Truth: If you could undo one thing from last year, what?',
      '😯 Truth: What’s your guilty-pleasure song?',
      '😯 Truth: What’s the biggest risk you’ve ever taken?',
    ],
  },
  {
    id: 'dare',
    label: 'Dare',
    icon: '😈',
    lines: [
      '😈 Dare: Send a voice note singing your favorite song.',
      '😈 Dare: Text the 5th person in your chats “I knew it 👀”.',
      '😈 Dare: Send the last photo in your camera roll.',
      '😈 Dare: Do your best impression of me (voice note).',
      '😈 Dare: Change your profile pic to whatever I choose for a day.',
      '😈 Dare: Send a screenshot of your screen time.',
      '😈 Dare: Talk in only emojis for the next 3 messages.',
      '😈 Dare: Post a story with a dumb caption I give you.',
      '😈 Dare: Send a selfie right now, no filter.',
      '😈 Dare: Call me and say one weird sentence, then hang up.',
    ],
  },
  {
    id: 'roast',
    label: 'Roast',
    icon: '🔥',
    lines: [
      '🔥 You reply to messages like they’re a yearly subscription.',
      '🔥 Your fashion sense called — it wants a refund.',
      '🔥 You’re the human version of a “buffering” icon.',
      '🔥 You’re proof that autocorrect can only do so much.',
      '🔥 If overthinking was a sport, you’d still find a way to lose.',
      '🔥 You bring everyone so much joy… when you leave the chat.',
      '🔥 Your playlist is a war crime.',
      '🔥 You’re not lazy, you’re just on energy-saving mode 24/7.',
      '🔥 You’ve got the confidence of someone way more prepared.',
      '🔥 You’re the reason the group has a “think before you type” rule.',
    ],
  },
  {
    id: 'compliment',
    label: 'Compliment',
    icon: '💛',
    lines: [
      '💛 You’re genuinely one of the funniest people I know.',
      '💛 Talking to you is the easiest part of my day.',
      '💛 You’re way smarter than you give yourself credit for.',
      '💛 You have great taste — in memes and in friends 😌.',
      '💛 You always know how to make a boring day better.',
      '💛 You’re the friend everyone secretly wants.',
      '💛 Your energy is honestly contagious.',
      '💛 You’re reliable in a way most people aren’t.',
      '💛 You give really good advice, even when I don’t ask.',
      '💛 The world’s just a bit more fun with you in it.',
    ],
  },
];

export function randomLine(pack: Pack, avoid?: string): string {
  if (pack.lines.length === 1) return pack.lines[0];
  let line = pack.lines[Math.floor(Math.random() * pack.lines.length)];
  let guard = 0;
  while (line === avoid && guard++ < 8) line = pack.lines[Math.floor(Math.random() * pack.lines.length)];
  return line;
}
