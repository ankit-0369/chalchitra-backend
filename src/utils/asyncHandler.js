
const asyncHandler= (reqHandler) => {
    return (req, res, next)=> {
        Promise
            .resolve(reqHandler(req, res, next))
            .catch((err) => next(err))
    }
}

export {asyncHandler}


// Another way of handling async functions

// const asyncHandler= (requestHandler) => async (req, res, next) =>{
//     try {

//         await requestHandler(req, res, next)
        
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

// export {asyncHandler}