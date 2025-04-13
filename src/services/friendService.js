import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { friendModel } from '~/models/friendModel'
import { userModel } from '~/models/userModel'
import { getUserSocketId, getReceiverSocketId, io } from '~/sockets/socket.js'
const getFriends = async (userID) => {
  try {
    const result = await friendModel.getFriends(userID)

    if (result.length === 0 || !result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Friends not found')
    }
    return result
  } catch (error) {
    throw error
  }
}
const friendRequest = async (senderID, receiverID) => {
  try {
    if (senderID === receiverID) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You can not send friend request to yourself'
      )
    }

    const receiver = await userModel.getUserById(receiverID)
    if (!receiver) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }

    const friendShip = await friendModel.createFriendRequest(
      senderID,
      receiverID
    )

    const senderSocketID = getUserSocketId(senderID)
    const receiverSocketID = getReceiverSocketId(receiverID)
    if (receiverSocketID) {
      io.to(receiverSocketID).emit('friendRequest', {
        friendShip
      })
    }
    if (senderSocketID) {
      io.to(senderSocketID).emit('sentFriendRequest', {
        friendShip
      })
    }
    return friendShip
  } catch (error) {
    throw error
  }
}

const cancelFriendRequest = async (senderID, receiverID) => {
  try {
    if (senderID === receiverID) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You can not cancel friend request to yourself'
      )
    }
    const friendRequest = await friendModel.getFriend(senderID, receiverID)

    if (!friendRequest) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Friend request not found')
    }

    const result = await friendModel.cancelFriendRequest(senderID, receiverID)

    const senderSocketID = getUserSocketId(senderID)
    const receiverSocketID = getReceiverSocketId(receiverID)
    if (receiverSocketID) {
      io.to(receiverSocketID).emit('friendRequest', {
        message: 'A friend request has been cancelled'
      })
    }
    if (senderSocketID) {
      io.to(senderSocketID).emit('sentFriendRequest', {
        message: 'You have canceled the friend request'
      })
    }
    if (result) {
      return { msg: 'Friend request has been canceled' }
    }
  } catch (error) {
    throw error
  }
}

const acceptFriendRequest = async (senderID, receiverID) => {
  try {
    if (senderID === receiverID) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You can not accept friend request from yourself'
      )
    }

    const friendRequest = await friendModel.getFriend(senderID, receiverID)
    if (!friendRequest) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Friend request not found')
    }

    const result = await friendModel.acceptFriendRequest(senderID, receiverID)

    if (result) {
      const sender = await userModel.getUserById(senderID)
      const receiver = await userModel.getUserById(receiverID)

      const senderSocketID = getUserSocketId(senderID)
      const receiverSocketID = getReceiverSocketId(receiverID)

      if (senderSocketID) {
        io.to(senderSocketID).emit('friendRequestAccepted', {
          sender
        })
      }

      if (receiverSocketID) {
        io.to(receiverSocketID).emit('friendRequestAccepted', {
          receiver
        })
      }

      return { msg: 'Friend request has been accepted' }
    }
  } catch (error) {
    throw error
  }
}

const declineFriendRequest = async (senderID, receiverID) => {
  try {
    if (senderID === receiverID) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You can not decline friend request from yourself'
      )
    }

    const friendRequest = await friendModel.getFriend(senderID, receiverID)
    if (!friendRequest) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Friend request not found')
    }

    const result = await friendModel.declineFriendRequest(senderID, receiverID)

    const senderSocketID = getUserSocketId(senderID)
    const receiverSocketID = getReceiverSocketId(receiverID)
    if (receiverSocketID) {
      io.to(receiverSocketID).emit('friendRequest', {
        message: 'You have declined the friend request'
      })
    }
    if (senderSocketID) {
      io.to(senderSocketID).emit('sentFriendRequest', {
        message: 'A friend request has been declined'
      })
    }

    if (result) {
      return { msg: 'Friend request has been declined' }
    }
  } catch (error) {
    throw error
  }
}

const getFriendRequests = async (userID) => {
  try {
    const result = await friendModel.getFriendRequests(userID)
    if (result.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Friend requests not found')
    }
    return result
  } catch (error) {
    throw error
  }
}

const getSentFriendRequests = async (userID) => {
  try {
    const result = await friendModel.getSentFriendRequests(userID)

    if (result.length === 0) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Sent friend requests not found'
      )
    }
    return result
  } catch (error) {
    throw error
  }
}

const removeFriend = async (userID, friendID) => {
  try {
    if (userID === friendID) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You can not remove yourself from friend list'
      )
    }

    const friend = await friendModel.getFriend(userID, friendID)
    if (!friend) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Friend not found')
    }

    const result = await friendModel.removeFriend(userID, friendID)

    if (result) {
      return { msg: 'Friend has been removed' }
    }
  } catch (error) {
    throw error
  }
}
export const friendService = {
  getFriends,
  friendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getSentFriendRequests,
  removeFriend
}
