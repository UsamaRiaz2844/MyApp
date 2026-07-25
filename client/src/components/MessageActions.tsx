import { REACTION_EMOJIS } from '../lib/themes';

interface Props {
  isMine: boolean;
  currentReaction?: string;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

// Bottom action sheet shown when a message is long-pressed.
export default function MessageActions({ isMine, currentReaction, onReact, onDelete, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom w-full max-w-md animate-pop-in rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />

        <div className="mb-2 flex items-center justify-around">
          {REACTION_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => onReact(e)}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl transition active:scale-90 ${
                currentReaction === e ? 'bg-brand-100 dark:bg-brand-500/20' : 'hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {isMine && (
          <button
            onClick={onDelete}
            className="mt-2 w-full rounded-xl bg-red-50 py-3 text-sm font-semibold text-red-600 transition active:scale-[0.99] dark:bg-red-500/10 dark:text-red-400"
          >
            🗑 Delete message
          </button>
        )}
        <button
          onClick={onClose}
          className="mt-2 w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
