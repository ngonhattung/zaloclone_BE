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
const getConversationByName = async (conversationName) => {
  try {
    const result = await conversationModel.getConversationByName(
      conversationName
    )
    return result
  } catch (error) {
    throw error
  }
}

const checkConversationExist = async (userID, receiverId) => {
  try {
    const result = await conversationModel.haveTheyChatted(userID, receiverId)
    return result
  } catch (error) {
    throw error
  }
}

const getReceiverByConversationId = async (userID, conversationId) => {
  try {
    const result = await conversationModel.getReceiverByConversationId(
      userID,
      conversationId
    )
    return result
  } catch (error) {
    throw error
  }
}

const updateStateSeen = async (conversationId, userId) => {
  try {
    const result = await conversationModel.updateStateSeen(
      conversationId,
      userId
    )
    return result
  } catch (error) {
    throw error
  }
}
const getConversationsNoSeen = async (userID) => {
  try {
    const result = await conversationModel.getConversationsNoSeen(userID)
    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    return result
  } catch (error) {
    throw error
  }
}
export const conversationService = {
  getConversations,
  getConversationByName,
  checkConversationExist,
  getReceiverByConversationId,
  updateStateSeen,
  getConversationsNoSeen
}
