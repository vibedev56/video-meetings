'use client';

import { MeetingsList } from './meetings-list/meetings-list';
import { AppShell } from '@/components/app-shell';
import { LoadError } from '@/components/load-error';
import { PageSpinner } from '@/components/page-spinner';
import { listMeetings } from '@/lib/api';
import { useAuthorizedLoad } from '@/lib/use-authorized-load';

export function HomeDashboard() {
  const { state, reload } = useAuthorizedLoad(listMeetings);

  return (
    <AppShell width="wide" activeNav="meetings">
      {state.status === 'loading' && <PageSpinner />}
      {state.status === 'error' && (
        <LoadError title="Не удалось загрузить встречи" onRetry={reload} />
      )}
      {state.status === 'ready' && <MeetingsList meetings={state.data} />}
    </AppShell>
  );
}
