import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import ApiError from '~/utils/ApiError'
import ms from 'ms'
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

    //Set cookie cho client
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const logout = async (req, res, next) => {
  try {
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    res.status(StatusCodes.OK).json({ loggedOut: true })
  } catch (error) {
    next(error)
  }
}

const refreshToken = async (req, res, next) => {
  try {
    const result = await userService.refreshToken(req.cookies?.refreshToken)

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Please login!'))
  }
}
export const userController = {
  createNewUser,
  getUserById,
  updateUser,
  deleteUser,
  login,
  logout,
  refreshToken
}
