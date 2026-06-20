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
    <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
      {fightstickButtons.map((btn, index) => {
        const active = currentInput[btn];
        const activeClass =
          index < 3
            ? "bg-red-500 border-red-600 text-white"
            : "bg-amber-400 border-amber-500 text-gray-950";
        const translateY =
          index % 3 === 1
            ? "translateY(clamp(-0.6rem, -1.6vw, -0.9rem))"
            : index % 3 === 2
              ? "translateY(clamp(-0.85rem, -2vw, -1.15rem))"
              : undefined;

        return (
          <button
            key={btn}
            type="button"
            aria-label={btn.toUpperCase()}
            onPointerDown={() => onButtonChange(btn, true)}
            onPointerUp={() => onButtonChange(btn, false)}
            onPointerCancel={() => onButtonChange(btn, false)}
            onPointerLeave={() => onButtonChange(btn, false)}
            className={`app-mono flex cursor-pointer items-center justify-center rounded-full border-[3px] text-sm font-bold shadow transition-all touch-none sm:border-4 ${
              active ? activeClass : "border-gray-300 bg-gray-100 text-gray-400"
            }`}
            style={{
              width: "clamp(3rem, 10vw, 4.5rem)",
              height: "clamp(3rem, 10vw, 4.5rem)",
              transform: translateY,
            }}
          >
            <span className="sr-only">{btn.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
