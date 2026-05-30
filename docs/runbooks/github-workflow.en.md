# GitHub Workflow Runbook

A step-by-step guide for working with branches, pull requests, CI, and reverts.
Use the same commands every time to keep `main` clean and deployable.

> **Golden rules**
> 1. Never commit directly to `main` — always branch.
> 2. Verify locally before pushing — it saves CI cycles.
> 3. For major dependency bumps (React/Prisma), follow the full chain of peer
>    dependencies and breaking changes — a version bump alone is not enough.
> 4. After any PR merges, other open branches may conflict — update them with
>    `git merge origin/main` and re-verify.
> 5. On a shared branch, use `git revert` (safe), never `git reset` (rewrites history).

---

## 1. Update `main` before starting

```bash
git checkout main
git pull origin main
```

## 2. Create a feature branch

```bash
git checkout -b feat/your-feature      # e.g. feat/student-registration
```

Branch naming:
- `feat/...` new feature
- `fix/...` bug fix
- `chore/...` maintenance (e.g. dependency upgrades)

## 3. Work and commit

```bash
git status
git add .                              # or: git add <specific-file>
git commit -m "feat(students): add registration form"
```

Follow **Conventional Commits**: `feat(...)`, `fix(...)`, `refactor(...)`, `test(...)`, `docs(...)`.

## 4. Verify locally (critical — run what CI runs)

```bash
# Frontend
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm run build
npm test

# Backend
cd server
npx tsc --noEmit
npm test
cd ..
```

> Do not push until these pass locally.

## 5. Push the branch

```bash
git push -u origin feat/your-feature   # -u only the first time
```

## 6. Open a Pull Request

```bash
gh pr create --base main --head feat/your-feature \
  --title "feat: clear title" \
  --body "What changed and why"
```

Or use the **New pull request** button on GitHub.

## 7. Watch CI

```bash
gh pr checks                # check status for the current PR
gh pr view                  # PR details
gh run view <RUN_ID> --log-failed   # read a failing check's log
```

Fix → `git add` → `git commit` → `git push` (CI re-runs automatically).

## 8. Resolve a merge conflict

```bash
git checkout feat/your-feature
git fetch origin
git merge origin/main          # bring main into your branch
# Edit conflicted files, remove <<<<<<< ======= >>>>>>> markers
git add <resolved-files>
git commit                     # completes the merge
git push
```

## 9. Merge the PR (only when all checks are green)

```bash
gh pr merge <number> --squash --delete-branch
```

- `--squash` collapses all commits into one clean commit
- `--delete-branch` removes the branch after merging

## 10. Clean up after merging

```bash
git checkout main
git pull origin main
git remote prune origin        # drop refs to deleted remote branches
```

---

## Reverting after a merge (undo)

> Since `main` is shared and already pushed, prefer `git revert`. It creates a
> new commit that undoes the change without rewriting history.

### Option A — GitHub UI (easiest)
1. Open the merged PR.
2. Click the **Revert** button at the bottom.
3. GitHub opens a new PR that reverses the changes — review and merge it.

### Option B — Command line

```bash
git checkout main
git pull origin main
git log --oneline -10          # find the merged commit hash

# Squash merge (a normal single commit):
git revert <HASH>

# Real merge commit (has two parents):
git revert -m 1 <HASH>

git push origin main
```

### Revert several merges

```bash
git revert <HASH_A> <HASH_B>          # one revert commit each
# or a contiguous range:
git revert <oldest>^..<newest>
git push origin main
```

### Test before pushing

```bash
git checkout -b revert-test main
git revert <HASH>
# npm test / npm run build
git checkout main && git branch -D revert-test   # if not satisfied
```

### `git reset` — special cases only
Use only when changes are **not pushed yet**, or on your private branch:

```bash
git reset --hard <HASH_before_merge>
git push --force-with-lease origin <your-branch>
```

> Never do this on shared `main` — it breaks everyone who already pulled.

### Undo a revert
```bash
git revert <HASH_of_the_revert>        # re-applies the change
```

---

## Quick reference

| Command | Purpose |
|---|---|
| `gh pr list` | List open PRs |
| `gh pr list --state all` | All PRs (open/closed/merged) |
| `gh pr checks <n>` | CI check status |
| `gh pr view <n> --web` | Open PR in browser |
| `gh pr close <n>` | Close a PR without merging |
| `gh pr merge <n> --squash --delete-branch` | Merge and clean up |
| `git log --oneline -10` | Last 10 commits |
| `git branch -a` | All branches (local + remote) |
| `gh auth status` | Verify GitHub CLI auth |

| Situation | Command |
|---|---|
| Merged & pushed to `main` | `git revert <hash>` then `git push` |
| From GitHub UI | **Revert** button on the PR |
| Not pushed yet / private branch | `git reset --hard` |
| Revert a real merge commit | `git revert -m 1 <hash>` |
