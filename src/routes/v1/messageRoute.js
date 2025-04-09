import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { messageController } from '~/controllers/messageController'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
const Router = express.Router()

Router.route('/').get(authMiddleware.isAuthorized, (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'Get list messages' })
})

Router.route('/send/:receiverId').post(
  //gửi tin nhắn text
  authMiddleware.isAuthorized,
  messageController.sendMessage
)
// Router.route('/send/images/:receiverId').post(
//   authMiddleware.isAuthorized,
//   multerUploadMiddleware.upload.array('images', 10),
//   messageController.sendImages
// )
Router.route('/send/files/:receiverId').post(
  //gửi tin nhắn files
  authMiddleware.isAuthorized,
  multerUploadMiddleware.upload.array('files', 10),
  messageController.sendFiles
)
// Router.route('/send/videos/:receiverId').post(
//   authMiddleware.isAuthorized,
//   multerUploadMiddleware.upload.array('videos', 10),
//   messageController.sendVideos
// )
Router.post(
  // thu hồi tin nhắn
  '/revoke/:participantId',
  authMiddleware.isAuthorized,
  messageController.revokeMessage
)

Router.post(
  // xóa tin nhắn
  '/delete',
  authMiddleware.isAuthorized,
  messageController.deleteMessage
)

Router.post(
  //chuyển tiếp tin nhắn
  '/share',
  authMiddleware.isAuthorized,
  messageController.shareMessage
)
Router.get(
  '/conversation/:conversationID',
  authMiddleware.isAuthorized,
  messageController.getMessagesByConversation
)
export const messageRoutes = Router
