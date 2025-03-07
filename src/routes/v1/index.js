import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoutes } from '~/routes/v1/userRoute'
const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APis v1 ready to use.' })
})

Router.use('/users', userRoutes)

export const APIs_V1 = Router
