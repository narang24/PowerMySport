"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

const CERTIFICATIONS_OPTIONS = [
  "NASM Certified",
  "ACE Certified",
  "ISSA Certified",
  "IFS Certified",
  "Sports First Aid",
  "CPR Certified",
  "International Coach",
  "University Degree",
  "Professional League",
  "Other",
];

interface CertificationsMultiSelectProps {
  value: string[];
  onChange: (certifications: string[]) => void;
  disabled?: boolean;
}

export default function CertificationsMultiSelect({
  value,
  onChange,
  disabled = false,
}: CertificationsMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleCertification = (cert: string) => {
    const updated = value.includes(cert)
      ? value.filter((c) => c !== cert)
      : [...value, cert];
    onChange(updated);
  };

  const removeCertification = (cert: string) => {
    onChange(value.filter((c) => c !== cert));
  };

  return (
    <div className="w-full">
      <div className="relative">
        {/* Selected Tags */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-slate-200">
            {value.map((cert) => (
              <div
                key={cert}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
              >
                <span>{cert}</span>
                <button
                  type="button"
                  onClick={() => removeCertification(cert)}
                  disabled={disabled}
                  className="hover:text-blue-900 transition-colors"
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
              ? "Add certifications..."
              : `${value.length} added`}
          </span>
          <ChevronDown
            size={20}
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 border border-slate-300 rounded-lg bg-white shadow-lg z-10 max-h-64 overflow-y-auto">
            {CERTIFICATIONS_OPTIONS.map((cert) => (
              <label
                key={cert}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={value.includes(cert)}
                  onChange={() => toggleCertification(cert)}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm text-slate-900">{cert}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
