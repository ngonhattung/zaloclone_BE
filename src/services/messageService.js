import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { conversationModel } from '~/models/conversationModel'
import { messageModel } from '~/models/messageModel'
import { getReceiverSocketId, getUserSocketId, io } from '~/config/socket'
import { S3Provider } from '~/providers/S3Provider'
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

const sendFiles = async (userID, receiverId, files) => {
  try {
    // Tìm xem 2 người đã từng gửi tin nhắn với nhau hay chưa
    const conversation = await conversationModel.haveTheyChatted(
      userID,
      receiverId
    )
    let msg = {}

    //Lưu message vào database
    const saveMessage = async (result) => {
      try {
        const fileParts = result.originalname.split('.')
        const fileType =
          fileParts.length > 1 ? fileParts[fileParts.length - 1] : 'unknown'

        const messageData = {
          conversationID: conversation.conversationID,
          senderID: userID,
          content: result.originalname,
          url: result.Location,
          type: fileType
        }

        return await messageModel.createNewMessage(messageData)
      } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error)
      }
    }

    //Nếu đã từng nhắn tin
    if (conversation) {
      const promiseUpload = files.map((file) =>
        S3Provider.streamUpload(file, userID)
      )

      try {
        const uploadResults = await Promise.all(promiseUpload)
        const messageResults = await Promise.all(uploadResults.map(saveMessage))

        if (messageResults) {
          const userConversation = {
            conversationID: conversation.conversationID,
            lastMessage: messageResults[messageResults.length - 1].messageID
          }

          await conversationModel.updateLastMessage(userID, userConversation)
          await conversationModel.updateLastMessage(
            receiverId,
            userConversation
          )

          const userSockerID = getUserSocketId(userID)
          const receiverSocketID = getReceiverSocketId(receiverId)

          if (receiverSocketID && userSockerID) {
            io.to(receiverSocketID).emit('newMessage', messageResults)
            io.to(userSockerID).to(receiverSocketID).emit('notification')
          }
          io.to(userSockerID).emit('notification')

          msg = { conversation, messageResults }
        }
      } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error)
      }
    } else {
      //Nếu chưa từng nhắn tin
      const createConversation = await conversationModel.createNewConversation()

      //Đưa upload file vào mảng promiseUpload
      const promiseUpload = files.map((file) =>
        S3Provider.streamUpload(file, userID)
      )

      try {
        //Upload file lên S3
        const uploadResults = await Promise.all(promiseUpload)

        //Lưu message vào database
        const messageResults = await Promise.all(uploadResults.map(saveMessage))

        if (messageResults) {
          const userConversation = {
            conversationID: createConversation.conversationID,
            lastMessage: messageResults[messageResults.length - 1].messageID
          }

          await conversationModel.addUserToConversation(
            userID,
            userConversation
          )
          await conversationModel.addUserToConversation(
            receiverId,
            userConversation
          )

          const userSockerID = getUserSocketId(userID)
          const receiverSocketID = getReceiverSocketId(receiverId)

          if (userSockerID && receiverSocketID) {
            io.to(receiverSocketID)
              .to(userSockerID)
              .emit('newConversation', createConversation)

            io.to(receiverSocketID).emit('newMessage', messageResults)
          } else {
            io.to(userSockerID).emit('newConversation', createConversation)
          }

          msg = { createConversation, messageResults }
        }
        return msg
      } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error)
      }
    }

    return msg
  } catch (error) {
    throw error
  }
}

export const messageService = {
  sendMessage,
  sendFiles
}
