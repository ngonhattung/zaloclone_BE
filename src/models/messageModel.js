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
      senderDelete: false,
      reply: messageData.reply || null,
      reaction: messageData.reaction || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
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

const findMessageByID = async (messageID, conversationID) => {
  try {
    const params = {
      TableName: MESSAGE_TABLE_NAME,
      Key: {
        conversationID: conversationID,
        messageID: messageID
      }
    }
    const result = await dynamoClient.get(params).promise()
    return result.Item
  } catch (error) {
    throw new Error(error)
  }
}

const revokeMessage = async (messageID, conversationID) => {
  try {
    const params = {
      TableName: MESSAGE_TABLE_NAME,
      Key: {
        conversationID: conversationID,
        messageID: messageID
      },
      UpdateExpression: 'set #revoke_status = :r,messageContent = :mt',
      ExpressionAttributeNames: {
        '#revoke_status': 'revoke'
      },
      ExpressionAttributeValues: {
        ':r': true,
        ':mt': 'Tin nhắn đã bị thu hồi'
      },
      ReturnValues: 'ALL_NEW'
    }
    await dynamoClient.update(params).promise()
  } catch (error) {
    throw new Error(error)
  }
}

const deleteMessage = async (messageID, conversationID) => {
  try {
    const params = {
      TableName: MESSAGE_TABLE_NAME,
      Key: {
        conversationID: conversationID,
        messageID: messageID
      },
      UpdateExpression: 'set senderDelete = :sd',
      ExpressionAttributeValues: {
        ':sd': true
      },
      ReturnValues: 'UPDATED_NEW'
    }

    await dynamoClient.update(params).promise()
  } catch (error) {
    throw new Error(error)
  }
}

const getMessagesByConversation = async (conversationID) => {
  try {
    const params = {
      TableName: MESSAGE_TABLE_NAME,
      IndexName: 'conversationID-updatedAt-index',
      KeyConditionExpression: 'conversationID = :c',
      ExpressionAttributeValues: {
        ':c': conversationID
      },
      ScanIndexForward: false
    }
    const result = await dynamoClient.query(params).promise()
    return result.Items
  } catch (error) {
    throw new Error(error)
  }
}

const addReactionToMessage = async (
  messageID,
  conversationID,
  messageEmoji
) => {
  try {
    const params = {
      TableName: MESSAGE_TABLE_NAME,
      Key: {
        conversationID: conversationID,
        messageID: messageID
      },
      UpdateExpression: 'set reaction = :r',
      ExpressionAttributeValues: {
        ':r': messageEmoji
      },
      ReturnValues: 'UPDATED_NEW'
    }

    await dynamoClient.update(params).promise()
  } catch (error) {
    throw new Error(error)
  }
}

const searchMessageByContent = async (conversationID, contentSearch) => {
  try {
    const params = {
      TableName: MESSAGE_TABLE_NAME,
      IndexName: 'conversationID-updatedAt-index',
      KeyConditionExpression: 'conversationID = :c',
      FilterExpression: 'contains(messageContent, :cs)',
      ExpressionAttributeValues: {
        ':c': conversationID,
        ':cs': contentSearch
      },
      ScanIndexForward: false,
      Limit: 10
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
  getMessagesByConversation,
  deleteMessage,
  addReactionToMessage,
  searchMessageByContent
}
