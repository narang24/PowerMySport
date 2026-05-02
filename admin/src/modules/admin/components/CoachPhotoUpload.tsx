"use client";

import { toast } from "@/lib/toast";
import { uploadFileToPresignedUrl } from "@/modules/onboarding/services/onboarding";
import { adminApi } from "@/modules/admin/services/admin";
import { Camera, Loader, Trash2 } from "lucide-react";
import { useState } from "react";

interface CoachPhotoUploadProps {
  onPhotoReady: (photoUrl: string | null, photoKey: string | null) => void;
  disabled?: boolean;
  currentPhotoUrl?: string;
}

export default function CoachPhotoUpload({
  onPhotoReady,
  disabled = false,
  currentPhotoUrl,
}: CoachPhotoUploadProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    currentPhotoUrl || null,
  );
  const [photoKey, setPhotoKey] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handlePhotoSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Get presigned URL from server
      const response = await adminApi.getCoachPhotoUploadUrl(
        file.name,
        file.type,
      );

      if (!response.success || !response.data) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, downloadUrl, key } = response.data;

      // Upload to S3
      await uploadFileToPresignedUrl(file, uploadUrl, file.type);

      // Store photo info
      setPhotoUrl(downloadUrl);
      setPhotoKey(key);
      onPhotoReady(downloadUrl, key);

      toast.success("Profile photo uploaded successfully");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    setPhotoKey("");
    onPhotoReady(null, null);
    setError("");
  };

  return (
    <div className="w-full">
      {photoUrl ? (
        <div className="relative w-32 h-32 mx-auto">
          <img
            src={photoUrl}
            alt="Coach profile"
            className="w-full h-full object-cover rounded-lg border-2 border-green-300"
          />
          <button
            type="button"
            onClick={handleRemovePhoto}
            disabled={disabled}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-32 h-32 mx-auto border-2 border-dashed border-slate-300 rounded-lg hover:border-power-orange hover:bg-power-orange/5 transition-all cursor-pointer">
          {uploading ? (
            <Loader className="animate-spin text-power-orange" size={32} />
          ) : (
            <>
              <Camera className="text-slate-400 mb-2" size={32} />
              <span className="text-xs text-slate-600 text-center">
                Upload Photo
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files?.[0] && handlePhotoSelect(e.target.files[0])
            }
            className="hidden"
            disabled={disabled || uploading}
          />
        </label>
      )}

      {error && (
        <p className="text-red-500 text-xs mt-2 text-center">{error}</p>
      )}

      <p className="text-xs text-slate-600 mt-3 text-center">
        Square image recommended (min 200x200px, max 5MB)
      </p>
    </div>
  );
}
