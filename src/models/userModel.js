import Joi from 'joi'
import dynamoClient from '~/config/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
const USER_TABLE_NAME = 'users'
const USER_TABLE_SCHEMA = Joi.object({
  userID: Joi.string()
    .uuid()
    .default(() => uuidv4()),
  phoneNumber: Joi.string()
    .pattern(/^[0-9]{10,12}$/)
    .required(),
  fullName: Joi.string().min(3).max(100).trim().required(),
  slug: Joi.string().min(3).trim().required(),
  passWord: Joi.string().min(6).max(50).required(),
  avatar: Joi.string().required().default('https://www.google.com'),
  gender: Joi.boolean().required(),
  dayOfBirth: Joi.date()
    .iso()
    .less('now') // Ngày sinh phải trước ngày hiện tại
    .required(),
  createAt: Joi.date().timestamp('javascript').default(Date.now),
  updateAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  try {
    console.log('Data before validation:', data)
    return await USER_TABLE_SCHEMA.validateAsync(data, { abortEarly: false })
  } catch (error) {
    throw new Error(error)
  }
}

const createNew = async (data) => {
  try {
    let validatedData = await validateBeforeCreate(data)
    validatedData = {
      ...validatedData,
      dayOfBirth: moment(validatedData.dayOfBirth).format('DD-MM-YYYY') // Lưu dưới dạng dd-mm-yyyy
    }
    const params = {
      TableName: USER_TABLE_NAME,
      Item: validatedData
    }
    await dynamoClient.put(params).promise()
    return validatedData
  } catch (error) {
    throw new Error(error)
  }
}
const findOneById = async (id) => {
  try {
    const params = {
      TableName: USER_TABLE_NAME,
      Key: {
        userID: String(id)
      }
    }
    const { Item } = await dynamoClient.get(params).promise()
    return Item
  } catch (error) {
    throw new Error(error)
  }
}
export const userModel = {
  USER_TABLE_NAME,
  USER_TABLE_SCHEMA,
  createNew,
  findOneById
}
