"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

const AMENITIES_OPTIONS = [
  "Parking",
  "Restroom",
  "Water",
  "Changing Room",
  "Lockers",
  "Cafeteria",
  "AC",
  "Lights",
  "Equipment Rental",
  "WiFi",
];

interface AmenitiesMultiSelectProps {
  value: string[];
  onChange: (amenities: string[]) => void;
  disabled?: boolean;
  required?: boolean;
}

export default function AmenitiesMultiSelect({
  value,
  onChange,
  disabled = false,
  required = false,
}: AmenitiesMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAmenity = (amenity: string) => {
    const updated = value.includes(amenity)
      ? value.filter((a) => a !== amenity)
      : [...value, amenity];
    onChange(updated);
  };

  const removeAmenity = (amenity: string) => {
    onChange(value.filter((a) => a !== amenity));
  };

  return (
    <div className="w-full">
      <div className="relative">
        {/* Selected Tags */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-slate-200">
            {value.map((amenity) => (
              <div
                key={amenity}
                className="inline-flex items-center gap-1 bg-power-orange/10 text-power-orange px-3 py-1 rounded-full text-sm"
              >
                <span>{amenity}</span>
                <button
                  type="button"
                  onClick={() => removeAmenity(amenity)}
                  disabled={disabled}
                  className="hover:text-power-orange/70 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white flex items-center justify-between text-slate-900 hover:border-slate-400 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          <span className="text-slate-700">
            {value.length === 0
              ? "Select amenities..."
              : `${value.length} selected`}
          </span>
          <ChevronDown
            size={20}
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 border border-slate-300 rounded-lg bg-white shadow-lg z-10 max-h-64 overflow-y-auto">
            {AMENITIES_OPTIONS.map((amenity) => (
              <label
                key={amenity}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={value.includes(amenity)}
                  onChange={() => toggleAmenity(amenity)}
                  className="w-4 h-4 rounded border-slate-300 accent-power-orange cursor-pointer"
                />
                <span className="text-sm text-slate-900">{amenity}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {required && value.length === 0 && (
        <p className="text-red-500 text-xs mt-1">
          At least one amenity is required
        </p>
      )}
    </div>
  );
}
