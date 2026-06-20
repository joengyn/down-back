import { useCallback, useEffect, useRef, useState } from "react";

export interface InputState {
  direction: number;
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

export type VirtualButton =
  | "lp"
  | "mp"
  | "hp"
  | "lk"
  | "mk"
  | "hk"
  | "select"
  | "start";

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

export const DEFAULT_GAMEPAD_MAP = {
  lp: 2,
  mp: 3,
  hp: 5,
  lk: 0,
  mk: 1,
  hk: 7,
  select: 8,
  start: 9,
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordedCombo, setRecordedCombo] = useState<InputHistoryItem[]>([]);

  const keysPressed = useRef<Record<string, boolean>>({});
  const gamepadIndexRef = useRef<number | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const virtualDirectionRef = useRef<number>(5);
  const virtualButtonsRef = useRef<Record<VirtualButton, boolean>>({
    lp: false,
    mp: false,
    hp: false,
    lk: false,
    mk: false,
    hk: false,
    select: false,
    start: false,
  });

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

  const currentHistoryRef = useRef<InputHistoryItem[]>([]);
  const recordingBufferRef = useRef<InputHistoryItem[]>([]);
  const recordingActiveRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getOrCreateAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!audioContextRef.current) {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as WindowWithWebkitAudio).webkitAudioContext;

      if (!AudioContextConstructor) {
        return null;
      }

      audioContextRef.current = new AudioContextConstructor();
    }

    return audioContextRef.current;
  }, []);

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

        const clickPitch1 = isButton ? 2600 : 3100;
        const clickPitch2 = isButton ? 1600 : 2000;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(clickPitch1, now);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(clickPitch2, now);

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

  const processInputState = useCallback(
    (newState: InputState, frameTicks: number) => {
      const prevState = lastStateRef.current;

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

      const buttonTransitions = {
        lp: !prevState.lp && newState.lp,
        mp: !prevState.mp && newState.mp,
        hp: !prevState.hp && newState.hp,
        lk: !prevState.lk && newState.lk,
        mk: !prevState.mk && newState.mk,
        hk: !prevState.hk && newState.hk,
      };

      if (stateChanged) {
        const activeButtons: string[] = [];
        if (newState.lp) activeButtons.push("LP");
        if (newState.mp) activeButtons.push("MP");
        if (newState.hp) activeButtons.push("HP");
        if (newState.lk) activeButtons.push("LK");
        if (newState.mk) activeButtons.push("MK");
        if (newState.hk) activeButtons.push("HK");
        if (newState.select) activeButtons.push("SEL");
        if (newState.start) activeButtons.push("ST");

        const newItem: InputHistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          direction: newState.direction,
          buttons: activeButtons,
          frames: frameTicks,
          ms: Math.round(frameTicks * (1000 / 60)),
          timestamp: Date.now(),
        };

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

        const updatedHistory = [newItem, ...currentHistoryRef.current].slice(
          0,
          80,
        );
        currentHistoryRef.current = updatedHistory;
        setInputHistory(updatedHistory);

        if (recordingActiveRef.current) {
          recordingBufferRef.current = [...recordingBufferRef.current, newItem];
        }

        setCurrentInput(newState);
      } else if (currentHistoryRef.current.length > 0) {
        const updated = [...currentHistoryRef.current];
        updated[0] = {
          ...updated[0],
          frames: updated[0].frames + frameTicks,
          ms: Math.round((updated[0].frames + frameTicks) * (1000 / 60)),
        };
        currentHistoryRef.current = updated;
        setInputHistory(updated);

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

      lastStateRef.current = newState;
    },
    [playClick],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

    const handleGamepadConnected = (e: GamepadEvent) => {
      setActiveGamepad(e.gamepad.id);
      gamepadIndexRef.current = e.gamepad.index;
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
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

  useEffect(() => {
    const frameInterval = 1000 / 60;

    const pollInputs = (timestamp: number) => {
      if (!lastTickTime.current) {
        lastTickTime.current = timestamp;
      }

      const elapsed = timestamp - lastTickTime.current;

      if (elapsed >= frameInterval) {
        const frameTicks = Math.floor(elapsed / frameInterval);
        lastTickTime.current = timestamp - (elapsed % frameInterval);

        let up = keysPressed.current[keyMap.up] || keysPressed.current.ArrowUp;
        let down =
          keysPressed.current[keyMap.down] || keysPressed.current.ArrowDown;
        let left =
          keysPressed.current[keyMap.left] || keysPressed.current.ArrowLeft;
        let right =
          keysPressed.current[keyMap.right] || keysPressed.current.ArrowRight;

        let lp = keysPressed.current[keyMap.lp] || virtualButtonsRef.current.lp;
        let mp = keysPressed.current[keyMap.mp] || virtualButtonsRef.current.mp;
        let hp = keysPressed.current[keyMap.hp] || virtualButtonsRef.current.hp;
        let lk = keysPressed.current[keyMap.lk] || virtualButtonsRef.current.lk;
        let mk = keysPressed.current[keyMap.mk] || virtualButtonsRef.current.mk;
        let hk = keysPressed.current[keyMap.hk] || virtualButtonsRef.current.hk;
        let select =
          keysPressed.current[keyMap.select] ||
          virtualButtonsRef.current.select;
        let start =
          keysPressed.current[keyMap.start] || virtualButtonsRef.current.start;

        if (gamepadIndexRef.current !== null) {
          const gamepads = navigator.getGamepads();
          const gp = gamepads[gamepadIndexRef.current];
          if (gp) {
            const axisThreshold = 0.5;
            const stickLeft = gp.axes[0] < -axisThreshold;
            const stickRight = gp.axes[0] > axisThreshold;
            const stickUp = gp.axes[1] < -axisThreshold;
            const stickDown = gp.axes[1] > axisThreshold;

            const dpadUp = gp.buttons[12]?.pressed;
            const dpadDown = gp.buttons[13]?.pressed;
            const dpadLeft = gp.buttons[14]?.pressed;
            const dpadRight = gp.buttons[15]?.pressed;

            left = left || stickLeft || dpadLeft;
            right = right || stickRight || dpadRight;
            up = up || stickUp || dpadUp;
            down = down || stickDown || dpadDown;

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

        let direction = 5;
        if (virtualDirectionRef.current !== 5) {
          direction = virtualDirectionRef.current;
        } else if (down && left) {
          direction = 1;
        } else if (down && right) {
          direction = 3;
        } else if (down) {
          direction = 2;
        } else if (up && left) {
          direction = 7;
        } else if (up && right) {
          direction = 9;
        } else if (up) {
          direction = 8;
        } else if (left) {
          direction = 4;
        } else if (right) {
          direction = 6;
        }

        processInputState(
          {
            direction,
            lp,
            mp,
            hp,
            lk,
            mk,
            hk,
            select,
            start,
          },
          frameTicks,
        );
      }

      animationFrameId.current = requestAnimationFrame(pollInputs);
    };

    animationFrameId.current = requestAnimationFrame(pollInputs);

    return () => {
      if (animationFrameId.current !== null) {
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
    playBeep(1200, 0.15);
  };

  const stopRecording = () => {
    recordingActiveRef.current = false;
    setIsRecording(false);
    setRecordedCombo(recordingBufferRef.current);
    playBeep(1000, 0.1);
  };

  const clearRecording = () => {
    setRecordedCombo([]);
    recordingBufferRef.current = [];
  };

  const setVirtualDirection = (dir: number) => {
    virtualDirectionRef.current = dir;
  };

  const setVirtualButton = (button: VirtualButton, isPressed: boolean) => {
    virtualButtonsRef.current[button] = isPressed;
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
    setVirtualButton,
  };
}
