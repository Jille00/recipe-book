import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getShoppingList } from "@/lib/db/queries/shopping-list";
import { ShoppingListView } from "./shopping-list-view";

export const metadata: Metadata = {
  title: "Shopping list",
  description: "Everything you need to buy for your recipes",
  robots: { index: false, follow: false },
};

export default async function ShoppingListPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/shopping-list")}`);
  }

  const items = await getShoppingList(session.user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 print:max-w-none print:p-0">
      <ShoppingListView initialItems={items} />
    </div>
  );
}
