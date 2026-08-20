"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface DiscoveredLead {
  id: string;
  businessName: string;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  score: number;
  priority: string;
  category: { name: string } | null;
}

export default function LeadFinderPage() {
  const router = useRouter();
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [keywords, setKeywords] = useState("");
  const [quantity, setQuantity] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DiscoveredLead[] | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!industry.trim() || !city.trim()) {
      setError("Industry and city are required.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await api.post<{ leads: DiscoveredLead[] }>("/leads/discover", {
        industry,
        city,
        country,
        keywords,
        quantity,
      });
      setResults(res.data.leads);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Search failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">AI Lead Finder</h1>
        <p className="text-sm text-text-muted">Discover real businesses via Google Places. We never invent emails or phone numbers.</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Industry *</label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Restaurants"
                className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-text-muted">City *</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lahore"
                className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Country</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Pakistan"
                className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Keywords</label>
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="halal, fine dining"
                className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Quantity</label>
              <input
                type="number"
                min={1}
                max={200}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-5">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? "Searching..." : "Find Leads"}
              </Button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">
              {results.length} lead{results.length === 1 ? "" : "s"} discovered and saved
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {results.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-text-muted">No businesses found for this search.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                      <th className="px-5 py-3 font-medium">Business</th>
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 font-medium">Email</th>
                      <th className="px-5 py-3 font-medium">Phone</th>
                      <th className="px-5 py-3 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((lead) => (
                      <tr
                        key={lead.id}
                        className="cursor-pointer border-t border-border hover:bg-surface-2"
                        onClick={() => router.push("/dashboard/leads")}
                      >
                        <td className="px-5 py-3 font-medium">{lead.businessName}</td>
                        <td className="px-5 py-3 text-text-muted">{lead.category?.name ?? "Uncategorized"}</td>
                        <td className="px-5 py-3 text-text-muted">{lead.email ?? "Not Found"}</td>
                        <td className="px-5 py-3 text-text-muted">{lead.phone ?? "Not Found"}</td>
                        <td className="px-5 py-3">
                          <Badge variant={lead.priority === "Hot" ? "success" : lead.priority === "Warm" ? "warning" : "neutral"}>
                            {lead.score}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}