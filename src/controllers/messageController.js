import { StatusCodes } from 'http-status-codes'
import { messageService } from '~/services/messageService'
import ApiError from '~/utils/ApiError'

const sendMessage = async (req, res, next) => {
  try {
    const { receiverId } = req.params
    const userID = req.jwtDecoded.userID
    const { message } = req.body

    const result = await messageService.sendMessage(userID, receiverId, message)
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getMessageById = async (req, res, next) => {
  try {
    const { messageId, conversationID } = req.body
    const userID = req.jwtDecoded.userID

    const result = await messageService.getMessageById(
      messageId,
      conversationID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
// const sendImages = async (req, res, next) => {
//   try {
//     const { receiverId } = req.params
//     const userID = req.jwtDecoded.userID
//     const images = req.file
//     const result = await userService.sendImages(userID, receiverId, images)
//     res.status(StatusCodes.CREATED).json(result)
//   } catch (error) {
//     next(error)
//   }
// }

const sendFiles = async (req, res, next) => {
  try {
    const { receiverId } = req.params
    const userID = req.jwtDecoded.userID
    const files = req.files

    const result = await messageService.sendFiles(userID, receiverId, files)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

// const sendVideos = async (req, res, next) => {
//   try {
//     const { receiverId } = req.params
//     const userID = req.jwtDecoded.userID
//     const videos = req.files
//     const result = await userService.sendVideos(userID, receiverId, videos)

//     //Có kết quả trả về client
//     res.status(StatusCodes.CREATED).json(result)
//   } catch (error) {
//     next(error)
//   }
// }

const revokeMessage = async (req, res, next) => {
  try {
    const { participantId } = req.params
    const userID = req.jwtDecoded.userID
    const { messageID, conversationID } = req.body

    const result = await messageService.revokeMessage(
      userID,
      participantId,
      messageID,
      conversationID
    )
    console.log('result revokeMessage', result)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const deleteMessage = async (req, res, next) => {
  try {
    const { messageID, conversationID } = req.body
    const userID = req.jwtDecoded.userID

    const result = await messageService.deleteMessage(
      userID,
      messageID,
      conversationID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const shareMessage = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { messageID, receiverIds, conversationID } = req.body

    const result = await messageService.shareMessage(
      userID,
      receiverIds,
      messageID,
      conversationID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getMessagesByConversation = async (req, res, next) => {
  try {
    const { conversationID } = req.params

    const result = await messageService.getMessagesByConversation(
      conversationID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const replyMessage = async (req, res, next) => {
  try {
    const { receiverId } = req.params
    const userID = req.jwtDecoded.userID
    const { message, replyMessageID, conversationID } = req.body

    const result = await messageService.replyMessage(
      userID,
      receiverId,
      message,
      replyMessageID,
      conversationID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const addReactionToMessage = async (req, res, next) => {
  try {
    const { receiverId } = req.params
    const { messageID, conversationID, messageEmoji } = req.body
    const userID = req.jwtDecoded.userID

    const result = await messageService.addReactionToMessage(
      userID,
      receiverId,
      messageID,
      conversationID,
      messageEmoji
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const searchMessageByContent = async (req, res, next) => {
  try {
    const { conversationID } = req.params
    const { content } = req.body

    const result = await messageService.searchMessageByContent(
      conversationID,
      content
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
export const messageController = {
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
