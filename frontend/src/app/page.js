import { api } from "@/services/api";
import HeroSection from "@/components/home/HeroSection";
import OrangeBar from "@/components/home/OrangeBar";
import LifestyleSection from "@/components/home/LifestyleSection";
import NearbySection from "@/components/home/NearbySection";
import TestimonialSlider from "@/components/home/TestimonialSlider";
import TealBand from "@/components/home/TealBand";

export default async function HomePage() {
  let properties = [];
  let content = null;

  try {
    const response = await api.listProperties();
    properties = (response.data ?? []).filter((p) => !p.isPrivate);
  } catch (error) {
    console.error("Failed to load homepage properties", error);
  }

  try {
    const response = await api.getSiteContent();
    content = response.data;
  } catch (error) {
    console.error("Failed to load homepage content", error);
  }
  if (!content) return null;

  return (
    <div>
      <HeroSection initialProperties={properties} content={content.hero} />
      <OrangeBar content={content.featureBar} />
      <LifestyleSection content={content.lifestyle} />
      <div style={{ backgroundColor: content.nearby.backgroundColor }}>
        <div className="mx-auto max-w-7xl px-5 pb-20 grid lg:grid-cols-[2fr_1fr] gap-10 items-stretch">
          <NearbySection content={content.nearby} />
          <TestimonialSlider content={content.testimonials} />
        </div>
      </div>
      <TealBand content={content.trustBand} />
    </div>
  );
}
