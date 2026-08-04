import { PageShell, PageHeader } from '@/components/PageShell';
import { MyBidsSkeleton } from '@/components/pages/MyBids';

export default function Loading() {
  return (
    <PageShell width='wide'>
      <PageHeader title='My bids' />
      <MyBidsSkeleton />
    </PageShell>
  );
}
