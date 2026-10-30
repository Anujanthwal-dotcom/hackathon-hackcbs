"use client";

import { useCallback, useRef, useState } from "react";

type AudioContextCtor = typeof AudioContext;

function scheduleTone(
  ctx: AudioContext,
  frequency: number,
  at: number,
  duration: number,
  volume: number,
  type: OscillatorType = "triangle",
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.05);
}

export function useChime() {
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const contextRef = useRef<AudioContext | null>(null);
  const lastAlarmRef = useRef(0);

  const ensureContext = useCallback(async () => {
    if (typeof window === "undefined") return null;
    if (!contextRef.current) {
      const legacy = window as unknown as {
        webkitAudioContext?: AudioContextCtor;
      };
      const Ctor = window.AudioContext ?? legacy.webkitAudioContext;
      if (!Ctor) return null;
      contextRef.current = new Ctor();
    }
    if (contextRef.current.state === "suspended") {
      await contextRef.current.resume();
    }
    return contextRef.current;
  }, []);

  const arm = useCallback(async () => {
    const ctx = await ensureContext();
    if (!ctx) return;
    armedRef.current = true;
    setArmed(true);
    const at = ctx.currentTime + 0.02;
    scheduleTone(ctx, 660, at, 0.14, 0.05);
    scheduleTone(ctx, 880, at + 0.17, 0.2, 0.05);
  }, [ensureContext]);

  const playAlarm = useCallback(async () => {
    if (!armedRef.current) return;
    const now = Date.now();
    // Every phone reacts to the same ALERT_VERIFIED broadcast; play one room chime.
    if (now - lastAlarmRef.current < 900) return;
    const ctx = await ensureContext();
    if (!ctx) return;
    lastAlarmRef.current = now;
    const at = ctx.currentTime + 0.02;
    scheduleTone(ctx, 988, at, 0.18, 0.09);
    scheduleTone(ctx, 740, at + 0.22, 0.18, 0.09);
    scheduleTone(ctx, 988, at + 0.5, 0.18, 0.09);
    scheduleTone(ctx, 740, at + 0.72, 0.32, 0.09);
  }, [ensureContext]);

  return { armed, arm, playAlarm };
}
