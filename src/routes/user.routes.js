import { Router } from "express";
import {
    getUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAvatar,
    updatecoverImage,
    updateEmail,
    updatePassword

} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router()

router.route('/register').post(
    upload.fields([
        {
            name: "avatar", //this should match exactly with the variable defined in the data model
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        }
    ]),
    registerUser)

router.route('/login').post(loginUser);
router.route('/refresh-token').post(refreshAccessToken);

//secured routes

router.route('/logout').post(verifyJWT, logoutUser);
router.route('/me').get(verifyJWT, getUser);
router.route('/update-password').patch(verifyJWT, updatePassword);
router.route('/update-email').patch(verifyJWT, updateEmail);
router.route('/update-avatar').patch(verifyJWT, upload.single("avatar"), updateAvatar);
router.route('/update-cover-image').patch(verifyJWT, upload.single("coverImage"), updatecoverImage);

export default router


// router.route('/').get((req, res) => {
//     res.json({
//         message: "direct route data"
//     })
// })