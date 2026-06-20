"use client";

import React, { useRef, useState } from "react";

interface JoystickProps {
  onDirectionChange: (direction: number) => void;
  currentDirection: number;
}

export default function Joystick({
  onDirectionChange,
  currentDirection,
}: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragKnobPos, setDragKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const MAX_RADIUS = 64; // Max pixels the knob can move from center
  const DEADZONE = 36; // Pixels from center before register direction

  const getKnobPositionForDirection = (direction: number) => {
    const diagonalOffset = MAX_RADIUS * 0.7071;

    switch (direction) {
      case 1:
        return { x: -diagonalOffset, y: diagonalOffset };
      case 2:
        return { x: 0, y: MAX_RADIUS };
      case 3:
        return { x: diagonalOffset, y: diagonalOffset };
      case 4:
        return { x: -MAX_RADIUS, y: 0 };
      case 6:
        return { x: MAX_RADIUS, y: 0 };
      case 7:
        return { x: -diagonalOffset, y: -diagonalOffset };
      case 8:
        return { x: 0, y: -MAX_RADIUS };
      case 9:
        return { x: diagonalOffset, y: -diagonalOffset };
      default:
        return { x: 0, y: 0 };
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateJoystickPosition(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateJoystickPosition(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragKnobPos({ x: 0, y: 0 });
    onDirectionChange(5); // Neutral
  };

  const updateJoystickPosition = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let direction = 5;

    if (distance >= DEADZONE) {
      const angleRad = Math.atan2(-dy, dx);
      let angleDeg = angleRad * (180 / Math.PI);
      if (angleDeg < 0) {
        angleDeg += 360;
      }

      if (angleDeg >= 337.5 || angleDeg < 22.5) {
        direction = 6;
      } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
        direction = 9;
      } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
        direction = 8;
      } else if (angleDeg >= 112.5 && angleDeg < 157.5) {
        direction = 7;
      } else if (angleDeg >= 157.5 && angleDeg < 202.5) {
        direction = 4;
      } else if (angleDeg >= 202.5 && angleDeg < 247.5) {
        direction = 1;
      } else if (angleDeg >= 247.5 && angleDeg < 292.5) {
        direction = 2;
      } else if (angleDeg >= 292.5 && angleDeg < 337.5) {
        direction = 3;
      }
    }

    setDragKnobPos(getKnobPositionForDirection(direction));
    onDirectionChange(direction);
  };

  const knobPos = isDragging
    ? dragKnobPos
    : getKnobPositionForDirection(currentDirection);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex h-64 w-64 items-center justify-center cursor-pointer select-none touch-none bg-transparent sm:h-72 sm:w-72"
      >
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 192 192"
        >
          <polygon
            points="96,36 138.43,53.57 156,96 138.43,138.43 96,156 53.57,138.43 36,96 53.57,53.57"
            fill="none"
            className="stroke-gray-300 stroke-2"
          />
        </svg>

        <div
          className="absolute rounded-full border border-gray-300 pointer-events-none"
          style={{ width: `${DEADZONE * 2}px`, height: `${DEADZONE * 2}px` }}
        />

        <div
          className={`absolute h-20 w-20 rounded-full border-4 border-black bg-white select-none pointer-events-none transition-transform shadow-md sm:h-24 sm:w-24 ${
            isDragging ? "scale-105 shadow-lg" : ""
          }`}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        />
      </div>
    </div>
  );
}
