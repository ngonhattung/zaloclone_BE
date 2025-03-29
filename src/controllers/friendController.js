import { StatusCodes } from 'http-status-codes'
import { friendService } from '~/services/friendService'

const getFriends = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const result = await friendService.getFriends(userID)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const friendRequest = async (req, res, next) => {
  try {
    const senderID = req.jwtDecoded.userID
    const receiverID = req.params.receiverID
    const result = await friendService.friendRequest(senderID, receiverID)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const cancelFriendRequest = async (req, res, next) => {
  try {
    const senderID = req.jwtDecoded.userID
    const receiverID = req.params.receiverID
    const result = await friendService.cancelFriendRequest(senderID, receiverID)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const acceptFriendRequest = async (req, res, next) => {
  try {
    const receiverID = req.jwtDecoded.userID
    const senderID = req.params.senderID
    const result = await friendService.acceptFriendRequest(senderID, receiverID)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const declineFriendRequest = async (req, res, next) => {
  try {
    const senderID = req.jwtDecoded.userID
    const receiverID = req.params.receiverID
    const result = await friendService.declineFriendRequest(
      senderID,
      receiverID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
export const friendController = {
  getFriends,
  friendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest
}
