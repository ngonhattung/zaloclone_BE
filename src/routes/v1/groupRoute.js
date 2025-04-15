import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { groupController } from '~/controllers/groupController.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
const Router = express.Router()

Router.route('/').get(authMiddleware.isAuthorized, (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'Get list groups' })
})

Router.post(
  '/create',
  authMiddleware.isAuthorized,
  multerUploadMiddleware.upload.single('avatarGroup'), // tạo nhóm
  groupController.createGroup
) // tạo nhóm
Router.post('/invite', authMiddleware.isAuthorized, groupController.inviteGroup) // mời vào nhóm
Router.post('/leave', authMiddleware.isAuthorized, groupController.leaveGroup) // rời nhóm
Router.post(
  '/kick-member',
  authMiddleware.isAuthorized,
  groupController.kickMember
) // kích ra khỏi nhóm
Router.post('/delete', authMiddleware.isAuthorized, groupController.deleteGroup) // giải tán nhóm
Router.post(
  '/admin/grant',
  authMiddleware.isAuthorized,
  groupController.grantAdmin
) // cấp quyền admin
// Router.post(
//   '/admin/revoke',
//   authMiddleware.isAuthorized,
//   groupController.revokeAdmin
// ) // thu hồi quyền admin

Router.route('/messages/send/:conversationId').post(
  //gửi tin nhắn text
  authMiddleware.isAuthorized,
  groupController.sendMessage
)

Router.route('/messages/send/files/:conversationId').post(
  //gửi tin nhắn files
  authMiddleware.isAuthorized,
  multerUploadMiddleware.upload.array('files', 10),
  groupController.sendFiles
)

Router.post(
  // thu hồi tin nhắn
  '/messages/revoke',
  authMiddleware.isAuthorized,
  groupController.revokeMessage
)

Router.post(
  // xóa tin nhắn
  '/messages/delete',
  authMiddleware.isAuthorized,
  groupController.deleteMessage
)

Router.post(
  //chuyển tiếp tin nhắn
  '/messages/share',
  authMiddleware.isAuthorized,
  groupController.shareMessage
)
export const groupRoutes = Router
