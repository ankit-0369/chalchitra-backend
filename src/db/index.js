import express from 'express'
import mongoose from 'mongoose'
import { DB_NAME } from '../constant.js'


const connectionDB= async () => {
    
    const connection= await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
    // console.log(connection)
    console.log(`\n connection db port:  ${connection.connection.port}`)
    console.log(`\n host:  ${connection.connection.host}`)

    try {
        
    } catch (error) {
        console.log("Error while Connection with Mongo DB :: ", error)
        process.exit(1)
    }

}

export default connectionDB