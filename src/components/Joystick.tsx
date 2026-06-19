"use client";

import React, { useRef, useState, useEffect } from "react";

interface JoystickProps {
  onDirectionChange: (direction: number) => void;
  activeDirection: number;
  useArrows?: boolean;
}

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

export default function Joystick({
  onDirectionChange,
  activeDirection,
  useArrows = false,
}: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const MAX_RADIUS = 60; // Max pixels the knob can move from center
  const DEADZONE = 26; // Pixels from center before register direction

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateJoystickPosition(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateJoystickPosition(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onDirectionChange(5); // Neutral
  };

  const updateJoystickPosition = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    // Get center of joystick container
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Displacement
    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    // Determine direction and snappy visual target coordinate
    let direction = 5;
    let targetX = 0;
    let targetY = 0;

    if (distance >= DEADZONE) {
      // Calculate angle in degrees: 0 is Right, 90 is Up, 180 is Left, 270 is Down
      // Note: dy is inverted because y goes down in standard screen space
      let angleRad = Math.atan2(-dy, dx);
      let angleDeg = angleRad * (180 / Math.PI);
      if (angleDeg < 0) {
        angleDeg += 360;
      }

      // Snappy restrictor gate corner positions (sin/cos of 45 deg is ~0.7071)
      const cos45 = 0.7071;
      const sin45 = 0.7071;

      if (angleDeg >= 337.5 || angleDeg < 22.5) {
        direction = 6; // Right / Forward
        targetX = MAX_RADIUS;
        targetY = 0;
      } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
        direction = 9; // Up-Right / Up-Forward
        targetX = MAX_RADIUS * cos45;
        targetY = -MAX_RADIUS * sin45;
      } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
        direction = 8; // Up
        targetX = 0;
        targetY = -MAX_RADIUS;
      } else if (angleDeg >= 112.5 && angleDeg < 157.5) {
        direction = 7; // Up-Left / Up-Back
        targetX = -MAX_RADIUS * cos45;
        targetY = -MAX_RADIUS * sin45;
      } else if (angleDeg >= 157.5 && angleDeg < 202.5) {
        direction = 4; // Left / Back
        targetX = -MAX_RADIUS;
        targetY = 0;
      } else if (angleDeg >= 202.5 && angleDeg < 247.5) {
        direction = 1; // Down-Left / Down-Back (Down-Back!)
        targetX = -MAX_RADIUS * cos45;
        targetY = MAX_RADIUS * sin45;
      } else if (angleDeg >= 247.5 && angleDeg < 292.5) {
        direction = 2; // Down
        targetX = 0;
        targetY = MAX_RADIUS;
      } else if (angleDeg >= 292.5 && angleDeg < 337.5) {
        direction = 3; // Down-Right / Down-Forward
        targetX = MAX_RADIUS * cos45;
        targetY = MAX_RADIUS * sin45;
      }
    }

    setKnobPos({ x: targetX, y: targetY });
    onDirectionChange(direction);
  };

  // Helper to check if a specific direction is highlighted
  const getDirectionClass = (dir: number) => {
    return activeDirection === dir
      ? "bg-blue-600 text-white font-bold"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200";
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 3x3 Visual Grid Representing Numpad Notation */}
      <div className="grid grid-cols-3 gap-1 w-36 h-36">
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((dir) => (
          <div
            key={dir}
            className={`flex items-center justify-center text-sm rounded border transition-colors ${getDirectionClass(
              dir,
            )}`}
          >
            {useArrows ? arrowMap[dir] : dir}
          </div>
        ))}
      </div>

      {/* The Joystick Drag Controller Area */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-48 h-48 relative flex items-center justify-center cursor-pointer select-none touch-none bg-transparent"
      >
        {/* Octagonal restrictor gate guides */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 192 192"
        >
          <polygon
            points="96,36 138.43,53.57 156,96 138.43,138.43 96,156 53.57,138.43 36,96 53.57,53.57"
            fill="none"
            className="stroke-gray-300 stroke-2"
            strokeDasharray="4 2"
          />
          {/* Guide lines to notches */}
          <line
            x1="96"
            y1="36"
            x2="96"
            y2="156"
            className="stroke-gray-200 stroke-1"
            strokeDasharray="2 2"
          />
          <line
            x1="36"
            y1="96"
            x2="156"
            y2="96"
            className="stroke-gray-200 stroke-1"
            strokeDasharray="2 2"
          />
          <line
            x1="53.57"
            y1="53.57"
            x2="138.43"
            y2="138.43"
            className="stroke-gray-200 stroke-1"
            strokeDasharray="2 2"
          />
          <line
            x1="53.57"
            y1="138.43"
            x2="138.43"
            y2="53.57"
            className="stroke-gray-200 stroke-1"
            strokeDasharray="2 2"
          />
        </svg>

        {/* Center Deadzone Area Overlay */}
        <div
          className="absolute rounded-full border border-dashed border-gray-300 pointer-events-none bg-gray-50/10"
          style={{ width: `${DEADZONE * 2}px`, height: `${DEADZONE * 2}px` }}
        />

        {/* The Joystick Knob */}
        <div
          className={`w-16 h-16 rounded-full absolute border-4 border-black bg-white select-none pointer-events-none transition-transform shadow-md ${
            isDragging ? "scale-105 shadow-lg" : ""
          }`}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        />
      </div>

      <div className="text-center text-xs text-gray-500">
        <p>Drag knob to input directions</p>
        <p className="mt-1">
          Active:{" "}
          {useArrows
            ? arrowMap[activeDirection] || "•"
            : activeDirection === 5
              ? "Neutral (5)"
              : `Direction ${activeDirection}`}
        </p>
      </div>
    </div>
  );
}
