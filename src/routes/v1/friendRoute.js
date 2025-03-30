import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { friendController } from '~/controllers/friendController.js'

const Router = express.Router()

Router.route('/').get(authMiddleware.isAuthorized, friendController.getFriends)
Router.route('/:receiverID').post(
  //gửi lời mời kết bạn
  authMiddleware.isAuthorized,
  friendController.friendRequest
)
Router.route('/:receiverID/cancel').get(
  //hủy lời mời kết bạn
  authMiddleware.isAuthorized,
  friendController.cancelFriendRequest
)

Router.route('/:senderID/accept').get(
  //chấp nhận lời mời kết bạn
  authMiddleware.isAuthorized,
  friendController.acceptFriendRequest
)

Router.route('/:senderID/decline').get(
  //từ chối lời mời kết bạn
  authMiddleware.isAuthorized,
  friendController.declineFriendRequest
)

Router.route('/requests').get(
  //lấy danh sách lời mời kết bạn
  authMiddleware.isAuthorized,
  friendController.getFriendRequests
)

Router.route('/requests/sent').get(
  //lấy danh sách lời mời kết bạn đã gửi
  authMiddleware.isAuthorized,
  friendController.getSentFriendRequests
)
export const friendRoutes = Router
