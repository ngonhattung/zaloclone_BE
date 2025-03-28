import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { conversationService } from '~/services/conversationService'

const getConversations = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const result = await conversationService.getConversations(userID)

    //Có kết quả trả về client
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

export const conversationController = {
  getConversations
}
