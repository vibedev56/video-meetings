import type { Metadata } from 'next';
import { ProfileView } from './profile-view';

export const metadata: Metadata = {
  title: 'Профиль | Видеовстречи',
  description: 'Ваш профиль: имя и email.',
};

export default function ProfilePage() {
  return <ProfileView />;
}
