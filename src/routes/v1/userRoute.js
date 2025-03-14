import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userValidation } from '~/validations/userValidation.js'
import { userController } from '~/controllers/userController.js'
const Router = express.Router()

Router.route('/').get((req, res) => {
  res.status(StatusCodes.OK).json({ message: 'Get list users' })
})

Router.route('/:id')
  .get(userController.getUserById)
  .put(userValidation.validateUser, userController.updateUser)
  .delete(userController.deleteUser)

Router.route('/register').post(
  userValidation.validateUser,
  userController.createNewUser
)

Router.route('/login').post(userValidation.login, userController.login)
export const userRoutes = Router
