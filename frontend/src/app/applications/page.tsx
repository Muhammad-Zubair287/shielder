import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import ComingSoonPage from '@/components/ComingSoonPage';

export const metadata = {
  title: 'Applications | SHIELDER',
  description: 'Industrial filtration applications for heavy-duty equipment.',
};

export default function ApplicationsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar />
      <ComingSoonPage />
      <LandingFooter />
    </div>
  );
}