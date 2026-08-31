'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bidIncrement } from '@repo/db/auction-rules';
import { formatMoney } from '@/utils/format';

const BidDialog = ({
  minimumBid,
  disabled,
  disabledReason,
  onBid,
}: {
  minimumBid: number;
  disabled: boolean;
  disabledReason?: string;
  onBid: (amount: number) => boolean;
}) => {
  const [open, setOpen] = useState(false);

  /**
   * Rebuilt whenever the floor moves, so the form validates against the live
   * price. It used to be built once from the price in the initial server
   * render, so after someone else bid it happily accepted a stale, too-low
   * amount that the server then rejected.
   */
  const schema = z.object({
    amount: z.coerce
      .number({ invalid_type_error: 'Enter an amount' })
      .int('Bid in whole rupees')
      .min(minimumBid, `The next bid has to be at least ${formatMoney(minimumBid)}`),
  });

  const form = useForm<{ amount: number }>({
    resolver: zodResolver(schema),
    defaultValues: { amount: minimumBid },
  });

  // Keep the prefilled amount in step with the floor while the dialog is shut.
  useEffect(() => {
    if (!open) form.reset({ amount: minimumBid });
  }, [minimumBid, open, form]);

  const amount = form.watch('amount');
  const step = bidIncrement(minimumBid);

  const onSubmit = ({ amount }: { amount: number }) => {
    if (!onBid(amount)) {
      form.setError('amount', {
        message: 'Not connected to the saleroom. Try again in a moment.',
      });
      return;
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='paddle' size='lg' className='w-full' disabled={disabled}>
          {disabled && disabledReason ? disabledReason : 'Place bid'}
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='font-display'>Place your bid</DialogTitle>
          <DialogDescription>
            The next valid bid is{' '}
            <span className='font-mono tabular'>{formatMoney(minimumBid)}</span>. Bids
            cannot be withdrawn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='bid-amount'>Your bid</Label>
            <Input
              id='bid-amount'
              type='number'
              inputMode='numeric'
              step={step}
              min={minimumBid}
              className='font-mono text-lg tabular'
              autoFocus
              {...form.register('amount')}
            />
            {form.formState.errors.amount && (
              <p className='text-sm text-destructive' role='alert'>
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          <div className='flex flex-wrap gap-2'>
            {[0, 1, 2].map((multiplier) => {
              const quick = minimumBid + step * multiplier;
              return (
                <Button
                  key={quick}
                  type='button'
                  variant='outline'
                  size='sm'
                  className='font-mono tabular'
                  onClick={() =>
                    form.setValue('amount', quick, { shouldValidate: true })
                  }
                >
                  {formatMoney(quick)}
                </Button>
              );
            })}
          </div>

          {/* The button says exactly what pressing it does, and carries the same
              name as the action it completes. */}
          <Button
            type='submit'
            variant='paddle'
            className='w-full'
            disabled={form.formState.isSubmitting}
          >
            {Number.isFinite(amount) && amount >= minimumBid
              ? `Bid ${formatMoney(amount)}`
              : 'Bid'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BidDialog;
