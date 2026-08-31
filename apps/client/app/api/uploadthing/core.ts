import { getAuth } from '@/lib/auth';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({
    image: { maxFileSize: '4MB', maxFileCount: 1 },
  })
    .middleware(async () => {
      // This shipped with UploadThing's placeholder -- `() => ({ id: 'fakeId' })`
      // -- so the upload endpoint accepted files from anyone on the internet
      // and billed them to this account.
      const { user } = await getAuth();
      if (!user) throw new UploadThingError('Sign in to upload a photo.');

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata }) => {
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
