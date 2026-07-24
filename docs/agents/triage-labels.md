# Triage Labels

This project uses the following triage label vocabulary.

## State Labels

| Label | Meaning |
|-------|---------|
| `needs-triage` | New issue, needs evaluation |
| `needs-info` | Waiting on more information from reporter |
| `ready-for-agent` | Fully specified, ready for an agent to pick up |
| `ready-for-human` | Needs human implementation |
| `wontfix` | Will not be actioned |

## Category Labels

| Label | Meaning |
|-------|---------|
| `bug` | Something is broken |
| `enhancement` | New feature or improvement |

## Wayfinder Labels

| Label | Meaning |
|-------|---------|
| `wayfinder:map` | A wayfinding map issue |
| `wayfinder:research` | Research ticket |
| `wayfinder:prototype` | Prototype ticket |
| `wayfinder:grilling` | Grilling ticket |
| `wayfinder:task` | Task ticket |

## State Transitions

```
[unlabeled] → needs-triage
needs-triage → needs-info | ready-for-agent | ready-for-human | wontfix
needs-info → needs-triage (when reporter replies)
ready-for-agent → [agent works] → ready-for-human (for review/merge)
```

## Usage

Every triaged issue should carry:
- Exactly one **category** label (`bug` or `enhancement`)
- Exactly one **state** label

## Commands

```bash
# Apply labels
gh issue edit <number> --add-label "ready-for-agent,enhancement"

# Remove labels
gh issue edit <number> --remove-label "needs-triage"

# List issues by label
gh issue list --label "ready-for-agent"
```
