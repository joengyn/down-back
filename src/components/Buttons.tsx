import type { InputState, VirtualButton } from "../hooks/useInput";

interface ButtonsProps {
  currentInput: InputState;
  onButtonChange: (button: VirtualButton, isPressed: boolean) => void;
}

const fightstickButtons: VirtualButton[] = ["lp", "mp", "hp", "lk", "mk", "hk"];

export default function Buttons({
  currentInput,
  onButtonChange,
}: ButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {fightstickButtons.map((btn, index) => {
        const active = currentInput[btn];
        const activeClass =
          index < 3
            ? "bg-red-500 border-red-600 text-white"
            : "bg-amber-400 border-amber-500 text-gray-950";
        const columnOffsetClass =
          index % 3 === 1
            ? "-translate-y-3"
            : index % 3 === 2
              ? "-translate-y-4"
              : "";

        return (
          <button
            key={btn}
            type="button"
            aria-label={btn.toUpperCase()}
            onPointerDown={() => onButtonChange(btn, true)}
            onPointerUp={() => onButtonChange(btn, false)}
            onPointerCancel={() => onButtonChange(btn, false)}
            onPointerLeave={() => onButtonChange(btn, false)}
            className={`app-mono flex h-18 w-18 cursor-pointer items-center justify-center rounded-full border-4 text-sm font-bold shadow transition-all touch-none ${columnOffsetClass} ${
              active
                ? activeClass
                : "border-gray-300 bg-gray-100 text-gray-400"
            }`}
          >
            <span className="sr-only">{btn.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
