# ADR 0002: Live Gemini Required

## Status

Accepted

## Context

The demo is meant to show Gemini functionality, not a simulated analysis path. A polished fallback that pretends analysis succeeded would undermine the point of the hackathon.

## Decision

Photo analysis must use live Gemini in the relevant slice. If credentials, API reachability, or model response parsing fail, the UI should show an explicit blocked or failed state instead of fabricating a successful result.

## Consequences

- The user sees honest AI status in the product.
- Demo setup must validate credentials before the live presentation.
- Non-AI parts of the workflow should remain usable so a blocked AI state is understandable and recoverable.
