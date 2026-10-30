from __future__ import annotations

import tkinter as tk
from tkinter import ttk
from typing import Any, Callable

from .simulator import Simulator

BG = "#1e1e2e"
PANEL = "#181825"
CARD = "#242438"
CARD_ALT = "#2a2a40"
BORDER = "#3b3b55"
TEXT = "#cdd6f4"
MUTED = "#a6adc8"
ACCENT = "#89b4fa"
GREEN = "#a6e3a1"
AMBER = "#f9e2af"
RED = "#f38ba8"
CYAN = "#89dceb"

SANS = "DejaVu Sans"
MONO = "DejaVu Sans Mono"

FONT_TITLE = (SANS, 18, "bold")
FONT_PORT_TAG = (MONO, 10, "bold")
FONT_SUBTITLE = (MONO, 10)
FONT_BED_TAG = (MONO, 10, "bold")
FONT_STATUS_BADGE = (MONO, 8, "bold")
FONT_PATIENT_NAME = (SANS, 14, "bold")
FONT_PATIENT_CONTEXT = (SANS, 9)
FONT_METRIC_LABEL = (MONO, 8)
FONT_METRIC_VALUE = (MONO, 19, "bold")
FONT_RISK_LABEL = (MONO, 8, "bold")
FONT_BUTTON = (SANS, 10, "bold")
FONT_BUTTON_HINT = (MONO, 9)
FONT_LOG_HEADER = (MONO, 10, "bold")
FONT_LOG_STATUS = (MONO, 9)
FONT_LOG_TEXT = (MONO, 10)
FONT_FOOTER = (SANS, 9)

VITALS = [
    ("heart_rate", "HR", "bpm"),
    ("systolic_bp", "SYS", "mmHg"),
    ("diastolic_bp", "DIA", "mmHg"),
    ("respiratory_rate", "RR", "/min"),
    ("spo2", "SpO2", "%"),
    ("temp_c", "TEMP", "C"),
]


