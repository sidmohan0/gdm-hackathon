# GDM Hackathon

GDM is a map-first golf course GIS operations demo for superintendent and irrigation teams. It shows how a private course map, field photo, asset context, weather, and live Gemini workflows can turn a field observation into prioritized maintenance work.

The current demo is centered on Presidio Golf Course in San Francisco with synthetic but realistic GIS asset records. It is designed as a local, product-grade hackathon vertical slice rather than a production system.

## What It Does

- Renders a Mapbox satellite workspace with private irrigation assets and issue layers.
- Lets an operator select an irrigation asset, attach the demo image or upload a field photo, and add a superintendent note.
- Calls Gemini for structured photo triage and validates the result before changing local demo state.
- Creates generated issue and work order objects from successful analysis.
- Calls Gemini to prioritize open work using current issues, generated work orders, Open-Meteo weather, and BMP-style maintenance criteria.
- Generates a read-only Morning Superintendent Brief through the hosted Gemini managed-agent path.
- Keeps readiness, weather, AI trace, failure, and validation states visible for live demos.

## Stack

- Next.js App Router
- React and TypeScript
- Mapbox GL JS
- Gemini API and Gemini managed agents
- Open-Meteo weather context
- Zustand local demo state
- Vitest and ESLint

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
GEMINI_API_KEY=your_gemini_api_key
```

Optional:

```bash
GEMINI_HEALTH_MODEL=gemini-2.5-flash-lite
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Flow

1. Select an asset on the map or in the Assets inspector.
2. Use `upload photo` to attach the included demo image, or choose your own image.
3. Run `analyze` to create a validated issue and draft work order from Gemini triage.
4. Run `prioritize` to rank current open work and highlight the top map issue.
5. Run `generate brief` to produce the Morning Superintendent Brief with the managed-agent flow.

The demo is intentionally honest about AI failures: if a Gemini response cannot be parsed or validated, the UI shows the failure and preserves the rest of the workspace.

## Scripts

```bash
npm run dev
npm test
npm run lint
npm run build
```

## Notes

- The Presidio GIS data in this repository is synthetic demo data.
- The app stores local demo state in browser storage and can be reset from the command bar.
- Vercel deployment is not required for the hackathon submission path.

## License

MIT
