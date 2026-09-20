import PolicyPage from "@/components/common/PolicyPage";
import { getSiteContent, getBrand, pageTitle } from "@/lib/getSiteContent";

export async function generateMetadata() {
  const [content, brand] = await Promise.all([getSiteContent(), getBrand()]);
  const page = content?.privacyPage;
  return { title: pageTitle(page?.title ?? "Privacy Policy", brand), description: page?.metaDescription };
}

export default async function PrivacyPolicyPage() {
  const content = await getSiteContent();
  if (!content?.privacyPage) return <PolicyPage content={{ title: "Privacy Policy", sections: [] }} />;
  return <PolicyPage content={content.privacyPage} />;
}
