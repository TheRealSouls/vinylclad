import type { Metadata } from "next";
import { addToWishlist } from "@/actions/records";
import { ActionForm } from "@/components/forms";
import { ReleaseFields, WishFields } from "@/components/fields";
import { PageHead } from "@/components/ui";
import { loadContext } from "@/lib/context";

export const metadata: Metadata = { title: "Add to wishlist" };

export default async function NewWish() {
  const { settings } = await loadContext();
  return (
    <div className="max-w-3xl">
      <PageHead
        title="Add to wishlist"
        sub="A record you are after. Listings that meet the grade and land under your budget show up as hits."
      />
      <ActionForm action={addToWishlist} submit="Add to wishlist" className="grid gap-8">
        <ReleaseFields />
        <WishFields currency={settings.currency} />
      </ActionForm>
    </div>
  );
}
