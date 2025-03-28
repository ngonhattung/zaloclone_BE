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

export const messageModel = {
  MESSAGE_TABLE_NAME,
  createNewMessage
}
