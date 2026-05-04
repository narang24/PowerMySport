"use client";

import { AdminPageHeader } from "@/modules/admin/components/AdminPageHeader";
import { adminApi } from "@/modules/admin/services/admin";
import { Card } from "@/modules/shared/ui/Card";
import { Coach } from "@/types";
import { ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface PaginationData {
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 12;

  const loadCoaches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getCoaches({
        page: currentPage,
        limit: PAGE_SIZE,
      });

      if (response.success && response.data) {
        setCoaches(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
        return;
      }

      setError(response.message || "Failed to load coaches.");
    } catch (loadError) {
      console.error("Failed to load coaches:", loadError);
      setError("Failed to load coaches.");
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  if (loading) {
    return <div className="py-12 text-center">Loading coaches...</div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          badge="Admin"
          title="Coaches"
          subtitle="Browse and manage coach accounts on the platform."
        />
        <Card className="bg-white">
          <div className="space-y-3 py-10 text-center">
            <p className="font-semibold text-red-600">{error}</p>
            <button
              onClick={loadCoaches}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Admin"
        title="Coaches"
        subtitle="Browse and manage coach accounts on the platform."
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {pagination.total} coach{pagination.total === 1 ? "" : "es"} found
        </p>
        <Link
          href="/admin/coaches/add"
          className="inline-flex items-center gap-2 rounded-xl bg-power-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <Plus size={16} /> Add coach
        </Link>
      </div>

      {coaches.length === 0 ? (
        <Card className="bg-white">
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="rounded-full bg-power-orange/10 px-4 py-2 text-sm font-semibold text-power-orange">
              No coaches yet
            </div>
            <p className="max-w-md text-slate-600">
              Coach accounts created from the admin portal will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {coaches.map((coach, coachIndex) => {
            const coachKey =
              coach.id ||
              coach._id ||
              `${coach.bio}-${coach.createdAt}-${coachIndex}`;
            const userInfo =
              typeof coach.userId === "object" && coach.userId !== null
                ? (coach.userId as Record<string, unknown>)
                : null;
            const displayName =
              typeof userInfo?.name === "string"
                ? userInfo.name
                : "Unnamed coach";

            return (
              <Card
                key={coachKey}
                className="bg-white transition-shadow hover:shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {displayName}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {typeof userInfo?.email === "string"
                          ? userInfo.email
                          : "No email"}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      {coach.verificationStatus || "UNVERIFIED"}
                    </span>
                  </div>

                  <p className="line-clamp-3 text-sm text-slate-600">
                    {coach.bio || "No bio provided."}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={16} />
                    <span>
                      {coach.serviceMode}
                      {coach.ownVenueDetails?.address
                        ? ` • ${coach.ownVenueDetails.address}`
                        : ""}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {coach.sports?.length ? (
                      coach.sports.map((sport) => (
                        <span
                          key={`${coachKey}-${sport}`}
                          className="rounded-full bg-power-orange/10 px-2 py-1 text-xs font-medium text-power-orange"
                        >
                          {sport}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No sports</span>
                    )}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    <p>
                      Rate:{" "}
                      <span className="font-semibold">₹{coach.hourlyRate}</span>
                    </p>
                    <p>
                      Rating:{" "}
                      <span className="font-semibold">{coach.rating ?? 0}</span>
                    </p>
                    <p>
                      Reviews:{" "}
                      <span className="font-semibold">
                        {coach.reviewCount ?? 0}
                      </span>
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-slate-600 sm:text-left">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-
            {Math.min(currentPage * PAGE_SIZE, pagination.total)} of{" "}
            {pagination.total} coaches
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 p-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 2),
                Math.min(pagination.totalPages, currentPage + 1),
              )
              .map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-lg px-3 py-2 font-semibold transition-colors ${
                    currentPage === page
                      ? "bg-power-orange text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}

            <button
              onClick={() =>
                setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))
              }
              disabled={currentPage === pagination.totalPages}
              className="rounded-lg border border-slate-300 p-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
