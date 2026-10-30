from __future__ import annotations

import tkinter as tk
from tkinter import ttk
from typing import Any, Callable

from .server import EdgeRuntime

BG = "#181825"
PANEL = "#11111b"
CARD = "#1e1e2e"
CARD_ALT = "#29293d"
BORDER = "#3b3b55"
TEXT = "#cdd6f4"
MUTED = "#a6adc8"
ACCENT = "#89b4fa"
GREEN = "#a6e3a1"
AMBER = "#f9e2af"
RED = "#f38ba8"
CYAN = "#89dceb"
MAUVE = "#cba6f7"

SANS = "DejaVu Sans"
MONO = "DejaVu Sans Mono"

FONT_TITLE = (SANS, 18, "bold")
FONT_PORT_TAG = (MONO, 10, "bold")
FONT_SUBTITLE = (MONO, 10)
FONT_TILE_LABEL = (MONO, 8, "bold")
FONT_TILE_VALUE = (MONO, 12, "bold")
FONT_CARD_BED = (MONO, 10, "bold")
FONT_CARD_STATUS = (MONO, 8, "bold")
FONT_PATIENT_NAME = (SANS, 13, "bold")
FONT_VITALS = (MONO, 9)
FONT_NEWS2_LABEL = (MONO, 8, "bold")
FONT_NEWS2_VALUE = (MONO, 20, "bold")
FONT_CARD_FILTER = (MONO, 8)
FONT_SBAR_HEADER = (MONO, 10, "bold")
FONT_SBAR_META = (MONO, 9)
FONT_SBAR_BADGE = (MONO, 10, "bold")
FONT_SBAR_SECTION = (MONO, 8, "bold")
FONT_SBAR_BODY = (SANS, 10)
FONT_LOG_HEADER = (MONO, 9, "bold")
FONT_LOG_SUB = (SANS, 8)
FONT_LOG_TEXT = (MONO, 9)
FONT_UPLINK_TITLE = (MONO, 9, "bold")
FONT_UPLINK_URL = (MONO, 8)
FONT_UPLINK_STATE = (MONO, 11, "bold")
FONT_UPLINK_DETAIL = (MONO, 8)

SBAR_SECTIONS = [
    ("situation", "S", "SITUATION", RED),
    ("background", "B", "BACKGROUND", CYAN),
    ("assessment", "A", "ASSESSMENT", AMBER),
    ("recommendation", "R", "RECOMMENDATION", GREEN),
]


