"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { geoApi, GeoSuggestion } from "@/modules/geo/services/geo";
import { Button } from "@/modules/shared/ui/Button";
import SportsMultiSelect from "@/modules/sports/components/SportsMultiSelect";
import AmenitiesMultiSelect from "@/modules/shared/components/AmenitiesMultiSelect";
import OpeningHoursInput, {
  getDefaultOpeningHours,
} from "@/modules/onboarding/components/OpeningHoursInput";
import type {
  AcademyOwnedVenueInput,
  AcademyStep4Payload,
} from "@/modules/onboarding/types/academy";

interface Step4VenuesProps {
  academyId: string;
  onSubmit: (data: AcademyStep4Payload) => Promise<void>;
  loading?: boolean;
  onBack?: () => void;
  previousData?: AcademyStep4Payload;
}

const parseLines = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const toLines = (value?: string[]): string => (value || []).join("\n");

const createEmptyVenue = (): AcademyOwnedVenueInput => ({
  name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  placeId: "",
  location: {
    type: "Point",
    coordinates: [77.2, 28.7],
  },
  sports: [],
  pricePerHour: 0,
  sportPricing: {},
  amenities: [],
  description: "",
  openingHours: getDefaultOpeningHours(),
  allowExternalCoaches: true,
  generalImages: [],
  generalImageKeys: [],
  sportImages: {},
  sportImageKeys: {},
  coverPhotoUrl: "",
  coverPhotoKey: "",
});

