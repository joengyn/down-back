"use client";

import Buttons from "../components/Buttons";
import InputHistory from "../components/InputHistory";
import Joystick from "../components/Joystick";
import { useInput } from "../hooks/useInput";

export default function Home() {
  const { currentInput, inputHistory, setVirtualDirection, setVirtualButton } =
    useInput();

  return (
    <main className="app-sans mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6 md:gap-8 md:px-8 md:py-8">
      <div className="flex w-full justify-center">
        <InputHistory inputHistory={inputHistory} />
      </div>

      <div className="flex w-full items-center justify-start gap-3 rounded-3xl p-2 shadow-sm sm:gap-5 sm:p-4 md:justify-center md:gap-8 md:p-6">
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
