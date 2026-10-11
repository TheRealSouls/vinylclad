# Vinylclad roadmap

What exists, what comes next, and why it comes in that order. The short version: get trustworthy prices in first, then automate finding listings, then build the demand and prediction layer on top of price history that has had time to accumulate.

## Phase 0: the basics (done)

- Next.js 15, Prisma, SQLite (one line from Postgres), Tailwind 4, TypeScript.
- **Collection**: records with Goldmine grades for record and sleeve, sealed flag, what you paid, status (keeping, for sale, sold) and sale price. Value and gain per copy and in total.
- **Wishlist**: budget (landed), lowest acceptable grade, priority, and purpose. A "flip" wish only counts as a hit when resale would make money.
- **Deals**: paste any listing (Discogs, eBay, Vinted, Amazon, other). It gets priced to your door: currency conversion, postage (stated or estimated from the seller's country), import VAT and handling when it crosses a customs border. Verdict against market value, plus profit if flipped after fees and packaging.
- **Valuation v1**: every price is converted, normalised to Near Mint through grade multipliers, weighted by kind (sold > suggested > asking) and age (half-life four months), trimmed of outliers, then a weighted median. Confidence comes from how much fresh evidence there is. The cheapest Discogs listing is shown as a floor but kept out of the value, since it is usually the most worn copy.
- **Discogs**: import any release by link or number (pressing details, cover, want/have counts, rating, cheapest copy). With a token, per-grade price suggestions too.
- **Settings**: delivery country and postcode, home currency, postage table, import charge rate, resale fees, deal threshold. Live ECB exchange rates.
- Unit tests for grading, currency, customs routes, valuation and deal scoring (`npm test`).

## Phase 1: trustworthy prices, every day

The valuation is only as good as its evidence. Without a token, Discogs gives the cheapest listing and nothing else, which is not enough to value anything.

1. **Discogs token** in `.env` (two minutes at discogs.com/settings/developers). Unlocks per-grade price suggestions and search.
2. **Search on the add forms**, so you type "ok computer 1997" and pick the pressing from covers, instead of pasting links.
3. **Import your Discogs collection and wantlist** by username. Your wantlist becomes the wishlist in one go.
4. **Daily refresh job** for every release, queued to stay under Discogs' 60 requests a minute. Each run stores a snapshot, so price history starts accumulating now. Phase 4 depends on months of this history, so it should start as early as possible.
5. **Price history chart** on each release page.
6. **Postgres and hosting** on Render with Neon, like TrophyPilot, behind a single password, since it holds personal data.

## Phase 2: finding deals automatically

Each source has different rules. Using official APIs keeps the site from getting blocked or breaking a site's terms.

| Source | Route | Notes |
| --- | --- | --- |
| eBay | Browse API (free app keys) | Search vinyl category 176985 by artist, title and catalogue number. Can quote postage to your postcode. Sold prices need the Marketplace Insights API, which eBay only grants on application. |
| Discogs | Seller inventories (`/users/{name}/inventory`) | There is no API to search all listings. Watching the inventories of chosen sellers (local shops, big UK sellers) works within the rules. |
| Vinted | Saved-search alert emails | No public API, and scraping is blocked and against its terms. Vinted emails new matches for saved searches; reading those from your own inbox is allowed and reliable. |
| Amazon | Keepa API (paid, about €19 a month) or Amazon's affiliate API | Keepa gives price history and drop alerts. Amazon's own API needs an Associates account with recent sales. |
| Anywhere | Share-to-app on the phone | Installable web app with a share target: share a listing link from any app and it gets scored on the spot. |

Around the sources:

- **Matching** listing titles to releases: artist, title, catalogue number, year, label, and pressing words ("first press", "reissue", "180g", colour). Anything below a confidence threshold goes to a queue for a yes or no.
- **Grade from free text** ("played twice", "light scuffs", "sealed") using a small Claude model. Cheap at this volume.
- **Alerts** by email or push for steals and wishlist hits.

## Phase 3: valuation v2

- **More sold prices**: your own sales, eBay sold (if Insights access is granted), and optionally Popsike for rare auction history (paid).
- **Calibrate grade multipliers** from Discogs' per-grade suggestions instead of fixed guesses.
- **Borrow strength across pressings**: a release with thin data leans on its master release, adjusted for what the pressing is (first press, country, colour, limited). Each pressing type gets its own premium, learned from releases that do have data.
- **Liquidity**: copies for sale against wants gives a rough time to sell. Flip scores should prefer records that move.

## Phase 4: demand and prediction

The part that sets Vinylclad apart. It needs history to learn from, which phase 1 starts collecting.

**Signals, best first**

1. Discogs want and have counts over time. Free, specific to vinyl, and the strongest signal: wants growing faster than haves means demand is outrunning supply.
2. Copies for sale over time on Discogs (supply).
3. Listener trends from Last.fm and ListenBrainz (free APIs).
4. Reddit mentions in r/vinyl, r/VinylReleases and r/VinylCollectors through the official API, with sentiment read by a small Claude model.
5. Events: anniversaries (25, 30, 50 years), reissue announcements, tours, new albums, deaths. A reissue often lowers prices for common original pressings while rare ones hold.

RateYourMusic has no API and forbids scraping, so it is left out. ListenBrainz and Last.fm cover the same ground for popularity.

**Model**

- Start with a transparent demand index (weighted, standardised signals) shown on each release, with the reasons listed.
- Once there are about six months of snapshots, train a model to forecast the 90 day value change, and backtest it against what actually happened before showing any forecast. A forecast without a track record is a guess, so its hit rate is shown next to it.

## Phase 5: the flipping workflow

- Bought, held, listed, sold, with realised profit, return per source and time held.
- Suggested asking price for your copy, and one-click listing on Discogs through its API.
- Royal Mail and courier price tables by weight (one LP, two LPs, box set).
- Yearly totals for tax. The UK trading allowance is £1,000 a year of gross income; past that it needs declaring.

## Phase 6: comfort

- Barcode scanning with the phone camera to add records.
- Dark theme.
- CSV export and backups.

## Open questions

- **Where you live**: settings default to the UK and pounds. Change them in Settings if not; postage and import charges depend on it.
- **Local or hosted**: local only, or online like TrophyPilot so it can run daily jobs and send alerts?
- **Paid data**: is Keepa (Amazon) or Popsike (auction history) worth paying for?
- **Discogs username**, for importing your collection and wantlist.
