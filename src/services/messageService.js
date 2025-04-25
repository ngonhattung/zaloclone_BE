import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { conversationModel } from '~/models/conversationModel'
import { messageModel } from '~/models/messageModel'
import { getReceiverSocketId, getUserSocketId, io } from '~/sockets/socket'
import { S3Provider } from '~/providers/S3Provider'
import { userModel } from '~/models/userModel'
import axios from 'axios'
import { env } from '~/config/environment'
const sendMessage = async (userID, receiverId, message) => {
  try {
    if (userID === receiverId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot send message to yourself'
      )
    }

    // Tìm xem 2 người đã từng gửi tin nhắn với nhau hay chưa
    const conversationExist = await conversationModel.haveTheyChatted(
      userID,
      receiverId
    )
    const conversation = conversationExist?.convDetails
    const isChatBot = receiverId === 'f7bdc49b-164d-4eed-81e4-a52b13446e4c'
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

      //Xu lý song song
      await Promise.all([
        conversationModel.updateLastMessage(userID, userConversation),
        conversationModel.updateLastMessage(receiverId, userConversation)
      ])

      const userSocketID = getUserSocketId(userID)
      const receiverSocketID = getReceiverSocketId(receiverId)

      if (receiverSocketID && userSocketID) {
        io.to(receiverSocketID)
          .to(userSocketID)
          .emit('newMessage', createNewMessage)
        io.to(userSocketID).to(receiverSocketID).emit('notification')
      } else {
        io.to(userSocketID).emit('notification')
        io.to(userSocketID).emit('newMessage', createNewMessage)
      }

      if (isChatBot)
        handleChatBotReply(
          userID,
          receiverId,
          message,
          conversation.conversationID
        )
      msg = { conversation, createNewMessage }
    } else {
      /*Nếu chưa
      - tạo 1 conversation -> lưu vào database, tạo 1 message -> lưu vào database
      - Lưu conversationID + info vào message
      - Lưu userId của 2 người vào user_conversation + lastMessage
    */

      const userCurrent = await userModel.getUserById(userID)
      if (!userCurrent) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
      }

      const receiver = await userModel.getUserById(receiverId)
      if (!receiver) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver not found')
      }
      const createConversation = await conversationModel.createNewConversation(
        'single'
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
      //Xử lý song song
      await Promise.all([
        conversationModel.addUserToConversation(userID, userConversation),
        conversationModel.addUserToConversation(receiverId, userConversation)
      ])

      const userSocketID = getUserSocketId(userID)
      const receiverSocketID = getReceiverSocketId(receiverId)

      if (userSocketID && receiverSocketID) {
        // Gửi conversation mới tới cả 2 người
        io.to(receiverSocketID)
          .to(userSocketID)
          .emit('notification', createConversation) // sửa thành notification

        // Gửi tin nhắn mới tới người nhận
        io.to(receiverSocketID)
          .to(userSocketID)
          .emit('newMessage', createNewMessage)
      } else {
        // Gửi conversation mới tới người gửi
        io.to(userSocketID).emit('notification', createConversation) // sửa thành notiification
        io.to(userSocketID).emit('newMessage', createNewMessage) // Thêm thông báo
      }

      if (isChatBot)
        handleChatBotReply(
          userID,
          receiverId,
          message,
          createConversation.conversationID,
          createConversation
        )

      msg = { createConversation, createNewMessage }
    }

    return msg
  } catch (error) {
    throw error
  }
}

