import { requireAdmin } from "@/lib/auth/dal";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
    year?: string;
  }>;
}

export default async function DashboardSummary({ searchParams }: Props) {
  await requireAdmin();

  const { from, to } = await searchParams;

  const cards = [
    { title: "Total Farmers", metric: 20 },
    { title: "Active Farms", metric: 15 },
    { title: "Active Crop Cycles", metric: 500 },
    { title: "Published Crops", metric: 400 },
    { title: "Seed Rates", metric: 134 },
    { title: "Pending Reviews", metric: 18 },
    { title: "Notifications", metric: 42 },
    { title: "Blocked Accounts", metric: 7 },
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
