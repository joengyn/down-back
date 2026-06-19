import { useCallback, useEffect, useRef, useState } from "react";

export interface InputState {
  direction: number; // Num-pad notation: 1-9 (5 is neutral)
  lp: boolean;
  mp: boolean;
  hp: boolean;
  lk: boolean;
  mk: boolean;
  hk: boolean;
  select: boolean;
  start: boolean;
}

export interface InputHistoryItem {
  id: string;
  direction: number;
  buttons: string[];
  frames: number;
  ms: number;
  timestamp: number;
}

export interface ChargeAttempt {
  id: string;
  chargeType: "Back Charge" | "Down Charge";
  chargeFrames: number;
  transitionFrames: number;
  button: string;
  status: "Success" | "Undercharged" | "Slow Release" | "No Button";
  timestamp: number;
}

export interface KeyMap {
  up: string;
  down: string;
  left: string;
  right: string;
  lp: string;
  mp: string;
  hp: string;
  lk: string;
  mk: string;
  hk: string;
  select: string;
  start: string;
}

export const DEFAULT_KEYMAP: KeyMap = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  lp: "KeyU",
  mp: "KeyI",
  hp: "KeyO",
  lk: "KeyJ",
  mk: "KeyK",
  hk: "KeyL",
  select: "Space",
  start: "Enter",
};

