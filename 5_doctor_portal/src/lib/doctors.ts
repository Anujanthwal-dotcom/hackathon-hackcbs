/**
 * Synthetic on-call physician roster for the doctor device simulator.
 *
 * These identities are demo-only and intentionally free of PHI. The central hub
 * accepts any doctor_id/doctor_name pair, so adding a persona here is enough to
 * add a live device to the claim race.
 */

export type DoctorAccent = "cyan" | "violet" | "amber" | "emerald";

export interface Doctor {
  id: string;
  name: string;
  role: string;
  initials: string;
  device: string;
  accent: DoctorAccent;
}

export interface AccentStyle {
  avatar: string;
  text: string;
  ring: string;
  dot: string;
  glow: string;
}

export const ACCENT_STYLES: Record<DoctorAccent, AccentStyle> = {
  cyan: {
    avatar: "border-info/30 bg-info/10 text-info",
    text: "text-info",
    ring: "border-info/60 shadow-card",
    dot: "bg-info",
    glow: "shadow-[0_12px_40px_-18px_rgba(56,130,246,0.45)]",
  },
  violet: {
    avatar: "border-brand/30 bg-brand-soft text-brand",
    text: "text-brand",
    ring: "border-brand/50 shadow-card",
    dot: "bg-brand",
    glow: "shadow-[0_12px_40px_-18px_rgba(15,82,87,0.4)]",
  },
  amber: {
    avatar: "border-warning/30 bg-warning-soft text-warning-ink",
    text: "text-warning-ink",
    ring: "border-warning/50 shadow-card",
    dot: "bg-warning",
    glow: "shadow-[0_12px_40px_-18px_rgba(245,158,11,0.45)]",
  },
  emerald: {
    avatar: "border-success/30 bg-success-soft text-success-ink",
    text: "text-success-ink",
    ring: "border-success/50 shadow-card",
    dot: "bg-success",
    glow: "shadow-[0_12px_40px_-18px_rgba(16,185,129,0.45)]",
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
