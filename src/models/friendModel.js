import dynamoClient from '~/config/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { userModel } from './userModel'

const FRIENDS_TABLE_NAME = 'friends'

const getFriends = async (userID) => {
  try {
    const result = await dynamoClient
      .query({
        TableName: FRIENDS_TABLE_NAME,
        KeyConditionExpression: 'userID = :userID',
        ExpressionAttributeValues: { ':userID': userID }
      })
      .promise()

    if (!result.Items || result.Items.length === 0) {
      return []
    }
    const friendIDs = result.Items.map((item) => item.friendID)

    const friendsData = await dynamoClient
      .batchGet({
        RequestItems: {
          [userModel.USER_TABLE_NAME]: {
            Keys: friendIDs.map((id) => ({ userID: id })) // userID là khóa chính của bảng Users
          }
        }
      })
      .promise()

    return friendsData.Responses[userModel.USER_TABLE_NAME] || []
  } catch (error) {
    throw error
  }
}
const createFriendRequest = async (senderID, receiverID) => {
  try {
    const friendShip = {
      userID: senderID,
      friendID: receiverID,
      friendStatus: 'pending',
      createdAt: Date.now(),
      updatedAt: null
    }

    await dynamoClient
      .put({
        TableName: FRIENDS_TABLE_NAME,
        Item: friendShip
      })
      .promise()

    return friendShip
  } catch (error) {
    throw error
  }
}

const getFriend = async (userID, friendID) => {
  try {
    const result = await dynamoClient
      .get({
        TableName: FRIENDS_TABLE_NAME,
        Key: {
          userID,
          friendID
        }
      })
      .promise()

    if (!result.Item) {
      return null
    }
    return result.Item
  } catch (error) {
    throw error
  }
}

const cancelFriendRequest = async (senderID, receiverID) => {
  try {
    await dynamoClient
      .delete({
        TableName: FRIENDS_TABLE_NAME,
        Key: {
          userID: senderID,
          friendID: receiverID
        }
      })
      .promise()

    return true
  } catch (error) {
    throw error
  }
}

const acceptFriendRequest = async (senderID, receiverID) => {
  try {
    console.log('senderID', senderID)
    console.log('receiverID', receiverID)
    await dynamoClient
      .update({
        TableName: FRIENDS_TABLE_NAME,
        Key: {
          userID: senderID,
          friendID: receiverID
        },
        UpdateExpression: 'set friendStatus = :status, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':status': 'accepted',
          ':updatedAt': Date.now()
        }
      })
      .promise()

    await dynamoClient
      .put({
        TableName: FRIENDS_TABLE_NAME,
        Item: {
          userID: receiverID,
          friendID: senderID,
          friendStatus: 'accepted',
          createdAt: Date.now(),
          updatedAt: null
        }
      })
      .promise()

    return true
  } catch (error) {
    throw error
  }
}
const declineFriendRequest = async (senderID, receiverID) => {
  try {
    await dynamoClient
      .delete({
        TableName: FRIENDS_TABLE_NAME,
        Key: {
          userID: senderID,
          friendID: receiverID
        }
      })
      .promise()

    return true
  } catch (error) {
    throw error
  }
}

const getFriendRequests = async (userID) => {
  try {
    const result = await dynamoClient
      .query({
        TableName: FRIENDS_TABLE_NAME,
        IndexName: 'friendID-index', // Chỉ mục phụ để tìm kiếm theo friendID
        KeyConditionExpression:
          'friendID = :friendID AND friendStatus = :status',
        ExpressionAttributeValues: {
          ':friendID': userID,
          ':status': 'pending'
        }
      })
      .promise()

    const friendIDs = result.Items.map((item) => item.userID)
    if (!friendIDs || friendIDs.length === 0) {
      return []
    }
    const friendsData = await dynamoClient
      .batchGet({
        RequestItems: {
          [userModel.USER_TABLE_NAME]: {
            Keys: friendIDs.map((id) => ({ userID: id })) // userID là khóa chính của bảng Users
          }
        }
      })
      .promise()

    return friendsData.Responses[userModel.USER_TABLE_NAME] || []
  } catch (error) {
    throw error
  }
}

const getSentFriendRequests = async (userID) => {
  try {
    const result = await dynamoClient
      .query({
        TableName: FRIENDS_TABLE_NAME,
        KeyConditionExpression: 'userID = :userID',
        FilterExpression: 'friendStatus = :status',
        ExpressionAttributeValues: {
          ':userID': userID,
          ':status': 'pending'
        }
      })
      .promise()

    const friendIDs = result.Items.map((item) => item.friendID)

    if (!friendIDs || friendIDs.length === 0) {
      return []
    }

    const friendsData = await dynamoClient
      .batchGet({
        RequestItems: {
          [userModel.USER_TABLE_NAME]: {
            Keys: friendIDs.map((id) => ({ userID: id })) // userID là khóa chính của bảng Users
          }
        }
      })
      .promise()

    return friendsData.Responses[userModel.USER_TABLE_NAME] || []
  } catch (error) {
    throw error
  }
}
export const friendModel = {
  FRIENDS_TABLE_NAME,
  getFriends,
  createFriendRequest,
  getFriend,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getSentFriendRequests
}
