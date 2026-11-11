import { DISPLAY_WEEK, WEEKDAY_NAMES, type WeeklyHours } from "../lib/store-hours";

export function CafeStructuredData({ canonicalUrl, weeklyHours }: {
  canonicalUrl: string;
  weeklyHours: WeeklyHours;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    "@id": new URL("#cafe", canonicalUrl).href,
    name: "Deaf Shark Coffee",
    url: canonicalUrl,
    image: new URL("/og.png", canonicalUrl).href,
    telephone: "+1-908-481-8884",
    address: {
      "@type": "PostalAddress",
      streetAddress: "900 Green Lane",
      addressLocality: "Union",
      addressRegion: "NJ",
      postalCode: "07083",
      addressCountry: "US",
    },
    openingHoursSpecification: DISPLAY_WEEK.filter((day) => !weeklyHours[day].closed).map((day) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: WEEKDAY_NAMES[day],
      opens: weeklyHours[day].open,
      closes: weeklyHours[day].close,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