class EdgeGUI:
    def __init__(
        self,
        root: tk.Tk,
        runtime: EdgeRuntime,
        on_close: Callable[[], None],
    ) -> None:
        self.root = root
        self.runtime = runtime
        self.on_close = on_close
        self.last_log_seq = 0
        self.bed_widgets: dict[str, dict[str, Any]] = {}
        self.sbar_labels: dict[str, tk.Label] = {}
        self._build()
        self.root.protocol("WM_DELETE_WINDOW", self._close)
        self.refresh()

    # ------------------------------------------------------------------
    def _build(self) -> None:
        self.root.title("Cura Health | In-Room Edge Agent")
        self.root.configure(bg=BG)
        self.root.geometry("925x860+965+60")
        self.root.minsize(860, 780)

        outer = tk.Frame(self.root, bg=BG, padx=18, pady=14)
        outer.pack(fill="both", expand=True)

        header = tk.Frame(outer, bg=BG)
        header.pack(fill="x")
        tk.Label(
            header,
            text="CURA HEALTH  /  IN-ROOM EDGE AGENT",
            bg=BG,
            fg=TEXT,
            font=FONT_TITLE,
        ).pack(side="left")
        tk.Label(
            header,
            text="PORT 8001   UPLINK -> :8000",
            bg=BG,
            fg=MAUVE,
            font=FONT_PORT_TAG,
        ).pack(side="right")
        tk.Label(
            outer,
            text="Deterministic NEWS2 scoring  |  local artifact suppression  |  agentic SBAR synthesis",
            bg=BG,
            fg=MUTED,
            font=FONT_SUBTITLE,
        ).pack(anchor="w", pady=(2, 10))

        status_row = tk.Frame(outer, bg=BG)
        status_row.pack(fill="x")
        self.ingestion_value = self._status_tile(status_row, "INGESTION", "WAITING", AMBER)
        self.filter_value = self._status_tile(status_row, "FILTER MODE", "PASS", GREEN)
        self.llm_value = self._status_tile(status_row, "SBAR ENGINE", "LOCAL FALLBACK", ACCENT)

        cards = tk.Frame(outer, bg=BG, pady=10)
        cards.pack(fill="x")
        for idx in range(len(self.runtime.state.beds)):
            cards.grid_columnconfigure(idx, weight=1, uniform="bed")
        for idx, (bed_id, bed) in enumerate(self.runtime.state.beds.items()):
            self._build_bed_card(cards, idx, bed_id, bed.patient_name)

        self._build_sbar(outer)
        self._build_bottom(outer)

    def _status_tile(
        self, parent: tk.Frame, label: str, value: str, color: str
    ) -> tk.Label:
        frame = tk.Frame(
            parent,
            bg=CARD,
            highlightbackground=BORDER,
            highlightthickness=1,
            padx=10,
            pady=6,
        )
        frame.pack(side="left", fill="x", expand=True, padx=(0, 6))
        tk.Label(frame, text=label, bg=CARD, fg=MUTED, font=FONT_TILE_LABEL).pack(anchor="w")
        value_label = tk.Label(frame, text=value, bg=CARD, fg=color, font=FONT_TILE_VALUE)
        value_label.pack(anchor="w")
        return value_label

    def _build_bed_card(
        self, parent: tk.Frame, col: int, bed_id: str, patient_name: str
    ) -> None:
        card = tk.Frame(
            parent,
            bg=CARD,
            highlightbackground=BORDER,
            highlightthickness=1,
            padx=11,
            pady=9,
        )
        card.grid(
            row=0,
            column=col,
            sticky="nsew",
            padx=(0 if col == 0 else 5, 0 if col == 2 else 5),
        )
        top = tk.Frame(card, bg=CARD)
        top.pack(fill="x")
        tk.Label(top, text=bed_id.upper(), bg=CARD, fg=ACCENT, font=FONT_CARD_BED).pack(side="left")
        status = tk.Label(
            top,
            text="MONITORING",
            bg=CARD_ALT,
            fg=GREEN,
            font=FONT_CARD_STATUS,
            padx=5,
            pady=1,
        )
        status.pack(side="right")
        tk.Label(card, text=patient_name, bg=CARD, fg=TEXT, font=FONT_PATIENT_NAME).pack(anchor="w")
        vitals1 = tk.Label(card, text="HR --  BP --/--  MAP --", bg=CARD, fg=TEXT, font=FONT_VITALS)
        vitals1.pack(anchor="w", pady=(4, 0))
        vitals2 = tk.Label(card, text="RR --  SpO2 --%  T --", bg=CARD, fg=TEXT, font=FONT_VITALS)
        vitals2.pack(anchor="w")

        score_row = tk.Frame(card, bg=CARD)
        score_row.pack(fill="x", pady=(6, 0))
        tk.Label(score_row, text="NEWS2", bg=CARD, fg=MUTED, font=FONT_NEWS2_LABEL).pack(side="left")
        score = tk.Label(score_row, text="0", bg=CARD, fg=GREEN, font=FONT_NEWS2_VALUE)
        score.pack(side="right")
        bar = tk.Canvas(card, height=6, bg=CARD_ALT, highlightthickness=0)
        bar.pack(fill="x", pady=(2, 4))
        filter_label = tk.Label(card, text="FILTER: PASS", bg=CARD, fg=MUTED, font=FONT_CARD_FILTER)
        filter_label.pack(anchor="w")

        self.bed_widgets[bed_id] = {
            "vitals1": vitals1,
            "vitals2": vitals2,
            "score": score,
            "status": status,
            "bar": bar,
            "filter": filter_label,
        }

    def _build_sbar(self, outer: tk.Frame) -> None:
        frame = tk.Frame(
            outer,
            bg=PANEL,
            highlightbackground=BORDER,
            highlightthickness=1,
            padx=12,
            pady=9,
        )
        frame.pack(fill="both", expand=False)
        header = tk.Frame(frame, bg=PANEL)
        header.pack(fill="x")
        tk.Label(
            header,
            text="SBAR SYNTHESIS PREVIEW",
            bg=PANEL,
            fg=TEXT,
            font=FONT_SBAR_HEADER,
        ).pack(side="left")
        self.sbar_meta = tk.Label(
            header,
            text="awaiting verified deterioration",
            bg=PANEL,
            fg=MUTED,
            font=FONT_SBAR_META,
        )
        self.sbar_meta.pack(side="right")

        for key, letter, label, color in SBAR_SECTIONS:
            row = tk.Frame(frame, bg=PANEL, pady=2)
            row.pack(fill="x")
            tk.Label(
                row,
                text=letter,
                bg=color,
                fg=PANEL,
                font=FONT_SBAR_BADGE,
                width=2,
            ).pack(side="left", anchor="n", padx=(0, 8))
            body = tk.Frame(row, bg=PANEL)
            body.pack(side="left", fill="x", expand=True)
            tk.Label(body, text=label, bg=PANEL, fg=color, font=FONT_SBAR_SECTION).pack(anchor="w")
            text = tk.Label(
                body,
                text="—",
                bg=PANEL,
                fg=TEXT,
                font=FONT_SBAR_BODY,
                wraplength=790,
                justify="left",
                anchor="w",
            )
            text.pack(anchor="w", fill="x")
            self.sbar_labels[key] = text

    def _build_bottom(self, outer: tk.Frame) -> None:
        bottom = tk.Frame(outer, bg=BG)
        bottom.pack(fill="both", expand=True, pady=(10, 0))

        log_frame = tk.Frame(bottom, bg=PANEL, highlightbackground=BORDER, highlightthickness=1)
        log_frame.pack(side="left", fill="both", expand=True, padx=(0, 8))
        log_header = tk.Frame(log_frame, bg=PANEL)
        log_header.pack(fill="x", padx=10, pady=(7, 2))
        tk.Label(
            log_header,
            text="EDGE EVENT LOG",
            bg=PANEL,
            fg=TEXT,
            font=FONT_LOG_HEADER,
        ).pack(side="left")
        tk.Label(
            log_header,
            text="local decisions never leave this node unless escalated",
            bg=PANEL,
            fg=MUTED,
            font=FONT_LOG_SUB,
        ).pack(side="right")
        scrollbar = ttk.Scrollbar(log_frame, orient="vertical")
        scrollbar.pack(side="right", fill="y")
        self.log = tk.Text(
            log_frame,
            bg=PANEL,
            fg=TEXT,
            font=FONT_LOG_TEXT,
            relief="flat",
            padx=9,
            pady=4,
            height=7,
            wrap="word",
            yscrollcommand=scrollbar.set,
            state="disabled",
        )
        self.log.pack(fill="both", expand=True)
        scrollbar.config(command=self.log.yview)
        self.log.tag_configure("info", foreground=MUTED)
        self.log.tag_configure("artifact", foreground=AMBER)
        self.log.tag_configure("alert", foreground=RED)
        self.log.tag_configure("llm", foreground=MAUVE)
        self.log.tag_configure("uplink", foreground=GREEN)
        self.log.tag_configure("error", foreground=RED)

        uplink = tk.Frame(
            bottom,
            bg=PANEL,
            highlightbackground=BORDER,
            highlightthickness=1,
            padx=12,
            pady=9,
            width=250,
        )
        uplink.pack(side="right", fill="y")
        uplink.pack_propagate(False)
        tk.Label(uplink, text="UPLINK BUS", bg=PANEL, fg=TEXT, font=FONT_UPLINK_TITLE).pack(anchor="w")
        self.uplink_url = tk.Label(
            uplink,
            text="http://localhost:8000/api/edge/alert",
            bg=PANEL,
            fg=CYAN,
            font=FONT_UPLINK_URL,
            wraplength=230,
            justify="left",
        )
        self.uplink_url.pack(anchor="w", pady=(3, 6))
        self.uplink_state = tk.Label(uplink, text="STANDBY", bg=PANEL, fg=AMBER, font=FONT_UPLINK_STATE)
        self.uplink_state.pack(anchor="w")
        self.uplink_detail = tk.Label(
            uplink,
            text="no escalations yet",
            bg=PANEL,
            fg=MUTED,
            font=FONT_UPLINK_DETAIL,
            wraplength=230,
            justify="left",
        )
        self.uplink_detail.pack(anchor="w", pady=(4, 0))
        self.uplink_counts = tk.Label(uplink, text="alerts sent: 0", bg=PANEL, fg=MUTED, font=FONT_UPLINK_DETAIL)
        self.uplink_counts.pack(anchor="w", pady=(4, 0))

    # ------------------------------------------------------------------
    def _update_bar(self, bed_id: str, score: int, color: str) -> None:
        canvas: tk.Canvas = self.bed_widgets[bed_id]["bar"]
        canvas.update_idletasks()
        width = max(canvas.winfo_width(), 20)
        canvas.delete("all")
        ratio = max(0.01, min(1.0, score / 20.0))
        canvas.create_rectangle(0, 0, int(width * ratio), 7, fill=color, outline="")

    def refresh(self) -> None:
        snapshot: dict[str, Any] = self.runtime.state.snapshot()

        ingestion = snapshot["ingestion"]
        if ingestion["active"]:
            self.ingestion_value.config(
                text=f"ACTIVE (Port 8002)  ·  {ingestion['count']} pkts", fg=GREEN
            )
        else:
            self.ingestion_value.config(text="WAITING (Port 8002)", fg=AMBER)

        filter_state = snapshot["filter"]
        if filter_state["mode"] == "ARTIFACT_SUPPRESSED":
            self.filter_value.config(
                text=f"ARTIFACT SUPPRESSED · {filter_state['bed_id']}", fg=AMBER
            )
        else:
            self.filter_value.config(text="PASS · no artifacts in window", fg=GREEN)

        llm = snapshot["llm"]
        if llm["enabled"]:
            provider = llm.get("provider", "OPENAI")
            label = f"{provider} · {llm['model']}"
        else:
            label = "LOCAL FALLBACK · offline-safe"
        if llm["last_source"]:
            label += f"  ·  last {llm['last_source']}"
        self.llm_value.config(text=label, fg=ACCENT if llm["enabled"] else MAUVE)

        for bed_id, data in snapshot["beds"].items():
            widgets = self.bed_widgets[bed_id]
            telemetry = data["telemetry"]
            if telemetry:
                widgets["vitals1"].config(
                    text=(
                        f"HR {telemetry['heart_rate']:.0f}  "
                        f"BP {telemetry['systolic_bp']:.0f}/{telemetry['diastolic_bp']:.0f}  "
                        f"MAP {telemetry['map']:.0f}"
                    )
                )
                widgets["vitals2"].config(
                    text=(
                        f"RR {telemetry['respiratory_rate']:.0f}  "
                        f"SpO2 {telemetry['spo2']:.0f}%  "
                        f"T {telemetry['temp_c']:.1f}C"
                    )
                )
            score = int(data["news2_score"])
            if score >= 7:
                color = RED
            elif score >= 5:
                color = AMBER
            elif score >= 3:
                color = "#f9e2af"
            else:
                color = GREEN
            widgets["score"].config(text=str(score), fg=color)
            self._update_bar(bed_id, score, color)

            if data["filter_status"] == "ARTIFACT_SUPPRESSED":
                widgets["status"].config(text="SUPPRESSED", fg=AMBER)
                widgets["filter"].config(text="FILTER: ARTIFACT SUPPRESSED", fg=AMBER)
            elif data["alert_pending"]:
                widgets["status"].config(text="SYNTHESIZING", fg=MAUVE)
                widgets["filter"].config(text="FILTER: PASS", fg=GREEN)
            elif data["alert_active"]:
                widgets["status"].config(text="ALERT ACTIVE", fg=RED)
                widgets["filter"].config(text="FILTER: PASS", fg=GREEN)
            else:
                widgets["status"].config(text="MONITORING", fg=GREEN)
                widgets["filter"].config(text="FILTER: PASS", fg=MUTED)

        self._update_sbar(snapshot)

        uplink = snapshot["uplink"]
        if uplink["ok"]:
            self.uplink_state.config(text="LIVE", fg=GREEN)
        else:
            self.uplink_state.config(text="DEGRADED" if uplink["last_error"] else "STANDBY", fg=AMBER if uplink["last_error"] else MUTED)
        detail = uplink["last_error"] or (
            f"last ok {uplink['last_ok']}" if uplink["last_ok"] else "no escalations yet"
        )
        self.uplink_detail.config(text=detail)
        self.uplink_counts.config(text=f"alerts sent: {uplink['alerts_sent']}")

        for entry in snapshot["logs"]:
            if entry["seq"] <= self.last_log_seq:
                continue
            self.last_log_seq = entry["seq"]
            self.log.configure(state="normal")
            self.log.insert(
                "end",
                f"{entry['ts']}  {entry['text']}\n",
                entry["kind"] if entry["kind"] in {"info", "artifact", "alert", "llm", "uplink", "error"} else "info",
            )
            self.log.see("end")
            self.log.configure(state="disabled")

        self.root.after(300, self.refresh)

    def _update_sbar(self, snapshot: dict[str, Any]) -> None:
        chosen: dict[str, Any] | None = None
        for data in snapshot["beds"].values():
            if data["sbar"]:
                if chosen is None or data["news2_score"] >= chosen["news2_score"]:
                    chosen = data
        pending_bed = next(
            (data for data in snapshot["beds"].values() if data["alert_pending"]), None
        )

        if chosen is not None:
            sbar = chosen["sbar"]
            for key in ("situation", "background", "assessment", "recommendation"):
                self.sbar_labels[key].config(text=sbar[key])
            self.sbar_meta.config(
                text=(
                    f"{chosen['bed_id']} · NEWS2 {chosen['news2_score']} · "
                    f"{chosen['sbar_source']}"
                ),
                fg=RED,
            )
        elif pending_bed is not None:
            self.sbar_meta.config(
                text=f"{pending_bed['bed_id']} · synthesizing SBAR...", fg=MAUVE
            )
            for key in ("situation", "background", "assessment", "recommendation"):
                self.sbar_labels[key].config(text="Synthesizing clinical brief...")
        else:
            self.sbar_meta.config(text="awaiting verified deterioration", fg=MUTED)
            for key in ("situation", "background", "assessment", "recommendation"):
                self.sbar_labels[key].config(text="—")

    def _close(self) -> None:
        self.on_close()


def launch_gui(runtime: EdgeRuntime, on_close: Callable[[], None]) -> None:
    root = tk.Tk()
    EdgeGUI(root, runtime, lambda: (on_close(), root.destroy()))
    root.mainloop()
