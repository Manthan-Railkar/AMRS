.PHONY: all install lint type test cov api web dev scenarios benchmark

PYTHON ?= python

all: install lint type test

install:
	$(PYTHON) -m pip install -e .[dev,transformers]

lint:
	$(PYTHON) -m ruff check src tests

type:
	$(PYTHON) -m mypy src/amrs

test:
	$(PYTHON) -m pytest tests

cov:
	$(PYTHON) -m pytest --cov=src/amrs tests/unit

api:
	$(PYTHON) -m uvicorn amrs.api.main:app --host 127.0.0.1 --port 8000 --reload

web:
	npm --prefix apps/web run dev

dev:
	$(PYTHON) -m uvicorn amrs.api.main:app --host 127.0.0.1 --port 8000

scenarios:
	$(PYTHON) scripts/build_scenarios.py

benchmark:
	$(PYTHON) scripts/run_benchmark.py

