import type { InputHistoryItem } from "../hooks/useInput";

interface InputHistoryProps {
  inputHistory: InputHistoryItem[];
}

const directionRotationMap: Record<number, number | null> = {
  1: 225,
  2: 180,
  3: 135,
  4: 270,
  5: null,
  6: 90,
  7: 315,
  8: 0,
  9: 45,
};

function DirectionIcon({ direction }: { direction: number }) {
  if (direction === 5) {
    return <span className="block h-2.5 w-2.5 rounded-full bg-current" />;
  }

  const rotation = directionRotationMap[direction] ?? 0;

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6"
      aria-hidden="true"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path
        d="M12 4V19M7 9l5-5 5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function InputHistory({ inputHistory }: InputHistoryProps) {
  return (
    <div className="flex w-full justify-center text-left">
      <div className="flex flex-row gap-1.5 sm:gap-2 md:gap-3">
        {inputHistory.length === 0 ? (
          <div
            className="flex shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400"
            style={{
              width: "clamp(2rem, 6vw, 2.75rem)",
              height: "clamp(2rem, 6vw, 2.75rem)",
            }}
          >
            <DirectionIcon direction={5} />
          </div>
        ) : (
          inputHistory.slice(0, 3).map((item, index) => (
            <div
              key={item.id}
              className={`flex shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 ${
                index === 0 ? "opacity-100" : "opacity-45"
              }`}
              style={{
                width: "clamp(2rem, 6vw, 2.75rem)",
                height: "clamp(2rem, 6vw, 2.75rem)",
              }}
            >
              <DirectionIcon direction={item.direction} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
