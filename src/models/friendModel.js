import dynamoClient from '~/config/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
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

export const friendModel = {
  FRIENDS_TABLE_NAME,
  getFriends
}
