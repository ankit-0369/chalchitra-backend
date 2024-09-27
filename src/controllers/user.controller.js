import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken'
const registerUser = asyncHandler(async (req, res) => {
    console.log("req.files is here :: ", req.files);
    const { username, fullName, email, password } = req?.body;

    if ([username, fullName, email, password].some(field => !field || field.trim() === "")) {
        throw new ApiError(400, "All fields are required but some are missing.");
    }

    // Check if username or email already exists
    const existedUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existedUser) {
        throw new ApiError(409, `Given ${existedUser.email === email ? 'email' : 'username'} already exists.`);
    }

    // Process avatar and cover image uploads
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    let coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload images to Cloudinary in parallel
    const [avatar, coverImage] = await Promise.all([
        uploadOnCloudinary(avatarLocalPath),
        coverImageLocalPath ? uploadOnCloudinary(coverImageLocalPath) : null
    ]);

    // Create the new user
    const newUser = await User.create({
        username,
        fullName,
        email,
        password,
        avatar: avatar?.url,
        coverImage: coverImage ? coverImage.url : "",
    });

    // Prepare the user data excluding sensitive fields
    const userResponse = {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        avatar: newUser.avatar,
        coverImage: newUser.coverImage,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
    };

    return res.status(201).json(
        new ApiResponse(200, userResponse, "User registered successfully")
    );
});


/*
        Steps to Login----
        1. Take {username, email, password} from req.
        2. Find the user.
        3. Check for password correct or not.
        4. Login the user i.e. tokens need to be used.
    */

const generateAccessAndRefreshToken = async (userId) => {

    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return {
        accessToken,
        refreshToken
    }
}
const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    console.log(username, email, password, req.body)
    if (!username && !email)
        throw new ApiError(500, 'username or email is required for login');

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(404, 'User with given email/username not registered');
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, 'Password is incorrect');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select(
        ["-password", "-refreshToken"]
    )

    const options = {
        httpOnly: true,
        secure: true
    }



    res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
               200,
               {loggedInUser, accessToken, refreshToken},
               "user loggedIn success!"
                
            )
        )

})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingToken) {
        throw new ApiError(401, "Unauthorized access")
    }

    const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id)
    if (!user) throw new ApiError(404, "Invalid refresh token")

    if (incomingToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token is expired")
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user?._id)
    const options = {
        httpOnly: true,
        secure: true
    }
    res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200,
                { accessToken, refreshToken: newRefreshToken },
                "token refresh successfully"
            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    if (!user) throw new ApiError(500, 'Something went wrong while logging Out');
    const options = {
        httpOnly: true,
        secure: true
    }

    res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, { user }, 'User Logged Out successfully'))

})

const getUser = asyncHandler(async (req, res) => {

    res.status(200).json(
        new ApiResponse(200, { user: req.user }, 'user found')
    );

})


const updatePassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;
    const user = req.user;
    const isPasswordValid = user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid password')
    }
    const existedUser = await User.findById(user?._id)
    existedUser.password = newPassword;
    await existedUser.save({ validateBeforeSave: false });

    return res.status(200).json(200, 'Password updated successfully');
})

const updateEmail = asyncHandler(async (req, res) => {

    const { email } = req.body;
    if (!email)
        throw new ApiError(404, 'bsdk bina email diye update kya krna chah rha h tu');

    /*
        Here need to apply email verification logic.
    */
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { email }
        },
        { new: true }
    ).select(["-password", "-refreshToken"]);

    return res.status(200).json(
        new ApiResponse(200, 'email updated successfully', { updatedUser })
    );


})


const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath)
        throw new ApiError(401, 'avatar file is missing')

    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const user= await User.findByIdAndUpdate(req.user._id,
        {
            $set: {avatar: avatar.url}
        },
        {new: true}
    ).select(["-password", "-refreshToken"]);

    res.status(200).json(
        new ApiResponse(200, 'avatar updated successfully', {user})
    );

})


const updatecoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath)
        throw new ApiError(401, 'coverImage file is missing')
    /*
        Need to delete the previous images
    */
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)
    const user= await User.findByIdAndUpdate(req.user._id,
        {
            $set: {coverImage: coverImage.url}
        },
        {new: true}
    ).select(["-password", "-refreshToken"]);

    res.status(200).json(
        new ApiResponse(200, 'coverImage updated successfully', {user})
    );

})





export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getUser,
    updatePassword,
    updateEmail,
    updateAvatar,
    updatecoverImage
}
/*Steps to register a user ---
    1. get data from req.
    2. wheather all fields are completed or not,  check for validations.
    3. chheck if user already exist or not.
    4. check for images, avatar given or not.
    5. upload it on cloudinary.
    6. create a user object for DB entry.
    7. remove the refresh token, password from the created object.
    8. return the final response.



*/



// const registerUser= (req, res) => {
//     res.status(200).json({
//         message: "checking without the asynchandler",
//         username: "alpha",
//         password: "asdmalkf"
//     })
// }
