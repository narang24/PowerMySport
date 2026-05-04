import { AdminPageHeader } from "@/modules/admin/components/AdminPageHeader";
import AcademyOnboardingContainer from "@/modules/onboarding/components/academy/AcademyOnboardingContainer";
import { Suspense } from "react";

export const metadata = {
  title: "Create Academy - PowerMySport Admin",
  description: "Create an academy directly in the admin panel",
};

export default function AdminAddAcademyPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Create Academy"
        subtitle="Collect academy details and complete onboarding from the admin panel"
      />
      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Loading academy form...
          </div>
        }
      >
        <AcademyOnboardingContainer />
      </Suspense>
    </div>
  );
}
