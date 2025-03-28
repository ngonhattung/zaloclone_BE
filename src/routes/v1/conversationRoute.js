import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { conversationController } from '~/controllers/conversationController.js'
const Router = express.Router()

Router.route('/').get(
  authMiddleware.isAuthorized,
  conversationController.getConversations
)

Router.route('/:conversationId').get(
  authMiddleware.isAuthorized,
  conversationController.getConversation
)

export const conversationRoutes = Router
