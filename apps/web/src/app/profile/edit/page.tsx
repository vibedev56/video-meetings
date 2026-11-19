import type { Metadata } from 'next';
import { EditProfileForm } from './edit-profile-form';

export const metadata: Metadata = {
  title: 'Изменить имя | Видеовстречи',
  description: 'Измените имя, которое видно в вашем профиле.',
};

export default function EditProfilePage() {
  return <EditProfileForm />;
}
