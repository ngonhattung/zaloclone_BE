import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { conversationModel } from '~/models/conversationModel'
import { messageModel } from '~/models/messageModel'
import { getReceiverSocketId, getUserSocketId, io } from '~/sockets/socket'
import { S3Provider } from '~/providers/S3Provider'
import { userModel } from '~/models/userModel'
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
      const receiver = await userModel.getUserById(receiverId)
      if (!receiver) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver not found')
      }
      const createConversation = await conversationModel.createNewConversation(
        receiver.fullName
      )

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
      const receiver = await userModel.getUserById(receiverId)
      if (!receiver) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver not found')
      }
      const createConversation = await conversationModel.createNewConversation(
        receiver.fullName
      )

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

const revokeMessage = async (userID, participantId, messageID) => {
  try {
    const conversation = await conversationModel.haveTheyChatted(
      userID,
      participantId
    )

    if (!conversation) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Conversation not found. Cannot revoke message'
      )
    }

    const message = await messageModel.findMessageByID(messageID)

    if (!message) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Message not found. Cannot revoke message'
      )
    }

    if (message.senderID !== userID) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You are not authorized to revoke this message'
      )
    }

    await messageModel.revokeMessage(messageID)

    const messageContent = 'Tin nhắn đã bị thu hồi'

    const receiverSocketId = getReceiverSocketId(participantId)
    const userSocketId = getUserSocketId(userID)
    if (receiverSocketId && userSocketId) {
      io.to(receiverSocketId).emit('revokeMessage', messageContent)
      io.to(receiverSocketId).to(userSocketId).emit('notification')
    } else {
      io.to(userSocketId).emit('notification')
    }

    return { msg: messageContent }
  } catch (error) {
    throw error
  }
}

const deleteMessage = async (userID, messageID) => {
  try {
    const message = await messageModel.findMessageByID(messageID)

    if (!message) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Message not found. Cannot delete message'
      )
    }

    if (message.senderID !== userID) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You are not authorized to delete this message'
      )
    }

    await messageModel.deleteMessage(userID, messageID)

    return { msg: 'Message deleted successfully' }
  } catch (error) {
    throw error
  }
}

const shareMessage = async (userID, receiverIds, messageID) => {
  try {
    const message = await messageModel.findMessageByID(messageID)
    if (!message) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Message not found. Cannot share message'
      )
    }

    // Loại bỏ chính userID khỏi danh sách receiverIds
    receiverIds = receiverIds.filter((receiverId) => receiverId !== userID)
    if (receiverIds.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'No valid receivers to share message'
      )
    }

    // Lấy socket ID một lần
    const userSocketID = getUserSocketId(userID)

    const results = []
    const errors = []

    for (const receiverId of receiverIds) {
      try {
        const receiverSocketID = getReceiverSocketId(receiverId)
        let msg = {}

        const conversation = await conversationModel.haveTheyChatted(
          userID,
          receiverId
        )
        if (conversation) {
          // Đã có cuộc trò chuyện -> Gửi tin nhắn vào cuộc trò chuyện cũ
          const messageData = {
            conversationID: conversation.conversationID,
            senderID: userID,
            content: message.messageContent,
            url: message.messageUrl,
            type: message.messageType
          }

          const createNewMessage = await messageModel.createNewMessage(
            messageData
          )

          const userConversation = {
            conversationID: conversation.conversationID,
            lastMessage: createNewMessage.messageID
          }

          await Promise.all([
            conversationModel.updateLastMessage(userID, userConversation),
            conversationModel.updateLastMessage(receiverId, userConversation)
          ])

          // Gửi sự kiện socket
          if (receiverSocketID && userSocketID) {
            io.to(receiverSocketID).emit('newMessage', createNewMessage)
            io.to(userSocketID).to(receiverSocketID).emit('notification')
          }
          io.to(userSocketID).emit('notification')

          msg = { conversation, createNewMessage }
        } else {
          // Chưa có cuộc trò chuyện -> Tạo cuộc trò chuyện mới
          const receiver = await userModel.getUserById(receiverId)
          if (!receiver) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver not found')
          }
          const createConversation =
            await conversationModel.createNewConversation(receiver.fullName)

          const messageData = {
            conversationID: createConversation.conversationID,
            senderID: userID,
            content: message.messageContent,
            url: message.messageUrl,
            type: message.messageType
          }

          const createNewMessage = await messageModel.createNewMessage(
            messageData
          )

          const userConversation = {
            conversationID: createConversation.conversationID,
            lastMessage: createNewMessage.messageID
          }

          //Xử lý song song
          await Promise.all([
            conversationModel.addUserToConversation(userID, userConversation),
            conversationModel.addUserToConversation(
              receiverId,
              userConversation
            )
          ])

          // Gửi sự kiện socket
          if (userSocketID && receiverSocketID) {
            io.to(receiverSocketID)
              .to(userSocketID)
              .emit('newConversation', createConversation)

            io.to(receiverSocketID).emit('newMessage', createNewMessage)
          } else {
            io.to(userSocketID).emit('newConversation', createConversation)
          }

          msg = { createConversation, createNewMessage }
        }

        results.push(msg)
      } catch (error) {
        errors.push({ receiverId, error: error.message })
      }
    }

    if (errors.length > 0) {
      console.warn('Some messages failed to send:', errors)
    }

    return results
  } catch (error) {
    throw error
  }
}

const getMessagesByConversation = async (conversationID) => {
  try {
    const conversation = await conversationModel.findConversationByID(
      conversationID
    )

    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found')
    }

    const messages = await messageModel.getMessagesByConversation(
      conversationID
    )

    return messages
  } catch (error) {
    throw error
  }
}
export const messageService = {
  sendMessage,
  sendFiles,
  revokeMessage,
  shareMessage,
  getMessagesByConversation,
  deleteMessage
}
