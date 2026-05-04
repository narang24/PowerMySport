"use client";

import { Footer } from "@/components/layout/Footer";
import { Navigation } from "@/components/layout/Navigation";
import { academyOnboardingApi } from "@/modules/onboarding/services/academy";
import { OnboardingAcademy } from "@/modules/onboarding/types/academy";
import { Button } from "@/modules/shared/ui/Button";
import { Card } from "@/modules/shared/ui/Card";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  MapPin,
  Search,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AcademyCard = OnboardingAcademy & {
  id?: string;
  slug?: string;
  city?: string;
  sports?: string[];
  rating?: number;
  reviewCount?: number;
  sessionRatePerHour?: number;
  logoUrl?: string;
  coverPhotoUrl?: string;
  ageGroups?: ("kids" | "teens" | "adults" | "all")[];
};

const SPORT_OPTIONS = [
  "Basketball",
  "Cricket",
  "Football",
  "Badminton",
  "Tennis",
  "Volleyball",
  "Kabaddi",
  "Swimming",
];

const AGE_GROUP_OPTIONS = [
  { value: "", label: "All Age Groups" },
  { value: "kids", label: "Kids (5-12)" },
  { value: "teens", label: "Teens (13-17)" },
  { value: "adults", label: "Adults (18+)" },
  { value: "all", label: "All Ages" },
];

const normalizeImageUrl = (value?: string) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:image")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.includes("amazonaws.com")) {
    return `https://${trimmed}`;
  }

  return trimmed;
};

const toRupees = (paise?: number) => {
  if (typeof paise !== "number") {
    return null;
  }
  return Math.round(paise / 100);
};

const isVerifiedAcademy = (academy: AcademyCard) => {
  if (typeof academy.kycVerified === "boolean") {
    return academy.kycVerified;
  }
  if (typeof academy.isApproved === "boolean") {
    return academy.isApproved;
  }
  // Public endpoint currently returns only approved + KYC verified academies.
  return true;
};

const academyMatchesAgeGroup = (academy: AcademyCard, ageGroup: string) => {
  if (!ageGroup) return true;
  if (!academy.ageGroups || academy.ageGroups.length === 0) {
    return true;
  }
  return academy.ageGroups.includes(
    ageGroup as "kids" | "teens" | "adults" | "all",
  );
};

