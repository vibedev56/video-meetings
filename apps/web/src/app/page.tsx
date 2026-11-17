import type { Metadata } from 'next';
import { HomeDashboard } from './home-dashboard';

export const metadata: Metadata = {
  title: 'Встречи | Видеовстречи',
  description: 'Ваши видеовстречи.',
};

export default function HomePage() {
  return <HomeDashboard />;
}
