'use client';

import type { OurFileRouter } from '@/app/api/uploadthing/core';
import { UploadDropzone } from '@uploadthing/react';
import { X } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

const ImageUpload = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) => {
  if (value) {
    return (
      <div className='relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border'>
        <Image src={value} alt='The photo you uploaded' fill className='object-cover' />
        <button
          type='button'
          aria-label='Remove photo'
          onClick={() => onChange('')}
          className='absolute right-2 top-2 rounded-full border border-border bg-background p-1 text-foreground shadow-sm'
        >
          <X className='size-4' />
        </button>
      </div>
    );
  }

  return (
    <UploadDropzone<OurFileRouter, 'imageUploader'>
      endpoint='imageUploader'
      className='ut-label:text-foreground ut-allowed-content:text-muted-foreground ut-button:bg-primary ut-button:text-primary-foreground mt-0 rounded-lg border-dashed border-border bg-card'
      onClientUploadComplete={(res) => {
        const url = res?.[0]?.url;
        if (!url) return;
        onChange(url);
        toast.success('Photo added.');
      }}
      onUploadError={(error: Error) => {
        console.error('Upload failed:', error);
        toast.error('That upload did not go through. Try again.');
      }}
    />
  );
};

export default ImageUpload;
