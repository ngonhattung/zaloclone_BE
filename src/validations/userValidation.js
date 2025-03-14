import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
const validateUser = async (req, res, next) => {
  const schema = Joi.object({
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10,12}$/)
      .required(),
    fullName: Joi.string().min(3).max(100).trim().required(),
    passWord: Joi.string().min(6).max(50).required(),
    avatar: Joi.string().required(),
    gender: Joi.boolean().required(),
    dayOfBirth: Joi.date()
      .iso()
      .less('now') // Ngày sinh phải trước ngày hiện tại
      .required()
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })

    // Nếu không có lỗi thì chuyển hướng sang controller
    next()
  } catch (error) {
    next(
      new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message)
    )
  }
}

const login = async (req, res, next) => {
  const schema = Joi.object({
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10,12}$/)
      .required(),
    passWord: Joi.string().min(6).max(50).required()
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })

    // Nếu không có lỗi thì chuyển hướng sang controller
    next()
  } catch (error) {
    next(
      new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message)
    )
  }
}
export const userValidation = {
  validateUser,
  login
}
