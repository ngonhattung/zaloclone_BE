import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import ApiError from '~/utils/ApiError'
import ms from 'ms'
const createNewUser = async (req, res, next) => {
  try {
    const userAvatarFile = req.file
    console.log('User avatar file:', userAvatarFile)
    const result = await userService.createNewUser(req.body, userAvatarFile)

    //Có kết quả trả về client
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}
const getMe = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    console.log('User ID:', userID)
    const result = await userService.getUserById(userID)
    res.status(StatusCodes.OK).json(result)
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
    const userID = req.jwtDecoded.userID
    const userAvatarFile = req.file
    const result = await userService.updateUser(
      userID,
      req.body,
      userAvatarFile
    )
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const forgetPassword = async (req, res, next) => {
  try {
    console.log('req.body', req.body)
    const { newPassWord, phoneNumber } = req.body
    const result = await userService.forgetPassword(phoneNumber, newPassWord)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const existPhoneNumber = async (req, res, next) => {
  try {
    const phoneNumber = req.params.phoneNumber
    const result = await userService.searchUser(phoneNumber)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const deleteUser = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    await userService.deleteUser(userID)
    res.status(StatusCodes.OK).send()
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

const searchUser = async (req, res, next) => {
  try {
    const phoneNumber = req.params.phoneNumber
    const result = await userService.searchUser(phoneNumber)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getAllUsers = async (req, res, next) => {
  try {
    const result = await userService.getAllUsers()
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
  login,
  logout,
  refreshToken,
  getMe,
  searchUser,
  getAllUsers,
  forgetPassword,
  existPhoneNumber
}