// Standard Gamepad default layout index mapping (XInput)
export const DEFAULT_GAMEPAD_MAP = {
  lp: 2, // X / Square
  mp: 3, // Y / Triangle
  hp: 5, // RB / R1
  lk: 0, // A / Cross
  mk: 1, // B / Circle
  hk: 7, // RT / R2
  select: 8, // Back / Share
  start: 9, // Start / Options
};

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function useInput() {
  const [currentInput, setCurrentInput] = useState<InputState>({
    direction: 5,
    lp: false,
    mp: false,
    hp: false,
    lk: false,
    mk: false,
    hk: false,
    select: false,
    start: false,
  });

  const [inputHistory, setInputHistory] = useState<InputHistoryItem[]>([]);
  const [activeGamepad, setActiveGamepad] = useState<string | null>(null);
  const [keyMap, setKeyMap] = useState<KeyMap>(DEFAULT_KEYMAP);

  // Recording combo functionality
  const [isRecording, setIsRecording] = useState(false);
  const [recordedCombo, setRecordedCombo] = useState<InputHistoryItem[]>([]);

  // Refs for tracking keys pressed and loop status
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gamepadIndexRef = useRef<number | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const virtualDirectionRef = useRef<number>(5);

  // High-precision timing refs (60 FPS logic)
  const lastTickTime = useRef<number>(0);
  const lastStateRef = useRef<InputState>({
    direction: 5,
    lp: false,
    mp: false,
    hp: false,
    lk: false,
    mk: false,
    hk: false,
    select: false,
    start: false,
  });

  // Refs for tracking history state to avoid stale closure references
  const currentHistoryRef = useRef<InputHistoryItem[]>([]);
  const recordingBufferRef = useRef<InputHistoryItem[]>([]);
  const recordingActiveRef = useRef<boolean>(false);

  // Sound generation ref (using Web Audio API)
  const audioContextRef = useRef<AudioContext | null>(null);

  const getOrCreateAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!audioContextRef.current) {
      const audioContextConstructor =
        window.AudioContext ??
        (window as WindowWithWebkitAudio).webkitAudioContext;

      if (!audioContextConstructor) {
        return null;
      }

      audioContextRef.current = new audioContextConstructor();
    }

    return audioContextRef.current;
  }, []);

  // Play crisp metronome beep
  const playBeep = useCallback(
    (freq: number = 800, duration: number = 0.05) => {
      try {
        const ctx = getOrCreateAudioContext();
        if (!ctx) {
          return;
        }

        if (ctx.state === "suspended") {
          void ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        // Fast fade out to sound like arcade click
        gainNode.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + duration,
        );

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {
        console.warn("AudioContext failed to trigger beep", e);
      }
    },
    [getOrCreateAudioContext],
  );

  // Play realistic mechanical microswitch click
  const playClick = useCallback(
    (isButton: boolean) => {
      try {
        const ctx = getOrCreateAudioContext();
        if (!ctx) {
          return;
        }

        if (ctx.state === "suspended") {
          void ctx.resume();
        }
        const now = ctx.currentTime;

        // Synthesis values for crisp, high-pitched mechanical key switch clicks
        // Card direction clicks are slightly higher pitch than action button clicks
        const clickPitch1 = isButton ? 2600 : 3100;
        const clickPitch2 = isButton ? 1600 : 2000;

        // Leaf-spring high snap
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(clickPitch1, now);

        // Housing impact resonance
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(clickPitch2, now);

        // High-pass crisp transient envelopes (8ms and 15ms decays)
        gain1.gain.setValueAtTime(0.04, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);

        gain2.gain.setValueAtTime(0.02, now);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.01);
        osc2.start(now);
        osc2.stop(now + 0.02);
      } catch (e) {
        console.warn("AudioContext failed to trigger switch sound", e);
      }
    },
    [getOrCreateAudioContext],
  );

  // Function to process state updates frame by frame
  const processInputState = useCallback(
    (newState: InputState, frameTicks: number) => {
      const prevState = lastStateRef.current;

      // Check if the input state is identical to the previous frame
      const isDirectionSame = prevState.direction === newState.direction;
      const isButtonsSame =
        prevState.lp === newState.lp &&
        prevState.mp === newState.mp &&
        prevState.hp === newState.hp &&
        prevState.lk === newState.lk &&
        prevState.mk === newState.mk &&
        prevState.hk === newState.hk &&
        prevState.select === newState.select &&
        prevState.start === newState.start;

      const stateChanged = !isDirectionSame || !isButtonsSame;

      // Detect button press transitions (used for gap and link timing analysis)
      const buttonTransitions = {
        lp: !prevState.lp && newState.lp,
        mp: !prevState.mp && newState.mp,
        hp: !prevState.hp && newState.hp,
        lk: !prevState.lk && newState.lk,
        mk: !prevState.mk && newState.mk,
        hk: !prevState.hk && newState.hk,
      };

      if (stateChanged) {
        // Gather active buttons list
        const activeBtns: string[] = [];
        if (newState.lp) activeBtns.push("LP");
        if (newState.mp) activeBtns.push("MP");
        if (newState.hp) activeBtns.push("HP");
        if (newState.lk) activeBtns.push("LK");
        if (newState.mk) activeBtns.push("MK");
        if (newState.hk) activeBtns.push("HK");
        if (newState.select) activeBtns.push("SEL");
        if (newState.start) activeBtns.push("ST");

        const newItem: InputHistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          direction: newState.direction,
          buttons: activeBtns,
          frames: frameTicks,
          ms: Math.round(frameTicks * (1000 / 60)),
          timestamp: Date.now(),
        };

        // Play soft arcade feedback click on new button press or direction change
        const hasNewButtonPress =
          Object.values(buttonTransitions).some(Boolean);

        if (hasNewButtonPress) {
          playClick(true);
        } else if (
          prevState.direction !== newState.direction &&
          newState.direction !== 5
        ) {
          playClick(false);
        }
        // Update Input History (keep last 80 items to avoid lagging)
        const updatedHistory = [newItem, ...currentHistoryRef.current].slice(
          0,
          80,
        );
        currentHistoryRef.current = updatedHistory;
        setInputHistory(updatedHistory);

        // If combo recording is active, append to recording buffer
        if (recordingActiveRef.current) {
          recordingBufferRef.current = [...recordingBufferRef.current, newItem];
        }

        setCurrentInput(newState);
      } else {
        // If same state, increment frame duration of the current top item in history
        if (currentHistoryRef.current.length > 0) {
          const updated = [...currentHistoryRef.current];
          updated[0] = {
            ...updated[0],
            frames: updated[0].frames + frameTicks,
            ms: Math.round((updated[0].frames + frameTicks) * (1000 / 60)),
          };
          currentHistoryRef.current = updated;
          setInputHistory(updated);

          // Also update recording buffer top item
          if (
            recordingActiveRef.current &&
            recordingBufferRef.current.length > 0
          ) {
            const recBuf = [...recordingBufferRef.current];
            recBuf[recBuf.length - 1] = {
              ...recBuf[recBuf.length - 1],
              frames: recBuf[recBuf.length - 1].frames + frameTicks,
              ms: Math.round(
                (recBuf[recBuf.length - 1].frames + frameTicks) * (1000 / 60),
              ),
            };
            recordingBufferRef.current = recBuf;
          }
        }
      }

      lastStateRef.current = newState;
    },
    [playClick],
  );

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling when pressing Space or Arrow keys
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      ) {
        e.preventDefault();
      }
      keysPressed.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Gamepad Connection Listeners
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log("Gamepad connected:", e.gamepad.id);
      setActiveGamepad(e.gamepad.id);
      gamepadIndexRef.current = e.gamepad.index;
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log("Gamepad disconnected:", e.gamepad.id);
      if (gamepadIndexRef.current === e.gamepad.index) {
        setActiveGamepad(null);
        gamepadIndexRef.current = null;
      }
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener(
        "gamepaddisconnected",
        handleGamepadDisconnected,
      );
    };
  }, []);

  // 60FPS Input Reader loop
  useEffect(() => {
    const frameInterval = 1000 / 60; // ~16.6667ms per frame

    const pollInputs = (timestamp: number) => {
      if (!lastTickTime.current) {
        lastTickTime.current = timestamp;
      }

      const elapsed = timestamp - lastTickTime.current;

      // Ensure we run the physics frame at a capped 60 FPS regardless of monitor refresh rate
      if (elapsed >= frameInterval) {
        // Calculate the number of 60 FPS frames that have elapsed (typically 1)
        const frameTicks = Math.floor(elapsed / frameInterval);
        lastTickTime.current = timestamp - (elapsed % frameInterval);

        // 1. Gather Keyboard Direction Inputs
        let up =
          keysPressed.current[keyMap.up] || keysPressed.current["ArrowUp"];
        let down =
          keysPressed.current[keyMap.down] || keysPressed.current["ArrowDown"];
        let left =
          keysPressed.current[keyMap.left] || keysPressed.current["ArrowLeft"];
        let right =
          keysPressed.current[keyMap.right] ||
          keysPressed.current["ArrowRight"];

        // 2. Gather Keyboard Button Inputs
        let lp = keysPressed.current[keyMap.lp];
        let mp = keysPressed.current[keyMap.mp];
        let hp = keysPressed.current[keyMap.hp];
        let lk = keysPressed.current[keyMap.lk];
        let mk = keysPressed.current[keyMap.mk];
        let hk = keysPressed.current[keyMap.hk];
        let select = keysPressed.current[keyMap.select];
        let start = keysPressed.current[keyMap.start];

        // 3. Gamepad Polling Override/Addition
        if (gamepadIndexRef.current !== null) {
          const gamepads = navigator.getGamepads();
          const gp = gamepads[gamepadIndexRef.current];
          if (gp) {
            // Read D-pad / Axes
            // Left Stick horizontal: axes[0], vertical: axes[1]
            const axisThreshold = 0.5;
            const stickLeft = gp.axes[0] < -axisThreshold;
            const stickRight = gp.axes[0] > axisThreshold;
            const stickUp = gp.axes[1] < -axisThreshold;
            const stickDown = gp.axes[1] > axisThreshold;

            // D-Pad buttons (mapped standard to buttons 12 (up), 13 (down), 14 (left), 15 (right))
            const dpadUp = gp.buttons[12]?.pressed;
            const dpadDown = gp.buttons[13]?.pressed;
            const dpadLeft = gp.buttons[14]?.pressed;
            const dpadRight = gp.buttons[15]?.pressed;

            left = left || stickLeft || dpadLeft;
            right = right || stickRight || dpadRight;
            up = up || stickUp || dpadUp;
            down = down || stickDown || dpadDown;

            // Action Buttons
            lp = lp || gp.buttons[DEFAULT_GAMEPAD_MAP.lp]?.pressed;
            mp = mp || gp.buttons[DEFAULT_GAMEPAD_MAP.mp]?.pressed;
            hp = hp || gp.buttons[DEFAULT_GAMEPAD_MAP.hp]?.pressed;
            lk = lk || gp.buttons[DEFAULT_GAMEPAD_MAP.lk]?.pressed;
            mk = mk || gp.buttons[DEFAULT_GAMEPAD_MAP.mk]?.pressed;
            hk = hk || gp.buttons[DEFAULT_GAMEPAD_MAP.hk]?.pressed;
            select = select || gp.buttons[DEFAULT_GAMEPAD_MAP.select]?.pressed;
            start = start || gp.buttons[DEFAULT_GAMEPAD_MAP.start]?.pressed;
          }
        }

        // 4. Resolve Num-pad directional notation (1-9)
        // 7 8 9
        // 4 5 6
        // 1 2 3
        let direction = 5; // Neutral
        if (virtualDirectionRef.current !== 5) {
          direction = virtualDirectionRef.current;
        } else {
          if (down && left)
            direction = 1; // Down-Back
          else if (down && right)
            direction = 3; // Down-Forward
          else if (down)
            direction = 2; // Down
          else if (up && left)
            direction = 7; // Up-Back
          else if (up && right)
            direction = 9; // Up-Forward
          else if (up)
            direction = 8; // Up
          else if (left)
            direction = 4; // Back
          else if (right) direction = 6; // Forward
        }

        const newState: InputState = {
          direction,
          lp,
          mp,
          hp,
          lk,
          mk,
          hk,
          select,
          start,
        };

        // 5. Detect and process input state changes
        processInputState(newState, frameTicks);
      }

      animationFrameId.current = requestAnimationFrame(pollInputs);
    };

    animationFrameId.current = requestAnimationFrame(pollInputs);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [keyMap, processInputState]);

  const clearHistory = () => {
    currentHistoryRef.current = [];
    setInputHistory([]);
  };

  const startRecording = () => {
    recordingBufferRef.current = [];
    recordingActiveRef.current = true;
    setIsRecording(true);
    playBeep(1200, 0.15); // Confirmation beep
  };

  const stopRecording = () => {
    recordingActiveRef.current = false;
    setIsRecording(false);
    setRecordedCombo(recordingBufferRef.current);
    playBeep(1000, 0.1); // Confirmation beep
  };

  const clearRecording = () => {
    setRecordedCombo([]);
    recordingBufferRef.current = [];
  };

  const setVirtualDirection = (dir: number) => {
    virtualDirectionRef.current = dir;
  };

  return {
    currentInput,
    inputHistory,
    activeGamepad,
    keyMap,
    setKeyMap,
    clearHistory,
    isRecording,
    recordedCombo,
    startRecording,
    stopRecording,
    clearRecording,
    playBeep,
    setVirtualDirection,
  };
}
