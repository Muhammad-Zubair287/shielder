import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import HeroSection from './_components/HeroSection';
import CompanyStory from './_components/CompanyStory';
import MissionVision from './_components/MissionVision';
import CoreValues from './_components/CoreValues';
import CompanyTimeline from './_components/CompanyTimeline';
import IndustriesSection from './_components/IndustriesSection';
import WhyChooseUs from './_components/WhyChooseUs';
import StatisticsSection from './_components/StatisticsSection';
import CertificationsSection from './_components/CertificationsSection';
import CTABanner from './_components/CTABanner';

export const metadata = {
  title: 'About SHIELDER | Premium Filtration Solutions',
  description: 'Learn about SHIELDER - a global leader in industrial filtration solutions with over 30 years of experience in providing high-quality filters for heavy-duty equipment.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar />

      <main className="flex-1">
        <HeroSection />
        <CompanyStory />
        <MissionVision />
        <CoreValues />
        <CompanyTimeline />
        {/* <IndustriesSection /> */}
        <WhyChooseUs />
        <StatisticsSection />
        <CertificationsSection />
        <CTABanner />
      </main>

      <LandingFooter />
    </div>
  );
}
