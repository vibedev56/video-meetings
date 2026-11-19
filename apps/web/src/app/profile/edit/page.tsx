import type { Metadata } from 'next';
import { EditProfileForm } from './edit-profile-form';

export const metadata: Metadata = {
  title: 'Редактирование профиля | Видеовстречи',
  description: 'Измените данные вашего профиля.',
};

export default function EditProfilePage() {
  return <EditProfileForm />;
}
