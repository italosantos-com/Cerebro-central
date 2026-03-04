from __future__ import annotations

import time
from pathlib import Path

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from backend.rag_engine import RAGEngine
from backend.settings import ALLOWED_EXT, IGNORED_DIRS, INDEXING_CONFIG


def _is_relevant_file(path: str) -> bool:
    p = Path(path)
    if any(part in IGNORED_DIRS for part in p.parts):
        return False
    return p.suffix.lower() in ALLOWED_EXT


class ReindexHandler(FileSystemEventHandler):
    def __init__(self, engine: RAGEngine) -> None:
        self.engine = engine
        self.last_run = 0.0

    def _maybe_reindex(self) -> None:
        now = time.time()
        debounce = INDEXING_CONFIG["watch_debounce_seconds"]
        if now - self.last_run < debounce:
            return
        self.last_run = now
        self.engine.rebuild()

    def on_any_event(self, event: FileSystemEvent) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        event_path = event.src_path or ""
        if not _is_relevant_file(event_path):
            return
        self._maybe_reindex()


class ProjectWatcher:
    def __init__(self, engine: RAGEngine, project_root: Path) -> None:
        self.engine = engine
        self.project_root = project_root
        self.observer: Observer | None = None

    def start(self) -> None:
        if self.observer is not None:
            return
        handler = ReindexHandler(self.engine)
        observer = Observer()
        observer.schedule(handler, str(self.project_root), recursive=True)
        observer.start()
        self.observer = observer

    def stop(self) -> None:
        if self.observer is None:
            return
        self.observer.stop()
        self.observer.join(timeout=5)
        self.observer = None
