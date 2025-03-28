import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { friendController } from '~/controllers/friendController.js'

const Router = express.Router()

Router.route('/').get(authMiddleware.isAuthorized, friendController.getFriends)
Router.route('/:receiverID').post(
  authMiddleware.isAuthorized,
  friendController.friendRequest
)
Router.route('/:receiverID/cancel').get(
  authMiddleware.isAuthorized,
  friendController.cancelFriendRequest
)

Router.route('/:receiverID/accept').get(
  authMiddleware.isAuthorized,
  friendController.acceptFriendRequest
)
export const friendRoutes = Router