export default function Step4Venues({
  academyId,
  onSubmit,
  loading = false,
  onBack,
  previousData,
}: Step4VenuesProps) {
  const [venues, setVenues] = useState<AcademyOwnedVenueInput[]>(
    previousData?.academyVenues?.length
      ? previousData.academyVenues
      : [createEmptyVenue()],
  );
  const [addressQueries, setAddressQueries] = useState<string[]>(
    previousData?.academyVenues?.length
      ? previousData.academyVenues.map((venue) => venue.address)
      : [""],
  );
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] =
    useState<number>(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const skipAutocompleteRef = useRef(false);

  useEffect(() => {
    if (activeSuggestionIndex < 0) {
      setSuggestions([]);
      return;
    }

    if (skipAutocompleteRef.current) {
      skipAutocompleteRef.current = false;
      return;
    }

    const query = (addressQueries[activeSuggestionIndex] || "").trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await geoApi.autocomplete(query);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [activeSuggestionIndex, addressQueries]);

  const updateVenue = (
    index: number,
    updater: (venue: AcademyOwnedVenueInput) => AcademyOwnedVenueInput,
  ) => {
    setVenues((prev) =>
      prev.map((venue, currentIndex) =>
        currentIndex === index ? updater(venue) : venue,
      ),
    );
  };

  const ensureAddressQueriesLength = (nextLength: number) => {
    setAddressQueries((prev) => {
      const copy = [...prev];
      while (copy.length < nextLength) copy.push("");
      return copy.slice(0, nextLength);
    });
  };

  const addVenue = () => {
    setVenues((prev) => {
      const next = [...prev, createEmptyVenue()];
      ensureAddressQueriesLength(next.length);
      return next;
    });
  };

  const removeVenue = (index: number) => {
    setVenues((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
    setAddressQueries((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
    if (activeSuggestionIndex === index) {
      setActiveSuggestionIndex(-1);
      setSuggestions([]);
    }
  };

  const handleAddressQueryChange = (index: number, value: string) => {
    setAddressQueries((prev) =>
      prev.map((query, currentIndex) =>
        currentIndex === index ? value : query,
      ),
    );
    setActiveSuggestionIndex(index);
    updateVenue(index, (venue) => ({
      ...venue,
      address: value,
    }));
  };

  const handleSuggestionSelect = (index: number, suggestion: GeoSuggestion) => {
    skipAutocompleteRef.current = true;
    setAddressQueries((prev) =>
      prev.map((query, currentIndex) =>
        currentIndex === index ? suggestion.label : query,
      ),
    );
    updateVenue(index, (venue) => ({
      ...venue,
      address: suggestion.label,
      location: {
        type: "Point",
        coordinates: [suggestion.lon, suggestion.lat],
      },
    }));
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!venues.length) {
      errors.venues = "Add at least one venue";
    }

    venues.forEach((venue, index) => {
      const key = `venue_${index}`;
      if (!venue.name.trim()) errors[`${key}_name`] = "Venue name is required";
      if (!venue.address.trim())
        errors[`${key}_address`] = "Venue address is required";
      if (!venue.city.trim()) errors[`${key}_city`] = "City is required";
      if (!venue.state.trim()) errors[`${key}_state`] = "State is required";
      if (!/^\d{6}$/.test(venue.pincode)) {
        errors[`${key}_pincode`] = "Pincode must be 6 digits";
      }
      if (!venue.sports.length) {
        errors[`${key}_sports`] = "Select at least one sport";
      }
      if (!venue.pricePerHour || venue.pricePerHour < 100) {
        errors[`${key}_pricePerHour`] = "Price per hour must be at least Rs 1";
      }
      if (!venue.coverPhotoUrl.trim()) {
        errors[`${key}_coverPhotoUrl`] = "Cover photo URL is required";
      }
      if (venue.generalImages.length < 3) {
        errors[`${key}_generalImages`] =
          "At least 3 general image URLs are required";
      }
      for (const sport of venue.sports) {
        if (!venue.sportImages[sport] || venue.sportImages[sport].length < 5) {
          errors[`${key}_sportImages_${sport}`] =
            `Add at least 5 image URLs for ${sport}`;
        }
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      toast.error("Please fix venue details before continuing");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        academyId,
        academyVenues: venues,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save venues",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-xs md:p-8">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-3xl font-bold text-slate-900">
          Step 4: Venue Details
        </h2>
        <p className="text-slate-600">
          Add full venue onboarding details, including sports, amenities, maps
          location, and image URLs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Academy Venues
          </h3>
          <Button
            type="button"
            variant="outline"
            onClick={addVenue}
            disabled={isSubmitting || loading}
          >
            Add Venue
          </Button>
        </div>

        {fieldErrors.venues ? (
          <p className="text-xs text-red-600">{fieldErrors.venues}</p>
        ) : null}

        {venues.map((venue, index) => (
          <div
            key={`academy-venue-${index}`}
            className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">
                Venue {index + 1}
              </h4>
              <button
                type="button"
                className="text-sm text-red-600 disabled:text-slate-400"
                onClick={() => removeVenue(index)}
                disabled={venues.length === 1 || isSubmitting || loading}
              >
                Remove
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={venue.name}
                onChange={(e) =>
                  updateVenue(index, (v) => ({ ...v, name: e.target.value }))
                }
                placeholder="Venue name"
                className="rounded-lg border border-slate-300 px-3 py-2"
                disabled={isSubmitting || loading}
              />
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={addressQueries[index] || ""}
                  onChange={(e) =>
                    handleAddressQueryChange(index, e.target.value)
                  }
                  onFocus={() => setActiveSuggestionIndex(index)}
                  placeholder="Search venue address (Google Maps API)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={isSubmitting || loading}
                />
                {isSearching && activeSuggestionIndex === index ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Searching location...
                  </p>
                ) : null}
                {activeSuggestionIndex === index && suggestions.length > 0 ? (
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    {suggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.label}-${suggestion.lat}-${suggestion.lon}`}
                        type="button"
                        onClick={() =>
                          handleSuggestionSelect(index, suggestion)
                        }
                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {fieldErrors[`venue_${index}_address`] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[`venue_${index}_address`]}
                  </p>
                ) : null}
              </div>
              <input
                type="text"
                value={venue.city}
                onChange={(e) =>
                  updateVenue(index, (v) => ({ ...v, city: e.target.value }))
                }
                placeholder="City"
                className="rounded-lg border border-slate-300 px-3 py-2"
                disabled={isSubmitting || loading}
              />
              <input
                type="text"
                value={venue.state}
                onChange={(e) =>
                  updateVenue(index, (v) => ({ ...v, state: e.target.value }))
                }
                placeholder="State"
                className="rounded-lg border border-slate-300 px-3 py-2"
                disabled={isSubmitting || loading}
              />
              <input
                type="text"
                value={venue.pincode}
                onChange={(e) =>
                  updateVenue(index, (v) => ({ ...v, pincode: e.target.value }))
                }
                placeholder="Pincode"
                className="rounded-lg border border-slate-300 px-3 py-2"
                disabled={isSubmitting || loading}
              />
              <input
                type="number"
                min={1}
                value={venue.pricePerHour ? venue.pricePerHour / 100 : ""}
                onChange={(e) =>
                  updateVenue(index, (v) => ({
                    ...v,
                    pricePerHour: Math.round(Number(e.target.value || 0) * 100),
                  }))
                }
                placeholder="Price per hour"
                className="rounded-lg border border-slate-300 px-3 py-2"
                disabled={isSubmitting || loading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Sports *
              </label>
              <SportsMultiSelect
                value={venue.sports}
                onChange={(sports) =>
                  updateVenue(index, (v) => ({
                    ...v,
                    sports,
                    sportImages: Object.fromEntries(
                      sports.map((sport) => [
                        sport,
                        v.sportImages[sport] || [],
                      ]),
                    ),
                    sportImageKeys: Object.fromEntries(
                      sports.map((sport) => [
                        sport,
                        v.sportImageKeys[sport] || [],
                      ]),
                    ),
                  }))
                }
                disabled={isSubmitting || loading}
                required
              />
              {fieldErrors[`venue_${index}_sports`] ? (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors[`venue_${index}_sports`]}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Amenities
              </label>
              <AmenitiesMultiSelect
                value={venue.amenities}
                onChange={(amenities) =>
                  updateVenue(index, (v) => ({ ...v, amenities }))
                }
                disabled={isSubmitting || loading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Opening Hours
              </label>
              <OpeningHoursInput
                value={venue.openingHours}
                onChange={(openingHours) =>
                  updateVenue(index, (v) => ({ ...v, openingHours }))
                }
              />
            </div>

            <textarea
              value={venue.description || ""}
              onChange={(e) =>
                updateVenue(index, (v) => ({
                  ...v,
                  description: e.target.value,
                }))
              }
              placeholder="Venue description"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              disabled={isSubmitting || loading}
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={venue.allowExternalCoaches}
                onChange={(e) =>
                  updateVenue(index, (v) => ({
                    ...v,
                    allowExternalCoaches: e.target.checked,
                  }))
                }
                disabled={isSubmitting || loading}
              />
              Allow external coaches
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Cover photo URL *
                </label>
                <input
                  type="url"
                  value={venue.coverPhotoUrl}
                  onChange={(e) =>
                    updateVenue(index, (v) => ({
                      ...v,
                      coverPhotoUrl: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={isSubmitting || loading}
                />
                {fieldErrors[`venue_${index}_coverPhotoUrl`] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[`venue_${index}_coverPhotoUrl`]}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Cover photo key (optional)
                </label>
                <input
                  type="text"
                  value={venue.coverPhotoKey || ""}
                  onChange={(e) =>
                    updateVenue(index, (v) => ({
                      ...v,
                      coverPhotoKey: e.target.value,
                    }))
                  }
                  placeholder="s3/key/path"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={isSubmitting || loading}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                General image URLs (one per line, min 3)
              </label>
              <textarea
                rows={3}
                value={toLines(venue.generalImages)}
                onChange={(e) =>
                  updateVenue(index, (v) => ({
                    ...v,
                    generalImages: parseLines(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                disabled={isSubmitting || loading}
              />
              {fieldErrors[`venue_${index}_generalImages`] ? (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors[`venue_${index}_generalImages`]}
                </p>
              ) : null}
            </div>

            {venue.sports.map((sport) => (
              <div key={`${index}-${sport}`}>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  {sport} image URLs (one per line, min 5)
                </label>
                <textarea
                  rows={3}
                  value={toLines(venue.sportImages[sport])}
                  onChange={(e) =>
                    updateVenue(index, (v) => ({
                      ...v,
                      sportImages: {
                        ...v.sportImages,
                        [sport]: parseLines(e.target.value),
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={isSubmitting || loading}
                />
                {fieldErrors[`venue_${index}_sportImages_${sport}`] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[`venue_${index}_sportImages_${sport}`]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ))}

        <div className="flex gap-3 pt-4">
          {onBack ? (
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              disabled={isSubmitting || loading}
            >
              Back
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={isSubmitting || loading}
            className="flex-1"
          >
            {isSubmitting ? "Saving..." : "Continue to Step 5"}
          </Button>
        </div>
      </form>
    </div>
  );
}
