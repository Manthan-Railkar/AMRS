"""AMRS command line interface stub."""

import sys
from amrs import __version__


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] in ("--version", "-v"):
        print(f"AMRS version {__version__}")
        return
    print(f"AMRS CLI v{__version__} - Adaptive Model Recovery System")


if __name__ == "__main__":
    main()

