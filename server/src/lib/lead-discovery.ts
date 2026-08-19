// Real lead discovery via Google Places API (New) Text Search.
// We NEVER invent emails/phones — anything not returned or found on the
// business's own website is stored as null and surfaced to the client as "Not Found".

interface DiscoveredPlace {
  businessName: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  googleTypes: string[];
  sourceRef: string;
}

export async function searchGooglePlaces(
  industry: string,
  city: string,
  country: string,
  keywords: string,
  quantity: number
): Promise<DiscoveredPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY is not set. Add it to server/.env — see README for setup."
    );
  }

  const query = [industry, keywords, "in", city, country].filter(Boolean).join(" ");
  const results: DiscoveredPlace[] = [];
  let pageToken: string | undefined;

  while (results.length < quantity) {
    const body: Record<string, unknown> = { textQuery: query, pageSize: Math.min(20, quantity) };
    if (pageToken) body.pageToken = pageToken;

    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.types,places.addressComponents,nextPageToken",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Google Places request failed (${resp.status}): ${text}`);
    }

    const data = (await resp.json()) as {
      places?: Array<{
        displayName?: { text?: string };
        formattedAddress?: string;
        websiteUri?: string;
        nationalPhoneNumber?: string;
        types?: string[];
        addressComponents?: Array<{ types: string[]; longText?: string }>;
      }>;
      nextPageToken?: string;
    };
    const places = data.places || [];

    for (const p of places) {
      const cityComponent = p.addressComponents?.find((c: { types: string[] }) =>
        c.types.includes("locality")
      );
      const countryComponent = p.addressComponents?.find((c: { types: string[] }) =>
        c.types.includes("country")
      );

      results.push({
        businessName: p.displayName?.text ?? "Unknown",
        website: p.websiteUri ?? null,
        phone: p.nationalPhoneNumber ?? null,
        address: p.formattedAddress ?? null,
        city: cityComponent?.longText ?? city,
        country: countryComponent?.longText ?? country,
        googleTypes: p.types ?? [],
        sourceRef: "Google Places",
      });

      if (results.length >= quantity) break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
    // Google requires a short delay before a page token becomes valid
    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}

// Best-effort email enrichment: fetch the business's own website and look for a
// visible mailto: link or email pattern. If nothing is found, we return null —
// never a guessed or invented address.
export async function enrichEmailFromWebsite(website: string | null): Promise<string | null> {
  if (!website) return null;
  try {
    const res = await fetch(website, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const html = await res.text();

    const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (mailtoMatch) return mailtoMatch[1];

    const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) return emailMatch[0];

    return null;
  } catch {
    return null;
  }
}

export function inferCategoryName(googleTypes: string[], industryInput: string): string {
  const map: Record<string, string> = {
    restaurant: "Restaurant",
    cafe: "Restaurant",
    meal_takeaway: "Restaurant",
    dentist: "Dental",
    doctor: "Healthcare",
    hospital: "Healthcare",
    real_estate_agency: "Real Estate",
    gym: "Fitness",
    beauty_salon: "Beauty & Salon",
    lawyer: "Legal",
    software_company: "Software",
  };

  for (const t of googleTypes) {
    if (map[t]) return map[t];
  }
  return industryInput.charAt(0).toUpperCase() + industryInput.slice(1);
}

export function scoreLead(input: {
  hasWebsite: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
}): { score: number; priority: "Hot" | "Warm" | "Cold" } {
  let score = 40;
  if (input.hasWebsite) score += 20;
  if (input.hasEmail) score += 25;
  if (input.hasPhone) score += 15;

  const priority = score >= 80 ? "Hot" : score >= 55 ? "Warm" : "Cold";
  return { score, priority };
}
