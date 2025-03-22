import { slugify } from '~/utils/formatters'
import { userModel } from '~/models/userModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import bcryptjs from 'bcryptjs'
import { pickUser } from '~/utils/formatters'

const sendMessage = async (req) => {
  try {
    // Tìm xem 2 người đã từng gửi tin nhắn với nhau hay chưa

    /*Nếu chưa tạo 1 conversation
      - Lưu conversationID + info vào message
      - Lưu userId của 2 người vào user_conversation + lastMessage
    */

    /* Nếu từng nhắn rồi
      - Lưu conversationID, senderId , info vào messages
      - Update lastMessage trong user_conversation của 2 người
    */

    const result = await userModel.createNew()
    const getNewUser = await userModel.findOneById(result.userID)
    //Trả kết quả về, trong service luôn phải có return
    return pickUser(getNewUser)
  } catch (error) {
    throw error
  }
}

const sendFiles = async (req) => {
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

export const messageService = {
  sendMessage,
  sendFiles
}
