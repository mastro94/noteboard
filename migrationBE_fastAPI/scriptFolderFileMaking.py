from pathlib import Path

BASE = Path("src/docker_entity/src/entity")

DIRS = [
    BASE,
    BASE / "schemas",
    BASE / "controllers",
    BASE / "security",
    BASE / "services",
    BASE / "routers",
]

FILES = [
    # root
    BASE / "main.py",

    # router unico
    BASE / "routers" / "router.py",

    # service unico
    BASE / "services" / "db_service.py",

    # schemas (modellazione classi)
    BASE / "schemas" / "auth.py",
    BASE / "schemas" / "user.py",
    BASE / "schemas" / "board.py",
    BASE / "schemas" / "task.py",
    BASE / "schemas" / "tag.py",
    BASE / "schemas" / "invite.py",

    # controllers – READ
    BASE / "controllers" / "read_auth.py",
    BASE / "controllers" / "read_boards.py",
    BASE / "controllers" / "read_tasks.py",
    BASE / "controllers" / "read_tags.py",
    BASE / "controllers" / "read_invites.py",

    # controllers – WRITE
    BASE / "controllers" / "write_auth.py",
    BASE / "controllers" / "write_boards.py",
    BASE / "controllers" / "write_tasks.py",
    BASE / "controllers" / "write_tags.py",
    BASE / "controllers" / "write_invites.py",

    # security
    BASE / "security" / "jwt_auth.py",
]


def main():
    for d in DIRS:
        d.mkdir(parents=True, exist_ok=True)

    for f in FILES:
        if not f.exists():
            f.touch()
            print(f"CREATED  {f}")
        else:
            print(f"SKIPPED  {f}")

    print("\n✅ Struttura FastAPI creata correttamente (router unico, service unico, no models).")


if __name__ == "__main__":
    main()
