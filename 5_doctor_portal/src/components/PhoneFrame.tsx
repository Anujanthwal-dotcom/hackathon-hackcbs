"use client";

import { BatteryFull, Signal, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import type { DoctorAccent } from "@/lib/doctors";
import { ACCENT_STYLES } from "@/lib/doctors";

interface PhoneFrameProps {
  children: ReactNode;
  accent?: DoctorAccent;
  caption?: string;
}

export function PhoneFrame({
  children,
  accent = "cyan",
  caption,
}: PhoneFrameProps) {
  return (
    <div className="flex w-full flex-col items-center">
      <div
        className={`relative mx-auto w-full max-w-[342px] ${ACCENT_STYLES[accent].glow}`}
      >
        {/* physical side buttons */}
        <div className="absolute -left-[3px] top-[122px] h-16 w-[3px] rounded-l-md bg-[#2a3142]" />
        <div className="absolute -left-[3px] top-[198px] h-10 w-[3px] rounded-l-md bg-[#2a3142]" />
        <div className="absolute -right-[3px] top-[168px] h-20 w-[3px] rounded-r-md bg-[#2a3142]" />

        <div className="relative overflow-hidden rounded-[3rem] border border-ink/10 bg-[#10141c] p-[9px] shadow-2xl">
          <div className="relative flex h-[700px] flex-col overflow-hidden rounded-[2.45rem] bg-canvas ring-1 ring-black/40">
            {/* dynamic island */}
            <div className="absolute left-1/2 top-2.5 z-30 flex h-[26px] w-[112px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-3 shadow-inner">
              <div className="h-2 w-2 rounded-full bg-[#0d1626] ring-1 ring-white/10" />
            </div>

            {/* status bar */}
            <div className="relative z-20 flex items-center justify-between px-6 pb-1 pt-3">
              <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-ink-muted">
                CURA HEALTH
              </span>
              <div className="flex items-center gap-1.5 text-ink-muted">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <BatteryFull className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>

            {/* home indicator */}
            <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-ink/20" />
          </div>
        </div>
      </div>

      {caption && (
        <p className="mt-3 text-center font-mono text-[10px] tracking-[0.16em] text-ink-subtle">
          {caption}
        </p>
      )}
    </div>
  );
}
