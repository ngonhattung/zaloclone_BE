import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userValidation } from '~/validations/userValidation.js'
import { userController } from '~/controllers/userController.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
const Router = express.Router()

Router.route('/').get(authMiddleware.isAuthorized, (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'Get list users' })
})

Router.route('/:id')
  .get(authMiddleware.isAuthorized, userController.getUserById)
  .put(
    authMiddleware.isAuthorized,
    userValidation.validateUser,
    userController.updateUser
  )
  .delete(authMiddleware.isAuthorized, userController.deleteUser)

Router.route('/register').post(
  userValidation.validateUser,
  userController.createNewUser
)

Router.route('/login').post(userValidation.login, userController.login)

Router.route('/logout').post(userController.logout)

Router.route('/refresh-token').get(userController.refreshToken)
export const userRoutes = Router
