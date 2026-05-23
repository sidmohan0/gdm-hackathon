# GDM Hackathon Context

## Product

GDM is a golf course GIS operations demo for superintendent and irrigation teams. The hackathon path shows a private course map, lets an operator select a real asset, attaches a field photo, runs live Gemini analysis, and turns the result into prioritized work.

## Demo Spine

1. Upload photo.
2. Analyze.
3. Prioritize.

The demo must never imply fake AI success. If Gemini is unavailable, the UI should show a visible blocked state and preserve the rest of the workflow.

## Course

The demo course is Presidio Golf Course in San Francisco. The assets are plausible private GIS records created for the demo, not imported course data. They should feel real enough for a superintendent: readable IDs, zones, holes, asset types, and operational notes.

## Glossary

- Asset: A private GIS object owned by the course, such as a sprinkler head, lateral pipe, valve, or controller.
- Issue: A field problem or maintenance concern tied to an asset and shown on the map.
- Severity: The field impact level of an issue: low, medium, high, or critical.
- Priority score: A demo ranking value used later to order work by safety, playability, water waste, and weather context.
- Selected asset: The map/list asset currently in focus for upload, analysis, and issue context.
- Demo photo: The primary sample image at `public/demo-image.png`.
- Reset: A local action that restores the original seeded state while preserving seeded assets and issues.
- Morning Superintendent Brief: A read-only planning artifact generated from open issues, work orders, weather context, and activity history to help a superintendent understand the day.

## Locked Decisions

- Use the default Create Next App foundation with `src/app`, `src/components`, `src/data`, and `src/lib`.
- Use Mapbox satellite imagery as the basemap and private GIS layers on top.
- Use localStorage-first demo persistence so the app can survive refreshes during live demos.
- Require a selected asset before photo upload.
- Require live Gemini analysis in later slices; no hardcoded successful AI output.
- Use Open-Meteo as the primary weather context provider in the demo.
- Keep GDM-2 local: no backend, auth, real GIS imports, or deployment work in this slice.
- Keep Morning Superintendent Brief advisory in v1; it must not create or update work orders automatically.
- Morning Superintendent Brief must not select assets, reorder issues, or change top-priority map highlight state; Prioritize owns ranking and highlight state.
- Generate Morning Superintendent Brief on demand in v1; scheduled/background brief generation is out of scope for the hackathon demo.
- Use Gemini managed agents for Morning Superintendent Brief in v1 so the demo can truthfully answer the hackathon managed-agents criterion.
- For v1, managed agent means Google's hosted Gemini managed-agent API; a normal `generateContent` call with agent-like UI does not satisfy this requirement.
- Morning Superintendent Brief should invoke the hosted Antigravity managed agent inline per request; creating and managing a saved custom agent is out of scope for v1.
- Keep live Analyze and Prioritize actions as fast structured Gemini calls; use the managed agent only for Morning Superintendent Brief in v1.
- Morning Superintendent Brief v1 contains an opening summary, top priorities, weather watch, crew plan, risks to verify, and a visible managed-agent trace.
- Morning Superintendent Brief crew planning uses coarse demo planning language only; it should not imply real labor schedules, named staff, or precise dispatch times.
- Morning Superintendent Brief output should be structured and validated before display; free-form markdown alone is not reliable enough for the demo.
- If Morning Superintendent Brief validation fails, the UI should show a visible failure state and leave the existing brief unchanged rather than rendering raw unvalidated agent output.
- Morning Superintendent Brief trace should show real managed-agent lifecycle stages with productized labels; it must not imply separate hidden agents or external browsing when those did not happen.
- Morning Superintendent Brief uses a single generate action with loading and trace states; streaming partial brief text into the UI is out of scope for v1.
- Persist the latest Morning Superintendent Brief in localStorage-backed demo state; a brief history/archive is out of scope for v1.
- Regenerating Morning Superintendent Brief replaces the latest brief; v1 does not keep a visible brief history.
- Reset clears Morning Superintendent Brief output, error, trace, loading state, and persisted brief state.
- Morning Superintendent Brief works from current open work; generated issues and work orders enrich the brief but are not required. Use daily ranking when available.
- Morning Superintendent Brief should use the latest Prioritize output when available and fall back to open issue severity/order when no prioritization has been run.
- Morning Superintendent Brief generation is available whenever there is open work; if there is no open work, the action should be disabled with a clear empty state.
- Morning Superintendent Brief should proceed when Open-Meteo is unavailable; weather context enriches the brief but must not block generation.
- Morning Superintendent Brief managed-agent input should come from current product state; broad external web browsing and agent-discovered external facts are out of scope for v1.
- Morning Superintendent Brief managed-agent execution should run with network egress disabled and no search or URL-context tools; the brief is a synthesis of supplied product state only.
- Morning Superintendent Brief recommendations must cite known issue, work order, or asset IDs from the supplied state; recommendations tied only to unknown records should be rejected or dropped.
- The Morning Superintendent Brief UI should explicitly identify managed-agent generation with a compact trace, while staying framed as superintendent operations software.
- Morning Superintendent Brief belongs with cross-asset planning artifacts, not inside the selected-asset detail drawer.