const handleChatBotReply = async (
  userID,
  botID,
  userMessage,
  conversationID,
  createConversation
) => {
  try {
    const res = await axios.post(
      `${env.CHATBOT_URL}`,
      {
        message: userMessage,
        userId: userID,
        sesstionID: userID,
        type: 'text'
      },
      { headers: { 'Content-Type': 'application/json' } }
    )

    if (res.data.output === '' || res.data.output === undefined) {
      res.data.output =
        'Cảm ơn bạn đã liên hệ với chúng tôi. Chúng tôi sẽ phản hồi bạn trong thời gian sớm nhất!'
    }
    const botMessage = {
      conversationID,
      senderID: botID,
      content: res.data.output,
      type: 'text'
    }

    const createBotMessage = await messageModel.createNewMessage(botMessage)
    const botConversation = {
      conversationID,
      lastMessage: createBotMessage.messageID
    }

    await Promise.all([
      conversationModel.updateLastMessage(botID, botConversation),
      conversationModel.updateLastMessage(userID, botConversation)
    ])

    const userSocketID = getUserSocketId(userID)
    const receiverSocketID = getReceiverSocketId(botID)

    if (createConversation) {
      if (userSocketID && receiverSocketID) {
        // Gửi conversation mới tới cả 2 người
        io.to(receiverSocketID)
          .to(userSocketID)
          .emit('notification', createConversation) // sửa thành notification

        // Gửi tin nhắn mới tới người nhận
        io.to(receiverSocketID)
          .to(userSocketID)
          .emit('newMessage', createBotMessage)
      } else {
        // Gửi conversation mới tới người gửi
        io.to(userSocketID).emit('notification', createConversation) // sửa thành notiification
        io.to(userSocketID).emit('newMessage', createBotMessage) // Thêm thông báo
      }
    }
    if (receiverSocketID && userSocketID) {
      io.to(receiverSocketID)
        .to(userSocketID)
        .emit('newMessage', createBotMessage)
      io.to(userSocketID).to(receiverSocketID).emit('notification')
    } else {
      io.to(userSocketID).emit('notification')
      io.to(userSocketID).emit('newMessage', createBotMessage)
    }
  } catch (err) {
    console.error('Chatbot response error:', err.message)
  }
}

