import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoutes } from '~/routes/v1/userRoute'
import { messageRoutes } from '~/routes/v1/messageRoute'
import { conversationRoutes } from '~/routes/v1/conversationRoute'
const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APis v1 ready to use.' })
})

Router.use('/users', userRoutes)
Router.use('/messages', messageRoutes)
Router.use('/conversations', conversationRoutes)
export const APIs_V1 = Router
