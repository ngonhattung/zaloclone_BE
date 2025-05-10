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

//cấp quyền phó nhóm
Router.post(
  '/admin/deputy',
  authMiddleware.isAuthorized,
  groupController.grantDeputy
) // cấp quyền phó nhóm

//thu hồi quyền phó nhóm
Router.post(
  '/admin/revoke-deputy',
  authMiddleware.isAuthorized,
  groupController.revokeDeputy
) // thu hồi quyền phó nhóm

Router.route('/messages/send').post(
  //gửi tin nhắn text
  authMiddleware.isAuthorized,
  groupController.sendMessage
)

Router.route('/messages/send/files').post(
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
  // trả lời tin nhắn
  '/messages/reply',
  authMiddleware.isAuthorized,
  groupController.replyMessage
)

Router.post(
  //chuyển tiếp tin nhắn
  '/messages/share',
  authMiddleware.isAuthorized,
  groupController.shareMessage
)

Router.get(
  // lấy danh sách nhóm của người dùng
  '/my-groups',
  authMiddleware.isAuthorized,
  groupController.getMyGroups
)

Router.get(
  // lấy tất cả các nhóm
  '/all-groups',
  authMiddleware.isAuthorized,
  groupController.getAllGroups
)

Router.get(
  // lấy thông tin nhóm theo id nhóm
  '/group/:groupID',
  authMiddleware.isAuthorized,
  groupController.getGroupInfo
)

Router.get(
  // lấy danh sách thành viên trong nhóm theo id nhóm
  '/members/:groupID',
  authMiddleware.isAuthorized,
  groupController.getMembersInGroup
)
export const groupRoutes = Router
