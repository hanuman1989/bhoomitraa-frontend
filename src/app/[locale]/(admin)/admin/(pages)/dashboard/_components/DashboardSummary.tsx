import { requireAdmin } from "@/lib/auth/dal";
import { getTranslations } from "next-intl/server";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
    year?: string;
  }>;
}

export default async function DashboardSummary({ searchParams }: Props) {
  const tUi = await getTranslations("dashboard.summary");

  await requireAdmin();

  const { from, to } = await searchParams;

  const cards = [
    { title: tUi("totalFarmers"), metric: 20 },
    { title: tUi("activeFarms"), metric: 15 },
    { title: tUi("activeCropCycles"), metric: 500 },
    { title: tUi("publishedCrops"), metric: 400 },
    { title: tUi("seedRates"), metric: 134 },
    { title: tUi("pendingReviews"), metric: 18 },
    { title: tUi("notifications"), metric: 42 },
    { title: tUi("blockedAccounts"), metric: 7 },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
      {cards.map(({ title, metric }) => (
        <div
          key={title}
          className="rounded-xl border bg-white p-4 dark:bg-gray-900"
        >
          <p className="text-sm text-gray-500">{title}</p>

          <h3 className="mt-2 text-2xl font-semibold">{metric}</h3>
        </div>
      ))}
    </div>
  );
}
