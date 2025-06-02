import { Gig } from "@/types";

type DateGroup = {
  label: string;
  gigs: Gig[];
};

export function groupGigsByDateProximity(gigs: Gig[]): DateGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeek = new Date(today);
  thisWeek.setDate(today.getDate() + 7);

  const next30Days = new Date(today);
  next30Days.setDate(today.getDate() + 30);

  const groups: DateGroup[] = [
    { label: "This Week", gigs: [] },
    { label: "Next 30 Days", gigs: [] },
    { label: "Later", gigs: [] },
  ];

  // Sort gigs by date first
  const sortedGigs = [...gigs]
    .filter(gig => {
      const gigDate = new Date(gig.date);
      gigDate.setHours(0, 0, 0, 0);
      return gigDate >= today;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedGigs.forEach((gig) => {
    const gigDate = new Date(gig.date);
    gigDate.setHours(0, 0, 0, 0);

    if (gigDate <= thisWeek) {
      groups[0].gigs.push(gig);
    } else if (gigDate <= next30Days) {
      groups[1].gigs.push(gig);
    } else {
      groups[2].gigs.push(gig);
    }
  });

  // Filter out empty groups
  return groups.filter((group) => group.gigs.length > 0);
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return "";
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "numeric" });
} 