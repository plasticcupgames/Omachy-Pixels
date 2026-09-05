# Publish Omachy Pixels in three steps

The local 1.0.0 release package is prepared for publication. It has not been
pushed to GitHub or submitted to the marketplace. Run these commands from
the repository root. GitHub CLI must be authenticated as an account with
permission to create `plasticcupgames/Omachy-Pixels`.

## 1. Publish the repository

Review the package, especially `assets/LICENSE`: code and documentation are
MIT; Pixels In Space artwork is licensed for distribution with this plugin,
not reuse in other games. Silkscreen retains its OFL license.

```bash
python3 tools/check-release.py --publish
node tests/world.test.cjs
omarchy plugin validate .
gh auth login
git add .
git commit -m "Release Omachy Pixels 1.0.0"
gh repo create plasticcupgames/Omachy-Pixels --public --source=. --remote=origin --push
```

If you already committed or created the repository, skip the corresponding
command and push the reviewed commit to your existing remote. Verify the
repository is public and contains the root manifest, README, LICENSE,
artwork terms, and preview. If you choose another repository/account, update
the URL in the README and submission draft before pushing.

## 2. Validate the published plugin

The root `manifest.json` declares `plasticcupgames.omachy-pixels`, version
`1.0.0`, author Tim Hyatt / Tim Hyatt Games, and service + bar-widget entry
points. The manifest passes the installed Omarchy validator. Cloning a stock
plugin is a scaffolding step and is unnecessary for this completed plugin.

Search the [marketplace](https://plugins.omarchy.org/) for the permanent ID
before submission; retired IDs also remain reserved. Check the repository's
current published commit and install it on Omarchy Quattro:

```bash
omarchy plugin disable local.omachy-pixels  # only if this old development copy is installed
omarchy plugin add https://github.com/plasticcupgames/Omachy-Pixels --enable
omarchy-shell pixels status
```

Check the bar button, settings, pause/resume, monitor selection, empty-desktop
visibility, and trails. Never enable the old development copy and release
copy together; both use the `pixels` IPC target. Removal is documented in
the README and uses Omarchy's built-in removal flow; preferences are retained.

Optionally tag the reviewed public commit and attach release notes:

```bash
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "Omachy Pixels 1.0.0" --notes-file CHANGELOG.md
```

## 3. Submit the listing

Open the [official submission form](https://github.com/omacom/omarchy-plugin-marketplace/issues/new?template=submit-plugin.yml)
and use the prepared [submission details](MARKETPLACE-SUBMISSION.md).
Category: **Desktop**. Tags: **games, bar, quickshell**.

Confirm each checklist item after the public repository exists, then change
the remaining unchecked boxes in the draft to `[x]`. You can submit the
reviewed draft using:

```bash
gh issue create --repo omacom/omarchy-plugin-marketplace \
  --title "[Plugin]: Omachy Pixels" \
  --body-file docs/MARKETPLACE-SUBMISSION.md
```

Automated validation checks the submitted commit; maintainer approval is
still required. Listing validation does not certify plugin security.

References: [publishing guide](https://plugins.omarchy.org/publish.html),
[submission instructions](https://github.com/omacom/omarchy-plugin-marketplace/blob/main/SUBMISSION.md).
