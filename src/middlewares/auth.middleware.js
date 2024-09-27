import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'

export const verifyJWT = asyncHandler(async (req, _, next) => {

   try {
     const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "")
 
     if(!token) throw new ApiError(401, 'Unauthorized access')
 
     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
     const user= await User.findById(decodedToken._id).
     select(["-password -refreshToken"])
 
     req.user= user
     if(!user) throw new ApiError(401, 'Unauthorized access')
     next()

   } catch (error) {
    throw new ApiError(401, error?.message || 'Unauthorized access')
   }

})