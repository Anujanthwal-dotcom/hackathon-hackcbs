from __future__ import annotations

import logging
import threading

import uvicorn

from app.config import HEADLESS, PORT
from app.gui import launch_gui
from app.server import create_app


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
    )
    app, simulator = create_app()
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=PORT,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(config)

    if HEADLESS:
        logging.info("Cura Health generator running headless on :%s", PORT)
        server.run()
        return

    thread = threading.Thread(target=server.run, name="generator-uvicorn", daemon=True)
    thread.start()

    def shutdown() -> None:
        server.should_exit = True
        thread.join(timeout=3)

    logging.info("Cura Health generator GUI opening; API on http://localhost:%s", PORT)
    launch_gui(simulator, shutdown)
    if thread.is_alive():
        thread.join(timeout=2)


if __name__ == "__main__":
    main()
