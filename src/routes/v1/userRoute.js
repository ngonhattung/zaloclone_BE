import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userValidation } from '~/validations/userValidation.js'

const Router = express.Router()

Router.route('/')
  .get((req, res) => {
    res.status(StatusCodes.OK).json({ message: 'Get list users' })
  })
  .post(userValidation.createNewUser)

Router.route('/:id')
  .get((req, res) => {
    const { id } = req.params
    res.status(StatusCodes.OK).json({ message: `Get user with ID: ${id}` })
  })
  .put((req, res) => {
    const { id } = req.params
    res.status(StatusCodes.OK).json({ message: `Update user with ID: ${id}` })
  })
  .delete((req, res) => {
    const { id } = req.params
    res.status(StatusCodes.OK).json({ message: `Delete user with ID: ${id}` })
  })
export const userRoutes = Router
