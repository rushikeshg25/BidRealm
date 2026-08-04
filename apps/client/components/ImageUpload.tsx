'use client';

import { OurFileRouter } from '@/app/api/uploadthing/core';
import { UploadDropzone } from '@uploadthing/react';
import Image from 'next/image';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

interface ImageUploadProps {
  ImageURL: (url: string) => void;
  /** So the parent can render a validation message next to the dropzone. */
  error?: string;
}

export default function ImageUpload({ ImageURL, error }: ImageUploadProps) {
  const [imgUrl, setImgUrl] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  const clear = () => {
    setImgUrl('');
    setLoaded(false);
    // The remove button used to clear only this component's local state and never
    // call ImageURL(''), so the parent kept the stale URL in its own imgUrl and
    // submitted it with the form.
    ImageURL('');
  };

  return (
    // Fixed aspect box rather than `w-fit`: the panel used to have no size until an
    // image landed, at which point a 300x300 next/image appeared and shifted the
    // whole two-column form grid.
    <div className='w-full space-y-2'>
      <div className='relative aspect-square w-full overflow-hidden rounded-lg border border-dashed'>
        {imgUrl ? (
          <>
            {/*
              The previous version wrapped this in <Suspense fallback="Loading...">,
              which does nothing -- a plain <Image> is not a suspending resource. An
              onLoad-driven skeleton is what was actually needed.
            */}
            {!loaded ? <Skeleton className='absolute inset-0 rounded-none' /> : null}
            <Image
              alt='Your uploaded auction image'
              src={imgUrl}
              fill
              sizes='(min-width: 768px) 33vw, 100vw'
              className='object-cover'
              onLoad={() => setLoaded(true)}
            />
            {/*
              Was an onClick on the bare <X> SVG: not focusable, not keyboard
              operable, no accessible name, and carrying five hardcoded
              light/dark colour classes.
            */}
            <button
              type='button'
              onClick={clear}
              aria-label='Remove image'
              className='absolute right-2 top-2 z-10 rounded-full border bg-background/90 p-1.5 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background'
            >
              <X className='h-4 w-4' />
            </button>
          </>
        ) : (
          <UploadDropzone<OurFileRouter, 'imageUploader'>
            // Every ut-* class here used to be a hardcoded light/dark pair
            // (ut-label:dark:text-white, ut-button:dark:text-black, and
            // `ut-button:hover:cursor-pointer`, which is not a valid variant
            // combination). These are theme tokens.
            className='h-full border-0 bg-transparent ut-label:text-foreground ut-allowed-content:text-muted-foreground ut-upload-icon:text-muted-foreground ut-button:bg-primary ut-button:text-primary-foreground ut-button:cursor-pointer ut-button:ut-readying:bg-primary/60'
            endpoint='imageUploader'
            onClientUploadComplete={(res) => {
              const url = res?.[0]?.url;
              if (!url) {
                toast.error('Upload finished but returned no URL. Try again.');
                return;
              }
              setImgUrl(url);
              ImageURL(url);
              toast.success('Image uploaded');
            }}
            onUploadError={(uploadError: Error) => {
              console.error('upload error:', uploadError);
              toast.error(uploadError.message || 'Error uploading image.');
            }}
          />
        )}
      </div>

      <p className='text-xs text-muted-foreground'>
        {/* The size and type limits were only enforced server-side, never stated. */}
        PNG, JPG or WEBP — up to 4MB.
      </p>

      {error ? <p className='text-sm text-destructive'>{error}</p> : null}
    </div>
  );
}
