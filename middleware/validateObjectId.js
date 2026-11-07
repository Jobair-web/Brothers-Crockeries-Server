import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

export const validateObjectId =
  (param = "id") =>
  (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[param])) return next(new ApiError(400, `Invalid ${param}`));
    next();
  };
