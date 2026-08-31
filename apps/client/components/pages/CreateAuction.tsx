'use client';

import { createAuction } from '@/actions/CreateAuction';
import ImageUpload from '@/components/ImageUpload';
import { Button } from '@/components/ui/button';
import DateTimePickerComponent from '@/components/ui/DateTimePickerComponent';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Auctionschema, type AuctionT } from '@/types/auction';
import { CATEGORIES } from '@/types/categories';
import { formatMoney } from '@/utils/format';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useState } from 'react';

const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);
const inAWeek = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className='mt-1 text-sm text-destructive' role='alert'>
      {message}
    </p>
  ) : null;

const CreateAuction = () => {
  const router = useRouter();
  const [imgUrl, setImgUrl] = useState('');

  /**
   * One source of truth. The old form kept a second copy of the values in
   * useState and submitted that, so it posted whatever the previous render had
   * -- and pushed dates in through setValue from three separate effects.
   */
  const form = useForm<AuctionT>({
    resolver: zodResolver(Auctionschema),
    defaultValues: {
      title: '',
      description: '',
      startingPrice: undefined,
      startDate: inAnHour(),
      endDate: inAWeek(),
    },
  });

  const { mutate: publish, isPending } = useMutation({
    mutationFn: (values: AuctionT) => createAuction(values, imgUrl),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Lot listed.');
      router.push(`/auction/${result.id}`);
      router.refresh();
    },
    onError: () => toast.error('Could not list the lot. Try again.'),
  });

  const startingPrice = form.watch('startingPrice');

  return (
    <div className='mx-auto max-w-4xl px-4 py-8 md:px-6 lg:py-12'>
      <header className='mb-8'>
        <p className='font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
          New consignment
        </p>
        <h1 className='mt-1.5 font-display text-3xl font-semibold'>List a lot</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Bidding opens and closes automatically at the times you set.
        </p>
      </header>

      <form
        onSubmit={form.handleSubmit((values) => publish(values))}
        className='grid grid-cols-1 gap-8 md:grid-cols-2'
      >
        <div className='space-y-5'>
          <div>
            <Label htmlFor='title'>Title</Label>
            <Input id='title' placeholder='1969 Mustang Mach 1' {...form.register('title')} />
            <FieldError message={form.formState.errors.title?.message} />
          </div>

          <div>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              rows={5}
              placeholder='Condition, provenance, anything a bidder should know.'
              {...form.register('description')}
            />
            <FieldError message={form.formState.errors.description?.message} />
          </div>

          <div>
            <Label htmlFor='startingPrice'>Opening price</Label>
            <Input
              id='startingPrice'
              type='number'
              inputMode='numeric'
              min={1}
              placeholder='10000'
              className='font-mono tabular'
              {...form.register('startingPrice', { valueAsNumber: true })}
            />
            {Number.isFinite(startingPrice) && startingPrice > 0 && (
              <p className='mt-1 font-mono text-xs text-muted-foreground tabular'>
                {formatMoney(startingPrice)}
              </p>
            )}
            <FieldError message={form.formState.errors.startingPrice?.message} />
          </div>

          <div>
            <Label htmlFor='category'>Category</Label>
            <Controller
              control={form.control}
              name='category'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='category'>
                    <SelectValue placeholder='Pick a category' />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={form.formState.errors.category?.message} />
          </div>
        </div>

        <div className='space-y-5'>
          <div>
            <Label>Photo</Label>
            <ImageUpload value={imgUrl} onChange={setImgUrl} />
          </div>

          <div>
            <Label htmlFor='startDate'>Bidding opens</Label>
            <Controller
              control={form.control}
              name='startDate'
              render={({ field }) => (
                <DateTimePickerComponent
                  id='startDate'
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldError message={form.formState.errors.startDate?.message} />
          </div>

          <div>
            <Label htmlFor='endDate'>Bidding closes</Label>
            <Controller
              control={form.control}
              name='endDate'
              render={({ field }) => (
                <DateTimePickerComponent
                  id='endDate'
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldError message={form.formState.errors.endDate?.message} />
          </div>
        </div>

        <div className='md:col-span-2'>
          <Button type='submit' size='lg' className='w-full' disabled={isPending}>
            {isPending ? 'Listing…' : 'List the lot'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateAuction;
