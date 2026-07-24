# Domain Documentation

This project uses a **single-context** domain documentation layout for a general-purpose learning library. Courses span any subject and may come from Teach sessions, contributed content, or other workflows.

## Structure

```
learning-hub/
├── CONTEXT.md              # Domain glossary
├── docs/
│   ├── adr/                # Architecture Decision Records
│   └── agents/             # Agent configuration
│       ├── issue-tracker.md
│       ├── domain.md
│       └── triage-labels.md
```

## CONTEXT.md

The domain glossary lives at the repo root in `CONTEXT.md`. It defines the key concepts and terminology used throughout the project.

### Format

```markdown
# Context

## Domain Glossary

### <Term>
<Definition with examples>

### <Term>
<Definition with examples>
```

### Guidelines

- Define terms precisely
- Include examples where helpful
- Clarify overloaded terms
- Note what a term is NOT if it's commonly confused
- Update inline as the domain model sharpens

## ADRs (Architecture Decision Records)

Hard-to-reverse decisions are recorded in `docs/adr/`.

### Format

```markdown
# ADR-NNN: Title

## Status
Accepted | Superseded by ADR-XXX | Deprecated

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or making?

## Consequences
What becomes easier or more difficult to do because of this change?
```

### Guidelines

- Write ADRs for decisions that are hard to reverse
- Don't write ADRs for ephemeral decisions
- Number sequentially: ADR-001, ADR-002, etc.
- Update status when superseded or deprecated
- Keep ADRs immutable once accepted (write a new ADR to supersede)

## Consumer Rules

When working in this repo:

1. **Read CONTEXT.md first** — understand the domain vocabulary
2. **Check docs/adr/** — understand existing decisions
3. **Use the domain terms** — don't invent new terms for existing concepts
4. **Update docs inline** — as the domain model sharpens, update CONTEXT.md and ADRs immediately
5. **Challenge vague terms** — if a term is unclear, clarify it in CONTEXT.md
