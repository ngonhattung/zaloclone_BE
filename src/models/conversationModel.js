import Joi from 'joi'
import dynamoClient from '~/config/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'

const CONVERSASION_TABLE_NAME = 'conversations'
const USERCONVERSASION_TABLE_NAME = 'userConversations'
const haveTheyChatted = async (userID, receiverId) => {
  try {
    const convUser = await dynamoClient
      .query({
        TableName: USERCONVERSASION_TABLE_NAME,
        KeyConditionExpression: 'userID = :userID',
        ExpressionAttributeValues: { ':userID': userID }
      })
      .promise()

    // Lấy danh sách các cuộc hội thoại của receiverId
    const convReceiver = await dynamoClient
      .query({
        TableName: USERCONVERSASION_TABLE_NAME,
        KeyConditionExpression: 'userID = :receiverId',
        ExpressionAttributeValues: { ':receiverId': receiverId }
      })
      .promise()

    const convSetUser = new Map(convUser.Items.map((item) => [item.SK, item]))
    const convSetReceiver = new Map(
      convReceiver.Items.map((item) => [item.SK, item])
    )

    for (let [convId, convDetails] of convSetUser) {
      if (convSetReceiver.has(convId)) {
        console.log('convDetails', convDetails)
        return { conversation: convDetails } // Trả về thông tin conversation
      }
    }
    return null
  } catch (error) {
    throw error
  }
}

const createNewConversation = async () => {
  try {
    const conversationID = uuidv4()

    const info = {
      conversationID,
      conversationType: 'private',
      conversationName: null,
      createdAt: Date.now(),
      updatedAt: null
    }

    const params = {
      TableName: CONVERSASION_TABLE_NAME,
      Item: info
    }

    await dynamoClient.put(params).promise()

    return info
  } catch (error) {
    throw error
  }
}

const addUserToConversation = async (userID, userConversation) => {
  try {
    const params = {
      TableName: USERCONVERSASION_TABLE_NAME,
      Item: {
        userID: userID,
        conversationID: userConversation.conversationID,
        lastMessageID: userConversation.lastMessage
      }
    }
    await dynamoClient.put(params).promise()
    return userConversation
  } catch (error) {
    throw error
  }
}

const updateLastMessage = async (userID, userConversation) => {
  try {
    const params = {
      TableName: USERCONVERSASION_TABLE_NAME,
      Key: {
        userID: userID,
        conversationID: userConversation.conversationID
      },
      UpdateExpression: 'set lastMessageID = :lastMessage',
      ExpressionAttributeValues: {
        ':lastMessage': userConversation.lastMessage
      }
    }
    await dynamoClient.update(params).promise()
    return userConversation
  } catch (error) {
    throw error
  }
}

const findConversationByID = async (conversationID) => {
  try {
    const params = {
      TableName: CONVERSASION_TABLE_NAME,
      Key: {
        conversationID
      }
    }
    const result = await dynamoClient.get(params).promise()
    return result.Item
  } catch (error) {
    throw new Error(error)
  }
}
export const conversationModel = {
  CONVERSASION_TABLE_NAME,
  haveTheyChatted,
  createNewConversation,
  addUserToConversation,
  updateLastMessage,
  findConversationByID
}
