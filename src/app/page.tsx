"use client";

import { useState } from "react";
import { useInput } from "../hooks/useInput";
import Joystick from "../components/Joystick";

const arrowMap: { [key: number]: string } = {
  1: "↙", // Down-Back
  2: "↓", // Down
  3: "↘", // Down-Forward
  4: "←", // Back/Left
  5: "•", // Neutral
  6: "→", // Forward/Right
  7: "↖", // Up-Back
  8: "↑", // Up
  9: "↗", // Up-Forward
};

export default function Home() {
  const {
    currentInput,
    inputHistory,
    activeGamepad,
    isRecording,
    recordedCombo,
    startRecording,
    stopRecording,
    clearRecording,
    clearHistory,
    setVirtualDirection,
  } = useInput();

  const [useArrows, setUseArrows] = useState(false);
  const getDirLabel = (dir: number) =>
    useArrows ? arrowMap[dir] || "•" : dir.toString();

  return (
    <main className="p-8 font-sans max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Down-Back Input Skeleton</h1>
        <label className="flex items-center gap-2 cursor-pointer select-none bg-gray-100 px-3 py-1.5 rounded border border-gray-200">
          <input
            type="checkbox"
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
            checked={useArrows}
            onChange={(e) => setUseArrows(e.target.checked)}
          />
          <span className="text-sm font-semibold text-gray-700">
            Use Arrow Notation
          </span>
        </label>
      </div>

      <div className="mb-6 p-4 border rounded bg-zinc-900 text-white">
        <h2 className="text-xl font-semibold mb-2">Gamepad Status</h2>
        <p>
          {activeGamepad
            ? `Connected: ${activeGamepad}`
            : "No Gamepad detected. (Press a button on controller or use WASD + JKL/UIO)"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Live State */}
        <div className="p-4 border rounded flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Real-time Inputs</h2>

            <div className="mb-4">
              <span className="font-bold">
                Direction ({useArrows ? "Arrow Notation" : "Numpad Notation"}):
              </span>
              <span className="ml-2 text-2xl px-3 py-1 bg-blue-100 rounded text-blue-800 font-mono">
                {getDirLabel(currentInput.direction)}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                (Neutral = {getDirLabel(5)}, Down-Back = {getDirLabel(1)})
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="font-bold mr-2 self-center">Buttons:</span>
              {["lp", "mp", "hp", "lk", "mk", "hk"].map((btn) => {
                const active = currentInput[btn as keyof typeof currentInput];
                return (
                  <span
                    key={btn}
                    className={`px-3 py-1 rounded font-mono text-sm border ${
                      active
                        ? "bg-green-500 text-white border-green-600"
                        : "bg-gray-100 text-gray-400 border-gray-200"
                    }`}
                  >
                    {btn.toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Interactive Joystick Section */}
          <div className="border-t pt-4 flex flex-col items-center">
            <h3 className="font-semibold mb-4 self-start">
              Interactive Virtual Joystick
            </h3>
            <Joystick
              onDirectionChange={setVirtualDirection}
              activeDirection={currentInput.direction}
              useArrows={useArrows}
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Combo Recording Control</h3>
            <div className="flex gap-2 mb-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Stop Recording
                </button>
              )}
              <button
                onClick={clearRecording}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Clear Recording
              </button>
            </div>
            {recordedCombo.length > 0 && (
              <div className="mt-2 text-sm">
                <span className="font-semibold">Recorded State Sequence:</span>
                <div className="bg-gray-50 p-2 rounded mt-1 font-mono max-h-40 overflow-y-auto">
                  {recordedCombo.map((item, idx) => (
                    <div key={idx}>
                      Dir: {getDirLabel(item.direction)} | Buttons: [
                      {item.buttons.join(", ")}] | Frames: {item.frames}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: History & Gaps */}
        <div className="p-4 border rounded">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Input History</h2>
            <button
              onClick={clearHistory}
              className="text-sm text-red-600 hover:underline"
            >
              Clear History
            </button>
          </div>

          <div className="bg-gray-50 p-3 rounded font-mono h-60 overflow-y-auto mb-4 border">
            {inputHistory.length === 0 ? (
              <span className="text-gray-400">Waiting for inputs...</span>
            ) : (
              inputHistory.map((item, idx) => (
                <div
                  key={item.id}
                  className="border-b py-1 last:border-0 flex justify-between"
                >
                  <span>
                    Dir:{" "}
                    <strong className="text-blue-600">
                      {getDirLabel(item.direction)}
                    </strong>{" "}
                    {item.buttons.length > 0 &&
                      `+ [${item.buttons.join(", ")}]`}
                  </span>
                  {idx === 0 ? (
                    <span className="text-blue-500 animate-pulse italic text-xs self-center">
                      Active
                    </span>
                  ) : (
                    <span className="text-gray-500">{item.frames}f</span>
                  )}
                </div>
              ))
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">
              Timing / Gap Analyzer (Real-time)
            </h3>
            <div className="bg-gray-50 p-3 rounded font-mono h-40 overflow-y-auto border text-sm"></div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-xs text-gray-500 border-t pt-4">
        <p className="font-semibold mb-1">Keyboard Mappings (Default):</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong>Directions:</strong> W (Up), A (Left), S (Down), D (Right)
            or Arrow Keys
          </li>
          <li>
            <strong>Punches:</strong> U (LP), I (MP), O (HP)
          </li>
          <li>
            <strong>Kicks:</strong> J (LK), K (MK), L (HK)
          </li>
        </ul>
      </div>
    </main>
  );
}