export default function AcademiesPage() {
  const [loading, setLoading] = useState(true);
  const [academies, setAcademies] = useState<AcademyCard[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAcademies, setTotalAcademies] = useState(0);

  const [cityInput, setCityInput] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [ageGroupFilter, setAgeGroupFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  useEffect(() => {
    void loadAcademies(currentPage);
  }, [currentPage, cityFilter, sportFilter]);

  const loadAcademies = async (page: number) => {
    setLoading(true);

    try {
      const response = await academyOnboardingApi.listApprovedAcademies(
        page,
        12,
        {
          city: cityFilter || undefined,
          sport: sportFilter || undefined,
        },
      );

      const payload = response.data;
      const apiAcademies = (payload?.academies || []) as AcademyCard[];
      const pagination = payload?.pagination;

      setAcademies(apiAcademies);
      setTotalAcademies(pagination?.total || apiAcademies.length);
      setTotalPages(Math.max(1, pagination?.totalPages || 1));
    } catch (error) {
      console.error("Failed to load academies:", error);
      setAcademies([]);
      setTotalAcademies(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const displayedAcademies = useMemo(() => {
    const parsedMin = minPrice ? Number(minPrice) : undefined;
    const parsedMax = maxPrice ? Number(maxPrice) : undefined;

    return academies.filter((academy) => {
      const rupees = toRupees(academy.sessionRatePerHour);
      const verified = isVerifiedAcademy(academy);

      if (verifiedOnly && !verified) {
        return false;
      }

      if (!academyMatchesAgeGroup(academy, ageGroupFilter)) {
        return false;
      }

      if (parsedMin !== undefined && !Number.isNaN(parsedMin)) {
        if ((rupees ?? 0) < parsedMin) {
          return false;
        }
      }

      if (parsedMax !== undefined && !Number.isNaN(parsedMax)) {
        if ((rupees ?? 0) > parsedMax) {
          return false;
        }
      }

      return true;
    });
  }, [academies, ageGroupFilter, minPrice, maxPrice, verifiedOnly]);

  const hasFilters =
    cityFilter.length > 0 ||
    sportFilter.length > 0 ||
    ageGroupFilter.length > 0 ||
    minPrice.length > 0 ||
    maxPrice.length > 0 ||
    !verifiedOnly;

  const handleApplySearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(1);
    setCityFilter(cityInput.trim());
  };

  const handleClearFilters = () => {
    setCityInput("");
    setCityFilter("");
    setSportFilter("");
    setAgeGroupFilter("");
    setMinPrice("");
    setMaxPrice("");
    setVerifiedOnly(true);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f4f8ff_46%,#fff8ee_100%)] flex flex-col">
      <Navigation sticky />

      <main className="flex-1">
        <section className="border-b border-white/60 bg-white/75 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-white/70 bg-[linear-gradient(120deg,#f8fbff_0%,#e5f1ff_40%,#fff4e2_100%)] p-6 shadow-sm sm:p-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <Users size={14} className="text-power-orange" />
                Academy Discovery
              </div>
              <h1 className="font-title text-3xl font-bold text-slate-900 sm:text-4xl">
                Find Top Sports Academies
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-700 sm:text-lg">
                Explore verified academies by city, sport, age group, and
                pricing.
              </p>

              <form
                onSubmit={handleApplySearch}
                className="mt-6 flex flex-col gap-3 sm:flex-row"
              >
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(event) => setCityInput(event.target.value)}
                    placeholder="Search city (e.g. Mumbai, Bengaluru)"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 focus:border-power-orange focus:outline-none focus:ring-2 focus:ring-power-orange/40"
                    aria-label="Search academies by city"
                  />
                </div>
                <Button
                  type="submit"
                  className="rounded-xl sm:w-auto"
                  variant="primary"
                >
                  Apply City
                </Button>
              </form>

              <div className="mt-5 rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur-md">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Refine Results
                  </p>
                  {hasFilters && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <label className="space-y-1.5 lg:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Sport
                    </span>
                    <select
                      value={sportFilter}
                      onChange={(event) => {
                        setSportFilter(event.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-power-orange focus:outline-none focus:ring-2 focus:ring-power-orange/40"
                    >
                      <option value="">All Sports</option>
                      {SPORT_OPTIONS.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Age Group
                    </span>
                    <select
                      value={ageGroupFilter}
                      onChange={(event) =>
                        setAgeGroupFilter(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-power-orange focus:outline-none focus:ring-2 focus:ring-power-orange/40"
                    >
                      {AGE_GROUP_OPTIONS.map((option, index) => (
                        <option key={`age-group-${index}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Min Price
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value)}
                      placeholder="₹500"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-power-orange focus:outline-none focus:ring-2 focus:ring-power-orange/40"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Max Price
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value)}
                      placeholder="₹2500"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-power-orange focus:outline-none focus:ring-2 focus:ring-power-orange/40"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Verified
                    </span>
                    <button
                      type="button"
                      onClick={() => setVerifiedOnly((value) => !value)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        verifiedOnly
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {verifiedOnly ? "Verified Only" : "All"}
                    </button>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {loading
                ? "Loading academies..."
                : `${displayedAcademies.length} academies on this page`}
            </h2>
            <p className="text-sm text-slate-600">
              Total in results: {totalAcademies}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white/70"
                />
              ))}
            </div>
          ) : displayedAcademies.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 bg-white/80 p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                No academies found
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Try changing city, sport, or pricing filters.
              </p>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleClearFilters}
                >
                  Reset Filters
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {displayedAcademies.map((academy) => {
                  const coverImage =
                    normalizeImageUrl(academy.coverPhotoUrl) ||
                    normalizeImageUrl(academy.logoUrl);
                  const rupees = toRupees(academy.sessionRatePerHour);
                  const detailsHref = academy.slug
                    ? `/academies/${academy.slug}`
                    : academy.id
                      ? `/academy/onboarding/success/${academy.id}`
                      : "/academies";

                  return (
                    <Card
                      key={academy.id || academy.slug || academy.name}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative h-44 w-full overflow-hidden bg-slate-200">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={academy.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="bg-linear-to-br from-slate-200 to-slate-300 flex h-full items-center justify-center text-sm font-semibold text-slate-600">
                            No Cover Image
                          </div>
                        )}

                        {isVerifiedAcademy(academy) && (
                          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-green-700 shadow-sm">
                            <BadgeCheck size={14} />
                            Verified
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 p-5">
                        <div>
                          <h3 className="line-clamp-1 text-lg font-bold text-slate-900">
                            {academy.name}
                          </h3>
                          <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600">
                            <MapPin size={14} />
                            {academy.city || "City unavailable"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(academy.sports || []).slice(0, 3).map((sport) => (
                            <span
                              key={`${academy.id || academy.slug}-${sport}`}
                              className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700"
                            >
                              {sport}
                            </span>
                          ))}
                          {(academy.sports || []).length > 3 && (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              +{(academy.sports || []).length - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                          <p className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                            <Star size={14} className="text-amber-500" />
                            {typeof academy.rating === "number"
                              ? academy.rating.toFixed(1)
                              : "New"}
                            {typeof academy.reviewCount === "number" && (
                              <span className="font-normal text-slate-500">
                                ({academy.reviewCount})
                              </span>
                            )}
                          </p>

                          <p className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                            <IndianRupee size={14} />
                            {typeof rupees === "number"
                              ? `${rupees}/hr`
                              : "Price on request"}
                          </p>
                        </div>

                        <Link href={detailsHref} className="block">
                          <Button
                            fullWidth
                            variant="outline"
                            className="rounded-xl"
                          >
                            View Academy
                            <ArrowRight size={16} />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1 || loading}
                  icon={<ChevronLeft size={16} />}
                >
                  Previous
                </Button>

                <p className="text-sm font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </p>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage >= totalPages || loading}
                  icon={<ChevronRight size={16} />}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
