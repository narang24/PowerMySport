import { redirect } from "next/navigation";

export const metadata = {
  title: "Academy Onboarding - PowerMySport",
  description: "Academy onboarding is now handled inside the admin panel.",
};

export default function AcademyOnboardingPage() {
  redirect("/contact?subject=Academy%20onboarding");
}
