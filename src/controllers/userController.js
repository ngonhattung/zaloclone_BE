import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
const createNewUser = async (req, res, next) => {
  try {
    const result = await userService.createNewUser(req.body)

    //Có kết quả trả về client
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

export const userController = {
  createNewUser
}