const sendFiles = async (userID, receiverId, files) => {
  try {
    if (userID === receiverId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot send message to yourself'
      )
    }

    // Tìm xem 2 người đã từng gửi tin nhắn với nhau hay chưa
    const conversationExist = await conversationModel.haveTheyChatted(
      userID,
      receiverId
    )
    const conversation = conversationExist?.convDetails
    let msg = {}

    //Lưu message vào database
    const saveMessage = async (uploadResults) => {
      try {
        const messageData = {
          conversationID: conversation.conversationID,
          senderID: userID,
          content: JSON.stringify(
            uploadResults.map((file) => file.originalname)
          ), // Mảng tên file
          url: JSON.stringify(uploadResults.map((file) => file.Location)), // Mảng URL
          type: JSON.stringify(
            uploadResults.map((file) => {
              const parts = file.originalname.split('.')
              return parts.length > 1 ? parts[parts.length - 1] : 'unknown'
            })
          ) // Mảng loại file
        }

        return await messageModel.createNewMessage(messageData)
      } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error)
      }
    }

    //Nếu đã từng nhắn tin
    if (conversation) {
      const promiseUpload = files.map(async (file) => {
        const s3Result = await S3Provider.streamUpload(file, userID)
        return {
          ...s3Result,
          originalname: file.originalname
        }
      })

      try {
        const uploadResults = await Promise.all(promiseUpload)
        const messageResults = await saveMessage(uploadResults)

        if (messageResults) {
          const userConversation = {
            conversationID: conversation.conversationID,
            lastMessage: messageResults.messageID
          }

          //Xu lý song song
          await Promise.all([
            conversationModel.updateLastMessage(userID, userConversation),
            conversationModel.updateLastMessage(receiverId, userConversation)
          ])

          const userSocketID = getUserSocketId(userID)
          const receiverSocketID = getReceiverSocketId(receiverId)

          if (receiverSocketID) {
            io.to(receiverSocketID).emit('newMessage', messageResults)
            io.to(receiverSocketID).emit('notification')
          }

          if (userSocketID) {
            io.to(userSocketID).emit('newMessage', messageResults)
            io.to(userSocketID).emit('notification')
          }

          msg = { conversation, messageResults }
        }
      } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error)
      }
    } else {
      //Nếu chưa từng nhắn tin

      const userCurrent = await userModel.getUserById(userID)
      if (!userCurrent) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
      }

      const receiver = await userModel.getUserById(receiverId)
      if (!receiver) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver not found')
      }
      const createConversation = await conversationModel.createNewConversation(
        'single'
      )

      //Đưa upload file vào mảng promiseUpload
      const promiseUpload = files.map(async (file) => {
        const s3Result = await S3Provider.streamUpload(file, userID)
        return {
          ...s3Result,
          originalname: file.originalname
        }
      })

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
          //Xử lý song song
          await Promise.all([
            conversationModel.addUserToConversation(userID, userConversation),
            conversationModel.addUserToConversation(
              receiverId,
              userConversation
            )
          ])

          const userSocketID = getUserSocketId(userID)
          const receiverSocketID = getReceiverSocketId(receiverId)

          if (receiverSocketID) {
            io.to(receiverSocketID).emit('newMessage', messageResults)
            io.to(receiverSocketID).emit('newConversation', createConversation)
            io.to(receiverSocketID).emit('notification')
          }

          if (userSocketID) {
            io.to(userSocketID).emit('newMessage', messageResults)
            io.to(userSocketID).emit('newConversation', createConversation)
            io.to(userSocketID).emit('notification')
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

const revokeMessage = async (
  userID,
  participantId,
  messageID,
  conversationID
) => {
  try {
    const conversationExist = await conversationModel.haveTheyChatted(
      userID,
      participantId
    )

    const conversation = conversationExist?.convDetails

    if (!conversation) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Conversation not found. Cannot revoke message'
      )
    }

    const message = await messageModel.findMessageByID(
      messageID,
      conversationID
    )

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

    if (message.senderDelete === true) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không thể thu hồi tin nhắn đã xóa'
      )
    }

    await messageModel.revokeMessage(messageID, conversationID)
    const messageAfterRevoke = await messageModel.findMessageByID(
      messageID,
      conversationID
    )
    const receiverSocketId = getReceiverSocketId(participantId)
    const userSocketId = getUserSocketId(userID)
    if (receiverSocketId && userSocketId) {
      io.to(receiverSocketId)
        .to(userSocketId)
        .emit('revokeMessage', messageAfterRevoke)
      io.to(receiverSocketId).to(userSocketId).emit('notification')
    } else {
      io.to(userSocketId).emit('revokeMessage', messageAfterRevoke)
      io.to(userSocketId).emit('notification')
    }

    return messageAfterRevoke
  } catch (error) {
    throw error
  }
}

const deleteMessage = async (userID, messageID, conversationID) => {
  try {
    const message = await messageModel.findMessageByID(
      messageID,
      conversationID
    )

    if (!message) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Message not found. Cannot delete message'
      )
    }

    if (message.senderID !== userID) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không có quyền xóa tin nhắn này'
      )
    }

    if (message.revoke === true) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không thể xóa tin nhắn đã thu hồi'
      )
    }

    await messageModel.deleteMessage(messageID, conversationID)

    const messageAfterDelete = await messageModel.findMessageByID(
      messageID,
      conversationID
    )

    const userSocketId = getUserSocketId(userID)

    if (userSocketId) {
      io.to(userSocketId).emit('deleteMessage', messageAfterDelete)
      io.to(userSocketId).emit('notification')
    }
    return messageAfterDelete
  } catch (error) {
    throw error
  }
}

