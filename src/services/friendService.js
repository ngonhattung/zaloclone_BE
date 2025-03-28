import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { friendModel } from '~/models/friendModel'

const getFriends = async (userID) => {
  try {
    const result = await friendModel.getFriends(userID)
    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    return result
  } catch (error) {
    throw error
  }
}

export const friendService = {
  getFriends
}
