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
      className="h-5 w-5"
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
    <div className="flex w-12 shrink-0 flex-col items-start text-left">
      <div className="flex w-full flex-col gap-2">
        {inputHistory.length === 0 ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
            <DirectionIcon direction={5} />
          </div>
        ) : (
          inputHistory.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700"
            >
              <DirectionIcon direction={item.direction} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
