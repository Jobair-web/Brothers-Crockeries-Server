import { v2 as cloudinary } from "cloudinary";

export const isCloudinaryConfigured = () => Boolean(process.env.CLOUDINARY_URL);

// CLOUDINARY_URL is read automatically by the SDK.
export { cloudinary };
