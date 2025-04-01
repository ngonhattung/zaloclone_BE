import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userValidation } from '~/validations/userValidation.js'
import { userController } from '~/controllers/userController.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
const Router = express.Router()

Router.route('/').get(authMiddleware.isAuthorized, (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'Get list users' })
})

Router.route('/me').get(authMiddleware.isAuthorized, userController.getMe)
Router.route('/user/:id').get(
  authMiddleware.isAuthorized,
  userController.getUserById
)
Router.route('/all').get(
  authMiddleware.isAuthorized,
  userController.getAllUsers
)
Router.route('/search/:phoneNumber').get(
  authMiddleware.isAuthorized,
  userController.searchUser
)

Router.route('/update').put(
  authMiddleware.isAuthorized,
  multerUploadMiddleware.upload.single('avatar'),
  userValidation.update,
  userController.updateUser
)

Router.route('/delete').delete(
  authMiddleware.isAuthorized,
  userController.deleteUser
)
Router.route('/register').post(
  multerUploadMiddleware.upload.single('avatar'),
  userValidation.validateUser,
  userController.createNewUser
)

Router.route('/login').post(userValidation.login, userController.login)

Router.route('/logout').post(userController.logout)

Router.route('/refresh-token').get(userController.refreshToken)
export const userRoutes = Router
