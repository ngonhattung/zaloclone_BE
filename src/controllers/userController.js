import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
const createNewUser = async (req, res, next) => {
  try {
    const createdUser = await userService.createNewUser(req.body)

    //Có kết quả trả về client
    res.status(StatusCodes.CREATED).json(createdUser)
  } catch (error) {
    next(error)
  }
}

export const userController = {
  createNewUser
}
