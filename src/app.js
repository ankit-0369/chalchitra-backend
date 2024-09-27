import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser';


const app= express()

app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,
        Credential: true
    }
))

app.use(express.json({limit: '16kb'}))
app.use(express.urlencoded({limit: '16kb'}))
app.use(express.static("public"))
app.use(cookieParser())


//routes import

import router from './routes/user.routes.js';


//routes declaration

app.use('/api/v1/users', router)
app.use('/test', router)

app.get('/', (req, res) => {
    res.send('Hi again from the project');
})


export {app};