import { slugify } from '~/utils/formatters'
import { userModel } from '~/models/userModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import bcryptjs from 'bcryptjs'
import { pickUser } from '~/utils/formatters'
import { env } from '~/config/environment'
import { JwtProvider } from '~/providers/JwtProvider'
const createNewUser = async (req) => {
  try {
    const existedUser = await userModel.findOneByPhoneNumber(req.phoneNumber)
    if (existedUser) {
      throw new ApiError(StatusCodes.CONFLICT, 'Phone number is already taken')
    }
    const newUser = {
      ...req,
      passWord: bcryptjs.hashSync(req.passWord, 8),
      slug: slugify(req.fullName)
    }
    const result = await userModel.createNew(newUser)
    const getNewUser = await userModel.findOneById(result.userID)
    //Trả kết quả về, trong service luôn phải có return
    return pickUser(getNewUser)
  } catch (error) {
    throw error
  }
}
const getUserById = async (userID) => {
  try {
    const result = await userModel.getUserById(userID)
    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    return result
  } catch (error) {
    throw error
  }
}

const updateUser = async (userID, data) => {
  try {
    const user = await userModel.getUserById(userID)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    const updateUser = {
      ...data,
      slug: slugify(data.fullName)
    }
    const result = await userModel.updateUser(userID, updateUser)
    return result
  } catch (error) {
    throw error
  }
}

const deleteUser = async (userID) => {
  try {
    const user = await userModel.getUserById(userID)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    await userModel.deleteUser(userID)
  } catch (error) {
    throw error
  }
}

const login = async (req) => {
  try {
    const user = await userModel.findOneByPhoneNumber(req.phoneNumber)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    if (!bcryptjs.compareSync(req.passWord, user.passWord)) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Password is incorrect')
    }

    const userInfo = {
      userID: user.userID,
      phoneNumber: user.phoneNumber
    }

    const accessToken = await JwtProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET,
      env.ACCESS_TOKEN_LIFE
    )
    const refreshToken = await JwtProvider.generateToken(
      userInfo,
      env.REFRESH_TOKEN_SECRET,
      env.REFRESH_TOKEN_LIFE
    )

    return {
      accessToken,
      refreshToken,
      ...pickUser(user)
    }
  } catch (error) {
    throw error
  }
}
export const userService = {
  createNewUser,
  getUserById,
  updateUser,
  deleteUser,
  login
}
