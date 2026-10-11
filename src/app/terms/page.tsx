import type { Metadata } from "next";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Terms and data" };

export default function Terms() {
  return (
    <div className="max-w-2xl">
      <PageHead title="Terms and data" />
      <div className="grid gap-6 leading-relaxed">
        <section>
          <h2 className="text-xl uppercase mb-1">Values are estimates</h2>
          <p>
            Record values, deal verdicts and resale profits are worked out from prices that marketplaces publish and
            prices entered by hand. They are a guide for deciding what to look at, not a promise of what a record will
            sell for. Check the listing, the seller and the grading before buying.
          </p>
        </section>
        <section>
          <h2 className="text-xl uppercase mb-1">Where the data comes from</h2>
          <p>
            Release details, cover images, community counts and marketplace prices come from the Discogs API and
            belong to Discogs and its contributors. Exchange rates are European Central Bank reference rates, served by
            Frankfurter. Links to listings open the seller&rsquo;s own site; purchases happen there, under that
            site&rsquo;s terms.
          </p>
        </section>
        <section>
          <h2 className="text-xl uppercase mb-1">What is stored</h2>
          <p>
            Your collection, wishlist, the listings you check, your delivery country and postcode, and your cost
            settings. Nothing is shared with the marketplaces beyond the release numbers needed to look prices up.
          </p>
        </section>
      </div>
    </div>
  );
}
