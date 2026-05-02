import { AdminPageHeader } from "@/modules/admin/components/AdminPageHeader";
import { CoachOnboardingForm } from "@/modules/admin/components/CoachOnboardingForm";

export const metadata = {
  title: "Coach Onboarding - PowerMySport Admin",
  description: "Onboard a coach on behalf of the coach from the admin portal",
};

export default function AdminAddCoachPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Coach Onboarding"
        subtitle="Create and activate a coach account on the coach's behalf"
      />
      <CoachOnboardingForm />
    </div>
  );
}
