import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getAuth } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // This shipped as:
      //
      //   const auth = (req: Request) => ({ id: "fakeId" }); // Fake auth function
      //   const user = await auth(req);
      //   if (!user) throw new UploadThingError("Unauthorized");
      //
      // The guard could never fire -- an object literal is always truthy -- so the
      // 4MB upload endpoint was open to the internet and every file was
      // attributed to "fakeId".
      const { user } = await getAuth();
      if (!user) throw new UploadThingError("Unauthorized");

      // Returned value is available as `metadata` in onUploadComplete.
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
