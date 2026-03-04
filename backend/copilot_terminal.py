from __future__ import annotations

from pathlib import Path
import shlex
import shutil
import subprocess
from dataclasses import dataclass

from backend.llm_client import ollama_available, resolved_runtime
from backend.settings import OLLAMA_MODEL


RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
MAGENTA = "\033[35m"
GRAY = "\033[90m"


@dataclass
class DevCommand:
    key: str
    command: str
    description: str


def _terminal_width() -> int:
    return max(72, shutil.get_terminal_size((100, 20)).columns)


def _line(char: str = "─") -> str:
    return char * min(120, _terminal_width())


def _header(indexed: int, online: bool) -> None:
    status = f"{GREEN}online{RESET}" if online else f"{YELLOW}offline{RESET}"
    runtime = resolved_runtime()
    print()
    print(f"{BOLD}{MAGENTA}cerebro central{RESET}")
    print(f"{DIM}{OLLAMA_MODEL} • runtime {runtime} • rag {indexed} • {status}{RESET}")
    print(f"{GRAY}modo comando ativo (sem chat). use /help{RESET}\n")


def _catalog() -> list[DevCommand]:
    return [
        DevCommand("install", "npm install", "instalar dependências"),
        DevCommand("dev", "npm run dev", "rodar frontend em desenvolvimento"),
        DevCommand("backend", "npm run backend:dev", "rodar API local"),
        DevCommand("build", "npm run build", "gerar build"),
        DevCommand("preview", "npm run preview", "preview do build"),
        DevCommand("lint", "npm run lint", "checagem TypeScript"),
        DevCommand("test", "npm test", "rodar testes (se existir)"),
        DevCommand("reindex", "cerebro index", "reindexar base RAG"),
        DevCommand("watch", "cerebro watch", "watcher de reindex"),
        DevCommand("release-check", "npm run release:check", "validar release npm"),
        DevCommand("publish", "npm run release:publish", "publicar pacote npm"),
    ]


def _print_catalog() -> None:
    print(f"\n{BOLD}catálogo de comandos webapp{RESET}")
    for item in _catalog():
        print(f"{DIM}{item.key:14}{RESET} {item.command}  {GRAY}# {item.description}{RESET}")
    print()


def _help() -> None:
    print(f"\n{BOLD}comandos{RESET}")
    print(f"{DIM}/help{RESET}      mostra esta ajuda")
    print(f"{DIM}/cmds{RESET}      lista comandos de desenvolvimento")
    print(f"{DIM}/status{RESET}    mostra status do modelo e do índice")
    print(f"{DIM}/reindex{RESET}   reindexa knowledge/ e projects/")
    print(f"{DIM}/run <cmd>{RESET} executa comando de terminal")
    print(f"{DIM}<cmd>{RESET}      executa comando direto (ex.: git status)")
    print(f"{DIM}/clear{RESET}     limpa a tela")
    print(f"{DIM}/exit{RESET}      encerra o cerebro central")
    print(f"{DIM}q{RESET}          atalho para sair\n")


def _looks_like_shell_command(text: str) -> bool:
    if not text:
        return False
    command_prefixes = (
        "npm ",
        "pnpm ",
        "yarn ",
        "pip ",
        "python ",
        "python3 ",
        "git ",
        "ls",
        "cd ",
        "mkdir ",
        "rm ",
        "cp ",
        "mv ",
        "cat ",
        "echo ",
        "pwd",
        "curl ",
        "node ",
    )
    normalized = text.strip()
    if normalized.startswith(command_prefixes):
        return True

    first_token = normalized.split()[0] if normalized else ""
    if not first_token:
        return False
    if shutil.which(first_token) is not None:
        return True
    return False


def _run_shell(command: str, cwd: Path) -> None:
    command = _prefer_local_cerebro(command=command, cwd=cwd)
    print(f"{DIM}executando: {command}{RESET}")
    completed = subprocess.run(
        command,
        cwd=str(cwd),
        shell=True,
        text=True,
        capture_output=True,
    )

    stdout = (completed.stdout or "").strip()
    stderr = (completed.stderr or "").strip()

    if stdout:
        print(f"\n{stdout}")
    if stderr:
        print(f"\n{stderr}")

    color = GREEN if completed.returncode == 0 else YELLOW
    print(f"\n{DIM}exit code:{RESET} {color}{completed.returncode}{RESET}\n")


def _prefer_local_cerebro(command: str, cwd: Path) -> str:
    normalized = command.strip()
    if not normalized:
        return command

    try:
        parts = shlex.split(normalized, posix=True)
    except ValueError:
        return command

    if not parts:
        return command

    if parts[0] not in {"cerebro", "./cerebro"}:
        return command

    local_bin = cwd / "cerebro"
    if not local_bin.exists():
        return command

    parts[0] = "./cerebro"
    return shlex.join(parts)


def _status(indexed: int, online: bool) -> None:
    mode = resolved_runtime()
    print(f"\n{BOLD}status{RESET}")
    print(f"- modelo: {OLLAMA_MODEL}")
    print(f"- modo: {mode}")
    print(f"- chunks indexados: {indexed}\n")


def _map_natural_language_to_command(text: str) -> str | None:
    normalized = text.strip().lower()
    if not normalized:
        return None

    mappings: list[tuple[tuple[str, ...], str]] = [
        (("npm install", "instalar npm", "instalar depend", "install dependencies"), "npm install"),
        (("npm run dev", "rodar dev", "iniciar dev", "start dev", "frontend"), "npm run dev"),
        (("backend", "api local", "rodar api", "iniciar api"), "npm run backend:dev"),
        (("npm run build", "build", "gerar build", "compilar projeto"), "npm run build"),
        (("preview", "npm run preview"), "npm run preview"),
        (("lint", "checar typescript", "corrigir lint"), "npm run lint"),
        (("test", "rodar teste", "npm test"), "npm test"),
        (("reindex", "indexar", "atualizar indice"), "cerebro index"),
        (("watch", "monitorar arquivos"), "cerebro watch"),
        (("publicar", "publish", "release"), "npm run release:publish"),
    ]

    for aliases, cmd in mappings:
        if any(alias in normalized for alias in aliases):
            return cmd
    return None


def run() -> int:
    project_root = Path(__file__).resolve().parents[1]
    indexed = 0
    online = ollama_available()

    _header(indexed=indexed, online=online)

    while True:
        try:
            question = input(f"{BOLD}you{RESET} {DIM}›{RESET} ").strip()
        except EOFError:
            break

        if not question:
            continue

        if question in {"/exit", "q", "quit"}:
            break

        if question == "/help":
            _help()
            continue

        if question == "/cmds":
            _print_catalog()
            continue

        if question == "/status":
            online = ollama_available()
            _status(indexed=indexed, online=online)
            continue

        if question == "/clear":
            print("\033c", end="")
            _header(indexed=indexed, online=online)
            continue

        if question == "/reindex":
            _run_shell(command="cerebro index", cwd=project_root)
            continue

        if question.startswith("/run "):
            command = question.replace("/run", "", 1).strip()
            if command:
                _run_shell(command=command, cwd=project_root)
            continue

        if _looks_like_shell_command(question):
            _run_shell(command=question, cwd=project_root)
            continue

        mapped = _map_natural_language_to_command(question)
        if mapped:
            _run_shell(command=mapped, cwd=project_root)
            continue

        print(f"{YELLOW}Entrada não reconhecida em modo comando.{RESET}")
        print(f"{DIM}Use /cmds para ver atalhos ou /run <comando> para executar manualmente.{RESET}\n")

    print(f"{DIM}Encerrado.{RESET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
