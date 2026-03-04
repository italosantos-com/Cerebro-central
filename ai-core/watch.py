from __future__ import annotations

import time

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from config import INDEXING_CONFIG, KNOWLEDGE_DIR, PROJECTS_DIR
from indexer import rebuild_index


class ReindexHandler(FileSystemEventHandler):
    def __init__(self) -> None:
        self.last_run = 0.0

    def _maybe_reindex(self) -> None:
        now = time.time()
        debounce = INDEXING_CONFIG["watch_debounce_seconds"]
        if now - self.last_run < debounce:
            return
        self.last_run = now
        total = rebuild_index()
        print(f"[watch] índice atualizado: {total} chunks")

    def on_created(self, event):  # type: ignore[override]
        if not event.is_directory:
            self._maybe_reindex()

    def on_modified(self, event):  # type: ignore[override]
        if not event.is_directory:
            self._maybe_reindex()

    def on_deleted(self, event):  # type: ignore[override]
        if not event.is_directory:
            self._maybe_reindex()


def run() -> int:
    handler = ReindexHandler()
    observer = Observer()

    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)

    observer.schedule(handler, str(PROJECTS_DIR), recursive=True)
    observer.schedule(handler, str(KNOWLEDGE_DIR), recursive=True)

    observer.start()
    print("watch ativo: monitorando /projects e /knowledge")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
