# ADR 0003: Open-Meteo Primary Weather Context

## Status

Accepted

## Context

Weather context helps prioritize golf course maintenance work, especially irrigation issues after rain, wind, heat, or forecasted precipitation. The demo needs a low-friction provider that works well in local development.

## Decision

Use Open-Meteo as the primary weather source for the hackathon demo. NWS can be considered later as a secondary or US-specific enrichment if the demo needs official alerts or forecast discussions.

## Consequences

- No provider key is required for the primary weather slice.
- Weather can support prioritization without adding deployment secret complexity.
- NWS-specific language should not appear unless a later slice implements it.
