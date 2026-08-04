import { PageShell, PageHeader } from '@/components/PageShell';
import { MyAuctionsSkeleton } from '@/components/pages/MyAuctions';

export default function Loading() {
  return (
    <PageShell width='wide'>
      <PageHeader title='My auctions' />
      <MyAuctionsSkeleton />
    </PageShell>
  );
}
