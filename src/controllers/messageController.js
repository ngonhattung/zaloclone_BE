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

const revokeMessage = (req, res, next) => {
  try {
    const { participantId } = req.params
    const userID = req.jwtDecoded.userID
    const { messageID } = req.body

    const result = messageService.revokeMessage(
      userID,
      participantId,
      messageID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const deleteMessage = (req, res, next) => {
  try {
    const { messageID } = req.body
    const userID = req.jwtDecoded.userID

    const result = messageService.deleteMessage(userID, messageID)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const shareMessage = (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { messageID, receiverIds } = req.body

    const result = messageService.shareMessage(userID, receiverIds, messageID)

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

export const messageController = {
  sendMessage,
  sendFiles,
  revokeMessage,
  shareMessage,
  getMessagesByConversation,
  deleteMessage
}
