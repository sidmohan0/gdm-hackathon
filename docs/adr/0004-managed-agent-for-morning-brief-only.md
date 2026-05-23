# ADR 0004: Managed Agent for Morning Brief Only

## Status

Accepted

## Context

The hackathon demo needs to truthfully demonstrate Gemini managed-agent functionality, while the core Upload photo, Analyze, and Prioritize path must remain fast and reliable for live judging.

## Decision

Use Google's hosted Gemini managed-agent API only for the on-demand Morning Superintendent Brief. Invoke the hosted Antigravity managed agent inline per brief request instead of provisioning a saved custom agent. Run the managed-agent interaction against supplied product state with network egress disabled and no search or URL-context tools. Request structured JSON from the Interactions API and validate the returned brief again inside the app before display. Require brief recommendations to cite known issue, work order, or asset IDs from the supplied payload. Keep Analyze and Prioritize as structured low-latency Gemini calls, and treat the brief as a slower advisory synthesis artifact over current product state.

## Consequences

- The managed-agent capability is visible without moving critical demo actions onto a slower or more failure-prone path.
- Avoiding a saved custom agent removes lifecycle, versioning, and cleanup work from the hackathon demo.
- Disabling network egress prevents the brief from inventing outside context while still demonstrating hosted managed-agent execution.
- The brief must fail visibly if the hosted managed-agent path is unavailable; it must not silently fall back to normal `generateContent`.
- Double validation makes preview API drift visible instead of letting malformed or partial agent output enter the demo state.
- ID-backed recommendations make hallucinated work detectable and keep the advisory brief anchored to the course's actual open work.
- Morning Superintendent Brief remains read-only and must not create, update, rank, or highlight operational work.