class GeneratorGUI:
    def __init__(
        self,
        root: tk.Tk,
        simulator: Simulator,
        on_close: Callable[[], None],
    ) -> None:
        self.root = root
        self.simulator = simulator
        self.on_close = on_close
        self.last_seq = 0
        self.vital_labels: dict[str, dict[str, tk.Label]] = {}
        self.status_labels: dict[str, tk.Label] = {}
        self.risk_canvases: dict[str, tk.Canvas] = {}
        self.risk_fills: dict[str, int] = {}
        self.last_tx: tk.Label
        self._build()
        self.root.protocol("WM_DELETE_WINDOW", self._close)
        self.refresh()

    # ------------------------------------------------------------------
    def _build(self) -> None:
        self.root.title("Cura Health | Bedside Telemetry Generator")
        self.root.configure(bg=BG)
        self.root.geometry("925x860+20+60")
        self.root.minsize(860, 780)

        outer = tk.Frame(self.root, bg=BG, padx=18, pady=14)
        outer.pack(fill="both", expand=True)

        header = tk.Frame(outer, bg=BG)
        header.pack(fill="x")
        tk.Label(
            header,
            text="CURA HEALTH  /  BEDSIDE TELEMETRY",
            bg=BG,
            fg=TEXT,
            font=FONT_TITLE,
        ).pack(side="left")
        tk.Label(
            header,
            text="PORT 8002   TX -> :8001",
            bg=BG,
            fg=ACCENT,
            font=FONT_PORT_TAG,
        ).pack(side="right")

        tk.Label(
            outer,
            text="SYNTHETIC MONITOR ARRAY   |   Ward 4B   |   3 occupied beds   |   1.5s packet interval",
            bg=BG,
            fg=MUTED,
            font=FONT_SUBTITLE,
        ).pack(anchor="w", pady=(2, 12))

        cards = tk.Frame(outer, bg=BG)
        cards.pack(fill="x")
        for idx in range(len(self.simulator.beds)):
            cards.grid_columnconfigure(idx, weight=1, uniform="card")
        for idx, (bed_id, bed) in enumerate(self.simulator.beds.items()):
            self._build_card(cards, idx, bed_id, bed.profile.patient_name, bed.profile.patient_context)

        controls = tk.Frame(outer, bg=BG, pady=12)
        controls.pack(fill="x")
        self._button(
            controls,
            "Trigger Artifact (Room 101)",
            AMBER,
            lambda: self.simulator.request("artifact"),
        ).pack(side="left", padx=(0, 8))
        self._button(
            controls,
            "Accelerate Shock (Room 101)",
            RED,
            lambda: self.simulator.request("shock"),
        ).pack(side="left", padx=(0, 8))
        self._button(
            controls,
            "Reset Baselines",
            CYAN,
            lambda: self.simulator.request("reset"),
        ).pack(side="left")
        tk.Label(
            controls,
            text="manual demo controls",
            bg=BG,
            fg=MUTED,
            font=FONT_BUTTON_HINT,
        ).pack(side="right")

        log_header = tk.Frame(outer, bg=BG)
        log_header.pack(fill="x", pady=(2, 4))
        tk.Label(
            log_header,
            text="OUTBOUND PACKET LOG",
            bg=BG,
            fg=TEXT,
            font=FONT_LOG_HEADER,
        ).pack(side="left")
        self.last_tx = tk.Label(
            log_header,
            text="waiting for uplink...",
            bg=BG,
            fg=MUTED,
            font=FONT_LOG_STATUS,
        )
        self.last_tx.pack(side="right")

        log_frame = tk.Frame(outer, bg=PANEL, highlightbackground=BORDER, highlightthickness=1)
        log_frame.pack(fill="both", expand=True)
        scrollbar = ttk.Scrollbar(log_frame, orient="vertical")
        scrollbar.pack(side="right", fill="y")
        self.log = tk.Text(
            log_frame,
            bg=PANEL,
            fg=TEXT,
            insertbackground=TEXT,
            font=FONT_LOG_TEXT,
            relief="flat",
            padx=10,
            pady=8,
            height=10,
            wrap="none",
            yscrollcommand=scrollbar.set,
        )
        self.log.pack(fill="both", expand=True)
        scrollbar.config(command=self.log.yview)
        self.log.tag_configure("ok", foreground=GREEN)
        self.log.tag_configure("err", foreground=RED)
        self.log.tag_configure("muted", foreground=MUTED)
        self.log.configure(state="disabled")

        footer = tk.Frame(outer, bg=BG)
        footer.pack(fill="x", pady=(8, 0))
        tk.Label(
            footer,
            text="The bedside layer streams raw vitals only. Clinical scoring and artifact suppression happen in the in-room edge agent.",
            bg=BG,
            fg=MUTED,
            font=FONT_FOOTER,
        ).pack(side="left")

    def _build_card(
        self, parent: tk.Frame, col: int, bed_id: str, name: str, context: str
    ) -> None:
        card = tk.Frame(
            parent,
            bg=CARD,
            highlightbackground=BORDER,
            highlightthickness=1,
            padx=12,
            pady=10,
        )
        card.grid(row=0, column=col, sticky="nsew", padx=(0 if col == 0 else 5, 0 if col == 2 else 5))

        top = tk.Frame(card, bg=CARD)
        top.pack(fill="x")
        tk.Label(top, text=bed_id.upper(), bg=CARD, fg=ACCENT, font=FONT_BED_TAG).pack(side="left")
        status = tk.Label(
            top,
            text="BASELINE",
            bg=CARD_ALT,
            fg=GREEN,
            font=FONT_STATUS_BADGE,
            padx=6,
            pady=2,
        )
        status.pack(side="right")
        self.status_labels[bed_id] = status

        tk.Label(card, text=name, bg=CARD, fg=TEXT, font=FONT_PATIENT_NAME).pack(anchor="w", pady=(5, 0))
        tk.Label(
            card,
            text=context,
            bg=CARD,
            fg=MUTED,
            font=FONT_PATIENT_CONTEXT,
            wraplength=260,
            justify="left",
        ).pack(anchor="w", pady=(1, 8))

        grid = tk.Frame(card, bg=CARD)
        grid.pack(fill="x")
        for i in range(3):
            grid.grid_columnconfigure(i, weight=1)
        self.vital_labels[bed_id] = {}
        for index, (key, label, unit) in enumerate(VITALS):
            r, c = divmod(index, 3)
            cell = tk.Frame(grid, bg=CARD)
            cell.grid(row=r, column=c, sticky="w", pady=(0, 6))
            tk.Label(cell, text=f"{label} ({unit})", bg=CARD, fg=MUTED, font=FONT_METRIC_LABEL).pack(anchor="w")
            value = tk.Label(cell, text="--", bg=CARD, fg=TEXT, font=FONT_METRIC_VALUE)
            value.pack(anchor="w")
            self.vital_labels[bed_id][key] = value

        bottom = tk.Frame(card, bg=CARD)
        bottom.pack(fill="x", pady=(3, 0))
        tk.Label(bottom, text="RISK", bg=CARD, fg=MUTED, font=FONT_RISK_LABEL).pack(side="left")
        canvas = tk.Canvas(bottom, height=6, bg=CARD_ALT, highlightthickness=0)
        canvas.pack(side="left", fill="x", expand=True, padx=(6, 0))
        self.risk_canvases[bed_id] = canvas

    @staticmethod
    def _button(parent: tk.Frame, text: str, accent: str, command: Callable[[], None]) -> tk.Button:
        return tk.Button(
            parent,
            text=text,
            command=command,
            bg=CARD_ALT,
            fg=accent,
            activebackground=BORDER,
            activeforeground=TEXT,
            relief="flat",
            bd=0,
            padx=14,
            pady=8,
            font=FONT_BUTTON,
            cursor="hand2",
            highlightbackground=accent,
            highlightthickness=1,
        )

    # ------------------------------------------------------------------
    def _refresh_risk(self, bed_id: str, value: float, color: str) -> None:
        canvas = self.risk_canvases[bed_id]
        canvas.update_idletasks()
        width = max(canvas.winfo_width(), 20)
        ratio = max(0.02, min(1.0, value))
        wanted = int(width * ratio)
        if self.risk_fills.get(bed_id) == wanted:
            return
        self.risk_fills[bed_id] = wanted
        canvas.delete("all")
        canvas.create_rectangle(0, 0, wanted, 7, fill=color, outline="")

    def refresh(self) -> None:
        snapshot: dict[str, Any] = self.simulator.snapshot()
        beds = snapshot["beds"]
        for bed_id, data in beds.items():
            values = data["vitals"]
            for key, _label, _unit in VITALS:
                label = self.vital_labels[bed_id][key]
                value = values[key]
                if key == "temp_c":
                    label.config(text=f"{value:.1f}")
                else:
                    label.config(text=f"{int(round(value))}")
                label.config(fg=RED if self._abnormal(key, value) else TEXT)

            status = data["status"]
            status_label = self.status_labels[bed_id]
            if status == "SENSOR ARTIFACT":
                status_label.config(text=status, fg=AMBER)
                color = AMBER
                risk = 0.85
            elif status in {"CRITICAL TREND", "DETERIORATING"}:
                status_label.config(text=status, fg=RED)
                color = RED
                risk = data["shock_progress"]
            elif status == "DRIFTING":
                status_label.config(text=status, fg=AMBER)
                color = AMBER
                risk = data["shock_progress"]
            else:
                status_label.config(text=status, fg=GREEN)
                color = GREEN
                risk = 0.06
            self._refresh_risk(bed_id, risk, color)

        for entry in snapshot["tx_log"]:
            if entry["seq"] <= self.last_seq:
                continue
            self.last_seq = entry["seq"]
            self.log.configure(state="normal")
            self.log.insert("end", f"{entry['ts']}  {entry['text']}\n", "ok" if entry["ok"] else "err")
            self.log.see("end")
            self.log.configure(state="disabled")
            self.last_tx.config(
                text=f"sent {snapshot['uplink']['sent']} | failed {snapshot['uplink']['failed']}",
                fg=GREEN if entry["ok"] else RED,
            )

        self.root.after(250, self.refresh)

    @staticmethod
    def _abnormal(key: str, value: float) -> bool:
        thresholds = {
            "heart_rate": (60, 100),
            "systolic_bp": (100, 150),
            "diastolic_bp": (60, 95),
            "respiratory_rate": (12, 20),
            "spo2": (95, 100),
            "temp_c": (36.1, 38.0),
        }
        low, high = thresholds[key]
        return value < low or value > high

    def _close(self) -> None:
        self.on_close()


def launch_gui(simulator: Simulator, on_close: Callable[[], None]) -> None:
    root = tk.Tk()
    GeneratorGUI(root, simulator, lambda: (on_close(), root.destroy()))
    root.mainloop()
