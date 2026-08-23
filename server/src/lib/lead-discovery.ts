interface DiscoveredPlace {
  businessName: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  osmTypes: string[];
  sourceRef: string;
}

const USER_AGENT = "BrosCodePlatform/1.0 (lead-discovery)";

function industryToOsmTags(industry: string): { key: string; value: string }[] {
  const normalized = industry.toLowerCase().trim();
  const map: Record<string, { key: string; value: string }[]> = {
    restaurant: [{ key: "amenity", value: "restaurant" }],
    restaurants: [{ key: "amenity", value: "restaurant" }],
    "fine dining": [{ key: "amenity", value: "restaurant" }],
    "fast food": [{ key: "amenity", value: "fast_food" }],
    bar: [{ key: "amenity", value: "bar" }],
    pub: [{ key: "amenity", value: "pub" }],
    cafe: [{ key: "amenity", value: "cafe" }],
    coffee: [{ key: "amenity", value: "cafe" }],
    dentist: [{ key: "amenity", value: "dentist" }],
    dental: [{ key: "amenity", value: "dentist" }],
    doctor: [{ key: "amenity", value: "doctors" }],
    clinic: [{ key: "amenity", value: "clinic" }],
    hospital: [{ key: "amenity", value: "hospital" }],
    "real estate": [{ key: "office", value: "estate_agent" }],
    realestate: [{ key: "office", value: "estate_agent" }],
    gym: [{ key: "leisure", value: "fitness_centre" }],
    fitness: [{ key: "leisure", value: "fitness_centre" }],
    salon: [{ key: "shop", value: "hairdresser" }],
    beauty: [{ key: "shop", value: "beauty" }],
    boutique: [{ key: "shop", value: "boutique" }],
    lawyer: [{ key: "office", value: "lawyer" }],
    legal: [{ key: "office", value: "lawyer" }],
    accountant: [{ key: "office", value: "accountant" }],
    accounting: [{ key: "office", value: "accountant" }],
    "it services": [{ key: "office", value: "it" }],
    "it company": [{ key: "office", value: "it" }],
    software: [{ key: "office", value: "it" }],
    pharmacy: [{ key: "amenity", value: "pharmacy" }],
    hotel: [{ key: "tourism", value: "hotel" }],
    guesthouse: [{ key: "tourism", value: "guest_house" }],
    bakery: [{ key: "shop", value: "bakery" }],
    bank: [{ key: "amenity", value: "bank" }],
    school: [{ key: "amenity", value: "school" }],
    academy: [{ key: "amenity", value: "school" }],
    tutoring: [{ key: "office", value: "educational_institution" }],
    supermarket: [{ key: "shop", value: "supermarket" }],
    grocery: [{ key: "shop", value: "supermarket" }],
    clothing: [{ key: "shop", value: "clothes" }],
    fashion: [{ key: "shop", value: "clothes" }],
    electronics: [{ key: "shop", value: "electronics" }],
    mobile: [{ key: "shop", value: "mobile_phone" }],
    car: [{ key: "shop", value: "car" }],
    automotive: [{ key: "shop", value: "car_repair" }],
    "travel agency": [{ key: "shop", value: "travel_agency" }],
    travel: [{ key: "shop", value: "travel_agency" }],
    furniture: [{ key: "shop", value: "furniture" }],
    jewelry: [{ key: "shop", value: "jewelry" }],
    jewellery: [{ key: "shop", value: "jewelry" }],
    photography: [{ key: "shop", value: "photo" }],
    "photo studio": [{ key: "shop", value: "photo" }],
    florist: [{ key: "shop", value: "florist" }],
    laundry: [{ key: "shop", value: "laundry" }],
    veterinary: [{ key: "amenity", value: "veterinary" }],
    vet: [{ key: "amenity", value: "veterinary" }],
  };

  const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (normalized.includes(key)) return map[key];
  }
  return [];
}

async function geocodeCity(city: string, country: string): Promise<{ lat: number; lon: number } | null> {
  const q = [city, country].filter(Boolean).join(", ");
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;

  const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!resp.ok) return null;

  const data = (await resp.json()) as Array<{ lat: string; lon: string }>;
  if (!data.length) return null;

  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

