# Vinylclad

Single-user vinyl deal hunting and collection valuation. Plan in ROADMAP.md.

## Design rules (from the owner, keep to them)

The look is a record-shop catalogue: warm paper background, dark ink, one vermilion accent, hairline rules, dense tables. Tokens live in `src/app/globals.css`.

Never use: gradients, Lucide (or any stock icon set), a pure white background, rainbow colours, drop shadows, three feature cards in a row, emojis, glass effects, em dashes, Inter / Geist / Space Grotesk, a coloured left stripe on cards, fake testimonials, bento grids, terminal-window graphics, "it's not X, it's Y" phrasing, checkmark bullets, three pricing tiers, rounded corners, skeleton loaders, purple with black, radial orbs, dot grids, sparkle icons, animated arrows.

Do: show real data (never invented prices or records presented as real), keep the Terms page current, square corners, Archivo for text (condensed for headings), IBM Plex Mono via the `num` class for prices and catalogue numbers.

## Conventions

- Enums are strings in Prisma so the schema works on SQLite and Postgres alike.
- Pricing maths stays pure (no database) in `src/lib/*.ts` and is covered by `src/lib/pricing.test.ts`. Run `npm test` after touching it.
- Every price is stored in its original currency and converted at display time with `loadContext().convert`.
- Copy is plain British English. No em dashes in UI text.
- Never commit with a Claude co-author line.
