import { redirect } from 'next/navigation';
import { ROUTES } from '@/utils/constants';

export default function HomePage() {
  redirect(ROUTES.LOGIN);
}

