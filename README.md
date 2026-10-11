# Vinylclad

Personal vinyl tool: values the collection from real marketplace prices, prices any listing to your door (postage, import charges, currency), and flags deals and wishlist hits.

See [ROADMAP.md](ROADMAP.md) for what is next.

## Running it

```bash
npm install
cp .env.example .env
npm run setup
npm run dev
```

Then open http://localhost:3000, set your country and currency in Settings, and add a record from a Discogs link.

Optional: put a Discogs personal access token in `.env` as `DISCOGS_TOKEN` for per-grade price suggestions and search.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm test` | Unit tests for the pricing maths |
| `npm run typecheck` | TypeScript check |
| `npm run db:push` | Apply schema changes to the database |

## Layout

- `src/lib/grades.ts`, `valuation.ts`, `deals.ts`, `shipping.ts`, `money.ts`: pricing maths, no database, all tested in `pricing.test.ts`.
- `src/lib/sources/`: one file per marketplace. Discogs so far.
- `src/lib/queries.ts`: loads rows and joins them to valuations for pages.
- `src/actions/`: server actions behind every form.
- `src/app/`: pages. The release page (`/releases/[id]`) is the hub for a pressing.
