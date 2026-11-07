import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, "Only JPG, PNG, WEBP, GIF or AVIF images are allowed"));
  },
});
