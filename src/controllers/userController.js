import { StatusCodes } from 'http-status-codes'

const createNewUser = async (req, res, next) => {
  try {
    console.log('req.body', req.body)
    res.status(StatusCodes.CREATED).json({ message: 'Create new user' })
  } catch (error) {
    next(error)
  }
}

export const userController = {
  createNewUser
}
