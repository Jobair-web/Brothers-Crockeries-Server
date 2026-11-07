import { cloudinary, isCloudinaryConfigured } from "./cloudinary.js";
import { getImageKit, isImageKitConfigured } from "./imagekit.js";
import { ApiError } from "../utils/ApiError.js";

const FOLDER = "brothers-crockeries/products";

export function activeProvider() {
  if (isCloudinaryConfigured()) return "cloudinary";
  if (isImageKitConfigured()) return "imagekit";
  return null;
}

/** Upload one multer file (memory buffer). Returns { url, fileId, provider }. */
export async function uploadImage(file) {
  const provider = activeProvider();
  if (!provider) {
    throw new ApiError(503, "Image storage is not configured. Set CLOUDINARY_URL or the IMAGEKIT_* variables in server/.env");
  }

  if (provider === "cloudinary") {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: FOLDER, resource_type: "image" }, (err, res) => (err ? reject(err) : resolve(res)))
        .end(file.buffer);
    });
    return { url: result.secure_url, fileId: result.public_id, provider };
  }

  const result = await getImageKit().upload({
    file: file.buffer,
    fileName: file.originalname || "product.jpg",
    folder: `/${FOLDER}`,
    useUniqueFileName: true,
  });
  return { url: result.url, fileId: result.fileId, provider };
}

/** Best-effort delete – never throws. */
export async function deleteImage({ fileId, provider } = {}) {
  if (!fileId || !provider) return;
  try {
    if (provider === "cloudinary" && isCloudinaryConfigured()) await cloudinary.uploader.destroy(fileId);
    if (provider === "imagekit" && isImageKitConfigured()) await getImageKit().deleteFile(fileId);
  } catch (err) {
    console.warn(`Could not delete image ${fileId}:`, err.message);
  }
}
