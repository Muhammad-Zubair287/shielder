import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import ResourcesPageClient from './ResourcesPageClient';

export const metadata = {
  title: 'Resources Center | SHIELDER',
  description:
    'Technical documentation, installation guides, warranty information, FAQs, and support resources for SHIELDER filtration products.',
};

export default function ResourcesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingNavbar />
      <main className="flex-1">
        <ResourcesPageClient />
      </main>
      <LandingFooter />
    </div>
  );
}
