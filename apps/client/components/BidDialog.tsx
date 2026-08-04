'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from './ui/input';
import { formatMoneyExact } from '@/utils/format';

interface BidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The live price from the store, not the price the page was rendered with. */
  currentAmount: number;
  startingPrice: number;
  isConnected: boolean;
  /** Returns false when the socket is not open, so the failure is visible. */
  onBid: (amount: number) => boolean;
}

const BidDialog = ({
  open,
  onOpenChange,
  currentAmount,
  startingPrice,
  isConnected,
  onBid,
}: BidDialogProps) => {
  const [submitting, setSubmitting] = useState(false);

  // Matches the bid server's rule, so the client rejects what the server would.
  const minimum = Math.max(currentAmount, startingPrice) + 1;

  /**
   * Rebuilt only when the minimum changes. It used to be constructed inline on
   * every render, which handed zodResolver a new identity each time.
   *
   * More importantly it validated against props that were both passed
   * `auction.currentPrice` -- the price as of the server render -- so `startPrice`
   * was meaningless and, once another user bid, the dialog happily accepted an
   * amount below the real current price. It reads the live store value now.
   */
  const dialogSchema = useMemo(
    () =>
      z.object({
        amount: z
          .string()
          .min(1, 'Enter an amount')
          .refine((value) => /^\d+$/.test(value), {
            message: 'Enter a whole number, digits only',
          })
          .refine((value) => Number(value) >= minimum, {
            message: `Bid must be at least ₹${formatMoneyExact(minimum)}`,
          }),
        confirm: z.string().refine((value) => value === 'BID', {
          message: "Type 'BID' in uppercase to confirm",
        }),
      }),
    [minimum]
  );

  const form = useForm<z.infer<typeof dialogSchema>>({
    resolver: zodResolver(dialogSchema),
    defaultValues: { amount: '', confirm: '' },
  });

  const onSubmit = (formData: z.infer<typeof dialogSchema>) => {
    setSubmitting(true);

    // `socket?.send(...)` on a null socket silently dropped the bid while the
    // form reset and the dialog closed -- success UI for a lost bid.
    const sent = onBid(Number(formData.amount));

    setSubmitting(false);
    if (!sent) {
      form.setError('amount', {
        message: 'Not connected to the auction. Please wait and try again.',
      });
      return;
    }

    form.reset();
    onOpenChange(false);
  };

  return (
    // `onOpenChange` receives Radix's boolean and passes it straight through. It
    // used to be wired to a `() => setIsModalOpen(!isModalOpen)` toggle that
    // discarded the argument, so any double invocation (focus return plus Escape)
    // left the dialog stuck.
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Place your bid</DialogTitle>
          {/* Radix logs an accessibility warning without a description. */}
          <DialogDescription>
            Bids are binding and cannot be withdrawn. The current bid is ₹
            {formatMoneyExact(currentAmount)}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
            <FormField
              control={form.control}
              name='amount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor='bid-amount'>Amount</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>
                        ₹
                      </span>
                      <Input
                        id='bid-amount'
                        // No numeric keypad on mobile before, and no currency
                        // affordance at all.
                        inputMode='numeric'
                        autoComplete='off'
                        placeholder={String(minimum)}
                        className='tabular pl-7'
                        {...field}
                      />
                    </div>
                  </FormControl>
                  {/* There was no indication of what would be accepted. */}
                  <FormDescription>
                    Minimum bid ₹{formatMoneyExact(minimum)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='confirm'
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor='bid-confirm'>Confirm</FormLabel>
                  <FormControl>
                    <Input
                      id='bid-confirm'
                      autoComplete='off'
                      placeholder='Type BID to confirm'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='gap-2'>
              {/* There was no way out of the dialog except the corner ✕. */}
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={submitting || !isConnected}>
                {submitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Placing bid…
                  </>
                ) : isConnected ? (
                  'Place bid'
                ) : (
                  'Connecting…'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BidDialog;
