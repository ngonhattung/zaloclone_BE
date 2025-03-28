import { slugify } from '~/utils/formatters'
import { userModel } from '~/models/userModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import bcryptjs from 'bcryptjs'
import { pickUser } from '~/utils/formatters'
import { conversationModel } from '~/models/conversationModel'
import { messageModel } from '~/models/messageModel'
import { getReceiverSocketId, getUserSocketId, io } from '~/config/socket'

const sendMessage = async (userID, receiverId, message) => {
  try {
    // Tìm xem 2 người đã từng gửi tin nhắn với nhau hay chưa
    const conversation = await conversationModel.haveTheyChatted(
      userID,
      receiverId
    )
    let msg = {}
    if (conversation) {
      /* Nếu từng nhắn rồi
      - Lưu conversationID, senderId , info vào messages
      - Update lastMessage trong user_conversation của 2 người
    */
      const messageData = {
        conversationID: conversation.conversationID,
        senderID: userID,
        content: message,
        type: 'text'
      }

      const createNewMessage = await messageModel.createNewMessage(messageData)

      const userConversation = {
        conversationID: conversation.conversationID,
        lastMessage: createNewMessage.messageID
      }

      await conversationModel.updateLastMessage(userID, userConversation)
      await conversationModel.updateLastMessage(receiverId, userConversation)

      const userSockerID = getUserSocketId(userID)
      const receiverSocketID = getReceiverSocketId(receiverId)

      if (receiverSocketID && userSockerID) {
        io.to(receiverSocketID).emit('newMessage', createNewMessage)
        io.to(userSockerID).to(receiverSocketID).emit('notification')
      }
      io.to(userSockerID).emit('notification')

      msg = { conversation, createNewMessage }
    } else {
      /*Nếu chưa
      - tạo 1 conversation -> lưu vào database, tạo 1 message -> lưu vào database
      - Lưu conversationID + info vào message
      - Lưu userId của 2 người vào user_conversation + lastMessage
    */
      const createConversation = await conversationModel.createNewConversation()

      const messageData = {
        conversationID: createConversation.conversationID,
        senderID: userID,
        content: message,
        type: 'text'
      }

      const createNewMessage = await messageModel.createNewMessage(messageData)

      const userConversation = {
        conversationID: createConversation.conversationID,
        lastMessage: createNewMessage.messageID
      }

      await conversationModel.addUserToConversation(userID, userConversation)
      await conversationModel.addUserToConversation(
        receiverId,
        userConversation
      )

      const userSockerID = getUserSocketId(userID)
      const receiverSocketID = getReceiverSocketId(receiverId)

      if (userSockerID && receiverSocketID) {
        // Gửi conversation mới tới cả 2 người
        io.to(receiverSocketID)
          .to(userSockerID)
          .emit('newConversation', createConversation)

        // Gửi tin nhắn mới tới người nhận
        io.to(receiverSocketID).emit('newMessage', createNewMessage)
      } else {
        // Gửi conversation mới tới người gửi
        io.to(userSockerID).emit('newConversation', createConversation)
      }

      msg = { createConversation, createNewMessage }
    }

    return msg
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
