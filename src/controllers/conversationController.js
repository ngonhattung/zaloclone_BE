import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { conversationService } from '~/services/conversationService'

const getConversations = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const result = await conversationService.getConversations(userID)
    console.log('result', result)
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getConversationByName = async (req, res, next) => {
  try {
    const { conversationName } = req.params
    const result = await conversationService.getConversationByName(
      conversationName
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const checkConversationExist = async (req, res, next) => {
  try {
    const { receiverId } = req.params
    const userID = req.jwtDecoded.userID
    const result = await conversationService.checkConversationExist(
      userID,
      receiverId
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getReceiver = async (req, res, next) => {
  try {
    const { conversationId } = req.params
    const userID = req.jwtDecoded.userID
    const result = await conversationService.getReceiverByConversationId(
      userID,
      conversationId
    )
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

export const conversationController = {
  getConversations,
  getConversationByName,
  checkConversationExist,
  getReceiver
}
