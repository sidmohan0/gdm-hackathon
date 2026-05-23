# ADR 0001: localStorage-First Demo Persistence

## Status

Accepted

## Context

The hackathon demo needs to be resilient during rapid local iteration and live presentation. A backend would add setup risk before the core GIS and AI workflow is proven.

## Decision

Persist demo state in browser localStorage for the initial slices. Seeded course assets and seeded issues stay in code. Transient state such as selected asset, attached demo photo, and later generated issues can be reset locally.

## Consequences

- Refreshing the page keeps the presenter oriented.
- Reset can return the app to a known pre-demo state quickly.
- Multi-user, audit history, and durable server persistence are explicitly out of scope until a later product slice.
