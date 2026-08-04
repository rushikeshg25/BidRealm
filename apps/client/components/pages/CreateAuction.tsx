'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

import { createAuction } from '@/actions/CreateAuction';
import { Auctionschema, AuctionT } from '@/types/auction';
import { CATEGORIES } from '@/types/categories';
import { PageShell, PageHeader } from '../PageShell';
import ImageUpload from '../ImageUpload';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import DateTimePickerComponent from '../ui/DateTimePickerComponent';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** A shared field wrapper, so the error styling is defined once. */
const Field = ({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className='space-y-1.5'>
    {/* Nearly every label in this form pointed at a nonexistent id: htmlFor="title"
        with no id on the Input, htmlFor="description" used *twice* (the second for
        Starting Price), and htmlFor="start-date"/"end-date"/"categories" matching
        nothing at all. */}
    <Label htmlFor={id}>{label}</Label>
    {children}
    {hint && !error ? (
      <p className='text-xs text-muted-foreground'>{hint}</p>
    ) : null}
    {/* Was `text-red-500` hardcoded in seven places rather than text-destructive. */}
    {error ? <p className='text-sm text-destructive'>{error}</p> : null}
  </div>
);

const CreateAuction = () => {
  const router = useRouter();
  const [imgUrl, setImgUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AuctionT>({
    resolver: zodResolver(Auctionschema),
    defaultValues: { title: '', description: '', Categories: '' },
  });

  const { mutate: server_createAuction, isPending } = useMutation({
    // The payload is an argument. It used to be read from a `data` useState that
    // onSubmit set with setData() and then immediately submitted -- but setState is
    // asynchronous, so the closure still held the previous value and the first
    // submit posted the empty initial state.
    //
    // `userId` is gone too: it used to be passed from the client, so anyone could
    // create auctions attributed to any user. The action reads it from the session.
    mutationFn: async (payload: AuctionT) => createAuction(payload, imgUrl),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Auction created');
      router.push('/my-auctions');
    },
    onError: () => {
      toast.error("We couldn't create your auction. Please try again.");
    },
  });

  const onSubmit = (data: AuctionT) => {
    // An empty image used to be accepted here and then crashed the detail page,
    // where next/image throws on src="". The action rejects it as well.
    if (!imgUrl) {
      setImageError('Please upload an image for your auction.');
      return;
    }
    setImageError(undefined);
    server_createAuction(data);
  };

  return (
    <PageShell width='default'>
      <PageHeader
        title='Create an auction'
        description='Set a reserve, choose when bidding opens and closes, and publish.'
      />

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]'>
          {/* Was one flat bordered box with `dark:border border` -- redundant, and
              with no section grouping at all. */}
          <div className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Item details</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <Field id='title' label='Title' error={errors.title?.message}>
                  <Input
                    id='title'
                    placeholder='e.g. 1969 Mustang Fastback'
                    {...register('title')}
                  />
                </Field>

                <Field
                  id='description'
                  label='Description'
                  error={errors.description?.message}
                  hint='What is it, what condition is it in, what is included.'
                >
                  <Textarea
                    id='description'
                    rows={6}
                    placeholder='Describe the item'
                    {...register('description')}
                  />
                </Field>

                <Field
                  id='categories'
                  label='Category'
                  error={errors.Categories?.message}
                >
                  {/*
                    Was mirrored into the form with a `useEffect` on a separate
                    useState -- one of three such effects. Controller is what
                    react-hook-form provides for non-native inputs.
                  */}
                  <Controller
                    control={control}
                    name='Categories'
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id='categories'>
                          <SelectValue placeholder='Choose a category' />
                        </SelectTrigger>
                        <SelectContent>
                          {/* The mapped SelectItem had no `key`. */}
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Pricing and schedule</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <Field
                  id='startingPrice'
                  label='Starting price'
                  error={errors.startingPrice?.message}
                  hint='The lowest bid you will accept.'
                >
                  <div className='relative'>
                    <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>
                      ₹
                    </span>
                    {/*
                      Was `onChange={(e) => setValue('startingPrice', Number(...))}`
                      instead of register, so there was no onBlur and no touched
                      state. valueAsNumber does the coercion.
                    */}
                    <Input
                      id='startingPrice'
                      type='number'
                      min={1}
                      step={1}
                      inputMode='numeric'
                      placeholder='10000'
                      className='tabular pl-7'
                      {...register('startingPrice', { valueAsNumber: true })}
                    />
                  </div>
                </Field>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <Field
                    id='start-date'
                    label='Bidding opens'
                    error={errors.startDate?.message}
                  >
                    <Controller
                      control={control}
                      name='startDate'
                      render={({ field }) => (
                        <DateTimePickerComponent
                          id='start-date'
                          value={field.value}
                          minDate={new Date()}
                          Datehandler={field.onChange}
                        />
                      )}
                    />
                  </Field>

                  <Field
                    id='end-date'
                    label='Bidding closes'
                    error={errors.endDate?.message}
                  >
                    <Controller
                      control={control}
                      name='endDate'
                      render={({ field }) => (
                        <DateTimePickerComponent
                          id='end-date'
                          value={field.value}
                          minDate={new Date()}
                          Datehandler={field.onChange}
                        />
                      )}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Was a single centred dropzone in a full-height grid cell, leaving a
              large empty area beside the form on desktop. */}
          <div className='lg:sticky lg:top-24 lg:self-start'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Photo</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  ImageURL={(url) => {
                    setImgUrl(url);
                    if (url) setImageError(undefined);
                  }}
                  error={imageError}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          {/* There was no pending state, so double-clicking Publish created two
              auctions. */}
          <Button type='submit' disabled={isPending} className='min-w-32'>
            {isPending ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Publishing…
              </>
            ) : (
              'Publish auction'
            )}
          </Button>
        </div>
      </form>
    </PageShell>
  );
};

export default CreateAuction;
