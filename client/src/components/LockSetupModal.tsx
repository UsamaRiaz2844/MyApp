import { useLock } from '../context/LockContext';
import PinPad from './PinPad';

// Set or remove the app PIN. Opened from the profile menu.
export default function LockSetupModal({ onClose }: { onClose: () => void }) {
  const { enabled, setPin, disable } = useLock();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs animate-pop-in rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#15161d]"
      >
        {enabled ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 text-3xl">🔒</div>
            <h2 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">App lock is on</h2>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
              Pronto asks for your PIN when reopened.
            </p>
            <button
              onClick={() => {
                disable();
                onClose();
              }}
              className="w-full rounded-xl bg-red-50 py-3 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400"
            >
              Turn off app lock
            </button>
            <button onClick={onClose} className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              Close
            </button>
          </div>
        ) : (
          <PinPad
            title="Set a 4-digit PIN"
            subtitle="You'll enter this to open Pronto"
            onSubmit={async (pin) => {
              await setPin(pin);
              onClose();
            }}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}
