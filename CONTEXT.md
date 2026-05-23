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

## Locked Decisions

- Use the default Create Next App foundation with `src/app`, `src/components`, `src/data`, and `src/lib`.
- Use Mapbox satellite imagery as the basemap and private GIS layers on top.
- Use localStorage-first demo persistence so the app can survive refreshes during live demos.
- Require a selected asset before photo upload.
- Require live Gemini analysis in later slices; no hardcoded successful AI output.
- Use Open-Meteo as the primary weather context provider in the demo.
- Keep GDM-2 local: no backend, auth, real GIS imports, or deployment work in this slice.
