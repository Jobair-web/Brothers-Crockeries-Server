import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadImage } from "../config/imageStorage.js";

/** POST /api/upload  (multipart field name: images) */
export const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new ApiError(400, "No images received (field name must be 'images')");
  const images = await Promise.all(req.files.map(uploadImage));
  res.status(201).json({ images });
});