const shareMessage = async (userID, receiverIds, messageID, conversationID) => {
  try {
    const message = await messageModel.findMessageByID(
      messageID,
      conversationID
    )
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

        const conversationExist = await conversationModel.haveTheyChatted(
          userID,
          receiverId
        )
        const conversation = conversationExist?.convDetails
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
            io.to(receiverSocketID)
              .to(userSocketID)
              .emit('newMessage', createNewMessage)
            io.to(userSocketID).to(receiverSocketID).emit('notification')
          } else {
            io.to(userSocketID).emit('notification')
            io.to(userSocketID).emit('newMessage', createNewMessage)
          }

          msg = { conversation, createNewMessage }
        } else {
          // Chưa có cuộc trò chuyện -> Tạo cuộc trò chuyện mới

          const userCurrent = await userModel.getUserById(userID)
          if (!userCurrent) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
          }

          const receiver = await userModel.getUserById(receiverId)
          if (!receiver) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver not found')
          }
          const createConversation =
            await conversationModel.createNewConversation('single')

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

            io.to(receiverSocketID)
              .to(userSocketID)
              .emit('newMessage', createNewMessage)
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

    try {
      const messages = await messageModel.getMessagesByConversation(
        conversationID
      )

      return messages
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  } catch (error) {
    throw error
  }
}

const replyMessage = async (
  userID,
  receiverId,
  message,
  replyMessageID,
  conversationID
) => {
  try {
    const conversation = await conversationModel.findConversationByID(
      conversationID
    )

    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    }

    const messageReply = await messageModel.findMessageByID(
      replyMessageID,
      conversationID
    )

    console.log('messageReply', messageReply)

    const messageData = {
      conversationID: conversation.conversationID,
      senderID: userID,
      content: message,
      url: messageReply.messageUrl || null,
      type: messageReply.messageType || 'text',
      reply: messageReply.messageID
    }

    const createNewMessage = await messageModel.createNewMessage(messageData)

    const userConversation = {
      conversationID: conversation.conversationID,
      lastMessage: createNewMessage.messageID
    }

    //Xu lý song song
    await Promise.all([
      conversationModel.updateLastMessage(userID, userConversation),
      conversationModel.updateLastMessage(receiverId, userConversation)
    ])

    const userSocketID = getUserSocketId(userID)
    const receiverSocketID = getReceiverSocketId(receiverId)

    if (receiverSocketID && userSocketID) {
      io.to(receiverSocketID)
        .to(userSocketID)
        .emit('newMessage', createNewMessage)
      io.to(userSocketID).to(receiverSocketID).emit('notification')
    } else {
      io.to(userSocketID).emit('notification')
      io.to(userSocketID).emit('newMessage', createNewMessage)
    }

    return createNewMessage
  } catch (error) {
    throw error
  }
}

const addReactionToMessage = async (
  userID,
  receiverId,
  messageID,
  conversationID,
  messageEmoji
) => {
  try {
    const message = await messageModel.findMessageByID(
      messageID,
      conversationID
    )

    if (!message) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Message not found. Cannot add reaction'
      )
    }

    if (message.senderDelete === true) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không thể thêm phản ứng vào tin nhắn đã xóa'
      )
    }

    const updatedMessage = await messageModel.addReactionToMessage(
      messageID,
      conversationID,
      messageEmoji
    )

    const messageAfterReaction = await messageModel.findMessageByID(
      messageID,
      conversationID
    )

    const userSocketID = getUserSocketId(userID)
    const receiverSocketID = getReceiverSocketId(receiverId)

    if (receiverSocketID && userSocketID) {
      io.to(receiverSocketID)
        .to(userSocketID)
        .emit('newMessage', updatedMessage)
      io.to(userSocketID).to(receiverSocketID).emit('notification')
    } else {
      io.to(userSocketID).emit('notification')
      io.to(userSocketID).emit('newMessage', updatedMessage)
    }

    return messageAfterReaction
  } catch (error) {
    throw error
  }
}
const searchMessageByContent = async (conversationID, content) => {
  try {
    const conversation = await conversationModel.findConversationByID(
      conversationID
    )

    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found')
    }

    const messages = await messageModel.searchMessageByContent(
      conversationID,
      content
    )

    return messages
  } catch (error) {
    throw error
  }
}
const getMessageById = async (messageID, conversationID) => {
  try {
    const message = await messageModel.findMessageByID(
      messageID,
      conversationID
    )

    if (!message) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found')
    }

    return message
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
  deleteMessage,
  replyMessage,
  addReactionToMessage,
  searchMessageByContent,
  getMessageById
}
