import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { conversationModel } from '~/models/conversationModel'

const getConversations = async (userID) => {
  try {
    const result = await conversationModel.getConversations(userID)
    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    return result
  } catch (error) {
    throw error
  }
}

export const conversationService = {
  getConversations
}
