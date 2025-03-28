import Joi from 'joi'
import dynamoClient from '~/config/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'

const MESSAGE_TABLE_NAME = 'messages'

const createNewMessage = async (messageData) => {
  try {
    const messageInfo = {
      messageID: uuidv4(),
      conversationID: messageData.conversationID,
      senderID: messageData.senderID,
      messageContent: messageData.content,
      messageUrl: messageData.url || null,
      messageType: messageData.type,
      revoke: false,
      createdAt: Date.now(),
      updatedAt: null
    }

    const params = {
      TableName: MESSAGE_TABLE_NAME,
      Item: messageInfo
    }
    await dynamoClient.put(params).promise()
    return messageInfo
  } catch (error) {
    throw new Error(error)
  }
}

const findMessageByID = async (messageID) => {
  try {
    const params = {
      TableName: MESSAGE_TABLE_NAME,
      Key: {
        messageID
      }
    }
    const result = await dynamoClient.get(params).promise()
    return result.Item
  } catch (error) {
    throw new Error(error)
  }
}

const revokeMessage = async (messageID) => {
  try {
    const params = {
      TableName: MESSAGE_TABLE_NAME,
      Key: {
        messageID
      },
      UpdateExpression: 'set revoke = :r, updatedAt = :u',
      ExpressionAttributeValues: {
        ':r': true,
        ':u': Date.now()
      },
      ReturnValues: 'ALL_NEW'
    }
    const result = await dynamoClient.update(params).promise()
    return result.Attributes
  } catch (error) {
    throw new Error(error)
  }
}

const getMessagesByConversation = async (conversationID) => {
  try {
    const params = {
      TableName: MESSAGE_TABLE_NAME,
      IndexName: 'conversationID-index',
      KeyConditionExpression: 'conversationID = :c',
      ExpressionAttributeValues: {
        ':c': conversationID
      }
    }
    const result = await dynamoClient.query(params).promise()
    return result.Items
  } catch (error) {
    throw new Error(error)
  }
}
export const messageModel = {
  MESSAGE_TABLE_NAME,
  createNewMessage,
  findMessageByID,
  revokeMessage,
  getMessagesByConversation
}
