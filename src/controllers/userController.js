import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import { JwtProvider } from '~/providers/JwtProvider'
const createNewUser = async (req, res, next) => {
  try {
    const result = await userService.createNewUser(req.body)

    //Có kết quả trả về client
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

const getUserById = async (req, res, next) => {
  try {
    const userID = req.params.id
    const result = await userService.getUserById(userID)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const updateUser = async (req, res, next) => {
  try {
    const userID = req.params.id
    const result = await userService.updateUser(userID, req.body)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const deleteUser = async (req, res, next) => {
  try {
    const userID = req.params.id
    await userService.deleteUser(userID)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (error) {
    next(error)
  }
}

const login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
export const userController = {
  createNewUser,
  getUserById,
  updateUser,
  deleteUser,
  login
}
