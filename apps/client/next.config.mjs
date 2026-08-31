/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // UploadThing v6 and earlier.
      { hostname: 'utfs.io' },
      // v7 serves new uploads from an app-scoped subdomain, so images uploaded
      // after the migration were failing the optimiser.
      { hostname: '*.ufs.sh' },
    ],
  },
};

export default nextConfig;
