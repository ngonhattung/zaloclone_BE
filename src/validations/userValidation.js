import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'

const createNewUser = async (req, res, next) => {
  const schema = Joi.object({
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10,12}$/)
      .required(),
    fullName: Joi.string().min(3).max(100).trim().required(),
    passWord: Joi.string().min(6).max(50).required(),
    avatar: Joi.string()
      .uri() // Kiểm tra xem có phải là URL hợp lệ không
      .required(),
    gender: Joi.boolean().required(),
    dayOfBirth: Joi.date()
      .less('now') // Ngày sinh phải trước ngày hiện tại
      .required(),
    create_at: Joi.date().timestamp()
    // update_at: Joi.date().default(Date.now, 'Current date and time')
  })

  try {
    console.log('req.body', req.body)
    await schema.validateAsync(req.body, { abortEarly: false })
    // next()
    res.status(StatusCodes.CREATED).json({ message: 'Create new user' })
  } catch (error) {
    res
      .status(StatusCodes.UNPROCESSABLE_ENTITY)
      .json({ errors: new Error(error).message })
  }
}

export const userValidation = {
  createNewUser
}
