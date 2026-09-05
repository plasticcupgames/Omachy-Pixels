# Release validation — 1.0.0

Checked September 6, 2026:

- `omarchy plugin validate .`: passed against the installed Quattro validator.
- `python3 tools/check-release.py --publish`: passed; 38 PNG dimensions,
  manifest entries, portable paths, license files, author credits, and preview.
- `node tests/world.test.cjs`: passed; ten-minute simulation, 27 settings
  combinations, collisions, collection, entity bounds, boss rotation,
  squadron convergence, leader replacement, trail continuity and expiry.
- `bash -n install-plugin omachy-pixels`: passed.
- Local install into an isolated configuration directory: passed; installed
  manifest validated, all required license notices copied, repeat install
  refused without overwriting files. Shell registration was mocked for this
  check; this was not a full marketplace installation.
- `python3 tools/render-preview.py`: passed with Qt's offscreen software
  renderer using the actual Battle.qml Canvas; preview visually inspected.
- Standalone qmllint cannot fully resolve shell-owned `qs.*` modules and
  reports Quickshell metadata warnings. It is not recorded as a passing check.

The installed development copy received the updated simulation, renderer,
and latest thruster sheets, with backups retained outside the repository.
The Omarchy shell was stopped at final verification, so no new live desktop
or installed release-ID smoke test was completed during this preparation.

GitHub CLI was unauthenticated and the repository had no remote. Public
repository visibility, permanent marketplace ID availability (including
retired listings), remote installation, and marketplace acceptance remain
publication-time checks. Local validation does not certify plugin security.
