"""Script to generate reproducible failure scenarios S1-S6 for AMRS."""

from __future__ import annotations

import sys

from amrs.cli import main

if __name__ == "__main__":
    args = ["scenarios", "build", "--all"]
    if len(sys.argv) > 1:
        args.extend(sys.argv[1:])
    sys.exit(main(args))
