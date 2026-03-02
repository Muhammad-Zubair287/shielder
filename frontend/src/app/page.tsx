import { permanentRedirect } from 'next/navigation';

/**
 * Root route `/` → permanent redirect (308) to the public landing page.
 * 308 is cached by the browser after the first visit so the server is
 * never hit again — eliminates the extra round-trip on every Vercel request.
 */
export default function HomePage() {
  permanentRedirect('/home');
}

