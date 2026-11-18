import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MeetingDetail } from './meeting-detail';

export const metadata: Metadata = {
  title: 'Встреча | Видеовстречи',
  description: 'Файлы встречи.',
};

export default function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Reading `params` is request-time data, so it sits behind Suspense to keep
  // the route prerenderable with cacheComponents.
  return (
    <Suspense>
      <MeetingPageContent params={params} />
    </Suspense>
  );
}

async function MeetingPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingDetail meetingId={id} />;
}
