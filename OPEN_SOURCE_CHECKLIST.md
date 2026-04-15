# Open Source Readiness Checklist

A general-purpose checklist for preparing a project for public release. Work through each section top-to-bottom; items marked **[BLOCKER]** must be resolved before publishing.

---

## 1. Licensing

- [ ] **[BLOCKER]** A `LICENSE` file exists at the repository root
- [ ] **[BLOCKER]** The `license` field in `package.json` (or equivalent manifest) matches the LICENSE file
- [ ] The chosen license is appropriate for the project's intent (MIT for permissive; Apache 2.0 for patent protection; GPL for copyleft)

## 2. Security — Secrets & Credentials

- [ ] **[BLOCKER]** No API keys, tokens, passwords, or secrets are present anywhere in the current codebase
- [ ] **[BLOCKER]** No secrets exist anywhere in git history (check with `git log --all -S "secret_string"` or `git filter-repo --analyze`)
- [ ] A `.env.example` (or equivalent) lists every required environment variable with empty values and a comment explaining each
- [ ] `.gitignore` explicitly excludes `.env`, `.env.*`, and any other secret-containing files
- [ ] Secret-scanning is enabled on the GitHub repository (Settings → Code security → Secret scanning)
- [ ] All previously exposed credentials have been rotated/revoked, even if removed from history

## 3. Documentation

- [ ] **[BLOCKER]** `README.md` exists and includes:
  - [ ] What the project does (1–2 sentence summary)
  - [ ] How to install / set up locally
  - [ ] How to run / use it
  - [ ] Link to further docs or contribution guide
- [ ] `CONTRIBUTING.md` exists and explains:
  - [ ] How to report bugs
  - [ ] How to propose features
  - [ ] How to open a pull request (branch naming, PR template, review process)
  - [ ] Local development setup
- [ ] `CODE_OF_CONDUCT.md` exists (Contributor Covenant v2.1 is a safe default)
- [ ] `CHANGELOG.md` exists (even a minimal initial entry)
- [ ] Any architecture, design, or API documentation is up to date

## 4. Package Metadata

- [ ] `name` is the real project name (not a placeholder like `temp-app`)
- [ ] `version` follows semver
- [ ] `description` is filled in and accurate
- [ ] `author` is filled in (or intentionally omitted for pseudonymous projects)
- [ ] `license` matches the LICENSE file
- [ ] `repository` points to the public repo URL
- [ ] `bugs` / `issues` points to the issue tracker
- [ ] `homepage` points to the project website or repo
- [ ] `private: true` is removed (or set to `false`) if the package should be installable/forkable

## 5. Code Hygiene

- [ ] No hardcoded internal hostnames, private URLs, or company-specific references
- [ ] No personal email addresses or usernames hardcoded in source files
- [ ] No TODO/FIXME/HACK comments that represent known bugs or missing features a contributor would need to know about (either fix them or create GitHub issues)
- [ ] No commented-out dead code that would confuse contributors
- [ ] No proprietary or internal packages in the dependency list

## 6. CI/CD

- [ ] A CI pipeline runs on every pull request (GitHub Actions, CircleCI, etc.)
- [ ] CI runs the build step
- [ ] CI runs the linter
- [ ] CI runs the test suite (if one exists)
- [ ] CI status badge is displayed in README
- [ ] No secrets are hardcoded in CI config files (use encrypted secrets / environment variables)

## 7. Tests

- [ ] At least minimal test coverage exists
- [ ] Tests pass cleanly on a fresh clone (with only public dependencies)
- [ ] Test instructions are documented (e.g., `npm test`)

## 8. Dependencies

- [ ] All dependencies are publicly available (no private registry packages)
- [ ] A lock file (`package-lock.json`, `yarn.lock`, `poetry.lock`, etc.) is committed
- [ ] No dependencies with licenses incompatible with the project's chosen license
- [ ] `npm audit` (or equivalent) shows no critical vulnerabilities

## 9. GitHub Repository Settings

- [ ] Repository description and topics/tags are set
- [ ] Repository website URL is set (if applicable)
- [ ] Branch protection is enabled on `main` (require PR reviews, status checks)
- [ ] Issue templates are configured (bug report, feature request)
- [ ] Pull request template is configured
- [ ] Secret scanning and Dependabot alerts are enabled

## 10. Final Checks

- [ ] `git clone` the repo into a fresh directory and follow the README — it works end-to-end
- [ ] All links in the README and docs resolve correctly
- [ ] The project builds cleanly from a cold state (`npm ci && npm run build` or equivalent)
- [ ] You are comfortable with everything in `git log --all --oneline` being permanently public
