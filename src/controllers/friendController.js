import { StatusCodes } from 'http-status-codes'
import { friendService } from '~/services/friendService'

const getFriends = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const result = await friendService.getFriends(userID)

    //Có kết quả trả về client
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

export const friendController = {
  getFriends
}
