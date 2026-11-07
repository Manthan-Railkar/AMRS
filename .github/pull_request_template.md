## Pull Request Description

### Summary of Changes
<!-- Provide a concise summary of the changes proposed in this PR. -->

### Motivation & Context
<!-- Why is this change required? What problem or ticket does it solve? -->

### Related Issues / Workstream Items
<!-- Reference any related tasks, e.g. Fixes #123, Implements INF-2.1 -->

---

## Definition of Done Checklist (Section 8)

Please ensure all applicable items are completed and checked before requesting review:

- [ ] **Tests Added & Passing**: Unit, integration, and contract tests have been added or updated (`pytest -q` passes with zero regressions).
- [ ] **Acceptance Criteria Verified**: All acceptance criteria for the ticket / workstream item are explicitly verified.
- [ ] **Coverage Gate Maintained**: Core package test coverage meets or exceeds the required threshold (`--cov-fail-under=$COVERAGE_MIN`, 80%).
- [ ] **Lint & Type Safety**: Code passes `ruff check`, `ruff format --check`, and `mypy src/amrs` without errors.
- [ ] **Documentation Updated**: Relevant docstrings, guides (`docs/`), and `README.md` are updated.
- [ ] **No Breaking Changes**: Configuration schemas, public API endpoints, and artifacts maintain backward compatibility (or changes are coordinated).
- [ ] **Security Considered**: Checkpoint loading uses `weights_only=True`, safe path traversals are enforced via `safe_join`, and no secrets/tokens are committed.
- [ ] **Scaffold & Clean Install**: Installs cleanly in a fresh Python 3.11 environment (`pip install -e .[dev]`).

