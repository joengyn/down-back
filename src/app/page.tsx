"use client";

import Buttons from "../components/Buttons";
import InputHistory from "../components/InputHistory";
import Joystick from "../components/Joystick";
import { useInput } from "../hooks/useInput";

export default function Home() {
  const { currentInput, inputHistory, setVirtualDirection, setVirtualButton } =
    useInput();

  return (
    <main className="app-sans mx-auto flex min-h-screen max-w-7xl items-center justify-between gap-6 overflow-x-auto p-4 sm:gap-8 sm:p-6 md:gap-12 md:p-8">
      <InputHistory inputHistory={inputHistory} />

      <div className="flex shrink-0 items-center gap-4 rounded-3xl p-4 shadow-sm sm:gap-6 sm:p-6 md:gap-8">
        <Joystick
          onDirectionChange={setVirtualDirection}
          currentDirection={currentInput.direction}
        />
        <Buttons
          currentInput={currentInput}
          onButtonChange={setVirtualButton}
        />
      </div>
    </main>
  );
}