async function fetchFromOverpass(query: string): Promise<{ elements?: OverpassElement[] }> {
  let lastError: Error | null = null;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const resp = await fetch(mirror, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(20000),
      });

      if (!resp.ok) {
        const text = await resp.text();
        lastError = new Error(`${mirror} failed (${resp.status}): ${text.slice(0, 200)}`);
        continue;
      }

      const json = (await resp.json()) as { elements?: OverpassElement[]; remark?: string };

      if ((json.elements?.length ?? 0) === 0 && json.remark) {
        lastError = new Error(`${mirror} returned no data with remark: ${json.remark}`);
        continue;
      }

      return json;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  throw new Error(
    `All OpenStreetMap servers are busy right now. Please try again in a moment. (${lastError?.message ?? "unknown error"})`
  );
}

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

export function inferCategoryName(osmTypes: string[], industryInput: string): string {
  const map: Record<string, string> = {
    restaurant: "Restaurant",
    fast_food: "Restaurant",
    bar: "Restaurant",
    pub: "Restaurant",
    cafe: "Restaurant",
    dentist: "Dental",
    doctors: "Healthcare",
    clinic: "Healthcare",
    hospital: "Healthcare",
    veterinary: "Healthcare",
    estate_agent: "Real Estate",
    fitness_centre: "Fitness",
    hairdresser: "Beauty & Salon",
    beauty: "Beauty & Salon",
    boutique: "Retail",
    lawyer: "Legal",
    accountant: "Finance",
    it: "IT Services",
    pharmacy: "Pharmacy",
    hotel: "Hospitality",
    guest_house: "Hospitality",
    bakery: "Bakery",
    bank: "Finance",
    school: "Education",
    educational_institution: "Education",
    supermarket: "Retail",
    clothes: "Retail",
    electronics: "Retail",
    mobile_phone: "Retail",
    car: "Automotive",
    car_repair: "Automotive",
    travel_agency: "Travel",
    furniture: "Retail",
    jewelry: "Retail",
    photo: "Retail",
    florist: "Retail",
    laundry: "Services",
  };

  for (const t of osmTypes) {
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

interface RawCandidate {
  businessName: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  osmTypes: string[];
}

type EnrichedLead = DiscoveredPlace & {
  email: string | null;
  category: string;
  score: number;
  priority: string;
};

function dedupeKey(name: string, city: string | null): string {
  return `${name.trim().toLowerCase()}|${(city ?? "").trim().toLowerCase()}`;
}

async function fetchCandidates(
  normalizedIndustry: string,
  center: { lat: number; lon: number },
  city: string,
  country: string,
  keywordList: string[],
  radius: number,
  cap: number
): Promise<RawCandidate[]> {
  const tags = industryToOsmTags(normalizedIndustry);

  let query: string;
  if (tags.length > 0) {
    const filters = tags.map((t) => `["${t.key}"="${t.value}"]`).join("");
    query = `[out:json][timeout:25];
(
  node${filters}(around:${radius},${center.lat},${center.lon});
  way${filters}(around:${radius},${center.lat},${center.lon});
);
out center ${cap};`;
  } else {
    const safeIndustry = normalizedIndustry.replace(/["\\]/g, "");
    query = `[out:json][timeout:25];
(
  node["name"~"${safeIndustry}",i](around:${radius},${center.lat},${center.lon});
  way["name"~"${safeIndustry}",i](around:${radius},${center.lat},${center.lon});
  node["shop"~"${safeIndustry}",i](around:${radius},${center.lat},${center.lon});
  way["shop"~"${safeIndustry}",i](around:${radius},${center.lat},${center.lon});
  node["amenity"~"${safeIndustry}",i](around:${radius},${center.lat},${center.lon});
  way["amenity"~"${safeIndustry}",i](around:${radius},${center.lat},${center.lon});
  node["office"~"${safeIndustry}",i](around:${radius},${center.lat},${center.lon});
  way["office"~"${safeIndustry}",i](around:${radius},${center.lat},${center.lon});
  node["craft"~"${safeIndustry}",i](around:${radius},${center.lat},${center.lon});
  way["craft"~"${safeIndustry}",i](around:${radius},${center.lat},${center.lon});
);
out center ${cap};`;
  }

  const data = await fetchFromOverpass(query);
  const elements = data.elements ?? [];

  const candidates: RawCandidate[] = [];

  for (const el of elements) {
    const t = el.tags;
    if (!t || !t.name) continue;

    if (keywordList.length > 0) {
      const haystack = `${t.name} ${t.shop ?? ""} ${t.amenity ?? ""} ${t.cuisine ?? ""}`.toLowerCase();
      const matches = keywordList.some((k) => haystack.includes(k));
      if (!matches) continue;
    }

    const addressParts = [t["addr:housenumber"], t["addr:street"], t["addr:city"]].filter(Boolean);

    let website = t.website || t["contact:website"] || null;
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

    const phone = t.phone || t["contact:phone"] || null;

    candidates.push({
      businessName: t.name,
      website,
      phone,
      address: addressParts.length > 0 ? addressParts.join(" ") : null,
      city: t["addr:city"] || city,
      country: t["addr:country"] || country || null,
      osmTypes: [t.amenity, t.shop, t.office, t.leisure, t.tourism].filter((v): v is string => Boolean(v)),
    });
  }

  return candidates;
}

export async function searchGooglePlaces(
  industry: string,
  city: string,
  country: string,
  keywords: string,
  quantity: number,
  existingBusinessKeys: string[] = []
): Promise<EnrichedLead[]> {
  const normalizedIndustry = (industry ?? "").trim();
  if (!normalizedIndustry) {
    throw new Error("Please enter an industry/category to search for (e.g. restaurant, salon, real estate).");
  }

  const center = await geocodeCity(city, country);
  if (!center) {
    throw new Error(`Could not locate "${city}${country ? ", " + country : ""}" - check the spelling and try again.`);
  }

  const keywordList = keywords
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);

  const existingKeys = new Set(existingBusinessKeys.map((k) => k.trim().toLowerCase()));

  const seen = new Set<string>();
  const finalResults: EnrichedLead[] = [];

  let radius = 15000;
  let attempt = 0;
  const maxAttempts = 5;

  while (finalResults.length < quantity && attempt < maxAttempts) {
    attempt += 1;
    const cap = Math.min(Math.max(quantity * 15, 80), 400);

    const candidates = await fetchCandidates(
      normalizedIndustry,
      center,
      city,
      country,
      keywordList,
      radius,
      cap
    );

    const fresh = candidates.filter((c) => {
      const key = dedupeKey(c.businessName, c.city);
      if (seen.has(key)) return false;
      if (existingKeys.has(key) || existingKeys.has(c.businessName.trim().toLowerCase())) return false;
      return true;
    });

    const contactable = fresh.filter((c) => c.website || c.phone);

    const contactScore = (c: RawCandidate) => (c.website ? 2 : 0) + (c.phone ? 1 : 0);
    contactable.sort((a, b) => contactScore(b) - contactScore(a));

    const needed = quantity - finalResults.length;
    const shortlist = contactable.slice(0, needed * 2 || needed);

    const enriched = await Promise.all(
      shortlist.map(async (c) => {
        const email = c.website ? await enrichEmailFromWebsite(c.website) : null;
        const category = inferCategoryName(c.osmTypes, normalizedIndustry);
        const { score, priority } = scoreLead({
          hasWebsite: Boolean(c.website),
          hasEmail: Boolean(email),
          hasPhone: Boolean(c.phone),
        });

        return {
          ...c,
          email,
          category,
          score,
          priority,
          sourceRef: "OpenStreetMap",
        };
      })
    );

    for (const lead of enriched) {
      if (finalResults.length >= quantity) break;
      if (!lead.email && !lead.phone) continue;

      const key = dedupeKey(lead.businessName, lead.city);
      if (seen.has(key)) continue;
      seen.add(key);
      finalResults.push(lead);
    }

    radius = Math.round(radius * 1.7);
  }

  finalResults.sort((a, b) => b.score - a.score);
  return finalResults.slice(0, quantity);
}