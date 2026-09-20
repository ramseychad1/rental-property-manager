import PolicyPage from "@/components/common/PolicyPage";
import { getSiteContent, getBrand, pageTitle } from "@/lib/getSiteContent";

export async function generateMetadata() {
  const [content, brand] = await Promise.all([getSiteContent(), getBrand()]);
  const page = content?.refundPage;
  return { title: pageTitle(page?.title ?? "Refund Policy", brand), description: page?.metaDescription };
}

export default async function RefundPolicyPage() {
  const content = await getSiteContent();
  if (!content?.refundPage) return <PolicyPage content={{ title: "Refund Policy", sections: [] }} />;
  return <PolicyPage content={content.refundPage} />;
}
