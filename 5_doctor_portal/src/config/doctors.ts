export type DoctorAccent = "cyan" | "violet" | "amber" | "emerald";

export interface Doctor {
  id: string;
  name: string;
  role: string;
  initials: string;
  device: string;
  accent: DoctorAccent;
}

export interface AccentColor {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  glow: string;
  accentColor: string;
}

export const ACCENT_COLORS: Record<DoctorAccent, AccentColor> = {
  cyan: {
    badgeBg: "rgba(56, 189, 248, 0.12)",
    badgeBorder: "rgba(56, 189, 248, 0.4)",
    badgeText: "#38bdf8",
    glow: "#0284c7",
    accentColor: "#38bdf8",
  },
  violet: {
    badgeBg: "rgba(168, 85, 247, 0.12)",
    badgeBorder: "rgba(168, 85, 247, 0.4)",
    badgeText: "#c084fc",
    glow: "#9333ea",
    accentColor: "#a855f7",
  },
  amber: {
    badgeBg: "rgba(245, 158, 11, 0.12)",
    badgeBorder: "rgba(245, 158, 11, 0.4)",
    badgeText: "#fbbf24",
    glow: "#d97706",
    accentColor: "#f59e0b",
  },
  emerald: {
    badgeBg: "rgba(16, 185, 129, 0.12)",
    badgeBorder: "rgba(16, 185, 129, 0.4)",
    badgeText: "#34d399",
    glow: "#059669",
    accentColor: "#10b981",
  },
};

export const DOCTORS: Doctor[] = [
  {
    id: "doc_chen",
    name: "Dr. Sarah Chen",
    role: "Attending · Trauma & Acute Care",
    initials: "SC",
    device: "ON-CALL DEVICE 01 · WARD 4B",
    accent: "cyan",
  },
  {
    id: "doc_okafor",
    name: "Dr. James Okafor",
    role: "Critical Care Fellow",
    initials: "JO",
    device: "ON-CALL DEVICE 02 · WARD 4B",
    accent: "violet",
  },
  {
    id: "doc_nair",
    name: "Dr. Priya Nair",
    role: "Acute Surgical Resident",
    initials: "PN",
    device: "ON-CALL DEVICE 03 · WARD 4B",
    accent: "amber",
  },
  {
    id: "doc_brandt",
    name: "Dr. Elias Brandt",
    role: "Anaesthesia & Airway Lead",
    initials: "EB",
    device: "ON-CALL DEVICE 04 · WARD 4B",
    accent: "emerald",
  },
];
