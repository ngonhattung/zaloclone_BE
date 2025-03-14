import Joi from 'joi'
import dynamoClient from '~/config/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
const USER_TABLE_NAME = 'users'

const USER_ROLE = {
  ADMIN: 'admin',
  CLIENT: 'client'
}
const USER_TABLE_SCHEMA = Joi.object({
  userID: Joi.string()
    .uuid()
    .default(() => uuidv4()),
  phoneNumber: Joi.string()
    .pattern(/^[0-9]{10,12}$/)
    .required(),
  fullName: Joi.string().min(3).max(100).trim().required(),
  slug: Joi.string().min(3).trim().required(),
  passWord: Joi.string().min(6).max(100).required(),
  avatar: Joi.string().required().default('https://www.google.com'),
  gender: Joi.boolean().required(),
  dayOfBirth: Joi.date()
    .iso()
    .less('now') // Ngày sinh phải trước ngày hiện tại
    .required(),
  role: Joi.string()
    .valid(USER_ROLE.ADMIN, USER_ROLE.CLIENT)
    .default(USER_ROLE.CLIENT),
  createAt: Joi.date().timestamp('javascript').default(Date.now),
  updateAt: Joi.date().timestamp('javascript').default(null),
  destroy: Joi.boolean().default(false)
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
const findOneByPhoneNumber = async (phoneNumber) => {
  try {
    const params = {
      TableName: USER_TABLE_NAME,
      IndexName: 'phoneNumberIndex',
      KeyConditionExpression: 'phoneNumber = :phoneNumber',
      ExpressionAttributeValues: {
        ':phoneNumber': phoneNumber
      }
    }
    const { Items } = await dynamoClient.query(params).promise()
    return Items[0]
  } catch (error) {
    throw new Error(error)
  }
}
const getUserById = async (id) => {
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
const updateUser = async (id, data) => {
  try {
    const updatedData = {
      ...data,
      updateAt: Date.now()
    }
    const params = {
      TableName: USER_TABLE_NAME,
      Key: {
        userID: String(id)
      },
      UpdateExpression:
        'set phoneNumber = :phoneNumber, fullName = :fullName, slug = :slug, passWord = :passWord, avatar = :avatar, gender = :gender, dayOfBirth = :dayOfBirth, updateAt = :updateAt',
      ExpressionAttributeValues: {
        ':phoneNumber': updatedData.phoneNumber,
        ':fullName': updatedData.fullName,
        ':slug': updatedData.slug,
        ':passWord': updatedData.passWord,
        ':avatar': updatedData.avatar,
        ':gender': updatedData.gender,
        ':dayOfBirth': updatedData.dayOfBirth,
        ':updateAt': updatedData.updateAt
      },
      ReturnValues: 'UPDATED_NEW'
    }
    const result = await dynamoClient.update(params).promise()
    return result.Attributes
  } catch (error) {
    throw new Error(error)
  }
}
const deleteUser = async (id) => {
  try {
    const params = {
      TableName: USER_TABLE_NAME,
      Key: {
        userID: String(id)
      },
      UpdateExpression: 'set destroy = :destroy',
      ExpressionAttributeValues: {
        ':destroy': true
      }
    }
    await dynamoClient.update(params).promise()
  } catch (error) {
    throw new Error(error)
  }
}
export const userModel = {
  USER_TABLE_NAME,
  USER_TABLE_SCHEMA,
  createNew,
  findOneById,
  getUserById,
  updateUser,
  deleteUser,
  findOneByPhoneNumber
}
