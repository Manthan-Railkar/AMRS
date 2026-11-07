"""Script to execute AMRS comparative benchmarks against baselines."""

from __future__ import annotations

import sys

from amrs.cli import main

if __name__ == "__main__":
    args = ["benchmark"]
    if len(sys.argv) > 1:
        args.extend(sys.argv[1:])
    sys.exit(main(args))
