# Issue Tracker

This project uses **GitHub Issues** as the issue tracker.

## Configuration

- **Repository**: 32n1merge/learning-hub
- **CLI**: `gh` (GitHub CLI)
- **PRs as a request surface**: No

## Triage Labels

The following labels are used for triage states:

- `needs-triage` — New issue, needs evaluation
- `needs-info` — Waiting on more information from reporter
- `ready-for-agent` — Fully specified, ready for an agent to pick up
- `ready-for-human` — Needs human implementation (judgment calls, external access, etc.)
- `wontfix` — Will not be actioned

Category labels:
- `bug` — Something is broken
- `enhancement` — New feature or improvement

Wayfinder labels:
- `wayfinder:map` — A wayfinding map issue
- `wayfinder:research` — Research ticket
- `wayfinder:prototype` — Prototype ticket
- `wayfinder:grilling` — Grilling ticket
- `wayfinder:task` — Task ticket

## Issue Templates

### Spec Issue

When publishing a spec via `/to-spec`, use this format:

```markdown
## Problem Statement

<problem from user's perspective>

## Solution

<solution from user's perspective>

## User Stories

<numbered list of user stories>

## Implementation Decisions

<list of implementation decisions>

## Testing Decisions

<list of testing decisions>

## Out of Scope

<what's out of scope>

## Further Notes

<any additional notes>
```

### Ticket Issue

When publishing tickets via `/to-tickets`, use this format:

```markdown
## Parent

Reference to the parent spec issue (e.g., "Child of #1").

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- Reference to blocking tickets, or "None — can start immediately"
```

## Commands

```bash
# List issues
gh issue list --repo 32n1merge/learning-hub

# Create an issue
gh issue create --repo 32n1merge/learning-hub --title "Title" --body "Body" --label "ready-for-agent"

# View an issue
gh issue view <number> --repo 32n1merge/learning-hub

# Update labels
gh issue edit <number> --remove-label "needs-triage" --add-label "ready-for-agent"

# Close an issue
gh issue close <number>
```
