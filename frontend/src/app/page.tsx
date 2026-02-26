import { redirect } from 'next/navigation';

/**
 * Root route `/` → redirect to the public landing page.
 * Authenticated users land on the landing page and follow the Login link
 * to reach their role-specific dashboard.
 */
export default function HomePage() {
  redirect('/home');
}

